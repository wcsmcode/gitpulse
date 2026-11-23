import React, { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { LeaderboardView } from './components/LeaderboardView';
import { SettingsView } from './components/SettingsView';
import { IssueDetailModal } from './components/IssueDetailModal';
import { CreateIssueModal } from './components/CreateIssueModal';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal';
import { AuthView } from './components/auth/AuthView';
import { useAppStore } from './store/useAppStore';
import { Building2, Plus, Zap, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const { 
    token,
    currentUser,
    isAuthLoading,
    activeView, 
    workspaces,
    openCreateWorkspaceModal,
    hydrateAuth,
  } = useAppStore();

  useEffect(() => {
    // Validate session on app boot
    hydrateAuth();
  }, [hydrateAuth]);

  // Loading Splash Screen while checking stored token
  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 font-sans select-none">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-xl shadow-indigo-500/25 mb-4 animate-pulse border border-white/10">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2.5 text-xs font-mono text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Hydrating GitPulse workspace...</span>
        </div>
      </div>
    );
  }

  // Auth Guard: Unauthenticated visitors see the Vercel-style AuthView
  if (!token || !currentUser) {
    return <AuthView />;
  }

  const hasNoWorkspaces = workspaces.length === 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Collapsible Linear/Vercel Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Header />

        {/* Dynamic View Router */}
        {hasNoWorkspaces ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-400 mb-4 shadow-xl shadow-indigo-950/40">
              <Building2 className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-zinc-100 mb-2">No Workspaces Found</h2>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Your account currently does not belong to any workspace. Create your first workspace to start connecting repositories and managing bounties.
            </p>
            <button
              onClick={openCreateWorkspaceModal}
              className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Workspace</span>
            </button>
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto flex flex-col">
            {(activeView === 'board' || activeView === 'landing') && <KanbanBoard />}
            {activeView === 'leaderboard' && <LeaderboardView />}
            {activeView === 'settings' && <SettingsView />}
          </main>
        )}
      </div>

      {/* Slide-over Drawer / Detail Modal */}
      <IssueDetailModal />

      {/* Create Issue Modal */}
      <CreateIssueModal />

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal />
    </div>
  );
};

export default App;
