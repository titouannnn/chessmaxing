"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useChessStore } from "@/lib/store";
import { Search, Loader2, Database, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChessGame } from "@/types/chess";
import localGames from "@/data/titouannnnnn_1y.json";
import localGamesAll from "@/data/titouannnnnn_all.json";

export default function Home() {
  const [searchInput, setSearchInput] = useState("");
  const [period, setPeriod] = useState("30");
  const router = useRouter();
  
  const { games, setGames, isLoading, setLoading, setSelectedGame, username, setUsername } = useChessStore();

  const fetchGames = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput) return;

    setLoading(true);
    setUsername(searchInput);

    try {
      const res = await fetch(`/api/chess?username=${encodeURIComponent(searchInput)}&days=${period}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Joueur introuvable");
      setGames(data.games || []);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGameClick = (game: ChessGame) => {
    setSelectedGame(game);
    router.push("/analysis");
  };

  const getResult = (game: ChessGame) => {
    if (game.white.result === "win") return "1-0";
    if (game.black.result === "win") return "0-1";
    return "½-½";
  };

  const periods = [
    { label: "1S", value: "7" },
    { label: "30J", value: "30" },
    { label: "3M", value: "90" },
    { label: "1A", value: "365" },
    { label: "ALL", value: "total" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white">
      <main className="flex-grow flex flex-col items-center pt-12 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-chess-dark/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-xl w-full flex flex-col items-center gap-10 relative z-10">
          
          <div className="space-y-3 text-center">
            <h1 className="text-4xl font-display font-bold tracking-tight">Explorer</h1>
            <p className="text-stone-500 text-sm font-manrope">Recherchez et explorez l'historique des parties.</p>
          </div>

          <div className="w-full flex flex-col gap-6">
            <div className="flex gap-2 w-full">
              <form onSubmit={fetchGames} className="relative group flex-grow">
                <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-2xl rounded-2xl -z-10 group-focus-within:bg-white/[0.05] transition-colors border border-white/5 shadow-2xl"></div>
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-4 text-stone-600 group-focus-within:text-chess-light transition-colors" />
                <input
                  className="w-full bg-transparent border-none text-white placeholder:text-stone-700 py-5 pl-14 pr-24 rounded-2xl font-manrope text-sm focus:outline-none focus:ring-0"
                  placeholder="Entrez un pseudo..."
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  disabled={isLoading}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <button 
                    type="submit"
                    disabled={isLoading || !searchInput}
                    className="bg-white/5 hover:bg-white/10 text-white px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-0 flex items-center gap-2"
                  >
                    {isLoading ? <Loader2 className="size-3 animate-spin" /> : "Rechercher"}
                  </button>
                </div>
              </form>
            </div>

            <div className="flex justify-center">
              <div className="inline-flex p-1 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-full">
                {periods.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className={cn(
                      "px-5 py-1.5 rounded-full text-[10px] font-bold transition-all duration-200 uppercase tracking-widest",
                      period === p.value
                        ? "bg-white/10 text-chess-light shadow-sm"
                        : "text-stone-600 hover:text-stone-400"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Liste des parties */}
          <div className="w-full animate-fade-in text-left pt-4 pb-20">
            {games.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-700 px-2">Parties de {username}</h2>
                <div className="divide-y divide-white/[0.03] border-t border-white/[0.05]">
                  {games.map((game, i) => (
                    <div 
                      key={i} 
                      onClick={() => handleGameClick(game)}
                      className="py-4 flex items-center justify-between gap-6 group cursor-pointer hover:bg-white/[0.01] transition-colors rounded-sm px-2"
                    >
                      <div className="flex items-center gap-8 flex-1 min-w-0">
                        <span className="text-[10px] font-black w-8 text-center tabular-nums text-stone-600 group-hover:text-chess-light transition-colors">
                          {getResult(game)}
                        </span>
                        <div className="truncate flex items-center gap-3 text-[13px] tracking-tight text-stone-500 group-hover:text-stone-200 transition-colors">
                          <span className={game.white.username.toLowerCase() === username.toLowerCase() ? "text-white font-medium" : ""}>
                            {game.white.username}
                          </span>
                          <span className="text-[9px] text-stone-800 font-bold uppercase">/</span>
                          <span className={game.black.username.toLowerCase() === username.toLowerCase() ? "text-white font-medium" : ""}>
                            {game.black.username}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] text-stone-700 font-bold uppercase tracking-widest group-hover:text-stone-500 transition-colors">
                        {new Date(game.end_time * 1000).toLocaleDateString("fr-FR", { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !isLoading && (
                <p className="text-[10px] font-bold text-stone-700 uppercase tracking-widest text-center py-10">
                  Aucune partie à afficher.
                </p>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
