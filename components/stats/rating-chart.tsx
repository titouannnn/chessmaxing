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
    // Determine rating buckets
    // Example: <800, 800-1000, 1000-1200, 1200-1400, 1400-1600, >1600
    const buckets = [
      { min: 0, max: 799, label: "< 800", win: 0, draw: 0, loss: 0 },
      { min: 800, max: 999, label: "800-999", win: 0, draw: 0, loss: 0 },
      { min: 1000, max: 1199, label: "1000-1199", win: 0, draw: 0, loss: 0 },
      { min: 1200, max: 1399, label: "1200-1399", win: 0, draw: 0, loss: 0 },
      { min: 1400, max: 1599, label: "1400-1599", win: 0, draw: 0, loss: 0 },
      { min: 1600, max: 10000, label: "1600+", win: 0, draw: 0, loss: 0 },
    ];

    games.forEach((game) => {
      const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
      const playerResult = isWhite ? game.white.result : game.black.result;
      const opponentRating = isWhite ? game.black.rating : game.white.rating;

      let resType = 'draw';
      if (playerResult === 'win') resType = 'win';
      else if (
        playerResult === 'checkmated' ||
        playerResult === 'timeout' ||
        playerResult === 'resigned' ||
        playerResult === 'abandoned' ||
        playerResult === 'lose'
      ) resType = 'loss';

      for (let b of buckets) {
        if (opponentRating >= b.min && opponentRating <= b.max) {
          if (resType === 'win') b.win++;
          else if (resType === 'loss') b.loss++;
          else b.draw++;
          break;
        }
      }
    });

    return buckets.filter(b => b.win > 0 || b.loss > 0 || b.draw > 0);
  }, [games, username]);

  if (games.length === 0 || chartData.length === 0) return null;

  const chartConfig = {
    win: { label: "Victoires", color: "#22c55e" },
    draw: { label: "Nulles", color: "#78716c" },
    loss: { label: "Défaites", color: "#ef4444" },
  } satisfies ChartConfig;

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col gap-4">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Résultats par classement</h2>
      
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
