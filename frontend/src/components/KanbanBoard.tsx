import React from 'react';
import { CircleDot, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { IssueCard } from './IssueCard';
import type { IssueStatus } from '../types';

export const KanbanBoard: React.FC = () => {
  const { 
    issues, 
    searchQuery, 
    selectedPriority, 
    selectedTagId,
    updateIssueStatus 
  } = useAppStore();

  const columns: {
    status: IssueStatus;
    title: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      status: 'OPEN',
      title: 'Open Bounties',
      icon: <CircleDot className="w-3.5 h-3.5 text-zinc-400" />,
      color: 'border-zinc-800',
    },
    {
      status: 'IN_PROGRESS',
      title: 'In Progress',
      icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
      color: 'border-amber-900/50',
    },
    {
      status: 'IN_REVIEW',
      title: 'In Review',
      icon: <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />,
      color: 'border-indigo-900/50',
    },
    {
      status: 'CLOSED',
      title: 'Closed / Paid',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      color: 'border-emerald-900/50',
    },
  ];

  // Filtering issues
  const filteredIssues = issues.filter((issue) => {
    // Search query filter (title, description, tag)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = issue.title.toLowerCase().includes(q);
      const matchesDesc = issue.description.toLowerCase().includes(q);
      const matchesTags = issue.tags.some(t => t.name.toLowerCase().includes(q));
      if (!matchesTitle && !matchesDesc && !matchesTags) return false;
    }

    // Priority filter
    if (selectedPriority !== 'ALL' && issue.priority !== selectedPriority) {
      return false;
    }

    // Tag filter
    if (selectedTagId !== 'ALL' && !issue.tags.some(t => t.id === selectedTagId)) {
      return false;
    }

    return true;
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: IssueStatus) => {
    e.preventDefault();
    const issueId = Number(e.dataTransfer.getData('text/plain'));
    if (issueId) {
      updateIssueStatus(issueId, status);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-x-auto min-h-[calc(100vh-4rem)] bg-zinc-950">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-w-[900px] h-full items-start">
        {columns.map((col) => {
          const colIssues = filteredIssues.filter((i) => i.status === col.status);
          const totalPointsInCol = colIssues.reduce((sum, i) => sum + i.bounty_points, 0);

          return (
            <div
              key={col.status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.status)}
              className="flex flex-col bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 h-full max-h-[calc(100vh-6rem)] overflow-hidden"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-800/70 select-none">
                <div className="flex items-center gap-2">
                  {col.icon}
                  <span className="text-xs font-semibold text-zinc-200">{col.title}</span>
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400">
                    {colIssues.length}
                  </span>
                </div>

                {totalPointsInCol > 0 && (
                  <span className="text-[10px] font-mono text-emerald-400 font-medium">
                    +{totalPointsInCol} XP
                  </span>
                )}
              </div>

              {/* Issues Scroll Area */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1">
                {colIssues.map((issue) => (
                  <div
                    key={issue.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', issue.id.toString());
                    }}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <IssueCard issue={issue} />
                  </div>
                ))}

                {colIssues.length === 0 && (
                  <div className="h-32 border border-dashed border-zinc-800/60 rounded-lg flex flex-col items-center justify-center text-zinc-400 text-xs text-center p-4">
                    <span>No issues here</span>
                    <span className="text-[10px] text-zinc-400 mt-1">Drag an issue or change filters</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

