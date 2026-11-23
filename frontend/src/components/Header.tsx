import React from 'react';
import { Search, SlidersHorizontal, Sparkles, X, LogIn, LogOut, RefreshCw, Plus } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { IssuePriority } from '../types';

export const Header: React.FC = () => {
  const { 
    searchQuery, 
    setSearchQuery, 
    selectedPriority, 
    setSelectedPriority, 
    selectedTagId, 
    setSelectedTagId, 
    allTags,
    currentUser,
    isAuthenticated,
    openAuthModal,
    logout,
    fetchLiveIssues,
    isLoadingIssues,
    activeView,
    openCreateIssueModal
  } = useAppStore();

  const priorities: (IssuePriority | 'ALL')[] = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input & Global Command Palette feel */}
      <div className="flex items-center gap-4 flex-1 max-w-lg">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search issues, titles, tags... (Cmd + K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-9 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Center Filter controls (Only for Board view) */}
      {activeView === 'board' && (
        <div className="hidden md:flex items-center gap-2.5">
          {/* Priority filter */}
          <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 px-2 py-1 rounded-lg">
            <SlidersHorizontal className="w-3 h-3 text-zinc-400" />
            <span className="text-[11px] text-zinc-400 font-medium">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as IssuePriority | 'ALL')}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              {priorities.map((p) => (
                <option key={p} value={p} className="bg-zinc-900 text-zinc-200">
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Tag filter */}
          <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 px-2 py-1 rounded-lg">
            <span className="text-[11px] text-zinc-400 font-medium">Tag:</span>
            <select
              value={selectedTagId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTagId(val === 'ALL' ? 'ALL' : Number(val));
              }}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-zinc-900 text-zinc-200">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag.id} value={tag.id} className="bg-zinc-900 text-zinc-200">
                  #{tag.name}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchLiveIssues()}
            disabled={isLoadingIssues}
            title="Refresh issues from API"
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingIssues ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      )}

      {/* Right User XP Badge & Auth Controls */}
      <div className="flex items-center gap-3">
        {/* Create Issue Action (Owner / Maintainer) */}
        {(currentUser?.role === 'OWNER' || currentUser?.role === 'MAINTAINER') && (
          <button
            onClick={openCreateIssueModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs shadow-sm hover:shadow transition"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-950" />
            <span>New Issue</span>
          </button>
        )}

        {/* Swagger Docs Link */}
        <a
          href="http://127.0.0.1:8000/api/docs/"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex text-[11px] text-zinc-400 hover:text-indigo-300 font-mono transition"
        >
          API Docs ↗
        </a>

        {/* Bounty XP Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-800/60 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-semibold text-emerald-400">
            {(currentUser?.reputation_points ?? 0).toLocaleString()} XP
          </span>
        </div>

        {/* User Avatar & Login/Logout Action */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-zinc-800">
          <img
            src={currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
            alt={currentUser?.username || 'User'}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-700"
          />
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-medium text-zinc-200 leading-tight">
              {currentUser?.username || 'Guest'}
            </span>
            <span className="text-[10px] text-zinc-400 leading-tight">
              {isAuthenticated ? 'Authenticated' : 'Guest'}
            </span>
          </div>

          {isAuthenticated ? (
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={openAuthModal}
              className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
