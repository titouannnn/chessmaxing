"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChessGame } from "@/types/chess";

interface GameResultsMixedProps {
  games: ChessGame[];
  username: string;
}

const chartConfig = {
  win: {
    label: "Victoires",
    color: "#22c55e",
  },
  loss: {
    label: "Défaites",
    color: "#ef4444",
  },
  draw: {
    label: "Nulles",
    color: "#78716c",
  },
} satisfies ChartConfig;

export function GameResultsPies({ games, username }: GameResultsMixedProps) {
  const chartData = useMemo(() => {
    const stats = {
      white: { label: "Blancs", win: 0, loss: 0, draw: 0, total: 0 },
      black: { label: "Noirs", win: 0, loss: 0, draw: 0, total: 0 },
    };

    games.forEach((game) => {
      const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
      const playerResult = isWhite ? game.white.result : game.black.result;

      let type: "win" | "loss" | "draw" = "draw";
      if (playerResult === "win") type = "win";
      else if (["checkmated", "timeout", "resigned", "abandoned", "lose"].includes(playerResult)) type = "loss";

      if (isWhite) {
        stats.white[type]++;
        stats.white.total++;
      } else {
        stats.black[type]++;
        stats.black.total++;
      }
    });

    // Only return sides present in the games list
    return [stats.white, stats.black].filter(s => s.total > 0);
  }, [games, username]);

  if (games.length === 0) return null;

  return (
    <Card className="bg-white/[0.02] border-white/[0.05] flex flex-col w-full">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-stone-500">Comparaison des Résultats</CardTitle>
        <CardDescription className="text-[10px] text-stone-600 font-bold uppercase">Performance par couleur de pièces</CardDescription>
      </CardHeader>
      <CardContent className="mt-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-auto h-[250px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="label" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 'bold' }} 
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} 
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="win" name="win" fill="var(--color-win)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="loss" name="loss" fill="var(--color-loss)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="draw" name="draw" fill="var(--color-draw)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
