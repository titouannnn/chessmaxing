"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChessStore } from "@/lib/store";
import { ChessBoard } from "@/components/chess-board";
import { Chess } from "chess.js";
import { Config } from "chessground/config";
import { Key } from "chessground/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronFirst, ChevronLeft, ChevronRight, ChevronLast, 
  Activity, Loader2, Settings2, ArrowUpDown, Layers, BarChart3, CheckCircle2
} from "lucide-react";
import { cn, logger } from "@/lib/utils";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, ReferenceLine, Tooltip } from "recharts";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

// --- Piece Icons Components ---
const PieceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'K': return <span className="inline-block text-[1.2em] leading-none translate-y-[1px] mr-0.5">♚</span>;
    case 'Q': return <span className="inline-block text-[1.2em] leading-none translate-y-[1px] mr-0.5">♛</span>;
    case 'R': return <span className="inline-block text-[1.2em] leading-none translate-y-[1px] mr-0.5">♜</span>;
    case 'B': return <span className="inline-block text-[1.2em] leading-none translate-y-[1px] mr-0.5">♝</span>;
    case 'N': return <span className="inline-block text-[1.2em] leading-none translate-y-[1px] mr-0.5">♞</span>;
    default: return null;
  }
};

const FormattedMove = ({ move }: { move: string }) => {
  const pieceMatch = move.match(/^([KQRBN])/);
  if (pieceMatch) {
    const piece = pieceMatch[1];
    const rest = move.substring(1);
    return <span className="inline-flex items-center"><PieceIcon type={piece} />{rest}</span>;
  }
  return <span>{move}</span>;
};

// --- Types ---
interface PVLine {
  id: number;
  depth: number;
  cp?: number;
  mate?: number;
  pv: string[];
  sanMoves: string[];
}

interface EngineInfo {
  depth: number;
  seldepth: number;
  nps: number;
  lines: PVLine[];
}

interface MoveEval {
  moveIndex: number;
  evaluation: number; 
  mate?: number;
  cp?: number;
}

