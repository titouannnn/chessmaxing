"use client";

import { useState, useEffect, useMemo } from "react";
import { useChessStore } from "@/lib/store";
import { StatsChart } from "@/components/stats-chart";
import { StatsOverview } from "@/components/stats/stats-overview";
import { GameResultsPies } from "@/components/stats/game-results-pies";
import { TerminationChart } from "@/components/stats/termination-chart";
import { RatingChart } from "@/components/stats/rating-chart";
import { TimeStatsChart } from "@/components/stats/time-stats-chart";
import { EloProgressionChart } from "@/components/stats/elo-progression-chart";
import { OpeningsChart } from "@/components/stats/openings-chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Calendar, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

import localGamesAll from "@/data/titouannnnnn_all.json";
import { ChessGame } from "@/types/chess";

export default function StatsPage() {
  const { games, username, setGames, isLoading, setLoading } = useChessStore();
  const [side, setSide] = useState<"all" | "white" | "black">("all");
  const [period, setPeriod] = useState<string>("total");
  const [timeClass, setTimeClass] = useState<string>("all");

  const isDev = process.env.NEXT_PUBLIC_DEV === "1";

  // Fetch more data if period changes and we don't have enough
  useEffect(() => {
    if (!username || isLoading) return;

    const checkAndFetch = async () => {
      // Check oldest game in store
      const oldestTime = games.length > 0 
        ? Math.min(...games.map(g => g.end_time))
        : Date.now() / 1000;
      
      const now = Date.now() / 1000;
      const daysLoaded = (now - oldestTime) / (24 * 60 * 60);
      
      const requestedDays = period === "total" ? 365 * 10 : parseInt(period);

      if (daysLoaded < requestedDays * 0.9 && period !== "7" && period !== "30") {
        if (isDev && username === "titouannnnnn") {
          // In DEV mode for the test user, load the 'all' local file instead of fetching
          setLoading(true);
          setTimeout(() => {
            setGames(localGamesAll as ChessGame[]);
            setLoading(false);
          }, 500);
          return;
        }

        setLoading(true);
        try {
          const res = await fetch(`/api/chess?username=${encodeURIComponent(username)}&days=${period}`);
          const data = await res.json();
          if (res.ok) {
            setGames(data.games || []);
          }
        } catch (err) {
          console.error("Failed to fetch more games:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    checkAndFetch();
  }, [period, username, isDev]);

  const filteredGames = useMemo(() => {
    let result = [...games];

    // Filter by side
    if (side !== "all") {
      result = result.filter(g => {
        const isWhite = g.white.username.toLowerCase() === username.toLowerCase();
        return side === "white" ? isWhite : !isWhite;
      });
    }

    // Filter by time class
    if (timeClass !== "all") {
      result = result.filter(g => g.time_class === timeClass);
    }

    // Filter by period locally (in case we have more data than requested)
    if (period !== "total") {
      const limit = (Date.now() / 1000) - (parseInt(period) * 24 * 60 * 60);
      result = result.filter(g => g.end_time >= limit);
    }

    return result;
  }, [games, side, period, username, timeClass]);

  const periods = [
    { label: "1S", value: "7" },
    { label: "30J", value: "30" },
    { label: "3M", value: "90" },
    { label: "1A", value: "365" },
    { label: "ALL", value: "total" },
  ];

  if (!username && !isLoading) {
    return (
      <main className="max-w-4xl mx-auto p-6 text-center py-20">
        <p className="text-stone-500 uppercase tracking-widest font-bold text-xs">
          Recherchez un joueur pour voir les statistiques.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8 min-h-screen bg-[#0a0a0a] text-white animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Statistiques <span className="text-chess-light">pour {username}</span>
          </h1>
          <p className="text-sm text-stone-500 font-manrope">
            Analyse détaillée des performances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Game Type Selector */}
          <Select value={timeClass} onValueChange={setTimeClass}>
            <SelectTrigger className="w-[110px] bg-white/[0.03] border-white/5 text-[10px] font-bold uppercase tracking-widest rounded-xl h-10 focus:ring-0 px-3">
              <Zap className="size-3 mr-2 text-stone-500 shrink-0" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              <SelectItem value="all" className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white">Tout</SelectItem>
              <SelectItem value="rapid" className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white">Rapide</SelectItem>
              <SelectItem value="blitz" className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white">Blitz</SelectItem>
              <SelectItem value="bullet" className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white">Bullet</SelectItem>
            </SelectContent>
          </Select>

          {/* Side Selector */}
          <Select value={side} onValueChange={(v: any) => setSide(v)}>
            <SelectTrigger className="w-[110px] bg-white/[0.03] border-white/5 text-[10px] font-bold uppercase tracking-widest rounded-xl h-10 focus:ring-0 px-3">
              <Users className="size-3 mr-2 text-stone-500 shrink-0" />
              <SelectValue placeholder="Les 2" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              <SelectItem value="all" className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white">Les 2</SelectItem>
              <SelectItem value="white" className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white">Blancs</SelectItem>
              <SelectItem value="black" className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white">Noirs</SelectItem>
            </SelectContent>
          </Select>

          {/* Period Selector */}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[110px] bg-white/[0.03] border-white/5 text-[10px] font-bold uppercase tracking-widest rounded-xl h-10 focus:ring-0 px-3">
              <Calendar className="size-3 mr-2 text-stone-500 shrink-0" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              {periods.map((p) => (
                <SelectItem 
                  key={p.value} 
                  value={p.value}
                  className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white"
                >
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 border border-dashed border-white/5 rounded-3xl">
          <Loader2 className="size-8 animate-spin text-chess-light" />
          <p className="text-xs font-bold uppercase tracking-widest text-stone-700">
            Récupération des données...
          </p>
        </div>
      ) : filteredGames.length > 0 ? (
        <div className="space-y-8">
          <StatsOverview games={filteredGames} username={username} />
          
          <EloProgressionChart 
            games={filteredGames} 
            username={username} 
            period={period} 
            timeClass={timeClass}
          />

          <OpeningsChart games={filteredGames} username={username} />

          <StatsChart games={filteredGames} />
          
          <GameResultsPies games={filteredGames} username={username} />
          
          <TerminationChart games={filteredGames} username={username} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RatingChart games={filteredGames} username={username} />
            <TimeStatsChart games={filteredGames} username={username} />
          </div>
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-700">
            Aucune partie trouvée pour ces critères.
          </p>
        </div>
      )}
    </main>
  );
}
