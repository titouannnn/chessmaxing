"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChessGame } from "@/types/chess";

interface EloProgressionChartProps {
  games: ChessGame[];
  username: string;
  period: string;
  timeClass?: string;
}

const chartConfig = {
  rapid: {
    label: "Rapid",
    color: "#fbbf24",
  },
  blitz: {
    label: "Blitz",
    color: "#8b5cf6",
  },
  bullet: {
    label: "Bullet",
    color: "#f43f5e",
  },
} satisfies ChartConfig;

export function EloProgressionChart({ games, username, period, timeClass = "all" }: EloProgressionChartProps) {
  const chartData = React.useMemo(() => {
    if (!games.length) return [];

    const sortedGames = [...games].sort((a, b) => a.end_time - b.end_time);
    
    // Group by day
    const dailyMap = new Map<string, { rapid?: number; blitz?: number; bullet?: number }>();
    
    sortedGames.forEach(game => {
      const date = new Date(game.end_time * 1000).toISOString().split('T')[0];
      const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
      const rating = isWhite ? game.white.rating : game.black.rating;
      const timeClass = game.time_class;

      if (!dailyMap.has(date)) dailyMap.set(date, {});
      const current = dailyMap.get(date)!;
      if (timeClass === 'rapid') current.rapid = rating;
      else if (timeClass === 'blitz') current.blitz = rating;
      else if (timeClass === 'bullet') current.bullet = rating;
    });

    const dates = Array.from(dailyMap.keys()).sort();
    if (dates.length === 0) return [];

    // Define chart range
    const firstGameDate = new Date(dates[0]);
    const lastGameDate = new Date(dates[dates.length - 1]);
    
    const now = new Date();
    const requestedDays = period === "total" ? 365 * 5 : parseInt(period);
    const startDate = new Date();
    startDate.setDate(now.getDate() - requestedDays);

    // If we have games before the requested start, use the games' start
    const finalStartDate = startDate < firstGameDate ? startDate : firstGameDate;
    const finalEndDate = now;

    const data: any[] = [];
    const curr = new Date(finalStartDate);
    
    // Track last known ratings for extrapolation/continuity
    let lastRapid: number | null = null;
    let lastBlitz: number | null = null;
    let lastBullet: number | null = null;

    // Find first known ratings for backward extrapolation
    const firstRatings: any = { rapid: null, blitz: null, bullet: null };
    for (const d of dates) {
      const r = dailyMap.get(d)!;
      if (firstRatings.rapid === null && r.rapid) firstRatings.rapid = r.rapid;
      if (firstRatings.blitz === null && r.blitz) firstRatings.blitz = r.blitz;
      if (firstRatings.bullet === null && r.bullet) firstRatings.bullet = r.bullet;
    }

    while (curr <= finalEndDate) {
      const dateStr = curr.toISOString().split('T')[0];
      const dayData = dailyMap.get(dateStr);

      if (dayData) {
        if (dayData.rapid) lastRapid = dayData.rapid;
        if (dayData.blitz) lastBlitz = dayData.blitz;
        if (dayData.bullet) lastBullet = dayData.bullet;
      }

      data.push({
        date: dateStr,
        // Use last known rating OR first known rating (backward extrapolation)
        rapid: lastRapid ?? firstRatings.rapid,
        blitz: lastBlitz ?? firstRatings.blitz,
        bullet: lastBullet ?? firstRatings.bullet,
      });

      curr.setDate(curr.getDate() + 1);
    }

    return data;
  }, [games, username, period]);

  return (
    <Card className="bg-white/[0.02] border-white/[0.05] flex flex-col w-full">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b border-white/5 py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-stone-500">Progression Elo</CardTitle>
          <CardDescription className="text-[10px] text-stone-600 font-bold uppercase">
            Évolution continue (extrapolée)
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillRapid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-rapid)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--color-rapid)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillBlitz" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-blitz)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--color-blitz)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillBullet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-bullet)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--color-bullet)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={64}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("fr-FR", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              domain={['auto', 'auto']}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            {(timeClass === "all" || timeClass === "rapid") && (
              <Area
                dataKey="rapid"
                type="monotone"
                fill="url(#fillRapid)"
                stroke="var(--color-rapid)"
                strokeWidth={2}
                connectNulls
              />
            )}
            {(timeClass === "all" || timeClass === "blitz") && (
              <Area
                dataKey="blitz"
                type="monotone"
                fill="url(#fillBlitz)"
                stroke="var(--color-blitz)"
                strokeWidth={2}
                connectNulls
              />
            )}
            {(timeClass === "all" || timeClass === "bullet") && (
              <Area
                dataKey="bullet"
                type="monotone"
                fill="url(#fillBullet)"
                stroke="var(--color-bullet)"
                strokeWidth={2}
                connectNulls
              />
            )}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
