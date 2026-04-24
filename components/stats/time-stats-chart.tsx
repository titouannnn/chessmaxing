"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChessGame } from "@/types/chess";

interface TimeStatsChartProps {
  games: ChessGame[];
  username: string;
}

export function TimeStatsChart({ games, username }: TimeStatsChartProps) {
  const [view, setView] = useState<"day" | "time">("day");

  const chartData = useMemo(() => {
    if (view === "day") {
      const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      const buckets = days.map(d => ({ label: d, win: 0, draw: 0, loss: 0 }));

      games.forEach((game) => {
        const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
        const playerResult = isWhite ? game.white.result : game.black.result;
        
        let resType = 'draw';
        if (playerResult === 'win') resType = 'win';
        else if (['checkmated', 'timeout', 'resigned', 'abandoned', 'lose'].includes(playerResult)) resType = 'loss';

        const date = new Date(game.end_time * 1000);
        const dayIndex = date.getDay(); // 0 is Sunday
        
        if (resType === 'win') buckets[dayIndex].win++;
        else if (resType === 'loss') buckets[dayIndex].loss++;
        else buckets[dayIndex].draw++;
      });
      // Move Sunday to the end for French week standard (Mon-Sun)
      const sun = buckets.shift();
      if (sun) buckets.push(sun);
      
      return buckets;
    } else {
      const buckets = [
        { label: "Nuit (0h-6h)", win: 0, draw: 0, loss: 0 },
        { label: "Matin (6h-12h)", win: 0, draw: 0, loss: 0 },
        { label: "Aprem (12h-18h)", win: 0, draw: 0, loss: 0 },
        { label: "Soir (18h-24h)", win: 0, draw: 0, loss: 0 },
      ];

      games.forEach((game) => {
        const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
        const playerResult = isWhite ? game.white.result : game.black.result;
        
        let resType = 'draw';
        if (playerResult === 'win') resType = 'win';
        else if (['checkmated', 'timeout', 'resigned', 'abandoned', 'lose'].includes(playerResult)) resType = 'loss';

        const date = new Date(game.end_time * 1000);
        const hour = date.getHours();
        
        let bucketIndex = 0;
        if (hour >= 6 && hour < 12) bucketIndex = 1;
        else if (hour >= 12 && hour < 18) bucketIndex = 2;
        else if (hour >= 18) bucketIndex = 3;

        if (resType === 'win') buckets[bucketIndex].win++;
        else if (resType === 'loss') buckets[bucketIndex].loss++;
        else buckets[bucketIndex].draw++;
      });

      return buckets;
    }
  }, [games, username, view]);

  if (games.length === 0) return null;

  const chartConfig = {
    win: { label: "Victoires", color: "#22c55e" },
    draw: { label: "Nulles", color: "#78716c" },
    loss: { label: "Défaites", color: "#ef4444" },
  } satisfies ChartConfig;

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Calendrier</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView("day")}
            className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full transition-colors ${
              view === "day" ? "bg-white/10 text-white" : "text-stone-500 hover:text-stone-300"
            }`}
          >
            Jour
          </button>
          <button
            onClick={() => setView("time")}
            className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full transition-colors ${
              view === "time" ? "bg-white/10 text-white" : "text-stone-500 hover:text-stone-300"
            }`}
          >
            Heure
          </button>
        </div>
      </div>
      
      <div className="h-[250px] w-full mt-4">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="win" name="Victoires" stackId="a" fill="var(--color-win)" />
              <Bar dataKey="draw" name="Nulles" stackId="a" fill="var(--color-draw)" />
              <Bar dataKey="loss" name="Défaites" stackId="a" fill="var(--color-loss)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}
