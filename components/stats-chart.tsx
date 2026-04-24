"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { ChessGame } from "@/types/chess";
import { cn } from "@/lib/utils";

interface StatsChartProps {
  games: ChessGame[];
}

export function StatsChart({ games }: StatsChartProps) {
  const [viewMode, setViewMode] = useState<"day" | "week" | "month" | "year">("day");

  const chartData = useMemo(() => {
    if (!games || games.length === 0) return [];

    const sortedGames = [...games].sort((a, b) => a.end_time - b.end_time);
    const dataMap = new Map<string, number>();

    sortedGames.forEach(game => {
      const date = new Date(game.end_time * 1000);
      let key = "";
      
      if (viewMode === "day") {
        key = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      } else if (viewMode === "week") {
        // Find Monday of the week
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        key = "Sem " + monday.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      } else if (viewMode === "month") {
        key = date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      } else {
        key = date.getFullYear().toString();
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
      label: "Nombre de parties",
      color: "rgba(255,255,255,0.8)",
    },
  } satisfies ChartConfig;

  const views: { label: string; value: typeof viewMode }[] = [
    { label: "Jour", value: "day" },
    { label: "Semaine", value: "week" },
    { label: "Mois", value: "month" },
    { label: "Année", value: "year" },
  ];

  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in mt-8 mb-4">
      <div className="flex justify-between items-center px-2">
        <h3 className="text-sm font-bold tracking-widest uppercase text-stone-400">Activité</h3>
        <div className="flex gap-2">
          {views.map(v => (
            <button
              key={v.value}
              onClick={() => setViewMode(v.value)}
              className={cn(
                "text-[10px] uppercase font-bold px-3 py-1 rounded-full transition-colors",
                viewMode === v.value ? "bg-white/10 text-white" : "text-stone-500 hover:text-stone-300"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[250px] w-full bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
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
            <YAxis 
              tickLine={false} 
              axisLine={false} 
              tickMargin={10}
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar 
              dataKey="count" 
              fill="var(--color-count)" 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
