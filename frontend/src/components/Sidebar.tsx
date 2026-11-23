import React, { useState, useRef, useEffect } from 'react';
import { 
  FolderGit2, 
  Home, 
  Kanban, 
  Trophy, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Star, 
  ExternalLink,
  Zap,
  CheckCircle2,
  GitBranch,
  Plus,
  Check,
  Building2
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { ActiveView } from '../store/useAppStore';
import { cn } from '../lib/utils';

export const Sidebar: React.FC = () => {
  const { 
    activeView, 
    setActiveView, 
    workspace, 
    workspaces,
    switchWorkspace,
    openCreateWorkspaceModal,
    repositories,
    sidebarCollapsed, 
    toggleSidebar,
    issues 
  } = useAppStore();

  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWorkspaceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openBountiesCount = issues.filter(i => i.status === 'OPEN').length;
  const primaryRepo = repositories.length > 0 ? repositories[0] : null;

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: 'landing', label: 'Overview', icon: <Home className="w-4 h-4" /> },
    { 
      id: 'board', 
      label: 'Bounties Board', 
      icon: <Kanban className="w-4 h-4" />, 
      badge: openBountiesCount > 0 ? `${openBountiesCount}` : undefined 
    },
    { 
      id: 'leaderboard', 
      label: 'Leaderboard', 
      icon: <Trophy className="w-4 h-4" /> 
    },
    { 
      id: 'settings', 
      label: 'Repo & Settings', 
      icon: <Settings className="w-4 h-4" /> 
    },
  ];

  return (
    <aside 
      className={cn(
        "h-screen bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between transition-all duration-300 z-30 select-none relative",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Top Workspace Selector with Switcher Dropdown */}
      <div className="p-3 border-b border-zinc-800/70 relative" ref={dropdownRef}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => !sidebarCollapsed && setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="flex items-center gap-2.5 overflow-hidden text-left hover:opacity-90 transition group flex-1 mr-1"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col truncate flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Workspace</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:text-zinc-300 transition" />
                </div>
                <span className="text-xs font-semibold text-zinc-100 truncate">{workspace?.name || 'My Workspace'}</span>
              </div>
            )}
          </button>

          <button 
            onClick={toggleSidebar}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition shrink-0"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Dropdown Menu */}
        {isWorkspaceDropdownOpen && !sidebarCollapsed && (
          <div className="absolute top-full left-2 right-2 mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Switch Workspace
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5 py-1">
              {workspaces.map((ws) => {
                const isActive = ws.id === workspace?.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      switchWorkspace(ws.id);
                      setIsWorkspaceDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition text-left",
                      isActive
                        ? "bg-zinc-800/90 text-zinc-100 font-semibold"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{ws.name}</span>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-1.5 border-t border-zinc-800 mt-1">
              <button
                onClick={() => {
                  setIsWorkspaceDropdownOpen(false);
                  openCreateWorkspaceModal();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 transition font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <div className={cn("px-2 mb-2 text-[10px] font-semibold tracking-wider uppercase text-zinc-400", sidebarCollapsed && "sr-only")}>
          Workspace Menu
        </div>
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-xs font-medium transition-all group relative",
                isActive 
                  ? "bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-sm" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent"
              )}
            >
              <span className={cn(isActive ? "text-indigo-400" : "text-zinc-400 group-hover:text-zinc-300")}>
                {item.icon}
              </span>
              {!sidebarCollapsed && (
                <>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Dynamic GitHub Sync Status Card */}
      <div className="p-3 border-t border-zinc-800/70">
        {!sidebarCollapsed ? (
          primaryRepo ? (
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-zinc-300 font-medium truncate">
                  <FolderGit2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{primaryRepo.name}</span>
                </span>
                {primaryRepo.github_url && (
                  <a 
                    href={primaryRepo.github_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-zinc-400 hover:text-zinc-200"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                {primaryRepo.stars !== undefined ? (
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    {primaryRepo.stars.toLocaleString()}
                  </span>
                ) : (
                  <span>{primaryRepo.language || 'Codebase'}</span>
                )}
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  Synced
                </span>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono pt-1 border-t border-zinc-800/60">
                <GitBranch className="w-3 h-3 text-zinc-400" />
                <span>branch: main</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 flex flex-col items-center justify-center text-center py-3">
              <FolderGit2 className="w-4 h-4 text-zinc-400 mb-1" />
              <span className="text-[11px] text-zinc-400 font-medium">No repository linked</span>
              <button
                onClick={() => setActiveView('settings')}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono mt-1"
              >
                Connect in Settings →
              </button>
            </div>
          )
        ) : (
          <div className="flex justify-center" title={primaryRepo ? `${primaryRepo.name} (Synced)` : 'No repository linked'}>
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
              <FolderGit2 className="w-4 h-4 text-zinc-400" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
