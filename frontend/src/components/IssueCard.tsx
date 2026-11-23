import React from 'react';
import { 
  AlertCircle, 
  ArrowUpCircle, 
  ArrowRightCircle, 
  ArrowDownCircle, 
  MessageSquare, 
  Sparkles,
  UserCheck,
  FolderGit2
} from 'lucide-react';
import type { Issue, IssuePriority } from '../types';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

interface IssueCardProps {
  issue: Issue;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue }) => {
  const { setSelectedIssue } = useAppStore();

  const getPriorityIcon = (priority: IssuePriority) => {
    switch (priority) {
      case 'CRITICAL':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
      case 'HIGH':
        return <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400" />;
      case 'MEDIUM':
        return <ArrowRightCircle className="w-3.5 h-3.5 text-blue-400" />;
      case 'LOW':
        return <ArrowDownCircle className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getTagColorClass = (color: string) => {
    switch (color) {
      case 'rose':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/40';
      case 'emerald':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
      case 'cyan':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40';
      case 'amber':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/40';
      default:
        return 'text-indigo-400 bg-indigo-950/40 border-indigo-800/40';
    }
  };

  return (
    <div
      onClick={() => setSelectedIssue(issue)}
      className="group relative bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-lg p-3.5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md flex flex-col gap-3 select-none"
    >
      {/* Top Meta: Issue ID & Priority & Bounty XP */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span title={`Priority: ${issue.priority}`}>
            {getPriorityIcon(issue.priority)}
          </span>
          {issue.github_issue_number && (
            <span className="font-mono text-[11px] text-zinc-400 group-hover:text-zinc-300">
              #{issue.github_issue_number}
            </span>
          )}
          {issue.repository_name && (
            <span 
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-zinc-800/80 border border-zinc-700/60"
              title={`Repository: ${issue.repository_name}`}
            >
              <FolderGit2 className="w-3 h-3 text-zinc-400 shrink-0" />
              <span className="truncate max-w-[110px]">{issue.repository_name}</span>
            </span>
          )}
        </div>

        {/* Bounty Badge */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 font-mono text-[11px] font-semibold tracking-tight shadow-sm shrink-0">
          <Sparkles className="w-3 h-3" />
          +{issue.bounty_points} XP
        </div>
      </div>

      {/* Title */}
      <h4 className="text-xs font-medium text-zinc-100 group-hover:text-indigo-300 leading-snug line-clamp-2 transition-colors">
        {issue.title}
      </h4>

      {/* Tags */}
      {issue.tags && issue.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {issue.tags.map((tag) => (
            <span
              key={tag.id}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium border font-mono tracking-tight",
                getTagColorClass(tag.color)
              )}
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Bottom Footer: Assignee & Comments */}
      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-zinc-400 text-[11px]">
        {/* Assignee Avatar / Placeholder */}
        <div className="flex items-center gap-1.5">
          {issue.assignee ? (
            <div className="flex items-center gap-1.5" title={`Assigned to ${issue.assignee.username}`}>
              <img
                src={issue.assignee.avatar_url}
                alt={issue.assignee.username}
                className="w-4 h-4 rounded-full object-cover ring-1 ring-zinc-700"
              />
              <span className="text-zinc-300 text-[11px] truncate max-w-[100px]">
                {issue.assignee.username}
              </span>
            </div>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
              <UserCheck className="w-3 h-3 text-zinc-400" />
              Unclaimed
            </span>
          )}
        </div>

        {/* Comment count */}
        {issue.comments_count > 0 && (
          <div className="flex items-center gap-1 text-zinc-400">
            <MessageSquare className="w-3 h-3" />
            <span className="font-mono text-[10px]">{issue.comments_count}</span>
          </div>
        )}
      </div>
    </div>
  );
};

