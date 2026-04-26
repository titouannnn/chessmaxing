"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
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
  Activity, Settings2, ArrowUpDown, BarChart3, CornerDownRight
} from "lucide-react";
import { cn, logger } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, ReferenceLine, Tooltip } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

// --- Constants (Lichess Multipliers) ---
const LICHESS_MULTIPLIER = -0.00368208;

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

// --- Icons ---
const FormattedMove = ({ move }: { move: string }) => {
  const pieceMatch = move.match(/^([KQRBN])/);
  const PieceIcon = (type: string) => {
    switch (type) {
      case 'K': return "♚"; case 'Q': return "♛"; case 'R': return "♜"; case 'B': return "♝"; case 'N': return "♞";
      default: return "";
    }
  };
  if (pieceMatch) {
    return <span className="inline-flex items-center"><span className="mr-0.5 opacity-80">{PieceIcon(pieceMatch[1])}</span>{move.substring(1)}</span>;
  }
  return <span>{move}</span>;
};

// --- Utils ---
const getWinningChance = (cp: number) => {
  return 2 / (1 + Math.exp(LICHESS_MULTIPLIER * cp)) - 1;
};

const getMateCp = (mate: number) => {
  const cp = (21 - Math.min(10, Math.abs(mate))) * 100;
  return cp * (mate > 0 ? 1 : -1);
};

