import React from 'react';
import { Trophy, Medal, Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const LeaderboardView: React.FC = () => {
  const { users, issues } = useAppStore();

  // Sort users by XP descending
  const sortedUsers = [...users].sort((a, b) => b.reputation_points - a.reputation_points);

  const getSolvedCount = (userId: number) => {
    return issues.filter((i) => i.status === 'CLOSED' && i.assignee?.id === userId).length;
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs">
            1
          </div>
        );
      case 2:
        return (
          <div className="w-6 h-6 rounded-full bg-zinc-400/20 border border-zinc-400/40 text-zinc-300 flex items-center justify-center font-bold text-xs">
            2
          </div>
        );
      case 3:
        return (
          <div className="w-6 h-6 rounded-full bg-amber-700/20 border border-amber-700/40 text-amber-600 flex items-center justify-center font-bold text-xs">
            3
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center font-mono text-xs">
            {rank}
          </div>
        );
    }
  };

  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-zinc-100">Bounty Hunters Leaderboard</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Engineers ranked by verified bounty XP earned across all merged PRs.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 px-4 py-2 rounded-xl text-xs font-mono">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-zinc-400">Total Bounties Distributed:</span>
          <span className="text-emerald-400 font-bold">12,450 XP</span>
        </div>
      </div>

      {/* Leaderboard Table (Linear style) */}
      <div className="bg-zinc-900/40 border border-zinc-800/90 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 uppercase font-mono text-[10px] tracking-wider select-none">
              <th className="py-3.5 px-4 w-16 text-center">Rank</th>
              <th className="py-3.5 px-4">Engineer</th>
              <th className="py-3.5 px-4 text-center">Issues Solved</th>
              <th className="py-3.5 px-4 text-right">Reputation XP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {sortedUsers.map((user, idx) => {
              const rank = idx + 1;
              const solvedCount = getSolvedCount(user.id);

              return (
                <tr 
                  key={user.id} 
                  className="hover:bg-zinc-900/60 transition-colors group"
                >
                  {/* Rank */}
                  <td className="py-4 px-4 text-center">
                    <div className="flex justify-center">
                      {getRankBadge(rank)}
                    </div>
                  </td>

                  {/* Engineer Info */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-700"
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-medium text-zinc-200 group-hover:text-indigo-300 transition-colors">
                          <span>{user.username}</span>
                          {rank === 1 && (
                            <Medal className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400">
                          {user.title || user.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Solved Issues */}
                  <td className="py-4 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[11px]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {solvedCount} solved
                    </div>
                  </td>

                  {/* XP */}
                  <td className="py-4 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 font-mono font-semibold text-xs shadow-inner">
                      <Sparkles className="w-3.5 h-3.5" />
                      {user.reputation_points.toLocaleString()} XP
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

