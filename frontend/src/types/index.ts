export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'IN_REVIEW' | 'CLOSED';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: number;
  username: string;
  email: string;
  avatar_url: string;
  reputation_points: number;
  title?: string;
  role?: 'OWNER' | 'MAINTAINER' | 'DEVELOPER';
}

export interface Repository {
  id: number;
  workspace?: number;
  workspace_name?: string;
  name: string;
  github_repo_id?: number | null;
  github_url?: string;
  is_active?: boolean;
  issues_count?: number;
  stars?: number;
  language?: string;
  created_at?: string;
}

export interface WorkspaceMember {
  id: number;
  workspace?: number;
  user?: User;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'OWNER' | 'MAINTAINER' | 'DEVELOPER';
  joined_at?: string;
}

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  description?: string;
  github_repo?: string;
  github_org?: string;
  stars?: number;
  language?: string;
  open_bounties_count?: number;
  current_user_role?: 'OWNER' | 'MAINTAINER' | 'DEVELOPER' | null;
  members_count?: number;
  repositories_count?: number;
  repositories?: Repository[];
  members?: WorkspaceMember[];
  owner?: User;
}

export interface Tag {
  id: number;
  name: string;
  color: string; // e.g. 'indigo', 'emerald', 'amber', 'rose', 'cyan'
}

export interface Comment {
  id: number;
  author: User;
  content: string;
  created_at: string;
}

export interface Issue {
  id: number;
  repository?: number | null;
  repository_name?: string | null;
  repository_details?: Repository | null;
  workspace_id?: number | null;
  workspace_name?: string | null;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  bounty_points: number;
  github_issue_number?: number;
  assignee: User | null;
  creator: User;
  tags: Tag[];
  comments_count: number;
  comments?: Comment[];
  created_at: string;
}