export default function AnalysisPage() {
  const { selectedGame, username } = useChessStore();
  
  // --- States ---
  const [fen, setFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [history, setHistory] = useState<string[]>([]);
  const [mainHistory, setMainHistory] = useState<string[]>([]);
  const [clocks, setClocks] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [pgnInput, setPgnInput] = useState("");
  const [animateNext, setAnimateNext] = useState(true);
  const [promotionMove, setPromotionMove] = useState<{ orig: Key; dest: Key } | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [multiPv, setMultiPv] = useState(2);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showEngineArrows, setShowEngineArrows] = useState(true);
  const [showPlayedArrows, setShowPlayedArrows] = useState(true);

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState(0);
  const [gameEvaluations, setGameEvaluations] = useState<MoveEval[]>([]);

  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [engineInfo, setEngineInfo] = useState<EngineInfo>({ depth: 0, seldepth: 0, nps: 0, lines: [] });
  const [displayedEval, setDisplayedEval] = useState({ height: 50, text: "0.0" });

  const [hoveredPosition, setHoveredPosition] = useState<string | null>(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0, visible: false });

  // --- Refs ---
  const workerRef = useRef<Worker | null>(null);
  const onMessageRef = useRef<(e: MessageEvent) => void>();
  const engineUpdateRef = useRef<EngineInfo>({ depth: 0, seldepth: 0, nps: 0, lines: [] });
  const reviewQueueRef = useRef<string[]>([]);
  const reviewResultsRef = useRef<MoveEval[]>([]);
  const reviewCurrentIdx = useRef<number>(0);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const lastWheelTimeRef = useRef<number>(0);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const boardContainerRef = useRef<HTMLDivElement>(null);
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const activeMoveRef = useRef<HTMLDivElement>(null);

  const TARGET_DEPTH = 18;
  const REVIEW_DEPTH = 18;

  // --- Functions ---
  const goToStart = useCallback(() => { setAnimateNext(true); setCurrentMoveIndex(-1); }, []);
  const goToPrev = useCallback(() => { setAnimateNext(true); setCurrentMoveIndex((i) => Math.max(-1, i - 1)); }, []);
  const goToNext = useCallback(() => { setAnimateNext(true); setCurrentMoveIndex((i) => Math.min(history.length - 1, i + 1)); }, [history.length]);
  const goToEnd = useCallback(() => { setAnimateNext(true); setCurrentMoveIndex(history.length - 1); }, [history.length]);

  const loadPgn = useCallback((pgnStr: string) => {
    if (!pgnStr) return;
    try {
      console.group("Chargement PGN");
      const cleanPgn = pgnStr.replace(/^\uFEFF/, "").trim();
      const chess = new Chess();
      chess.loadPgn(cleanPgn);
      const newHistory = chess.history();
      setHistory(newHistory);
      setMainHistory(newHistory);
      const newClocks: string[] = [""];
      const tempChess = new Chess();
      const moves = chess.history({ verbose: true });
      tempChess.reset();
      for (const move of moves) {
        tempChess.move(move);
        const comment = tempChess.getComment();
        const clockMatch = comment?.match(/\[%clk\s+([\d:.]+)\]/);
        newClocks.push(clockMatch ? clockMatch[1] : "");
      }
      setClocks(newClocks);
      setCurrentMoveIndex(newHistory.length - 1);
      setGameEvaluations([]); 
      if (isAnalyzing) setIsInitialLoading(true);
      console.groupEnd();
    } catch (e) { console.error("PGN Error", e); console.groupEnd(); }
  }, [isAnalyzing]);

  const processNextReviewMove = useCallback(() => {
    const idx = reviewCurrentIdx.current;
    if (idx >= reviewQueueRef.current.length) {
      setGameEvaluations([...reviewResultsRef.current.filter(Boolean)]);
      setIsReviewing(false);
      workerRef.current?.postMessage(`setoption name MultiPV value ${multiPv}`);
      if (isAnalyzing) {
        workerRef.current?.postMessage(`position fen ${fen}`);
        workerRef.current?.postMessage("go infinite");
      }
      return;
    }
    setReviewProgress(Math.round((idx / (reviewQueueRef.current.length - 1)) * 100));
    if (idx > 0 && idx % 5 === 0) setGameEvaluations([...reviewResultsRef.current.filter(Boolean)]);

    const chess = new Chess(reviewQueueRef.current[idx]);
    if (chess.isGameOver()) {
      const turn = chess.turn();
      const winProb = chess.isCheckmate() ? (turn === 'w' ? -1 : 1) : 0;
      reviewResultsRef.current[idx] = { moveIndex: idx - 1, evaluation: winProb * 10 };
      reviewCurrentIdx.current++;
      setTimeout(processNextReviewMove, 10);
      return;
    }
    workerRef.current?.postMessage(`position fen ${reviewQueueRef.current[idx]}`);
    workerRef.current?.postMessage(`go depth ${REVIEW_DEPTH}`);
  }, [fen, isAnalyzing, multiPv]);

  const startReview = useCallback(() => {
    if (!history.length || !isEngineReady) return;
    setIsReviewing(true);
    setReviewProgress(0);
    reviewCurrentIdx.current = 0;
    reviewResultsRef.current = [];
    const chess = new Chess();
    const fens = [chess.fen()];
    for (const move of history) { chess.move(move); fens.push(chess.fen()); }
    reviewQueueRef.current = fens;
    workerRef.current?.postMessage("stop");
    workerRef.current?.postMessage("setoption name MultiPV value 1");
    workerRef.current?.postMessage("ucinewgame");
    workerRef.current?.postMessage("isready"); 
  }, [history, isEngineReady]);

  const onMove = useCallback((orig: Key, dest: Key) => {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    const isPromotion = moves.some(m => m.from === orig && m.to === dest && m.flags.includes('p'));
    if (isPromotion) { setPromotionMove({ orig, dest }); return; }
    const move = chess.move({ from: orig, to: dest });
    if (move) {
      setAnimateNext(false);
      if (history[currentMoveIndex + 1] === move.san) {
        setCurrentMoveIndex(currentMoveIndex + 1);
      } else {
        setHistory([...history.slice(0, currentMoveIndex + 1), move.san]);
        setCurrentMoveIndex(currentMoveIndex + 1);
        setGameEvaluations([]); 
      }
    }
  }, [fen, history, currentMoveIndex]);

  const handlePromotion = useCallback((piece: 'q' | 'r' | 'b' | 'n') => {
    if (!promotionMove) return;
    const chess = new Chess(fen);
    const move = chess.move({ from: promotionMove.orig, to: promotionMove.dest, promotion: piece });
    if (move) {
      setAnimateNext(false);
      if (history[currentMoveIndex + 1] === move.san) {
        setCurrentMoveIndex(currentMoveIndex + 1);
      } else {
        setHistory([...history.slice(0, currentMoveIndex + 1), move.san]);
        setCurrentMoveIndex(currentMoveIndex + 1);
        setGameEvaluations([]); 
      }
    }
    setPromotionMove(null);
  }, [promotionMove, fen, history, currentMoveIndex]);

  const handlePvMoveClick = useCallback((line: PVLine, moveIdx: number) => {
    const chess = new Chess(fen);
    const newMoves = [];
    for (let i = 0; i <= moveIdx; i++) {
      try { const move = chess.move(line.pv[i]); newMoves.push(move.san); } catch (err) { break; }
    }
    if (newMoves.length > 0) {
      let isSame = true;
      for (let i = 0; i < newMoves.length; i++) {
        if (history[currentMoveIndex + 1 + i] !== newMoves[i]) { isSame = false; break; }
      }
      if (isSame) {
        setCurrentMoveIndex(currentMoveIndex + newMoves.length);
      } else {
        setHistory([...history.slice(0, currentMoveIndex + 1), ...newMoves]);
        setCurrentMoveIndex(currentMoveIndex + newMoves.length);
        setAnimateNext(true);
        setGameEvaluations([]);
      }
    }
  }, [fen, history, currentMoveIndex]);

  // --- Effects ---
  useEffect(() => {
    if (selectedGame?.pgn) {
      loadPgn(selectedGame.pgn);
      setIsAnalyzing(true);
      setOrientation(selectedGame.black.username.toLowerCase() === username.toLowerCase() ? "black" : "white");
    }
  }, [selectedGame, username, loadPgn]);

  useEffect(() => {
    const chess = new Chess();
    for (let i = 0; i <= currentMoveIndex; i++) { try { chess.move(history[i]); } catch(e) {} }
    setFen(chess.fen());
    setEngineInfo({ depth: 0, seldepth: 0, nps: 0, lines: [] });
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) setDisplayedEval({ height: chess.turn() === 'w' ? 0 : 100, text: "M0" });
      else setDisplayedEval({ height: 50, text: "1/2" });
    }
  }, [currentMoveIndex, history]);

  useEffect(() => {
    const worker = new Worker("/stockfish/stockfish-18-lite-single.js");
    workerRef.current = worker;
    worker.onmessage = (e) => onMessageRef.current?.(e);
    worker.postMessage("uci");
    worker.postMessage("setoption name Hash value 32");
    worker.postMessage("isready");
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    onMessageRef.current = (e) => {
      const line: string = e.data;
      if (line === "readyok") setIsEngineReady(true);
      if (line.startsWith("bestmove") && isReviewing) { reviewCurrentIdx.current++; processNextReviewMove(); return; }
      if (line.startsWith("info depth")) {
        const depth = parseInt(line.match(/\bdepth (\d+)/)?.[1] || "0");
        const scoreMatch = line.match(/\bscore (cp|mate) (-?\d+)/);
        const pvMatch = line.match(/\bpv\s+(.*)$/);
        
        if (isReviewing && scoreMatch) {
          const turn = new Chess(reviewQueueRef.current[reviewCurrentIdx.current]).turn();
          const multiplier = turn === 'w' ? 1 : -1;
          const cp = scoreMatch[1] === "cp" ? parseInt(scoreMatch[2], 10) : undefined;
          const mate = scoreMatch[1] === "mate" ? parseInt(scoreMatch[2], 10) : undefined;
          const val = cp !== undefined ? cp * multiplier : getMateCp(mate! * multiplier);
          const winProb = getWinningChance(val);
          reviewResultsRef.current[reviewCurrentIdx.current] = { 
            moveIndex: reviewCurrentIdx.current - 1, 
            evaluation: winProb * 10, 
            mate, cp: val
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
            for (const uci of uciMoves) { try { const move = tempChess.move(uci); sanMoves.push(move.san); } catch (err) { break; } }
            const newLine = { id: multipvIdx, depth, pv: uciMoves, sanMoves, cp: scoreMatch[1] === "cp" ? parseInt(scoreMatch[2], 10) : undefined, mate: scoreMatch[1] === "mate" ? parseInt(scoreMatch[2], 10) : undefined };
            const lines = [...engineUpdateRef.current.lines];
            const existingIdx = lines.findIndex(l => l.id === multipvIdx);
            if (existingIdx !== -1) lines[existingIdx] = newLine; else lines.push(newLine);
            engineUpdateRef.current.lines = lines.sort((a, b) => a.id - b.id);
          }
          if (Date.now() - lastUpdateTimeRef.current > 150) {
            setEngineInfo({ ...engineUpdateRef.current });
            lastUpdateTimeRef.current = Date.now();
            if (depth >= TARGET_DEPTH) setIsInitialLoading(false);
          }
        }
      }
    };
  }, [isReviewing, fen, processNextReviewMove]);

  useEffect(() => {
    if (!workerRef.current || !isEngineReady || isReviewing) return;
    workerRef.current.postMessage(`setoption name MultiPV value ${multiPv}`);
    workerRef.current.postMessage("stop");
    if (isAnalyzing) {
      if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = setTimeout(() => {
        workerRef.current?.postMessage(`position fen ${fen}`);
        workerRef.current?.postMessage("go infinite");
      }, 100);
    } else setIsInitialLoading(false);
  }, [fen, isAnalyzing, isEngineReady, isReviewing, multiPv]);

  useEffect(() => {
    if (!isAnalyzing) { setDisplayedEval({ height: 50, text: "0.0" }); return; }
    const best = engineInfo.lines.find(l => l.id === 1);
    if (engineInfo.depth >= 4 && best && (best.cp !== undefined || best.mate !== undefined)) {
      const turn = new Chess(fen).turn();
      const multiplier = turn === 'w' ? 1 : -1;
      if (best.mate !== undefined) {
        setDisplayedEval({ height: (best.mate * multiplier > 0) ? 100 : 0, text: `M${Math.abs(best.mate)}` });
      } else {
        const val = best.cp! * multiplier;
        const winProb = getWinningChance(val);
        setDisplayedEval({ height: (winProb + 1) * 50, text: (val / 100 > 0 ? "+" : "") + (val / 100).toFixed(1) });
      }
    }
  }, [engineInfo, isAnalyzing, fen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      switch (e.key) { case "ArrowLeft": goToPrev(); break; case "ArrowRight": goToNext(); break; case "ArrowUp": goToEnd(); break; case "ArrowDown": goToStart(); break; }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, goToStart, goToEnd]);

  useEffect(() => {
    const board = boardContainerRef.current, historyBox = historyContainerRef.current;
    const handleWheelLocal = (e: WheelEvent) => {
        const now = Date.now(); if (now - lastWheelTimeRef.current < 45) { e.preventDefault(); return; }
        lastWheelTimeRef.current = now;
        if (e.deltaY > 0) goToNext(); else goToPrev();
        e.preventDefault();
    };
    if (board) board.addEventListener('wheel', handleWheelLocal, { passive: false });
    if (historyBox) historyBox.addEventListener('wheel', handleWheelLocal, { passive: false });
    return () => { if (board) board.removeEventListener('wheel', handleWheelLocal); if (historyBox) historyBox.removeEventListener('wheel', handleWheelLocal); };
  }, [goToNext, goToPrev]);

  // --- Render Helpers ---
  const isVariation = useMemo(() => {
    return history.length !== mainHistory.length || history.some((m, i) => m !== mainHistory[i]);
  }, [history, mainHistory]);

  const playerInfo = useMemo(() => {
    if (!selectedGame) return { white: { name: "Blanc", rating: "" }, black: { name: "Noir", rating: "" } };
    return { white: { name: selectedGame.white.username, rating: selectedGame.white.rating }, black: { name: selectedGame.black.username, rating: selectedGame.black.rating } };
  }, [selectedGame]);

  const config: Config = {
    fen, orientation, turnColor: new Chess(fen).turn() === 'w' ? 'white' : 'black',
    movable: { color: new Chess(fen).turn() === 'w' ? 'white' : 'black', free: false, dests: (() => { const d = new Map(); new Chess(fen).moves({ verbose: true }).forEach(m => { if (!d.has(m.from)) d.set(m.from, []); d.get(m.from).push(m.to); }); return d; })(), events: { after: onMove } },
    drawable: { enabled: true, visible: true, autoShapes: [] },
    animation: { enabled: animateNext, duration: 250 }
  };

  return (
    <main className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 text-white min-h-screen bg-[#0a0a0a]">
      <div className="flex items-center justify-between">
        <div className="space-y-1"><h1 className="text-3xl font-display font-bold tracking-tight">Analyse</h1><p className="text-sm text-stone-500 font-manrope">{selectedGame ? `Partie contre ${selectedGame.white.username} vs ${selectedGame.black.username}` : "Échiquier d'analyse libre."}</p></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start relative">
        <div className={cn("fixed z-[100] pointer-events-none shadow-2xl border border-blue-500/30 rounded-lg overflow-hidden bg-[#1a1a1a] transition-all duration-300", previewPos.visible ? "opacity-100 scale-100" : "opacity-0 scale-95")} style={{ top: previewPos.y, left: previewPos.x, width: 200, height: 200 }}>
          {hoveredPosition && <ChessBoard config={{ fen: hoveredPosition, orientation, viewOnly: true }} />}
        </div>

        <div className="w-full lg:w-[65%] xl:w-[70%] flex flex-col gap-6">
          <div className="flex items-center justify-center gap-2 p-2 bg-white/[0.02] border border-white/5 rounded-xl">
            <Button variant="ghost" size="icon" onClick={goToStart} disabled={currentMoveIndex === -1}><ChevronFirst /></Button>
            <Button variant="ghost" size="icon" onClick={goToPrev} disabled={currentMoveIndex === -1}><ChevronLeft /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={cn(isSettingsOpen && "text-blue-400")}><Settings2 /></Button>
            <Button variant="ghost" size="icon" onClick={goToNext} disabled={currentMoveIndex === history.length - 1}><ChevronRight /></Button>
            <Button variant="ghost" size="icon" onClick={goToEnd} disabled={currentMoveIndex === history.length - 1}><ChevronLast /></Button>
          </div>
          
          <div ref={boardContainerRef} className="flex flex-row w-full gap-4 relative">
            {isReviewing && <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl gap-6"><h3>Analyse globale... {reviewProgress}%</h3><Progress value={reviewProgress} className="w-64" /></div>}
            <div className="w-8 shrink-0 bg-[#1a1a1a] border border-white/10 rounded-md overflow-hidden flex flex-col justify-end relative shadow-inner">
               <div className="w-full transition-all duration-700 bg-white" style={{ height: `${displayedEval.height}%` }} />
               <div className="absolute bottom-2 w-full text-center text-[10px] font-black mix-blend-difference">{displayedEval.text}</div>
            </div>

            <div className="flex-grow flex flex-col gap-2">
               <div className="flex items-center justify-between text-xs px-1">
                 <div className="flex items-center gap-2"><div className="size-4 bg-white/10 rounded flex items-center justify-center text-[8px] font-black">{orientation === "white" ? "B" : "W"}</div><span className="font-bold text-stone-400">{orientation === "white" ? playerInfo.black.name : playerInfo.white.name}</span></div>
                 <span className="font-mono text-stone-500">{clocks[currentMoveIndex + 1] || "0:00"}</span>
               </div>
               <div className="aspect-square w-full bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden relative shadow-2xl">
                 <ChessBoard config={config} />
                 {promotionMove && (
                   <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                     <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 flex gap-2 shadow-2xl animate-in zoom-in-95">
                       {['q', 'n', 'r', 'b'].map((p: any) => <Button key={p} variant="outline" className="h-16 w-16 text-2xl bg-white/5 border-white/5 hover:bg-white/10" onClick={() => handlePromotion(p)}>{p === 'q' ? "♛" : p === 'n' ? "♞" : p === 'r' ? "♜" : "♝"}</Button>)}
                     </div>
                   </div>
                 )}
               </div>
               <div className="flex items-center justify-between text-xs px-1">
                 <div className="flex items-center gap-2"><div className="size-4 bg-white/10 rounded flex items-center justify-center text-[8px] font-black">{orientation === "white" ? "W" : "B"}</div><span className="font-bold text-stone-200">{orientation === "white" ? playerInfo.white.name : playerInfo.black.name}</span></div>
                 <span className="font-mono text-white font-bold">{clocks[currentMoveIndex + 1] || "0:00"}</span>
               </div>
            </div>
          </div>

          <div onClick={!gameEvaluations.length && !isReviewing ? startReview : undefined} className={cn("min-h-[100px] w-full bg-white/[0.02] border border-white/[0.05] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.05] transition-all group/bilan")}>
            {gameEvaluations.length > 0 ? (
               <ChartContainer config={{ evaluation: { label: "Avantage", color: "#fff" } }} className="h-[180px] w-full">
                 <ResponsiveContainer>
                   <AreaChart data={gameEvaluations} onClick={(s: any) => s?.activePayload && setCurrentMoveIndex(s.activePayload[0].payload.moveIndex)}>
                     <defs><linearGradient id="colorEval" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fff" stopOpacity={0.2}/><stop offset="95%" stopColor="#fff" stopOpacity={0}/></linearGradient></defs>
                     <XAxis dataKey="moveIndex" hide /><YAxis domain={[-10, 10]} hide /><Tooltip content={({ active, payload }) => active && payload?.[0] && <div className="bg-[#1a1a1a] p-2 border border-white/10 text-[11px] font-bold shadow-2xl">{payload[0].payload.evaluation.toFixed(1)}</div>} />
                     <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" /><ReferenceLine x={currentMoveIndex} stroke="#ef4444" strokeWidth={2} />
                     <Area type="monotone" dataKey="evaluation" stroke="#fff" fill="url(#colorEval)" strokeWidth={2} isAnimationActive={false} />
                   </AreaChart>
                 </ResponsiveContainer>
               </ChartContainer>
            ) : <div className="flex flex-col items-center gap-3"><BarChart3 className="text-stone-700 group-hover/bilan:text-blue-500 transition-colors" /> <span className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-600 group-hover/bilan:text-stone-300">Lancer l'analyse du bilan</span></div>}
          </div>
        </div>

        <div className="w-full lg:w-[35%] xl:w-[30%] flex flex-col gap-6 self-stretch">
          <div className="bg-[#141414] border border-white/[0.05] rounded-xl p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between font-bold text-sm"><span>Stockfish 18</span><Switch checked={isAnalyzing} onCheckedChange={setIsAnalyzing} /></div>
            {isAnalyzing && engineInfo.lines.map(line => (
              <div key={line.id} className="text-[11px] flex gap-3 items-center border-t border-white/5 pt-3 group/line">
                <span className={cn("min-w-[36px] text-center px-1.5 py-0.5 rounded font-black tabular-nums", line.mate !== undefined ? "bg-red-500/20 text-red-400" : "bg-blue-500/10 text-blue-400")}>{line.mate !== undefined ? `M${Math.abs(line.mate)}` : (line.cp! / 100 > 0 ? "+" : "") + (line.cp! / 100).toFixed(1)}</span>
                <div className="flex flex-wrap gap-x-2 gap-y-1">{line.sanMoves.slice(0, 6).map((m, i) => <span key={i} className="text-stone-500 hover:text-white cursor-pointer transition-colors font-mono" onMouseEnter={(e) => { if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setPreviewPos({ x: r.left, y: r.bottom + 8, visible: true }); const t = new Chess(fen); for(let j=0; j<=i; j++) t.move(line.pv[j]); setHoveredPosition(t.fen()); }} onMouseLeave={() => { hideTimeoutRef.current = setTimeout(() => setPreviewPos(p => ({ ...p, visible: false })), 100); }} onClick={() => handlePvMoveClick(line, i)}><FormattedMove move={m} /></span>)}</div>
              </div>
            ))}
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col flex-grow min-h-[400px] overflow-hidden">
            <div className="flex items-center justify-between mb-6 shrink-0">
               <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Historique</h2>
               {isVariation && (
                 <Button size="sm" variant="ghost" className="h-6 text-[9px] uppercase font-black text-orange-500 hover:bg-orange-500/10 gap-1.5" onClick={() => { setHistory(mainHistory); setCurrentMoveIndex(mainHistory.length - 1); }}><ArrowUpDown className="size-3" /> Retour Partie</Button>
               )}
            </div>
            
            <div ref={historyContainerRef} className="flex-1 overflow-y-auto custom-scrollbar pr-2 font-mono">
              {history.length > 0 ? (
                <div className="space-y-0.5">
                  {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => {
                    const m1 = history[i*2], m2 = history[i*2+1];
                    const main1 = mainHistory[i*2], main2 = mainHistory[i*2+1];
                    const var1 = m1 !== main1, var2 = m2 && m2 !== main2;
                    
                    return (
                      <div key={i} className={cn("flex items-center py-0.5 px-2 rounded group transition-all", (currentMoveIndex === i*2 || currentMoveIndex === i*2+1) ? "bg-white/[0.03]" : "hover:bg-white/[0.01]")}>
                        <div className="w-8 text-stone-600 text-right pr-3 text-[10px] font-black">{i + 1}.</div>
                        <div ref={currentMoveIndex === i*2 ? activeMoveRef : null} className={cn("flex-1 px-1.5 cursor-pointer rounded transition-all", currentMoveIndex === i * 2 ? "text-blue-400 font-black scale-110" : var1 ? "text-orange-400/80" : "text-stone-300")} onClick={() => setCurrentMoveIndex(i * 2)}><FormattedMove move={m1} /></div>
                        {m2 && (
                          <div ref={currentMoveIndex === i*2+1 ? activeMoveRef : null} className={cn("flex-1 px-1.5 cursor-pointer rounded transition-all", currentMoveIndex === i * 2 + 1 ? "text-blue-400 font-black scale-110" : var2 ? "text-orange-400/80" : "text-stone-300")} onClick={() => setCurrentMoveIndex(i * 2 + 1)}><FormattedMove move={m2} /></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : <div className="h-full flex items-center justify-center text-[10px] font-black text-stone-700 uppercase tracking-widest italic">Aucun coup</div>}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-3 shrink-0 shadow-lg">
            <Textarea placeholder="Coller un PGN ici..." className="text-[10px] h-20 bg-black/20 border-white/5 focus:border-blue-500/50 transition-colors custom-scrollbar" value={pgnInput} onChange={e => setPgnInput(e.target.value)} />
            <Button className="w-full h-8 text-[10px] uppercase font-black tracking-widest bg-white/5 hover:bg-white/10 border-white/5" onClick={() => loadPgn(pgnInput)}>Charger PGN</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
