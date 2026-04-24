"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChessGame } from "@/types/chess";

interface TerminationChartProps {
  games: ChessGame[];
  username: string;
}

export function TerminationChart({ games, username }: TerminationChartProps) {
  const chartData = useMemo(() => {
    const counts: Record<string, { win: number; loss: number }> = {
      checkmated: { win: 0, loss: 0 },
      resigned: { win: 0, loss: 0 },
      timeout: { win: 0, loss: 0 },
      abandoned: { win: 0, loss: 0 },
    };

    games.forEach((game) => {
      const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
      const playerResult = isWhite ? game.white.result : game.black.result;
      const opponentResult = isWhite ? game.black.result : game.white.result;

      if (playerResult === "win") {
        if (counts[opponentResult] !== undefined) counts[opponentResult].win++;
      } else if (
        playerResult === "checkmated" ||
        playerResult === "resigned" ||
        playerResult === "timeout" ||
        playerResult === "abandoned"
      ) {
        counts[playerResult].loss++;
      }
    });

    return [
      { name: "Mat", win: counts.checkmated.win, loss: counts.checkmated.loss },
      { name: "Abandon", win: counts.resigned.win, loss: counts.resigned.loss },
      { name: "Temps", win: counts.timeout.win, loss: counts.timeout.loss },
      { name: "Déco.", win: counts.abandoned.win, loss: counts.abandoned.loss },
    ];
  }, [games, username]);

  if (games.length === 0) return null;

  const chartConfig = {
    win: {
      label: "Gagnées par",
      color: "#22c55e",
    },
    loss: {
      label: "Perdues par",
      color: "#ef4444",
    },
  } satisfies ChartConfig;

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col gap-4">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Résultats de la partie</h2>
      <p className="text-xs text-stone-400">Comment vous gagnez et perdez.</p>

      <div className="h-[250px] w-full mt-4">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="win" name="Gagnées" fill="var(--color-win)" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="loss" name="Perdues" fill="var(--color-loss)" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}
