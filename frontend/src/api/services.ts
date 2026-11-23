import { apiClient } from './client';
import type { Issue, Workspace, Repository, WorkspaceMember } from '../types';

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    full_name: string;
    profile: {
      github_username: string;
      avatar_url: string;
      bio: string;
      total_points: number;
    };
  };
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login/', { email, password });
    return res.data;
  },

  register: async (email: string, password: string, fullName?: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register/', {
      email,
      password,
      full_name: fullName || '',
    });
    return res.data;
  },

  getMe: async (): Promise<AuthResponse['user']> => {
    const res = await apiClient.get<AuthResponse['user']>('/auth/me/');
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout/');
    } catch {
      // ignore network errors on logout as specified
    } finally {
      localStorage.removeItem('gitpulse_token');
      localStorage.removeItem('gitpulse_auth_token');
    }
  },
};

export const issuesApi = {
  getIssues: async (params?: { status?: string; workspace?: number; repository?: number }): Promise<Issue[]> => {
    const res = await apiClient.get('/issues/', { params });
    const raw = res.data;
    const items = raw.results ? raw.results : raw;
    return items.map((item: any) => ({
      ...item,
      priority: item.priority || (item.bounty_points >= 500 ? 'CRITICAL' : item.bounty_points >= 250 ? 'HIGH' : 'MEDIUM'),
      tags: item.tags || [{ id: 1, name: 'core', color: 'indigo' }],
      comments_count: item.comments_count || 0,
    }));
  },

  createIssue: async (data: {
    title: string;
    description: string;
    bounty_points: number;
    repository?: number | null;
  }): Promise<Issue> => {
    const res = await apiClient.post('/issues/', data);
    return res.data;
  },

  claimIssue: async (issueId: number): Promise<Issue> => {
    const res = await apiClient.post(`/issues/${issueId}/claim/`);
    return res.data;
  },

  submitReview: async (issueId: number): Promise<Issue> => {
    const res = await apiClient.post(`/issues/${issueId}/submit_review/`);
    return res.data;
  },

  closeIssue: async (issueId: number): Promise<{ detail: string; issue: Issue }> => {
    const res = await apiClient.post(`/issues/${issueId}/close_issue/`);
    return res.data;
  },
};

export const workspacesApi = {
  getWorkspaces: async (): Promise<Workspace[]> => {
    const res = await apiClient.get('/workspaces/');
    const raw = res.data;
    const items = raw.results ? raw.results : raw;
    return items.map((w: any) => ({
      ...w,
      github_repo: w.github_org ? `${w.github_org}/${w.name}` : (w.repositories?.[0]?.name || w.name),
      stars: w.repositories?.[0]?.stars || 120,
      language: w.repositories?.[0]?.language || 'Python / TypeScript',
      open_bounties_count: w.open_bounties_count || 0,
      current_user_role: w.current_user_role || 'DEVELOPER',
    }));
  },

  createWorkspace: async (data: { name: string; description?: string }): Promise<Workspace> => {
    const res = await apiClient.post('/workspaces/', data);
    return res.data;
  },

  getWorkspaceMembers: async (workspaceId: number): Promise<WorkspaceMember[]> => {
    const res = await apiClient.get(`/workspaces/${workspaceId}/members/`);
    return res.data;
  },

  addMember: async (workspaceId: number, data: { email: string; role: string }): Promise<WorkspaceMember[]> => {
    const res = await apiClient.post(`/workspaces/${workspaceId}/members/`, data);
    return res.data;
  },

  getWorkspaceRepos: async (workspaceId: number): Promise<Repository[]> => {
    const res = await apiClient.get(`/workspaces/${workspaceId}/repos/`);
    return res.data;
  },

  linkRepository: async (workspaceId: number, data: { name: string; github_url?: string }): Promise<Repository> => {
    const res = await apiClient.post(`/workspaces/${workspaceId}/repos/`, data);
    return res.data;
  },

  unlinkRepository: async (repositoryId: number): Promise<void> => {
    await apiClient.delete(`/repositories/${repositoryId}/`);
  },

  syncGitHub: async (workspaceId: number, repo: string, token?: string): Promise<{ detail: string; synced_issues_count: number }> => {
    const res = await apiClient.post(`/workspaces/${workspaceId}/sync_github/`, { repo, token });
    return res.data;
  },
};
