"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChessGame } from "@/types/chess";

interface StatsChartProps {
  games: ChessGame[];
}

export function StatsChart({ games }: StatsChartProps) {
  const [viewMode, setViewMode] = useState<"day" | "month" | "auto">("auto");

  const chartData = useMemo(() => {
    if (!games || games.length === 0) return [];

    // Sort ascending for chronological chart
    const sortedGames = [...games].sort((a, b) => a.end_time - b.end_time);

    const firstGame = sortedGames[0];
    const lastGame = sortedGames[sortedGames.length - 1];
    
    const diffDays = (lastGame.end_time - firstGame.end_time) / (24 * 60 * 60);

    const actualViewMode = viewMode === "auto" 
      ? (diffDays > 90 ? "month" : "day") 
      : viewMode;

    const dataMap = new Map<string, number>();

    sortedGames.forEach(game => {
      const date = new Date(game.end_time * 1000);
      let key = "";
      if (actualViewMode === "day") {
        key = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      } else {
        key = date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      }
      
      dataMap.set(key, (dataMap.get(key) || 0) + 1);
    });

    return Array.from(dataMap.entries()).map(([date, count]) => ({
      date,
      count
    }));
  }, [games, viewMode]);

  if (games.length === 0) return null;

  const chartConfig = {
    count: {
      label: "Parties",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in mt-8 mb-4">
      <div className="flex justify-between items-center px-2">
        <h3 className="text-sm font-bold tracking-widest uppercase text-stone-400">Activité</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("day")}
            className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full transition-colors ${
              viewMode === "day" ? "bg-white/10 text-white" : "text-stone-500 hover:text-stone-300"
            }`}
          >
            Jour
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full transition-colors ${
              viewMode === "month" ? "bg-white/10 text-white" : "text-stone-500 hover:text-stone-300"
            }`}
          >
            Mois
          </button>
          <button
            onClick={() => setViewMode("auto")}
            className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full transition-colors ${
              viewMode === "auto" ? "bg-white/10 text-white" : "text-stone-500 hover:text-stone-300"
            }`}
          >
            Auto
          </button>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[200px] w-full bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              tickLine={false} 
              axisLine={false} 
              tickMargin={10}
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar 
              dataKey="count" 
              fill="rgba(255,255,255,0.8)" 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