export default function AnalysisPage() {
  const { selectedGame, username } = useChessStore();
  
  const [fen, setFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [history, setHistory] = useState<string[]>([]);
  const [clocks, setClocks] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [pgnInput, setPgnInput] = useState("");
  const [animateNext, setAnimateNext] = useState(true);

  // Refs for Scroll Control
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const historyContainerRef = useRef<HTMLDivElement>(null);

  // Analysis & UI Settings
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [multiPv, setMultiPv] = useState(2);
  const [showEngineArrows, setShowEngineArrows] = useState(true);
  const [showPlayedArrows, setShowPlayedArrows] = useState(true);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Review State
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState(0);
  const [gameEvaluations, setGameEvaluations] = useState<MoveEval[]>([]);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  
  const reviewQueueRef = useRef<string[]>([]);
  const reviewResultsRef = useRef<MoveEval[]>([]);
  const reviewCurrentIdx = useRef<number>(0);

  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [engineInfo, setEngineInfo] = useState<EngineInfo>({ depth: 0, seldepth: 0, nps: 0, lines: [] });
  const [displayedEval, setDisplayedEval] = useState({ height: 50, text: "0.0" });

  const workerRef = useRef<Worker | null>(null);
  const engineUpdateRef = useRef<EngineInfo>({ depth: 0, seldepth: 0, nps: 0, lines: [] });
  const lastUpdateTimeRef = useRef<number>(0);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastWheelTimeRef = useRef<number>(0);
  
  const [hoveredPosition, setHoveredPosition] = useState<string | null>(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0, visible: false });
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const TARGET_DEPTH = 18;
  const REVIEW_DEPTH = 16;

  const playerInfo = useMemo(() => {
    if (!selectedGame) return { 
      white: { name: "Blanc", rating: "" }, 
      black: { name: "Noir", rating: "" } 
    };
    return {
      white: { name: selectedGame.white.username, rating: selectedGame.white.rating },
      black: { name: selectedGame.black.username, rating: selectedGame.black.rating }
    };
  }, [selectedGame]);
// Initialize
useEffect(() => {
  if (selectedGame && selectedGame.pgn) {
    loadPgn(selectedGame.pgn);
    setShowReviewPrompt(true);
    setIsAnalyzing(true);

    // Auto-set orientation based on user point of view
    const isBlackPlayer = selectedGame.black.username.toLowerCase() === username.toLowerCase();
    setOrientation(isBlackPlayer ? "black" : "white");
  }
}, [selectedGame, username]);


  const loadPgn = (pgnStr: string) => {
    try {
      logger.info("Loading new PGN into analysis...");
      setAnimateNext(false);
      const chess = new Chess();
      chess.loadPgn(pgnStr);
      
      const newHistory = chess.history();
      const newClocks: string[] = [];
      
      // Start position (index -1)
      newClocks.push(""); 

      // Regex for [%clk 0:09:58.5]
      const clockRegex = /\{\[%clk\s+([\d:.]+)\]\}/g;
      const allClocks = Array.from(pgnStr.matchAll(clockRegex)).map(m => m[1]);

      for (let i = 0; i < newHistory.length; i++) {
        newClocks.push(allClocks[i] || "");
      }

      logger.info(`PGN loaded successfully: ${newHistory.length} moves.`);
      setHistory(newHistory);
      setClocks(newClocks);
      setCurrentMoveIndex(newHistory.length - 1);
      setPgnInput("");
      setGameEvaluations([]); 
      if (isAnalyzing) setIsInitialLoading(true);
    } catch (e) { 
      logger.error("Failed to load PGN: Invalid format.");
      console.error("Invalid PGN", e); 
    }
  };

  const handlePgnImport = () => {
    if (pgnInput.trim()) {
      loadPgn(pgnInput);
      setShowReviewPrompt(true);
      setIsAnalyzing(true);
    }
  };

  useEffect(() => {
    const chess = new Chess();
    for (let i = 0; i <= currentMoveIndex; i++) {
      try { chess.move(history[i]); } catch(e) {}
    }
    const newFen = chess.fen();
    setFen(newFen);
    
    // Immediate reset of internal depth only (Ref)
    engineUpdateRef.current.depth = 0;
    
    // Also reset state SYNC to prevent race conditions during renders
    setEngineInfo(prev => ({ ...prev, depth: 0, lines: [] }));

    if (chess.isGameOver()) {
        if (chess.isCheckmate()) {
            setDisplayedEval({ height: chess.turn() === 'w' ? 0 : 100, text: "M0" });
        } else {
            setDisplayedEval({ height: 50, text: "1/2" });
        }
    }
  }, [currentMoveIndex, history]);

  const goToStart = useCallback(() => { setAnimateNext(true); setCurrentMoveIndex(-1); }, []);
  const goToPrev = useCallback(() => { setAnimateNext(true); setCurrentMoveIndex((i) => Math.max(-1, i - 1)); }, []);
  const goToNext = useCallback(() => { setAnimateNext(true); setCurrentMoveIndex((i) => Math.min(history.length - 1, i + 1)); }, [history.length]);
  const goToEnd = useCallback(() => { setAnimateNext(true); setCurrentMoveIndex(history.length - 1); }, [history.length]);

  const handleWheel = useCallback((e: WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 45) { e.preventDefault(); return; }
    lastWheelTimeRef.current = now;
    if (e.deltaY > 0) goToNext();
    else goToPrev();
    e.preventDefault();
  }, [goToNext, goToPrev]);

  useEffect(() => {
    const board = boardContainerRef.current;
    const graph = graphContainerRef.current;
    const historyBox = historyContainerRef.current;
    const options = { passive: false };
    if (board) board.addEventListener('wheel', handleWheel, options);
    if (graph) graph.addEventListener('wheel', handleWheel, options);
    if (historyBox) historyBox.addEventListener('wheel', handleWheel, options);
    return () => {
      if (board) board.removeEventListener('wheel', handleWheel);
      if (graph) graph.removeEventListener('wheel', handleWheel);
      if (historyBox) historyBox.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  const startReview = () => {
    if (!history.length || !isEngineReady) return;
    setShowReviewPrompt(false);
    setIsReviewing(true);
    setReviewProgress(0);
    reviewCurrentIdx.current = 0;
    reviewResultsRef.current = [];
    const chess = new Chess();
    const fens = [chess.fen()];
    for (const move of history) {
      chess.move(move);
      fens.push(chess.fen());
    }
    reviewQueueRef.current = fens;
    workerRef.current?.postMessage("stop");
    workerRef.current?.postMessage("ucinewgame");
    workerRef.current?.postMessage("isready"); 
  };

  const processNextReviewMove = () => {
    const idx = reviewCurrentIdx.current;
    if (idx >= reviewQueueRef.current.length) {
      setGameEvaluations([...reviewResultsRef.current]);
      setIsReviewing(false);
      if (isAnalyzing) {
        workerRef.current?.postMessage(`position fen ${fen}`);
        workerRef.current?.postMessage("go infinite");
      }
      return;
    }
    setReviewProgress(Math.round((idx / (reviewQueueRef.current.length - 1)) * 100));
    
    const chess = new Chess(reviewQueueRef.current[idx]);
    if (chess.isGameOver()) {
        let val = 0;
        let mate: number | undefined = undefined;
        if (chess.isCheckmate()) {
            mate = 0;
            val = chess.turn() === 'w' ? -10 : 10;
        }
        reviewResultsRef.current[idx] = { 
            moveIndex: idx - 1, 
            evaluation: val === 0 ? 0 : 10 * (2 / (1 + Math.exp(-0.35 * val)) - 1), 
            mate 
        };
        reviewCurrentIdx.current++;
        setTimeout(processNextReviewMove, 10);
        return;
    }
    workerRef.current?.postMessage(`position fen ${reviewQueueRef.current[idx]}`);
    workerRef.current?.postMessage(`go depth ${REVIEW_DEPTH}`);
  };

  const handlePvMoveClick = (line: PVLine, moveIdx: number) => {
    const chess = new Chess(fen);
    const newMoves = [];
    for (let i = 0; i <= moveIdx; i++) {
      try {
        const move = chess.move(line.pv[i]);
        newMoves.push(move.san);
      } catch (err) { break; }
    }
    if (newMoves.length > 0) {
      const newHistory = [...history.slice(0, currentMoveIndex + 1), ...newMoves];
      setHistory(newHistory);
      setCurrentMoveIndex(newHistory.length - 1);
      setAnimateNext(true);
    }
  };

  const onMove = (orig: Key, dest: Key) => {
    const chess = new Chess(fen);
    try {
      const moves = chess.moves({ verbose: true });
      const isPromotion = moves.some(m => m.from === orig && m.to === dest && m.flags.includes('p'));
      const move = chess.move({ from: orig, to: dest, promotion: isPromotion ? 'q' : undefined });
      if (move) {
        setAnimateNext(false);
        const newHistory = [...history.slice(0, currentMoveIndex + 1), move.san];
        setHistory(newHistory);
        setCurrentMoveIndex(newHistory.length - 1);
        setGameEvaluations([]); 
      }
    } catch (e) { setFen(chess.fen()); }
  };
  // Stockfish Communication
  useEffect(() => {
    logger.engine("Initializing Stockfish Worker...");
    const worker = new Worker("/stockfish/stockfish-18-lite-single.js");
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const line: string = e.data;
      if (line === "readyok") {
        logger.engine("Stockfish readyok received.");
        setIsEngineReady(true);
        if (isReviewing) processNextReviewMove();
      }

      if (line.startsWith("bestmove") && isReviewing) {
        reviewCurrentIdx.current++;
        processNextReviewMove();
        return;
      }
      if (line.startsWith("info depth")) {
        const depth = parseInt(line.match(/\bdepth (\d+)/)?.[1] || "0");
        const scoreMatch = line.match(/\bscore (cp|mate) (-?\d+)/);
        const pvMatch = line.match(/\bpv\s+(.*)$/);
        
        if (isReviewing && scoreMatch) {
          const chess = new Chess(reviewQueueRef.current[reviewCurrentIdx.current]);
          const multiplier = chess.turn() === 'w' ? 1 : -1;
          let cp: number | undefined = undefined;
          let mate: number | undefined = undefined;
          let whiteRelativeEval = 0;
          if (scoreMatch[1] === "cp") {
            const rawCp = parseInt(scoreMatch[2], 10);
            cp = rawCp * multiplier;
            whiteRelativeEval = Math.max(-7, Math.min(7, cp / 100));
          } else {
            const rawMate = parseInt(scoreMatch[2], 10);
            mate = rawMate * multiplier;
            const mateVal = rawMate === 0 ? -15 : rawMate;
            whiteRelativeEval = (mateVal * multiplier > 0 ? 10 : -10);
          }
          const transformed = 10 * (2 / (1 + Math.exp(-0.35 * whiteRelativeEval)) - 1);
          reviewResultsRef.current[reviewCurrentIdx.current] = { 
            moveIndex: reviewCurrentIdx.current - 1, evaluation: transformed, mate, cp
          };
        }

        if (!isReviewing) {
          const seldepth = parseInt(line.match(/\bseldepth (\d+)/)?.[1] || "0");
          const nps = parseInt(line.match(/\bnps (\d+)/)?.[1] || "0");
          const multipvIdx = parseInt(line.match(/\bmultipv (\d+)/)?.[1] || "1");
          engineUpdateRef.current.depth = depth;
          engineUpdateRef.current.seldepth = seldepth;
          engineUpdateRef.current.nps = nps;
          if (pvMatch && scoreMatch) {
            const pvStr = pvMatch[1].split(" ");
            const uciMoves = pvStr.filter(m => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m));
            const tempChess = new Chess(fen);
            const sanMoves: string[] = [];
            for (const uci of uciMoves) {
              try { const move = tempChess.move(uci); sanMoves.push(move.san); } catch (err) { break; }
            }
            const newLine: PVLine = {
              id: multipvIdx, depth, pv: uciMoves, sanMoves,
              cp: scoreMatch[1] === "cp" ? parseInt(scoreMatch[2], 10) : undefined,
              mate: scoreMatch[1] === "mate" ? parseInt(scoreMatch[2], 10) : undefined
            };
            const lines = [...engineUpdateRef.current.lines];
            const existingIdx = lines.findIndex(l => l.id === multipvIdx);
            if (existingIdx !== -1) lines[existingIdx] = newLine;
            else lines.push(newLine);
            engineUpdateRef.current.lines = lines.sort((a, b) => a.id - b.id);
          }
          const now = Date.now();
          if (now - lastUpdateTimeRef.current > 150) {
            setEngineInfo({ ...engineUpdateRef.current });
            lastUpdateTimeRef.current = now;
            if (depth >= TARGET_DEPTH) setIsInitialLoading(false);
          }
        }
      }
    };
    worker.postMessage("uci");
    worker.postMessage("setoption name Hash value 32");
    worker.postMessage(`setoption name MultiPV value ${multiPv}`);
    worker.postMessage("isready");
    return () => {
      if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
      worker.terminate();
    };
  }, [multiPv, fen, isReviewing]); 

  useEffect(() => {
    if (!workerRef.current || !isEngineReady || isReviewing) return;
    if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    workerRef.current.postMessage("stop");
    if (isAnalyzing) {
      analysisTimeoutRef.current = setTimeout(() => {
        workerRef.current?.postMessage(`position fen ${fen}`);
        workerRef.current?.postMessage("go infinite");
      }, 250); 
    } else setIsInitialLoading(false);
  }, [fen, isAnalyzing, isEngineReady, isReviewing]);

  // Unified Evaluation Logic (No race conditions)
  useEffect(() => {
    if (!isAnalyzing) {
      setDisplayedEval({ height: 50, text: "0.0" });
      return;
    }
    const best = engineInfo.lines.find(l => l.id === 1);
    // STABILITY LOCK: Wait for depth 5 to avoid flips or erratic jumps
    if (engineInfo.depth >= 5 && best && (best.cp !== undefined || best.mate !== undefined)) {
      const turn = new Chess(fen).turn();
      const multiplier = turn === 'w' ? 1 : -1;
      let h = 50;
      let txt = "0.0";
      if (best.mate !== undefined) {
        h = (best.mate * multiplier > 0) ? 100 : 0;
        txt = `M${Math.abs(best.mate)}`;
      } else if (best.cp !== undefined) {
        const advantage = (best.cp / 100) * multiplier;
        h = 50 + (50 * (2 / (1 + Math.exp(-0.35 * advantage)) - 1));
        txt = (advantage > 0 ? "+" : "") + advantage.toFixed(1);
      }
      setDisplayedEval({ height: h, text: txt });
    }
  }, [engineInfo, isAnalyzing, fen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case "ArrowLeft": goToPrev(); break;
        case "ArrowRight": goToNext(); break;
        case "ArrowUp": goToEnd(); break;
        case "ArrowDown": goToStart(); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, goToStart, goToEnd]);

  const actualNextMove = useMemo(() => {
    if (currentMoveIndex >= history.length - 1) return null;
    const chess = new Chess(fen);
    try {
      const move = chess.move(history[currentMoveIndex + 1]);
      return { orig: move.from as Key, dest: move.to as Key };
    } catch (e) { return null; }
  }, [currentMoveIndex, history, fen]);

  const autoShapes = useMemo(() => {
    const shapes = [];
    if (showPlayedArrows && actualNextMove) shapes.push({ orig: actualNextMove.orig, dest: actualNextMove.dest, brush: "green" });
    const best = engineInfo.lines.find(l => l.id === 1);
    if (showEngineArrows && isAnalyzing && best && engineInfo.depth > 0 && best.pv.length > 0) {
      const move = best.pv[0];
      const orig = move.substring(0, 2) as Key;
      const dest = move.substring(2, 4) as Key;
      if (!actualNextMove || orig !== actualNextMove.orig || dest !== actualNextMove.dest) {
        shapes.push({ orig, dest, brush: "blue" });
      }
    }
    return shapes;
  }, [isAnalyzing, engineInfo, actualNextMove, showEngineArrows, showPlayedArrows]);

  const config: Config = {
    fen, orientation,
    turnColor: new Chess(fen).turn() === 'w' ? 'white' : 'black',
    movable: {
      color: new Chess(fen).turn() === 'w' ? 'white' : 'black',
      free: false,
      dests: (() => {
        const dests = new Map();
        new Chess(fen).moves({ verbose: true }).forEach(m => {
          if (!dests.has(m.from)) dests.set(m.from, []);
          dests.get(m.from).push(m.to);
        });
        return dests;
      })(),
      events: { after: onMove }
    },
    drawable: { enabled: true, visible: true, autoShapes },
    animation: { enabled: animateNext, duration: 250 }
  };

  const handleMoveHover = (line: PVLine, moveIdx: number, e: React.MouseEvent) => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    const container = e.currentTarget.closest('.pv-line-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      setPreviewPos({ x: rect.left, y: rect.bottom + 8, visible: true });
    }
    const tempChess = new Chess(fen);
    for (let i = 0; i <= moveIdx; i++) {
      try { tempChess.move(line.pv[i]); } catch(err) { break; }
    }
    setHoveredPosition(tempChess.fen());
  };

  const handleHoverLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setPreviewPos(prev => ({ ...prev, visible: false }));
      setHoveredPosition(null);
    }, 100);
  };

  return (
    <main className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 text-white min-h-screen bg-[#0a0a0a]">
      <div className="flex items-center justify-between">
        <div className="space-y-1"><h1 className="text-3xl font-display font-bold tracking-tight">Analyse</h1><p className="text-sm text-stone-500 font-manrope">{selectedGame ? `Partie contre ${selectedGame.white.username} vs ${selectedGame.black.username}` : "Échiquier d'analyse libre."}</p></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start relative">
        <div className={`fixed z-[100] pointer-events-none shadow-2xl border border-blue-500/30 rounded-lg overflow-hidden bg-[#1a1a1a] transition-all duration-300 ease-out ${previewPos.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ top: 0, left: 0, transform: `translate3d(${previewPos.x}px, ${previewPos.y}px, 0)`, width: '200px', height: '200px' }}><div className="w-full h-full" style={{ boxSizing: 'content-box' }}>{hoveredPosition && <ChessBoard config={{ fen: hoveredPosition, orientation, viewOnly: true, animation: { enabled: true, duration: 250 } }} />}</div></div>

        {isInitialLoading && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl gap-4">
             <Activity className="size-12 text-blue-500 animate-spin" />
             <div className="text-center"><h3 className="text-xl font-bold">Initialisation Stockfish...</h3><p className="text-sm text-stone-400">Profondeur {engineInfo.depth}/{TARGET_DEPTH}</p></div>
          </div>
        )}

        <div className="w-full lg:w-[65%] xl:w-[70%] flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2 p-2 bg-white/[0.02] border border-white/5 rounded-xl relative">
              <Button variant="ghost" size="icon" onClick={goToStart} disabled={currentMoveIndex === -1} className="text-stone-400 hover:text-white h-8 w-8"><ChevronFirst className="size-4" /></Button>
              <Button variant="ghost" size="icon" onClick={goToPrev} disabled={currentMoveIndex === -1} className="text-stone-400 hover:text-white h-8 w-8"><ChevronLeft className="size-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`transition-colors h-8 w-8 ${isSettingsOpen ? 'text-blue-400 bg-white/5' : 'text-stone-400 hover:text-white'}`}><Settings2 className="size-4" /></Button>
              <Button variant="ghost" size="icon" onClick={goToNext} disabled={currentMoveIndex === history.length - 1} className="text-stone-400 hover:text-white h-8 w-8"><ChevronRight className="size-4" /></Button>
              <Button variant="ghost" size="icon" onClick={goToEnd} disabled={currentMoveIndex === history.length - 1} className="text-stone-400 hover:text-white h-8 w-8"><ChevronLast className="size-4" /></Button>
            </div>
            {isSettingsOpen && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col gap-2"><span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Vue</span><Button variant="outline" size="sm" className="h-8 text-[10px] bg-white/5 border-white/10 hover:bg-white/10" onClick={() => setOrientation(orientation === "white" ? "black" : "white")}><ArrowUpDown className="size-3 mr-2" /> Tourner</Button></div>
                <div className="flex flex-col gap-2"><span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Moteur</span><div className="flex items-center justify-between bg-white/5 px-2 h-8 rounded border border-white/5"><span className="text-[9px] font-bold text-stone-400">Flèches SF</span><Switch checked={showEngineArrows} onCheckedChange={setShowEngineArrows} className="scale-75" /></div></div>
                <div className="flex flex-col gap-2"><span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Partie</span><div className="flex items-center justify-between bg-white/5 px-2 h-8 rounded border border-white/5"><span className="text-[9px] font-bold text-stone-400">Flèches Coups</span><Switch checked={showPlayedArrows} onCheckedChange={setShowPlayedArrows} className="scale-75" /></div></div>
                <div className="flex flex-col gap-2"><span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Analyse</span><Select value={multiPv.toString()} onValueChange={(v) => setMultiPv(parseInt(v))}><SelectTrigger className="h-8 bg-white/5 border-white/10 text-[10px] font-bold"><SelectValue /></SelectTrigger><SelectContent className="bg-[#1a1a1a] border-white/10">{[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={n.toString()} className="text-[10px]">{n} Lignes</SelectItem>)}</SelectContent></Select></div>
              </div>
            )}
          </div>

          <div ref={boardContainerRef} className="flex flex-row w-full gap-4 relative">
            {isReviewing && (
              <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl gap-6"><div className="text-center space-y-2"><Activity className="size-10 text-blue-500 animate-pulse mx-auto" /><h3 className="text-xl font-bold">Analyse globale...</h3><p className="text-sm text-stone-400 font-mono italic">Évaluation de chaque coup</p></div><div className="w-full max-w-xs space-y-2"><Progress value={reviewProgress} className="h-2 bg-white/10" /><p className="text-[10px] font-black uppercase text-center text-stone-500 tracking-widest">{reviewProgress}% terminé</p></div></div>
            )}
            <div className="w-8 shrink-0 bg-[#1a1a1a] border border-white/10 rounded-md overflow-hidden flex flex-col justify-end relative shadow-inner">
               <div 
                 className={`w-full transition-all duration-700 ease-in-out bg-white opacity-100`} 
                 style={{ height: `${displayedEval.height}%` }} 
               />
               <div className="absolute bottom-2 w-full text-center text-[10px] font-black text-white z-10 mix-blend-difference">
                 {displayedEval.text}
               </div>
            </div>

            {/* Board Wrapper with Player Info */}
            <div className="flex-grow flex flex-col gap-2">
               {/* Top Player */}
               <div className="flex items-center justify-between px-1 h-6">
                 <div className="flex items-center gap-2">
                   <div className="size-5 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold uppercase">
                     {orientation === "white" ? "B" : "W"}
                   </div>
                   <span className="text-xs font-bold text-stone-300">
                     {orientation === "white" ? playerInfo.black.name : playerInfo.white.name}
                     <span className="ml-2 text-[10px] text-stone-600 font-medium">
                       ({orientation === "white" ? playerInfo.black.rating : playerInfo.white.rating})
                     </span>
                   </span>
                 </div>
                 {/* Clock Top */}
                 <div className="bg-white/5 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-stone-400">
                    {orientation === "white" 
                      ? (clocks[currentMoveIndex + 1] || "0:00") 
                      : (clocks[currentMoveIndex + 1] || "0:00")}
                 </div>
               </div>


               <div className="aspect-square w-full bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden shadow-2xl shadow-black relative cursor-crosshair">
                 <ChessBoard config={config} />
               </div>

               {/* Bottom Player */}
               <div className="flex items-center justify-between px-1 h-6">
                 <div className="flex items-center gap-2">
                   <div className="size-5 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold uppercase">
                     {orientation === "white" ? "W" : "B"}
                   </div>
                   <span className="text-xs font-bold text-stone-300">
                     {orientation === "white" ? playerInfo.white.name : playerInfo.black.name}
                     <span className="ml-2 text-[10px] text-stone-600 font-medium">
                       ({orientation === "white" ? playerInfo.white.rating : playerInfo.black.rating})
                     </span>
                   </span>
                 </div>
                 {/* Clock Bottom */}
                 <div className="bg-white/10 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-white">
                    {orientation === "white" 
                      ? (clocks[currentMoveIndex + 1] || "0:00") 
                      : (clocks[currentMoveIndex + 1] || "0:00")}
                 </div>
               </div>
            </div>
          </div>

          <div 
            onClick={!gameEvaluations.length && !isReviewing && history.length > 0 ? startReview : undefined}
            className={cn(
              "min-h-[100px] w-full bg-white/[0.02] border border-white/[0.05] rounded-xl p-6 flex flex-col items-center justify-center relative transition-all overflow-hidden",
              !gameEvaluations.length && !isReviewing && history.length > 0 && "cursor-pointer hover:bg-white/[0.05] hover:border-blue-500/20 group/bilan"
            )}
          >
            {gameEvaluations.length > 0 ? (
               <div className="w-full h-full animate-in fade-in slide-in-from-bottom-2">
                 <ChartContainer config={{ evaluation: { label: "Éval", color: "#fff" } }} className="h-[180px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart 
                      data={gameEvaluations} 
                      onClick={(s: any) => {
                        if (s && s.activePayload && s.activePayload.length > 0) {
                          // Perfect sync: moveIndex matches currentMoveIndex
                          setCurrentMoveIndex(s.activePayload[0].payload.moveIndex);
                        }
                      }}
                     >
                       <defs><linearGradient id="colorEval" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fff" stopOpacity={0.3}/><stop offset="95%" stopColor="#fff" stopOpacity={0}/></linearGradient></defs>
                       <XAxis dataKey="moveIndex" type="number" domain={['dataMin', 'dataMax']} hide />
                       <YAxis domain={[-10, 10]} hide />
                       <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload?.[0]) {
                              const data = payload[0].payload as MoveEval;
                              // Always show eval from WHITE perspective (standard)
                              const val = (data.cp ?? 0) / 100;
                              let text = data.mate !== undefined ? `M${Math.abs(data.mate)}` : (val > 0 ? "+" : "") + val.toFixed(1);
                              if (data.mate !== undefined && data.mate < 0) text = `-M${Math.abs(data.mate)}`;

                              const moveNum = data.moveIndex === -1 ? "Départ" : `Coup ${Math.floor(data.moveIndex / 2) + 1}${data.moveIndex % 2 === 0 ? ' (B)' : ' (N)'}`;
                              return (
                                <div className="bg-[#1a1a1a] border border-white/10 p-2 rounded shadow-xl">
                                  <p className="text-[9px] text-stone-500 uppercase font-black mb-1">{moveNum}</p>
                                  <p className="text-[11px] font-bold text-white">{text}</p>
                                </div>
                              );
                            }
                            return null;
                          }} 
                       />
                       <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                       <ReferenceLine x={currentMoveIndex} stroke="#ef4444" strokeWidth={2} />
                       <Area type="linear" dataKey="evaluation" stroke="#fff" fillOpacity={1} fill="url(#colorEval)" isAnimationActive={false} />
                     </AreaChart>
                   </ResponsiveContainer>
                 </ChartContainer>

                 <div className="w-full flex justify-between px-1 opacity-30 text-[8px] font-bold uppercase tracking-tighter"><span>Début</span><span>Fin</span></div>
               </div>
            ) : !isReviewing && history.length > 0 ? (
               <div className="flex flex-col items-center gap-3 transition-all">
                  <BarChart3 className="size-8 text-stone-600 group-hover/bilan:text-blue-400 group-hover/bilan:scale-110 transition-all" />
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-500 group-hover/bilan:text-blue-200 transition-colors">Lancer l'analyse du bilan</span>
                    <span className="text-[9px] text-stone-700 font-medium">Analyse complète à la profondeur 16</span>
                  </div>
               </div>
            ) : <span className="text-[10px] font-bold text-stone-700 uppercase tracking-widest">Aucune donnée</span>}
          </div>

        </div>

        <div className="w-full lg:w-[35%] xl:w-[30%] flex flex-col gap-6 self-stretch">
          <div className="bg-[#141414] border border-white/[0.05] rounded-xl p-4 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between"><div className="flex items-center gap-3"><Activity className={`size-5 ${isAnalyzing ? 'text-blue-400 animate-pulse' : 'text-stone-600'}`} /><div className="flex flex-col"><h2 className="text-sm font-bold text-stone-200">Stockfish 18</h2><span className="text-[10px] text-stone-500 font-mono">{isAnalyzing ? `${engineInfo.depth}/${engineInfo.seldepth} • ${engineInfo.nps.toLocaleString()} nps` : 'Désactivé'}</span></div></div><Switch checked={isAnalyzing} onCheckedChange={setIsAnalyzing} className="data-[state=checked]:bg-blue-500" /></div>
            {isAnalyzing && engineInfo.lines.length > 0 && (
              <div className="space-y-0 pt-2 border-t border-white/5 relative">
                {engineInfo.lines.map((line) => (
                  <div key={line.id} className="pv-line-container flex gap-3 items-center py-2.5 px-2 hover:bg-white/[0.04] border-b border-white/[0.03] last:border-0 transition-colors group relative">
                    <span className={`text-[10px] font-black tabular-nums min-w-[36px] px-1 py-0.5 rounded text-center shrink-0 ${line.mate !== undefined ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>{line.mate !== undefined ? `M${Math.abs(line.mate)}` : (line.cp! / 100 > 0 ? "+" : "") + (line.cp! / 100).toFixed(1)}</span>
                    <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 overflow-hidden">
                      {line.sanMoves.slice(0, 8).map((move, i) => (
                        <span key={i} className="text-[11px] font-mono text-stone-400 hover:text-white cursor-pointer transition-colors" onMouseEnter={(e) => handleMoveHover(line, i, e)} onMouseLeave={handleHoverLeave} onClick={() => handlePvMoveClick(line, i)}><FormattedMove move={move} /></span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col flex-grow">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500 mb-4 shrink-0">Historique</h2>
            <div ref={historyContainerRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[200px]">{history.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">{Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                    <div key={i} className="flex col-span-2 text-sm font-medium font-mono text-stone-400 border-b border-white/[0.02] py-0.5"><div className="w-8 text-stone-600 text-right pr-2 text-[11px]">{i + 1}.</div><div className={`flex-1 cursor-pointer hover:bg-white/5 rounded px-2 ${currentMoveIndex === i * 2 ? 'bg-chess-light/20 text-chess-light font-bold border-l-2 border-chess-light' : ''}`} onClick={() => setCurrentMoveIndex(i * 2)}><FormattedMove move={history[i * 2]} /></div>{history[i * 2 + 1] && <div className={`flex-1 cursor-pointer hover:bg-white/5 rounded px-2 ${currentMoveIndex === i * 2 + 1 ? 'bg-chess-light/20 text-chess-light font-bold border-l-2 border-chess-light' : ''}`} onClick={() => setCurrentMoveIndex(i * 2 + 1)}><FormattedMove move={history[i * 2 + 1]} /></div>}</div>
                  ))}</div>
              ) : <div className="h-full flex items-center justify-center text-[10px] font-bold text-stone-700 uppercase">Vide</div>}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col gap-3 shrink-0"><h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Importer</h2><div className="flex flex-col gap-2"><Textarea placeholder="PGN..." className="min-h-[50px] bg-white/[0.01] border-white/10 text-[10px] font-mono p-2" value={pgnInput} onChange={(e) => setPgnInput(e.target.value)} /><Button onClick={handlePgnImport} className="w-full bg-white/10 hover:bg-white/20 h-7 text-[10px] uppercase font-bold tracking-widest">Charger</Button></div></div>
        </div>
      </div>
    </main>
  );
}
