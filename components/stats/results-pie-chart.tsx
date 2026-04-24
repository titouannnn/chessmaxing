"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChessGame } from "@/types/chess";
import { useGameStats } from "@/lib/use-game-stats";

interface ResultsPieChartProps {
  games: ChessGame[];
  username: string;
}

export function ResultsPieChart({ games, username }: ResultsPieChartProps) {
  const stats = useGameStats(games, username);

  const chartData = useMemo(() => {
    return [
      { name: "Victoires", value: stats.wins, fill: "var(--color-win, #22c55e)" },
      { name: "Nulles", value: stats.draws, fill: "var(--color-draw, #78716c)" },
      { name: "Défaites", value: stats.losses, fill: "var(--color-loss, #ef4444)" },
    ].filter(d => d.value > 0);
  }, [stats]);

  if (games.length === 0) return null;

  const chartConfig = {
    value: {
      label: "Parties",
    },
  } satisfies ChartConfig;

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col gap-4">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Répartition des résultats</h2>
      
      <div className="h-[200px] w-full mt-4">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}
