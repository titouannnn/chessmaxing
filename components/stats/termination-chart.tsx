"use client";

import { useMemo } from "react";
import { Pie, PieChart } from "recharts";
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

interface TerminationChartProps {
  games: ChessGame[];
  username: string;
}

const chartConfig = {
  checkmated: { label: "Mat", color: "hsl(30 50% 50%)" },
  resigned: { label: "Abandon", color: "hsl(30 40% 40%)" },
  timeout: { label: "Temps", color: "hsl(30 30% 30%)" },
  repetition: { label: "Répétition", color: "hsl(40 20% 50%)" },
  stalemate: { label: "Pat", color: "hsl(40 20% 40%)" },
  insufficient: { label: "Manque de matériel", color: "hsl(40 20% 30%)" },
  agreed: { label: "Accord", color: "hsl(40 20% 20%)" },
  "50move": { label: "50 coups", color: "hsl(40 10% 40%)" },
  win: { label: "Gain", color: "hsl(30 60% 60%)" },
} satisfies ChartConfig;

export function TerminationChart({ games, username }: TerminationChartProps) {
  const { winData, lossData, drawData } = useMemo(() => {
    const wins: Record<string, number> = {};
    const losses: Record<string, number> = {};
    const draws: Record<string, number> = {};
    
    let totalWins = 0;
    let totalLosses = 0;
    let totalDraws = 0;

    games.forEach((game) => {
      const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
      const playerResult = isWhite ? game.white.result : game.black.result;
      const opponentResult = isWhite ? game.black.result : game.white.result;

      const normalize = (res: string) => {
        if (res === "abandoned") return "resigned";
        if (res === "timevsinsufficient") return "insufficient";
        return res;
      };
      
      const drawTypes = ["draw", "repetition", "stalemate", "insufficient", "agreed", "timevsinsufficient", "50move"];

      if (playerResult === "win") {
        const normRes = normalize(opponentResult);
        wins[normRes] = (wins[normRes] || 0) + 1;
        totalWins++;
      } else if (drawTypes.includes(playerResult)) {
        const normRes = normalize(playerResult);
        const finalRes = normRes === "draw" ? "agreed" : normRes;
        draws[finalRes] = (draws[finalRes] || 0) + 1;
        totalDraws++;
      } else {
        const normRes = normalize(playerResult);
        losses[normRes] = (losses[normRes] || 0) + 1;
        totalLosses++;
      }
    });

    const format = (obj: Record<string, number>, total: number) => 
      Object.entries(obj).map(([key, value]) => ({
        result: key,
        count: value,
        percentage: total > 0 ? (value / total) * 100 : 0,
        fill: chartConfig[key as keyof typeof chartConfig]?.color || "hsl(var(--muted))"
      })).sort((a, b) => b.count - a.count);

    return { 
      winData: format(wins, totalWins), 
      lossData: format(losses, totalLosses),
      drawData: format(draws, totalDraws)
    };
  }, [games, username]);

  if (games.length === 0) return null;

  const renderTooltip = (value: any, name: any, item: any) => {
    const config = chartConfig[item.payload.result as keyof typeof chartConfig];
    return (
      <div className="flex items-center gap-2">
        <span className="font-bold">{item.payload.percentage.toFixed(1)}%</span>
        <span className="text-stone-500 font-medium">| {config?.label || name}</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
      {/* Wins Pie */}
      <Card className="bg-white/[0.02] border-white/[0.05] flex flex-col">
        <CardHeader className="items-center pb-0 text-center">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">Causes de Victoire</CardTitle>
          <CardDescription className="text-[9px] text-stone-600 font-bold uppercase">Comment vos adversaires perdent</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel formatter={renderTooltip} />} />
              <Pie data={winData} dataKey="count" nameKey="result" innerRadius={35} />
              <ChartLegend
                content={<ChartLegendContent nameKey="result" />}
                className="flex-wrap gap-2 text-[8px] uppercase font-black justify-center"
              />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Losses Pie */}
      <Card className="bg-white/[0.02] border-white/[0.05] flex flex-col">
        <CardHeader className="items-center pb-0 text-center">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">Causes de Défaite</CardTitle>
          <CardDescription className="text-[9px] text-stone-600 font-bold uppercase">Comment vous perdez</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel formatter={renderTooltip} />} />
              <Pie data={lossData} dataKey="count" nameKey="result" innerRadius={35} />
              <ChartLegend
                content={<ChartLegendContent nameKey="result" />}
                className="flex-wrap gap-2 text-[8px] uppercase font-black justify-center"
              />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Draws Pie */}
      <Card className="bg-white/[0.02] border-white/[0.05] flex flex-col">
        <CardHeader className="items-center pb-0 text-center">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">Causes de Nulles</CardTitle>
          <CardDescription className="text-[9px] text-stone-600 font-bold uppercase">Pourquoi la partie s'arrête</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel formatter={renderTooltip} />} />
              <Pie data={drawData} dataKey="count" nameKey="result" innerRadius={35} />
              <ChartLegend
                content={<ChartLegendContent nameKey="result" />}
                className="flex-wrap gap-2 text-[8px] uppercase font-black justify-center"
              />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
