"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChessGame } from "@/types/chess";

interface RatingChartProps {
  games: ChessGame[];
  username: string;
}

export function RatingChart({ games, username }: RatingChartProps) {
  const chartData = useMemo(() => {
    if (games.length === 0) return [];

    // Find min and max rating to define buckets of 100
    let minRating = Infinity;
    let maxRating = -Infinity;

    games.forEach(game => {
      const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
      const opponentRating = isWhite ? game.black.rating : game.white.rating;
      if (opponentRating < minRating) minRating = opponentRating;
      if (opponentRating > maxRating) maxRating = opponentRating;
    });

    // Round min down to nearest 100 and max up to nearest 100
    const start = Math.floor(minRating / 100) * 100;
    const end = Math.ceil(maxRating / 100) * 100;

    const bucketMap = new Map<number, { label: string, win: 0, draw: 0, loss: 0, total: 0 }>();
    for (let i = start; i < end; i += 100) {
      bucketMap.set(i, { label: `${i}-${i+99}`, win: 0, draw: 0, loss: 0, total: 0 });
    }

    games.forEach((game) => {
      const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
      const playerResult = isWhite ? game.white.result : game.black.result;
      const opponentRating = isWhite ? game.black.rating : game.white.rating;

      let resType: 'win' | 'loss' | 'draw' = 'draw';
      if (playerResult === 'win') resType = 'win';
      else if (['checkmated', 'timeout', 'resigned', 'abandoned', 'lose'].includes(playerResult)) resType = 'loss';

      const bucketKey = Math.floor(opponentRating / 100) * 100;
      const bucket = bucketMap.get(bucketKey);
      if (bucket) {
        bucket[resType]++;
        bucket.total++;
      }
    });

    // Normalize: calculate percentages
    return Array.from(bucketMap.values())
      .filter(b => b.total > 0)
      .map(b => ({
        label: b.label,
        win: (b.win / b.total) * 100,
        draw: (b.draw / b.total) * 100,
        loss: (b.loss / b.total) * 100,
        raw: { win: b.win, draw: b.draw, loss: b.loss, total: b.total }
      }));
  }, [games, username]);

  if (games.length === 0 || chartData.length === 0) return null;

  const chartConfig = {
    win: { label: "Victoires (%)", color: "#22c55e" },
    draw: { label: "Nulles (%)", color: "#78716c" },
    loss: { label: "Défaites (%)", color: "#ef4444" },
  } satisfies ChartConfig;

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col gap-4">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Résultats par classement (Normalisé)</h2>
      
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
