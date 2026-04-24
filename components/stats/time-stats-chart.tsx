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
      const buckets = days.map(d => ({ label: d, win: 0, draw: 0, loss: 0, total: 0 }));

      games.forEach((game) => {
        const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
        const playerResult = isWhite ? game.white.result : game.black.result;
        
        let resType: 'win' | 'loss' | 'draw' = 'draw';
        if (playerResult === 'win') resType = 'win';
        else if (['checkmated', 'timeout', 'resigned', 'abandoned', 'lose'].includes(playerResult)) resType = 'loss';

        const date = new Date(game.end_time * 1000);
        const dayIndex = date.getDay(); 
        
        buckets[dayIndex][resType]++;
        buckets[dayIndex].total++;
      });
      
      const sun = buckets.shift();
      if (sun) buckets.push(sun);
      
      return buckets.map(b => ({
        label: b.label,
        win: b.total > 0 ? (b.win / b.total) * 100 : 0,
        draw: b.total > 0 ? (b.draw / b.total) * 100 : 0,
        loss: b.total > 0 ? (b.loss / b.total) * 100 : 0,
        raw: { win: b.win, draw: b.draw, loss: b.loss, total: b.total }
      }));
    } else {
      // 2h intervals
      const buckets = Array.from({ length: 12 }, (_, i) => ({
        label: `${i * 2}h`,
        win: 0,
        draw: 0,
        loss: 0,
        total: 0
      }));

      games.forEach((game) => {
        const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
        const playerResult = isWhite ? game.white.result : game.black.result;
        
        let resType: 'win' | 'loss' | 'draw' = 'draw';
        if (playerResult === 'win') resType = 'win';
        else if (['checkmated', 'timeout', 'resigned', 'abandoned', 'lose'].includes(playerResult)) resType = 'loss';

        const date = new Date(game.end_time * 1000);
        const hour = date.getHours();
        const bucketIndex = Math.floor(hour / 2);

        buckets[bucketIndex][resType]++;
        buckets[bucketIndex].total++;
      });

      return buckets.map(b => ({
        label: b.label,
        win: b.total > 0 ? (b.win / b.total) * 100 : 0,
        draw: b.total > 0 ? (b.draw / b.total) * 100 : 0,
        loss: b.total > 0 ? (b.loss / b.total) * 100 : 0,
        raw: { win: b.win, draw: b.draw, loss: b.loss, total: b.total }
      }));
    }
  }, [games, username, view]);

  if (games.length === 0) return null;

  const chartConfig = {
    win: { label: "Victoires (%)", color: "#22c55e" },
    draw: { label: "Nulles (%)", color: "#78716c" },
    loss: { label: "Défaites (%)", color: "#ef4444" },
  } satisfies ChartConfig;

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Calendrier (Normalisé)</h2>
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
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} 
                tickFormatter={(val) => `${val}%`}
                domain={[0, 100]}
              />
              <ChartTooltip content={
                <ChartTooltipContent 
                  formatter={(value, name, item) => {
                    const val = typeof value === 'number' ? value.toFixed(1) : value;
                    return (
                      <div className="flex items-center gap-2">
                        <span>{val}%</span>
                        <span className="text-[10px] text-stone-500">({item.payload.raw[name as keyof typeof item.payload.raw]})</span>
                      </div>
                    );
                  }}
                />
              } />
              <Bar dataKey="win" name="win" stackId="a" fill="var(--color-win)" />
              <Bar dataKey="draw" name="draw" stackId="a" fill="var(--color-draw)" />
              <Bar dataKey="loss" name="loss" stackId="a" fill="var(--color-loss)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}
