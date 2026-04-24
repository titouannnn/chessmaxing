"use client";

import { useChessStore } from "@/lib/store";
import { StatsChart } from "@/components/stats-chart";
import { StatsOverview } from "@/components/stats/stats-overview";
import { ResultsPieChart } from "@/components/stats/results-pie-chart";
import { TerminationChart } from "@/components/stats/termination-chart";
import { RatingChart } from "@/components/stats/rating-chart";
import { TimeStatsChart } from "@/components/stats/time-stats-chart";

export default function StatsPage() {
  const { games, username, isLoading } = useChessStore();

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8 min-h-screen bg-[#0a0a0a] text-white animate-fade-in pb-20">
      <div className="space-y-2">
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Statistiques {username && <span className="text-chess-light">pour {username}</span>}
        </h1>
        <p className="text-sm text-stone-500 font-manrope">
          Analyse des performances sur les parties chargées.
        </p>
      </div>

      {games.length > 0 ? (
        <div className="space-y-8">
          <StatsOverview games={games} username={username} />
          
          <StatsChart games={games} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResultsPieChart games={games} username={username} />
            <TerminationChart games={games} username={username} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RatingChart games={games} username={username} />
            <TimeStatsChart games={games} username={username} />
          </div>
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-700">
            {isLoading ? "Chargement..." : "Aucune donnée disponible. Recherchez un joueur dans l'explorer."}
          </p>
        </div>
      )}
    </main>
  );
}
