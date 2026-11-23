import React, { useState } from 'react';
import { 
  FolderGit2, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Star,
  Users,
  UserPlus,
  Shield,
  AlertCircle
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { WorkspaceMember } from '../types';

export const SettingsView: React.FC = () => {
  const { 
    workspace,
    repositories, 
    syncFromGitHub, 
    linkRepoToWorkspace, 
    unlinkRepoFromWorkspace, 
    inviteMember,
    currentUser,
    isAuthenticated, 
    openAuthModal 
  } = useAppStore();

  const [newRepoInput, setNewRepoInput] = useState('');
  const [syncingRepo, setSyncingRepo] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Invite member state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'DEVELOPER' | 'MAINTAINER'>('DEVELOPER');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canManageMembers = 
    currentUser?.role === 'OWNER' || 
    currentUser?.role === 'MAINTAINER' || 
    workspace.current_user_role === 'OWNER' || 
    workspace.current_user_role === 'MAINTAINER';

  const handleSyncRepo = async (repoName: string) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setSyncingRepo(repoName);
    setStatusMsg(null);
    try {
      const count = await syncFromGitHub(repoName);
      setStatusMsg({
        type: 'success',
        text: `Successfully synced ${count} open issues from ${repoName}!`,
      });
    } catch (e: any) {
      setStatusMsg({
        type: 'error',
        text: e.response?.data?.detail || `Failed to sync ${repoName}. Ensure owner/maintainer role.`,
      });
    } finally {
      setSyncingRepo(null);
    }
  };

  const handleLinkRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoInput.trim() || isLinking) return;

    setIsLinking(true);
    setStatusMsg(null);
    try {
      await linkRepoToWorkspace(newRepoInput.trim());
      setStatusMsg({
        type: 'success',
        text: `Repository "${newRepoInput.trim()}" successfully linked to workspace!`,
      });
      setNewRepoInput('');
    } catch (e: any) {
      setStatusMsg({
        type: 'error',
        text: e.response?.data?.detail || 'Failed to link repository. Please check permissions.',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkRepo = async (repoId: number, repoName: string) => {
    if (!confirm(`Are you sure you want to unlink ${repoName}?`)) return;
    setStatusMsg(null);
    try {
      await unlinkRepoFromWorkspace(repoId);
      setStatusMsg({
        type: 'success',
        text: `Repository ${repoName} unlinked from workspace.`,
      });
    } catch (e: any) {
      setStatusMsg({
        type: 'error',
        text: 'Failed to unlink repository.',
      });
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || isInviting) return;

    setIsInviting(true);
    setInviteStatus(null);
    try {
      await inviteMember(inviteEmail.trim(), inviteRole);
      setInviteStatus({
        type: 'success',
        text: `Successfully added ${inviteEmail.trim()} as ${inviteRole}!`,
      });
      setInviteEmail('');
    } catch (err: any) {
      const msg = 
        err.response?.data?.detail || 
        err.response?.data?.email?.[0] || 
        'Failed to invite member. Please check user email.';
      setInviteStatus({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsInviting(false);
    }
  };

  const members: WorkspaceMember[] = workspace.members && workspace.members.length > 0 
    ? workspace.members 
    : [
        {
          id: 1,
          email: currentUser?.email || 'developer@gitpulse.io',
          full_name: currentUser?.username || 'Current User',
          role: (workspace.current_user_role || currentUser?.role || 'OWNER') as any,
          avatar_url: currentUser?.avatar_url,
        }
      ];

  return (
    <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8 pb-6 border-b border-zinc-800/80">
        <h1 className="text-xl font-bold text-zinc-100 mb-1.5">Workspace &amp; Sync Settings</h1>
        <p className="text-xs text-zinc-400">
          Manage linked repositories, issue synchronization intervals, and workspace team memberships.
        </p>
      </div>

      <div className="space-y-6">
        {/* Connected Repositories Section */}
        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold text-sm">
              <FolderGit2 className="w-4 h-4 text-indigo-400" />
              Connected Repositories ({repositories.length})
            </div>
          </div>

          {/* Repositories List */}
          <div className="space-y-3 mb-5">
            {repositories.length === 0 ? (
              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800/80 text-center text-xs text-zinc-400">
                No repositories linked yet. Add one below to start syncing issues.
              </div>
            ) : (
              repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                      <FolderGit2 className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-zinc-200">
                          {repo.name}
                        </span>
                        {repo.is_active && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono mt-0.5">
                        {repo.language && <span>{repo.language}</span>}
                        {repo.stars !== undefined && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400" />
                            {repo.stars.toLocaleString()}
                          </span>
                        )}
                        {repo.github_url && (
                          <a
                            href={repo.github_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-0.5 text-zinc-400 hover:text-indigo-400 transition"
                          >
                            <span>GitHub</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for repo */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleSyncRepo(repo.name)}
                      disabled={syncingRepo === repo.name}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-medium text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-indigo-400 ${
                          syncingRepo === repo.name ? 'animate-spin' : ''
                        }`}
                      />
                      <span>{syncingRepo === repo.name ? 'Syncing...' : 'Sync'}</span>
                    </button>

                    <button
                      onClick={() => handleUnlinkRepo(repo.id, repo.name)}
                      title="Unlink repository"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 border border-zinc-800 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Repository Inline Form */}
          <form onSubmit={handleLinkRepo} className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <span className="block text-[11px] font-medium text-zinc-300 mb-2">
              Link Additional GitHub Repository (owner/repo or full GitHub URL)
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. facebook/react or https://github.com/vercel/next.js"
                value={newRepoInput}
                onChange={(e) => setNewRepoInput(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={isLinking || !newRepoInput.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isLinking ? 'Linking...' : 'Link Repository'}</span>
              </button>
            </div>
          </form>

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`mt-4 p-3 rounded-lg border text-xs flex items-center gap-2 font-mono ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>

        {/* Team Members Section */}
        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold text-sm">
              <Users className="w-4 h-4 text-indigo-400" />
              Team Members ({members.length})
            </div>
            {workspace.current_user_role && (
              <span className="text-[11px] font-mono text-zinc-400">
                Your role: <span className="text-indigo-400 font-semibold">{workspace.current_user_role}</span>
              </span>
            )}
          </div>

          {/* Members List */}
          <div className="space-y-2.5 mb-5">
            {members.map((member) => (
              <div
                key={member.id}
                className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/90 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center text-xs font-semibold text-zinc-300">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.email} className="w-full h-full object-cover" />
                    ) : (
                      member.email.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-zinc-200">
                      {member.full_name || member.email}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">
                      {member.email}
                    </div>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                      member.role === 'OWNER'
                        ? 'bg-amber-950/60 border-amber-800/50 text-amber-400'
                        : member.role === 'MAINTAINER'
                        ? 'bg-indigo-950/60 border-indigo-800/50 text-indigo-400'
                        : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300'
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Invite Member Form (Owner / Maintainer Only) */}
          {canManageMembers ? (
            <form onSubmit={handleInviteMember} className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
              <span className="block text-[11px] font-medium text-zinc-300 mb-2 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                Invite Member by Email
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'DEVELOPER' | 'MAINTAINER')}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="DEVELOPER">Developer (Claim bounties)</option>
                  <option value="MAINTAINER">Maintainer (Create bounties &amp; review)</option>
                </select>
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isInviting ? 'Inviting...' : 'Add Member'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>Only workspace owners and maintainers can invite new team members.</span>
            </div>
          )}

          {/* Invite Status Feedback */}
          {inviteStatus && (
            <div
              className={`mt-4 p-3 rounded-lg border text-xs flex items-center gap-2 font-mono ${
                inviteStatus.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              {inviteStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{inviteStatus.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
