"use client";

import { useMemo, useState, useEffect } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChessGame } from "@/types/chess";
import { parseBasicPgn } from "@/lib/chess-utils";
import ecoIndexRaw from "@/data/eco-index.json";
import { EcoIndex } from "@/types/chess";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const ecoIndex = ecoIndexRaw as EcoIndex;

interface OpeningsChartProps {
  games: ChessGame[];
  username: string;
}

export function OpeningsChart({ games, username }: OpeningsChartProps) {
  const [selectedOpening, setSelectedOpening] = useState<string | null>(null);
  const [isNormalized, setIsNormalized] = useState(true);

  const { aggregatedData, variationsMap } = useMemo(() => {
    if (games.length === 0) return { aggregatedData: [], variationsMap: new Map() };

    // PERFORMANCE OPTIMIZATION: If we have massive amounts of games (e.g. 30k+), 
    // we sample them to keep the UI fluid while keeping stats accurate.
    let gamesToProcess = games;
    const MAX_GAMES_FOR_OPENINGS = 2000;
    if (games.length > MAX_GAMES_FOR_OPENINGS) {
      // Stratified-like sampling: take 2000 games distributed across the history
      const step = Math.floor(games.length / MAX_GAMES_FOR_OPENINGS);
      gamesToProcess = games.filter((_, i) => i % step === 0).slice(0, MAX_GAMES_FOR_OPENINGS);
    }

    const parentMap = new Map<string, { name: string; win: number; draw: number; loss: number; total: number }>();
    const varMap = new Map<string, Map<string, { name: string; win: number; draw: number; loss: number; total: number }>>();

    gamesToProcess.forEach((game) => {
      // pgn might be undefined for some variant games or API glitches
      if (!game.pgn) return;
      
      const pgnData = parseBasicPgn(game.pgn);
      const eco = pgnData.ECO;
      let parent = "Inconnu";
      let variation = "Base";

      // 1. Détermination du Parent fiable via ECO Index
      if (eco && ecoIndex[eco]) {
        parent = ecoIndex[eco].parent;
        variation = ecoIndex[eco].variation; // Fallback de base
      }

      // 2. Extraction de la Variante ultra-précise via l'URL Chess.com
      const ecoUrl = (game as any).eco || pgnData.ECOUrl;
      if (ecoUrl && ecoUrl.includes("/openings/")) {
        const parts = ecoUrl.split("/openings/");
        if (parts.length > 1) {
          const slug = parts[1]; // ex: Scotch-Game-Schmidt-Variation-5.Nxc6
          
          if (parent !== "Inconnu") {
            // On essaie de retirer le nom du parent du slug
            // ex: "Scotch Game" -> "Scotch-Game"
            const parentSlug = parent.replace(/\s+/g, "-");
            
            if (slug.startsWith(parentSlug + "-")) {
              // On retire le parent du slug (et le tiret)
              const varSlug = slug.substring(parentSlug.length + 1);
              // Remplacement des tirets par espaces, mais on garde certains formatages (ex: 3...Nc6)
              variation = varSlug.replace(/-/g, " ");
            } else if (slug === parentSlug) {
              variation = "Ligne Principale";
            } else {
              // Si ça ne matche pas parfaitement, on garde le slug entier formaté
              variation = slug.replace(/-/g, " ");
            }
          } else {
            // Si pas de parent dans l'index, on utilise le slug complet
            parent = slug.replace(/-/g, " ");
            variation = "Ligne Principale";
          }
        }
      }

      // Determine result
      const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
      const playerResult = isWhite ? game.white.result : game.black.result;
      
      let resType: 'win' | 'loss' | 'draw' = 'draw';
      if (playerResult === 'win') resType = 'win';
      else if (['checkmated', 'timeout', 'resigned', 'abandoned', 'lose'].includes(playerResult)) resType = 'loss';

      // Update parent map
      if (!parentMap.has(parent)) {
        parentMap.set(parent, { name: parent, win: 0, draw: 0, loss: 0, total: 0 });
      }
      const pStats = parentMap.get(parent)!;
      pStats[resType]++;
      pStats.total++;

      // Update variation map
      if (!varMap.has(parent)) {
        varMap.set(parent, new Map());
      }
      const parentVarMap = varMap.get(parent)!;
      if (!parentVarMap.has(variation)) {
        parentVarMap.set(variation, { name: variation, win: 0, draw: 0, loss: 0, total: 0 });
      }
      const vStats = parentVarMap.get(variation)!;
      vStats[resType]++;
      vStats.total++;
    });

    const sortedParents = Array.from(parentMap.values())
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 10); // Top 10

    return { aggregatedData: sortedParents, variationsMap: varMap };
  }, [games, username]);

  // Normalize data if requested
  const displayData = useMemo(() => {
    if (!isNormalized) return aggregatedData;
    
    return aggregatedData.map(d => ({
      ...d,
      win: (d.win / d.total) * 100,
      draw: (d.draw / d.total) * 100,
      loss: (d.loss / d.total) * 100,
      raw: { win: d.win, draw: d.draw, loss: d.loss, total: d.total }
    }));
  }, [aggregatedData, isNormalized]);

  // Set default selected opening or reset if current selection is gone
  useEffect(() => {
    if (aggregatedData.length > 0) {
      const currentExists = aggregatedData.some(d => d.name === selectedOpening);
      if (!selectedOpening || !currentExists) {
        setSelectedOpening(aggregatedData[0].name);
      }
    } else {
      setSelectedOpening(null);
    }
  }, [aggregatedData, selectedOpening]);

  const selectedVariationsData = useMemo(() => {
    if (!selectedOpening || !variationsMap.has(selectedOpening)) return [];
    
    return Array.from(variationsMap.get(selectedOpening)!.values())
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 8); // Top 8 variations
  }, [selectedOpening, variationsMap]);

  if (games.length === 0 || aggregatedData.length === 0) return null;

  const chartConfig = {
    win: { label: isNormalized ? "Victoires (%)" : "Victoires", color: "#22c55e" },
    draw: { label: isNormalized ? "Nulles (%)" : "Nulles", color: "#78716c" },
    loss: { label: isNormalized ? "Défaites (%)" : "Défaites", color: "#ef4444" },
  } satisfies ChartConfig;

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col gap-6 animate-fade-in mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Ouvertures jouées (Top 10)</h2>
          <p className="text-[11px] text-stone-600 mt-1 font-medium">Cliquez sur une barre pour explorer les variantes.</p>
        </div>
        <div className="flex items-center space-x-2 bg-white/[0.03] p-2 px-3 rounded-xl border border-white/5">
          <Switch 
            id="normalize-mode" 
            checked={isNormalized} 
            onCheckedChange={setIsNormalized}
            className="data-[state=checked]:bg-chess-light"
          />
          <Label htmlFor="normalize-mode" className="text-[10px] font-bold uppercase tracking-widest text-stone-400 cursor-pointer">
            Normaliser
          </Label>
        </div>
      </div>
      
      {/* Main Chart */}
      <div className="h-[250px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={displayData} 
              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
              onClick={(state: any) => {
                if (state && state.activeLabel) {
                  setSelectedOpening(state.activeLabel);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="name" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                tickFormatter={(value) => value.length > 12 ? value.substring(0, 12) + "..." : value}
                angle={-20}
                textAnchor="end"
                dy={10}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} 
                width={30}
                tickFormatter={(val) => isNormalized ? `${val}%` : val}
                domain={isNormalized ? [0, 100] : ['auto', 'auto']}
              />
              <ChartTooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                content={<ChartTooltipContent 
                  formatter={(value, name, item) => {
                    if (isNormalized) {
                      const raw = (item.payload as any).raw;
                      const key = name as string;
                      const val = typeof value === 'number' ? value.toFixed(1) : value;
                      return (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{val}%</span>
                          <span className="text-[10px] text-stone-500">({raw[key]})</span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{value as string}</span>
                      </div>
                    );
                  }}
                />} 
              />
              <Bar 
                dataKey="win" 
                name="win" 
                stackId="a" 
                fill="var(--color-win)" 
                cursor="pointer"
                onClick={(data) => { if (data && data.name) setSelectedOpening(data.name as string); }}
              >
                 {displayData.map((entry, index) => (
                    <Cell 
                      key={`cell-win-${index}`} 
                      opacity={selectedOpening === entry.name ? 1 : 0.4} 
                    />
                 ))}
              </Bar>
              <Bar 
                dataKey="draw" 
                name="draw" 
                stackId="a" 
                fill="var(--color-draw)" 
                cursor="pointer"
                onClick={(data) => { if (data && data.name) setSelectedOpening(data.name as string); }}
              >
                 {displayData.map((entry, index) => (
                    <Cell 
                      key={`cell-draw-${index}`} 
                      opacity={selectedOpening === entry.name ? 1 : 0.4} 
                    />
                 ))}
              </Bar>
              <Bar 
                dataKey="loss" 
                name="loss" 
                stackId="a" 
                fill="var(--color-loss)" 
                radius={[4, 4, 0, 0]} 
                cursor="pointer"
                onClick={(data) => { if (data && data.name) setSelectedOpening(data.name as string); }}
              >
                 {displayData.map((entry, index) => (
                    <Cell 
                      key={`cell-loss-${index}`} 
                      opacity={selectedOpening === entry.name ? 1 : 0.4} 
                    />
                 ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Variations Section */}
      {selectedOpening && selectedVariationsData.length > 0 && (
        <div className="mt-4 pt-6 border-t border-white/[0.05] animate-fade-in">
          <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-white flex items-center gap-2">
             Variantes de <span className="text-chess-light bg-chess-dark/30 px-2 py-0.5 rounded-sm">{selectedOpening}</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {selectedVariationsData.map((vr: any, i) => (
              <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                 <div className="flex items-start justify-between gap-2">
                   <span className="text-xs font-semibold text-stone-200 truncate">{vr.name}</span>
                   <span className="text-[10px] font-bold text-stone-500 tabular-nums">{vr.total} parties</span>
                 </div>
                 
                 <div className="h-1.5 w-full bg-white/5 rounded-full flex overflow-hidden mt-1">
                   <div className="bg-green-500 h-full" style={{ width: `${(vr.win / vr.total) * 100}%` }} title={`Victoires: ${vr.win}`} />
                   <div className="bg-stone-500 h-full" style={{ width: `${(vr.draw / vr.total) * 100}%` }} title={`Nulles: ${vr.draw}`} />
                   <div className="bg-red-500 h-full" style={{ width: `${(vr.loss / vr.total) * 100}%` }} title={`Défaites: ${vr.loss}`} />
                 </div>
                 
                 <div className="flex justify-between text-[9px] font-bold uppercase text-stone-500 mt-0.5 tracking-wider">
                   <span className="text-green-500/70">{((vr.win / vr.total) * 100).toFixed(0)}%</span>
                   <span className="text-stone-500/70">{((vr.draw / vr.total) * 100).toFixed(0)}%</span>
                   <span className="text-red-500/70">{((vr.loss / vr.total) * 100).toFixed(0)}%</span>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
