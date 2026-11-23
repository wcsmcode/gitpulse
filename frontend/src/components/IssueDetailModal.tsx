import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UserPlus, 
  GitPullRequest
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { IssueStatus } from '../types';

export const IssueDetailModal: React.FC = () => {
  const { 
    selectedIssue, 
    setSelectedIssue, 
    updateIssueStatus, 
    claimIssue, 
    addComment,
  } = useAppStore();

  const [commentText, setCommentText] = useState('');

  if (!selectedIssue) return null;

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(selectedIssue.id, commentText);
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      {/* Backdrop click dismiss */}
      <div 
        className="absolute inset-0" 
        onClick={() => setSelectedIssue(null)} 
      />

      {/* Slide-over Drawer (Linear / Vercel style) */}
      <div className="relative w-full max-w-2xl h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs text-zinc-400 font-medium">
              #{selectedIssue.github_issue_number || selectedIssue.id}
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              +{selectedIssue.bounty_points} XP
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIssue(null)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body - 2 Columns (Content & Meta) */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
          
          {/* Main Info & Discussion */}
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-100 tracking-tight leading-snug mb-3">
                {selectedIssue.title}
              </h2>
              
              {/* Tags */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                {selectedIssue.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-zinc-900 text-zinc-300 border border-zinc-800"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>

              {/* Description Body */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap">
                {selectedIssue.description || 'No description provided.'}
              </div>
            </div>

            {/* Comments / Discussion Stream */}
            <div className="pt-4 border-t border-zinc-800/70 flex flex-col gap-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Discussion ({selectedIssue.comments?.length || 0})
              </h3>

              <div className="space-y-3">
                {selectedIssue.comments && selectedIssue.comments.length > 0 ? (
                  selectedIssue.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <img
                            src={comment.author.avatar_url}
                            alt={comment.author.username}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span className="font-semibold text-zinc-200">
                            {comment.author.username}
                          </span>
                        </div>
                        <span className="text-zinc-400 font-mono text-[10px]">
                          {comment.created_at}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 pl-6 leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-400 italic">No comments yet. Start the conversation!</p>
                )}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleSendComment} className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Leave a comment or share PR link..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-3 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold disabled:opacity-40 transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Right Meta Sidebar */}
          <div className="w-full lg:w-56 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-zinc-800/80 pt-4 lg:pt-0 lg:pl-6 text-xs">
            {/* Status Selector */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Status
              </span>
              <select
                value={selectedIssue.status}
                onChange={(e) => updateIssueStatus(selectedIssue.id, e.target.value as IssueStatus)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600 cursor-pointer"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="CLOSED">Closed (Paid)</option>
              </select>
            </div>

            {/* Assignee Card */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Assignee
              </span>
              {selectedIssue.assignee ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                  <img
                    src={selectedIssue.assignee.avatar_url}
                    alt={selectedIssue.assignee.username}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <div className="flex flex-col truncate">
                    <span className="font-medium text-zinc-200 text-xs truncate">
                      {selectedIssue.assignee.username}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {selectedIssue.assignee.reputation_points} XP
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => claimIssue(selectedIssue.id)}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-medium text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Claim Issue
                </button>
              )}
            </div>

            {/* Priority */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Priority
              </span>
              <div className="px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-300 font-mono text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                {selectedIssue.priority}
              </div>
            </div>

            {/* Quick Actions (Linear style) */}
            <div className="pt-2 border-t border-zinc-800/60 flex flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Workflow Actions
              </span>

              {selectedIssue.status === 'OPEN' && (
                <button
                  onClick={() => claimIssue(selectedIssue.id)}
                  className="w-full py-2 px-3 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Claim Bounty
                </button>
              )}

              {selectedIssue.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => updateIssueStatus(selectedIssue.id, 'IN_REVIEW')}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition flex items-center justify-center gap-1.5"
                >
                  <GitPullRequest className="w-3.5 h-3.5" />
                  Submit for Review
                </button>
              )}

              {selectedIssue.status === 'IN_REVIEW' && (
                <button
                  onClick={() => updateIssueStatus(selectedIssue.id, 'CLOSED')}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve &amp; Pay XP
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

