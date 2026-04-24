"use client";

import { useGameStats } from "@/lib/use-game-stats";
import { ChessGame } from "@/types/chess";

interface StatsOverviewProps {
  games: ChessGame[];
  username: string;
}

export function StatsOverview({ games, username }: StatsOverviewProps) {
  const stats = useGameStats(games, username);

  if (games.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in mt-4">
      {/* Parties Jouées Card */}
      <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col gap-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Parties jouées</h2>
        <div className="text-4xl font-display font-bold text-white">
          {stats.total.toLocaleString()}
        </div>
        
        <div className="flex flex-col gap-2 mt-2">
          {/* Win */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-stone-300">Victoires</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white">{stats.wins.toLocaleString()}</span>
              <span className="text-xs text-stone-500 font-bold w-10 text-right">{stats.winRate.toFixed(1)}%</span>
            </div>
          </div>
          
          {/* Draw */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-stone-500" />
              <span className="text-sm font-medium text-stone-300">Nulles</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white">{stats.draws.toLocaleString()}</span>
              <span className="text-xs text-stone-500 font-bold w-10 text-right">{stats.drawRate.toFixed(1)}%</span>
            </div>
          </div>

          {/* Loss */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm font-medium text-stone-300">Défaites</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white">{stats.losses.toLocaleString()}</span>
              <span className="text-xs text-stone-500 font-bold w-10 text-right">{stats.lossRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
        
        {/* Progress Bar for visual ratio */}
        <div className="h-1.5 w-full bg-white/5 rounded-full flex overflow-hidden mt-1">
          <div className="bg-green-500 h-full" style={{ width: `${stats.winRate}%` }} />
          <div className="bg-stone-500 h-full" style={{ width: `${stats.drawRate}%` }} />
          <div className="bg-red-500 h-full" style={{ width: `${stats.lossRate}%` }} />
        </div>
      </div>

      {/* Précision Moyenne Card */}
      {stats.avgAccuracy !== null && (
        <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Précision moyenne</h2>
          <div className="text-4xl font-display font-bold text-white">
            {stats.avgAccuracy.toFixed(1)}
          </div>
          
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-300">Quand vous gagnez</span>
              <span className="text-sm font-bold text-green-500">{stats.avgAccuracyWin ? stats.avgAccuracyWin.toFixed(1) : '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-300">Quand vous faites nulle</span>
              <span className="text-sm font-bold text-stone-400">{stats.avgAccuracyDraw ? stats.avgAccuracyDraw.toFixed(1) : '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-300">Quand vous perdez</span>
              <span className="text-sm font-bold text-red-500">{stats.avgAccuracyLoss ? stats.avgAccuracyLoss.toFixed(1) : '-'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
