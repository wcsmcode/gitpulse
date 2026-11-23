import { create } from 'zustand';
import type { Workspace, Issue, IssueStatus, IssuePriority, Tag, User, Comment, Repository } from '../types';
import { mockWorkspace, mockIssues, mockTags, mockUsers } from '../mocks/data';
import { authApi, issuesApi, workspacesApi } from '../api/services';

export type ActiveView = 'landing' | 'board' | 'leaderboard' | 'settings';

const initialMockRepos: Repository[] = [
  {
    id: 1,
    name: 'gitpulse-core',
    github_url: 'https://github.com/gitpulse-dev/gitpulse-core',
    stars: 3420,
    language: 'TypeScript / Python',
    is_active: true,
    issues_count: 5,
  },
  {
    id: 2,
    name: 'pallets/flask',
    github_url: 'https://github.com/pallets/flask',
    stars: 68200,
    language: 'Python',
    is_active: true,
    issues_count: 3,
  },
];

interface AppState {
  // Navigation & Workspace
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  workspace: Workspace;
  workspaces: Workspace[];
  fetchUserWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: number) => Promise<void>;
  repositories: Repository[];
  users: User[];
  allTags: Tag[];

  // Workspace Creation Modal
  isCreateWorkspaceModalOpen: boolean;
  openCreateWorkspaceModal: () => void;
  closeCreateWorkspaceModal: () => void;
  createWorkspace: (name: string, description?: string) => Promise<void>;
  inviteMember: (email: string, role: string) => Promise<void>;

  // Authentication state
  token: string | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, fullName: string, pass: string) => Promise<void>;
  registerUser: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrateAuth: () => Promise<void>;
  checkAuthSession: () => Promise<void>;

  // Create Issue Modal
  isCreateIssueModalOpen: boolean;
  openCreateIssueModal: () => void;
  closeCreateIssueModal: () => void;

  // Sidebar collapse
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Search & Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedPriority: IssuePriority | 'ALL';
  setSelectedPriority: (priority: IssuePriority | 'ALL') => void;
  selectedTagId: number | 'ALL';
  setSelectedTagId: (tagId: number | 'ALL') => void;

  // Issues & State Management
  issues: Issue[];
  selectedIssue: Issue | null;
  setSelectedIssue: (issue: Issue | null) => void;
  isLoadingIssues: boolean;
  fetchLiveIssues: () => Promise<void>;
  fetchWorkspaceRepos: () => Promise<void>;

  // Actions
  createNewIssue: (data: {
    title: string;
    description: string;
    priority: IssuePriority;
    bounty_points: number;
    repositoryId?: number | null;
    tagIds?: number[];
  }) => Promise<void>;
  updateIssueStatus: (issueId: number, newStatus: IssueStatus) => Promise<void>;
  claimIssue: (issueId: number) => Promise<void>;
  addComment: (issueId: number, content: string) => void;
  syncFromGitHub: (repoName: string) => Promise<number>;
  linkRepoToWorkspace: (name: string, github_url?: string) => Promise<void>;
  unlinkRepoFromWorkspace: (repoId: number) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeView: 'landing',
  setActiveView: (view) => set({ activeView: view }),
  workspace: mockWorkspace,
  workspaces: [mockWorkspace],
  repositories: initialMockRepos,
  currentUser: null,
  users: mockUsers,
  allTags: mockTags,

  // Workspace Creation Modal State
  isCreateWorkspaceModalOpen: false,
  openCreateWorkspaceModal: () => set({ isCreateWorkspaceModalOpen: true }),
  closeCreateWorkspaceModal: () => set({ isCreateWorkspaceModalOpen: false }),

  fetchUserWorkspaces: async () => {
    const { isAuthenticated } = get();
    if (!isAuthenticated) return;
    try {
      const list = await workspacesApi.getWorkspaces();
      if (list && list.length > 0) {
        const currentId = get().workspace?.id;
        const activeWs = list.find((w) => w.id === currentId) || list[0];
        set({
          workspaces: list,
          workspace: activeWs,
          repositories: activeWs.repositories && activeWs.repositories.length > 0 ? activeWs.repositories : get().repositories,
          currentUser: get().currentUser ? {
            ...get().currentUser!,
            role: activeWs.current_user_role || 'DEVELOPER',
          } : null,
        });
        get().fetchWorkspaceRepos();
        get().fetchLiveIssues();
      } else {
        set({ workspaces: [] });
      }
    } catch (err) {
      console.warn('Failed to fetch user workspaces:', err);
    }
  },

  switchWorkspace: async (workspaceId: number) => {
    const { workspaces, currentUser } = get();
    const target = workspaces.find((w) => w.id === workspaceId);
    if (!target) return;
    set({
      workspace: target,
      repositories: target.repositories && target.repositories.length > 0 ? target.repositories : [],
      currentUser: currentUser ? {
        ...currentUser,
        role: target.current_user_role || 'DEVELOPER',
      } : null,
    });
    await get().fetchWorkspaceRepos();
    await get().fetchLiveIssues();
  },

  createWorkspace: async (name: string, description?: string) => {
    const { isAuthenticated } = get();
    if (!isAuthenticated) return;
    const newWs = await workspacesApi.createWorkspace({ name, description });
    await get().fetchUserWorkspaces();
    if (newWs && newWs.id) {
      await get().switchWorkspace(newWs.id);
    }
    set({ isCreateWorkspaceModalOpen: false });
  },

  inviteMember: async (email: string, role: string) => {
    const { workspace, isAuthenticated } = get();
    if (!isAuthenticated) return;
    const updatedMembers = await workspacesApi.addMember(workspace.id, { email, role });
    set((state) => ({
      workspace: {
        ...state.workspace,
        members: updatedMembers,
        members_count: updatedMembers.length,
      },
    }));
  },

  // Auth State
  token: localStorage.getItem('gitpulse_token') || localStorage.getItem('gitpulse_auth_token'),
  isAuthenticated: !!(localStorage.getItem('gitpulse_token') || localStorage.getItem('gitpulse_auth_token')),
  isAuthLoading: !!(localStorage.getItem('gitpulse_token') || localStorage.getItem('gitpulse_auth_token')),
  isAuthModalOpen: false,
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),

  // Create Issue Modal State
  isCreateIssueModalOpen: false,
  openCreateIssueModal: () => set({ isCreateIssueModalOpen: true }),
  closeCreateIssueModal: () => set({ isCreateIssueModalOpen: false }),

  login: async (email, pass) => {
    set({ isAuthLoading: true });
    try {
      const data = await authApi.login(email, pass);
      localStorage.setItem('gitpulse_token', data.token);
      localStorage.setItem('gitpulse_auth_token', data.token);
      const userObj: User = {
        id: data.user.id,
        username: data.user.full_name || data.user.email.split('@')[0],
        email: data.user.email,
        avatar_url: data.user.profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        reputation_points: data.user.profile?.total_points || 0,
        title: data.user.profile?.bio || 'Core Contributor',
        role: 'OWNER',
      };
      set({
        token: data.token,
        isAuthenticated: true,
        currentUser: userObj,
        isAuthLoading: false,
        isAuthModalOpen: false,
      });
      await get().fetchUserWorkspaces();
      await get().fetchLiveIssues();
      await get().fetchWorkspaceRepos();
    } catch (err) {
      set({ isAuthLoading: false });
      throw err;
    }
  },

  register: async (email, fullName, pass) => {
    set({ isAuthLoading: true });
    try {
      const data = await authApi.register(email, pass, fullName);
      localStorage.setItem('gitpulse_token', data.token);
      localStorage.setItem('gitpulse_auth_token', data.token);
      const userObj: User = {
        id: data.user.id,
        username: data.user.full_name || data.user.email.split('@')[0],
        email: data.user.email,
        avatar_url: data.user.profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        reputation_points: 0,
        title: 'New Hunter',
        role: 'MAINTAINER',
      };
      set({
        token: data.token,
        isAuthenticated: true,
        currentUser: userObj,
        isAuthLoading: false,
        isAuthModalOpen: false,
      });
      await get().fetchUserWorkspaces();
      await get().fetchLiveIssues();
      await get().fetchWorkspaceRepos();
    } catch (err) {
      set({ isAuthLoading: false });
      throw err;
    }
  },

  registerUser: async (email, pass, name) => {
    return get().register(email, name || '', pass);
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout network error ignored:', err);
    } finally {
      localStorage.removeItem('gitpulse_token');
      localStorage.removeItem('gitpulse_auth_token');
      set({
        token: null,
        isAuthenticated: false,
        currentUser: null,
        isAuthLoading: false,
        workspaces: [],
      });
    }
  },

  hydrateAuth: async () => {
    const token = localStorage.getItem('gitpulse_token') || localStorage.getItem('gitpulse_auth_token');
    if (!token) {
      set({ isAuthLoading: false, token: null, currentUser: null, isAuthenticated: false });
      return;
    }
    set({ isAuthLoading: true });
    try {
      const user = await authApi.getMe();
      const userObj: User = {
        id: user.id,
        username: user.full_name || user.email.split('@')[0],
        email: user.email,
        avatar_url: user.profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        reputation_points: user.profile?.total_points || 0,
        title: user.profile?.bio || 'Core Contributor',
        role: 'OWNER',
      };
      set({
        token,
        isAuthenticated: true,
        currentUser: userObj,
        isAuthLoading: false,
      });
      await get().fetchUserWorkspaces();
      await get().fetchLiveIssues();
      await get().fetchWorkspaceRepos();
    } catch {
      await get().logout();
    }
  },

  checkAuthSession: async () => {
    return get().hydrateAuth();
  },

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  selectedPriority: 'ALL',
  setSelectedPriority: (selectedPriority) => set({ selectedPriority }),
  selectedTagId: 'ALL',
  setSelectedTagId: (selectedTagId) => set({ selectedTagId }),

  issues: mockIssues,
  selectedIssue: null,
  setSelectedIssue: (selectedIssue) => set({ selectedIssue }),
  isLoadingIssues: false,

  fetchLiveIssues: async () => {
    set({ isLoadingIssues: true });
    try {
      const liveIssues = await issuesApi.getIssues();
      if (liveIssues && liveIssues.length > 0) {
        set({ issues: liveIssues });
      }
    } catch (err) {
      console.warn('Backend server not connected or empty, retaining local dataset.', err);
    } finally {
      set({ isLoadingIssues: false });
    }
  },

  fetchWorkspaceRepos: async () => {
    const { workspace } = get();
    try {
      const repos = await workspacesApi.getWorkspaceRepos(workspace.id);
      if (repos && repos.length > 0) {
        set({ repositories: repos });
      }
    } catch (err) {
      console.warn('Could not fetch remote workspace repos, keeping current list.', err);
    }
  },

  createNewIssue: async ({ title, description, priority, bounty_points, repositoryId, tagIds }) => {
    const { currentUser, allTags, repositories, isAuthenticated } = get();
    const matchedRepo = repositories.find((r) => r.id === repositoryId);
    const matchedTags = allTags.filter((t) => tagIds?.includes(t.id));

    let createdIssue: Issue = {
      id: Date.now(),
      title,
      description,
      status: 'OPEN',
      priority,
      bounty_points,
      repository: repositoryId || null,
      repository_name: matchedRepo ? matchedRepo.name : null,
      repository_details: matchedRepo || null,
      assignee: null,
      creator: currentUser || mockUsers[0],
      tags: matchedTags.length > 0 ? matchedTags : [allTags[0]],
      comments_count: 0,
      comments: [],
      created_at: 'Just now',
    };

    if (isAuthenticated) {
      try {
        const apiIssue = await issuesApi.createIssue({
          title,
          description,
          bounty_points,
          repository: repositoryId || null,
        });
        createdIssue = {
          ...createdIssue,
          id: apiIssue.id,
          repository_name: apiIssue.repository_name || createdIssue.repository_name,
        };
      } catch (err) {
        console.warn('Failed to post issue to API, created locally in store:', err);
      }
    }

    set((state) => ({
      issues: [createdIssue, ...state.issues],
      isCreateIssueModalOpen: false,
    }));
  },

  updateIssueStatus: async (issueId: number, newStatus: IssueStatus) => {
    const { isAuthenticated } = get();

    if (newStatus === 'IN_REVIEW' && isAuthenticated) {
      try {
        await issuesApi.submitReview(issueId);
      } catch (e) {
        console.error(e);
      }
    } else if (newStatus === 'CLOSED' && isAuthenticated) {
      try {
        await issuesApi.closeIssue(issueId);
        set((state) => ({
          currentUser: state.currentUser ? {
            ...state.currentUser,
            reputation_points: state.currentUser.reputation_points + (state.selectedIssue?.bounty_points || 0),
          } : null,
        }));
      } catch (e) {
        console.error(e);
      }
    }

    set((state) => {
      const updatedIssues = state.issues.map((issue) => {
        if (issue.id === issueId) {
          let assignee = issue.assignee;
          if (newStatus === 'IN_PROGRESS' && !assignee) {
            assignee = state.currentUser;
          }
          return { ...issue, status: newStatus, assignee };
        }
        return issue;
      });

      const selectedIssue = state.selectedIssue?.id === issueId
        ? updatedIssues.find((i) => i.id === issueId) || null
        : state.selectedIssue;

      return { issues: updatedIssues, selectedIssue };
    });
  },

  claimIssue: async (issueId: number) => {
    const { isAuthenticated, openAuthModal, currentUser } = get();
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    try {
      await issuesApi.claimIssue(issueId);
    } catch (err) {
      console.warn('Claim API failed or running in mock mode:', err);
    }

    set((state) => {
      const updatedIssues = state.issues.map((issue) => {
        if (issue.id === issueId) {
          return {
            ...issue,
            assignee: currentUser,
            status: 'IN_PROGRESS' as IssueStatus,
          };
        }
        return issue;
      });

      const selectedIssue = state.selectedIssue?.id === issueId
        ? updatedIssues.find((i) => i.id === issueId) || null
        : state.selectedIssue;

      return { issues: updatedIssues, selectedIssue };
    });
  },

  addComment: (issueId: number, content: string) => {
    const { currentUser } = get();
    if (!content.trim()) return;

    const newComment: Comment = {
      id: Date.now(),
      author: currentUser || mockUsers[0],
      content: content.trim(),
      created_at: 'Just now',
    };

    set((state) => {
      const updatedIssues = state.issues.map((issue) => {
        if (issue.id === issueId) {
          const comments = issue.comments ? [...issue.comments, newComment] : [newComment];
          return {
            ...issue,
            comments,
            comments_count: (issue.comments_count || 0) + 1,
          };
        }
        return issue;
      });

      const selectedIssue = state.selectedIssue?.id === issueId
        ? updatedIssues.find((i) => i.id === issueId) || null
        : state.selectedIssue;

      return { issues: updatedIssues, selectedIssue };
    });
  },

  syncFromGitHub: async (repoName: string) => {
    const { workspace, fetchLiveIssues, fetchWorkspaceRepos } = get();
    const result = await workspacesApi.syncGitHub(workspace.id, repoName);
    await fetchLiveIssues();
    await fetchWorkspaceRepos();
    return result.synced_issues_count;
  },

  linkRepoToWorkspace: async (name: string, github_url?: string) => {
    const { workspace, fetchWorkspaceRepos, isAuthenticated } = get();
    if (isAuthenticated) {
      await workspacesApi.linkRepository(workspace.id, { name, github_url });
      await fetchWorkspaceRepos();
    } else {
      const newRepo: Repository = {
        id: Date.now(),
        name,
        github_url: github_url || `https://github.com/${name}`,
        stars: 120,
        language: 'TypeScript',
        is_active: true,
        issues_count: 0,
      };
      set((state) => ({ repositories: [...state.repositories, newRepo] }));
    }
  },

  unlinkRepoFromWorkspace: async (repoId: number) => {
    const { isAuthenticated, fetchWorkspaceRepos } = get();
    if (isAuthenticated) {
      try {
        await workspacesApi.unlinkRepository(repoId);
        await fetchWorkspaceRepos();
      } catch (err) {
        console.warn('API delete repo failed:', err);
      }
    }
    set((state) => ({
      repositories: state.repositories.filter((r) => r.id !== repoId),
    }));
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('gitpulse:unauthorized', () => {
    useAppStore.getState().logout();
  });
}

