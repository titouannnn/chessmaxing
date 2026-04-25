"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChessStore } from "@/lib/store";
import { Search, Loader2, Users, Zap, Calendar, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { cn, logger } from "@/lib/utils";
import { ChessGame } from "@/types/chess";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Stats Components
import { StatsChart } from "@/components/stats-chart";
import { StatsOverview } from "@/components/stats/stats-overview";
import { GameResultsPies } from "@/components/stats/game-results-pies";
import { TerminationChart } from "@/components/stats/termination-chart";
import { RatingChart } from "@/components/stats/rating-chart";
import { TimeStatsChart } from "@/components/stats/time-stats-chart";
import { EloProgressionChart } from "@/components/stats/elo-progression-chart";
import { OpeningsChart } from "@/components/stats/openings-chart";

export default function Home() {
  const [searchInput, setSearchInput] = useState("");
  const [period, setPeriod] = useState("30");
  const router = useRouter();
  
  const { games, setGames, isLoading, setLoading, setSelectedGame, username, setUsername } = useChessStore();

  // Progress bar state
  const [progress, setProgress] = useState(0);

  // Stats Filters
  const [side, setSide] = useState<"all" | "white" | "black">("all");
  const [timeClass, setTimeClass] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;

  const periods = [
    { label: "1 Sem", value: "7" },
    { label: "30 J", value: "30" },
    { label: "3 Mois", value: "90" },
    { label: "1 An", value: "365" },
    { label: "Tout", value: "total" },
  ];

  // Sync search input if we already have games (coming back from analysis)
  useEffect(() => {
    if (games.length > 0 && username && !searchInput) {
      setSearchInput(username);
    }
  }, [games, username]);

  const fetchGames = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput) return;

    logger.info(`Initiating fetch for user: ${searchInput} (Period: ${period})`);
    setLoading(true);
    setProgress(0);
    setUsername(searchInput);
    setCurrentPage(0); // reset pagination

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15, 90));
    }, 150);

    try {
      const res = await fetch(`/api/chess?username=${encodeURIComponent(searchInput)}&days=${period}`);
      const data = await res.json();

      if (!res.ok) {
        logger.error(`Fetch error: ${data.error || "Unknown error"}`);
        throw new Error(data.error || "Joueur introuvable");
      }
      
      logger.info(`Fetch complete. Received ${data.games?.length || 0} games.`);
      setProgress(100);
      setGames(data.games || []);
    } catch (err: any) {
      logger.error(`Failed to fetch: ${err.message}`);
      console.error(err.message);
      setProgress(100);
      setGames([]); // clear on error
    } finally {
      setTimeout(() => {
        clearInterval(progressInterval);
        setLoading(false);
      }, 300); // small delay to let 100% render
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

  // -----------------------------------------------------
  // FILTERING FOR STATS
  // -----------------------------------------------------
  const filteredGames = useMemo(() => {
    let result = [...games];

    // Filter by side
    if (side !== "all") {
      result = result.filter(g => {
        const isWhite = g.white.username.toLowerCase() === username.toLowerCase();
        return side === "white" ? isWhite : !isWhite;
      });
    }

    // Filter by time class
    if (timeClass !== "all") {
      result = result.filter(g => g.time_class === timeClass);
    }

    return result;
  }, [games, side, username, timeClass]);

  // -----------------------------------------------------
  // PAGINATION FOR GAMES LIST
  // -----------------------------------------------------
  const paginatedGames = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return games.slice(start, start + itemsPerPage);
  }, [games, currentPage]);

  const totalPages = Math.ceil(games.length / itemsPerPage);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white">
      <main className="flex-grow flex flex-col items-center pt-12 px-4 md:px-6 relative overflow-x-hidden pb-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-chess-dark/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl w-full flex flex-col items-center gap-10 relative z-10">
          
          <div className="space-y-3 text-center">
            <h1 className="text-4xl font-display font-bold tracking-tight">Explorer</h1>
            <p className="text-stone-500 text-sm font-manrope">Recherchez un joueur pour analyser ses parties et statistiques.</p>
          </div>

          <div className="w-full max-w-2xl flex flex-col gap-6">
            <div className="w-full relative group">
              <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-2xl rounded-2xl -z-10 group-focus-within:bg-white/[0.05] transition-colors border border-white/5 shadow-2xl"></div>
              
              <form onSubmit={fetchGames} className="flex items-center w-full p-1.5 flex-wrap md:flex-nowrap">
                <div className="flex-grow relative flex items-center min-w-[200px]">
                  <Search className="absolute left-4 size-4 text-stone-600 group-focus-within:text-chess-light transition-colors" />
                  <input
                    className="w-full bg-transparent border-none text-white placeholder:text-stone-700 py-3 pl-12 pr-4 rounded-xl font-manrope text-sm focus:outline-none focus:ring-0"
                    placeholder="Pseudo Chess.com..."
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="hidden md:block h-8 w-[1px] bg-white/10 mx-2"></div>
                
                <div className="shrink-0 flex items-center w-full md:w-auto mt-2 md:mt-0 justify-between md:justify-start">
                  <Select value={period} onValueChange={setPeriod} disabled={isLoading}>
                    <SelectTrigger className="w-[120px] border-none bg-transparent hover:bg-white/5 focus:ring-0 text-[11px] font-bold uppercase tracking-widest text-stone-400">
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10">
                      {periods.map((p) => (
                        <SelectItem 
                          key={p.value} 
                          value={p.value}
                          className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white"
                        >
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <button 
                    type="submit"
                    disabled={isLoading || !searchInput}
                    className="bg-white/5 hover:bg-white/10 text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 ml-2"
                  >
                    {isLoading ? <Loader2 className="size-3 animate-spin" /> : "Go"}
                  </button>
                </div>
              </form>
              
              {/* Progress Bar shown during fetch */}
              {isLoading && (
                <div className="absolute -bottom-1 left-2 right-2 h-0.5 overflow-hidden rounded-full bg-white/5">
                  <div 
                    className="h-full bg-chess-light transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              )}
            </div>
          </div>

          {/* RESULTS AREA */}
          {games.length > 0 && !isLoading && (
            <div className="w-full flex flex-col gap-16 animate-fade-in text-left pt-4">
              
              {/* GAMES LIST SECTION */}
              <div className="space-y-4 max-w-2xl mx-auto w-full">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-700">Dernières parties</h2>
                  <span className="text-[10px] font-bold text-stone-600 tabular-nums">Total : {games.length} parties</span>
                </div>
                
                <div className="divide-y divide-white/[0.03] border-y border-white/[0.05]">
                  {paginatedGames.map((game, i) => (
                    <div 
                      key={i} 
                      onClick={() => handleGameClick(game)}
                      className="py-4 flex items-center justify-between gap-6 group cursor-pointer hover:bg-white/[0.02] transition-colors rounded-sm px-4"
                    >
                      <div className="flex items-center gap-6 flex-1 min-w-0">
                        <span className={`text-[11px] font-black w-8 text-center tabular-nums transition-colors
                          ${getResult(game) === "1-0" && game.white.username.toLowerCase() === username.toLowerCase() ? "text-green-500" : ""}
                          ${getResult(game) === "0-1" && game.black.username.toLowerCase() === username.toLowerCase() ? "text-green-500" : ""}
                          ${getResult(game) === "0-1" && game.white.username.toLowerCase() === username.toLowerCase() ? "text-red-500" : ""}
                          ${getResult(game) === "1-0" && game.black.username.toLowerCase() === username.toLowerCase() ? "text-red-500" : ""}
                          ${getResult(game) === "½-½" ? "text-stone-500" : ""}
                        `}>
                          {getResult(game)}
                        </span>
                        <div className="truncate flex items-center gap-3 text-[13px] tracking-tight text-stone-500 group-hover:text-stone-200 transition-colors">
                          <span className={game.white.username.toLowerCase() === username.toLowerCase() ? "text-white font-bold" : ""}>
                            {game.white.username}
                          </span>
                          <span className="text-[9px] text-stone-800 font-bold uppercase">/</span>
                          <span className={game.black.username.toLowerCase() === username.toLowerCase() ? "text-white font-bold" : ""}>
                            {game.black.username}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] text-stone-700 font-bold uppercase tracking-widest group-hover:text-stone-500 transition-colors">
                          {new Date(game.end_time * 1000).toLocaleDateString("fr-FR", { day: '2-digit', month: 'short' })}
                        </span>
                        <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all text-stone-600">
                          <Play className="size-3 fill-current" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className="text-stone-500 hover:text-white"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-[10px] font-bold text-stone-600 tracking-widest">
                      Page {currentPage + 1} / {totalPages}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage === totalPages - 1}
                      className="text-stone-500 hover:text-white"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* STATS SECTION */}
              <div className="w-full space-y-8 bg-white/[0.01] border border-white/[0.03] p-4 md:p-8 rounded-3xl">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-display font-bold tracking-tight">
                      Statistiques <span className="text-chess-light">pour {username}</span>
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Game Type Selector */}
                    <Select value={timeClass} onValueChange={setTimeClass}>
                      <SelectTrigger className="w-[110px] bg-white/[0.03] border-white/5 text-[10px] font-bold uppercase tracking-widest rounded-xl h-10 focus:ring-0 px-3">
                        <Zap className="size-3 mr-2 text-stone-500 shrink-0" />
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        <SelectItem value="all" className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white">Tout</SelectItem>
                        <SelectItem value="rapid" className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white">Rapide</SelectItem>
                        <SelectItem value="blitz" className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white">Blitz</SelectItem>
                        <SelectItem value="bullet" className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white">Bullet</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Side Selector */}
                    <Select value={side} onValueChange={(v: any) => setSide(v)}>
                      <SelectTrigger className="w-[110px] bg-white/[0.03] border-white/5 text-[10px] font-bold uppercase tracking-widest rounded-xl h-10 focus:ring-0 px-3">
                        <Users className="size-3 mr-2 text-stone-500 shrink-0" />
                        <SelectValue placeholder="Les 2" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        <SelectItem value="all" className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white">Les 2</SelectItem>
                        <SelectItem value="white" className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white">Blancs</SelectItem>
                        <SelectItem value="black" className="text-[10px] uppercase font-bold tracking-widest text-stone-400 focus:bg-white/10 focus:text-white">Noirs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredGames.length > 0 ? (
                  <div className="space-y-8">
                    <StatsOverview games={filteredGames} username={username} />
                    
                    <EloProgressionChart 
                      games={filteredGames} 
                      username={username} 
                      period={period} 
                      timeClass={timeClass}
                    />

                    <OpeningsChart games={filteredGames} username={username} />

                    <StatsChart games={filteredGames} />
                    
                    <TerminationChart games={filteredGames} username={username} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <RatingChart games={filteredGames} username={username} />
                      <TimeStatsChart games={filteredGames} username={username} />
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-700">
                      Aucune partie trouvée pour ces filtres.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isLoading && games.length === 0 && searchInput.length > 0 && username && (
             <p className="text-[10px] font-bold text-stone-700 uppercase tracking-widest text-center py-10 animate-fade-in">
               Aucune partie trouvée.
             </p>
          )}

        </div>
      </main>
    </div>
  );
}
