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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronFirst, ChevronLeft, ChevronRight, ChevronLast, 
  Activity, Settings2, ArrowUpDown, BarChart3, Loader2,
  Trophy, Lightbulb, MessageSquare
} from "lucide-react";
import { cn, logger } from "@/lib/utils";

// --- Constants (Lichess Multipliers) ---
const LICHESS_MULTIPLIER = -0.00368208;

// --- Types ---
interface PVLine {
  id: number; depth: number; cp?: number; mate?: number; pv: string[]; sanMoves: string[];
}

interface EngineInfo {
  depth: number; seldepth: number; nps: number; lines: PVLine[];
}

interface MoveEval {
  moveIndex: number;
  evaluation: number; // Visual Y coordinate (-10 to 10)
  mate?: number;
  cp?: number; // Raw centipawn value
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

// --- Custom Evaluation Graph Component ---
const EvaluationGraph = ({ 
  data, 
  currentIndex, 
  totalMoves,
  onSelectMove 
}: { 
  data: MoveEval[], 
  currentIndex: number, 
  totalMoves: number,
  onSelectMove: (idx: number) => void 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const width = 800;
  const height = 240;
  const padding = 20;
  const innerWidth = width - (padding * 2);
  const centerY = height / 2;

  const getX = (mIdx: number) => padding + ((mIdx + 1) / totalMoves) * innerWidth;
  const getY = (evalVal: number) => centerY - (evalVal / 10) * (height / 2);

  const sortedData = [...data].sort((a,b) => a.moveIndex - b.moveIndex);
  
  let areaPoints = `M ${getX(-1)} ${centerY} `;
  sortedData.forEach((d) => { areaPoints += `L ${getX(d.moveIndex)} ${getY(d.evaluation)} `; });
  areaPoints += `L ${getX(sortedData[sortedData.length - 1].moveIndex)} ${centerY} Z`;

  let linePoints = `M ${getX(-1)} ${centerY} `;
  sortedData.forEach((d) => { linePoints += `L ${getX(d.moveIndex)} ${getY(d.evaluation)} `; });

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const relativeX = ((x - rect.left) / rect.width) * width;
    const dataX = relativeX - padding;
    const targetMoveIndex = Math.round((dataX / innerWidth) * totalMoves) - 1;
    
    const closest = data.reduce((prev, curr) => {
      return Math.abs(curr.moveIndex - targetMoveIndex) < Math.abs(prev.moveIndex - targetMoveIndex) ? curr : prev;
    });

    if (e.type === 'mousedown' || e.type === 'touchstart') onSelectMove(closest.moveIndex);
    setHoverIndex(data.indexOf(closest));
  };

  const currentMoveData = hoverIndex !== null ? data[hoverIndex] : null;
  const displayVal = currentMoveData ? (
    currentMoveData.mate !== undefined 
      ? (currentMoveData.mate > 0 ? "#" : "-") + Math.abs(currentMoveData.mate)
      : (currentMoveData.cp! / 100 > 0 ? "+" : "") + (currentMoveData.cp! / 100).toFixed(1)
  ) : "";

  return (
    <div className="w-full relative group/graph select-none" onMouseLeave={() => setHoverIndex(null)}>
      <svg 
        ref={svgRef} viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-full cursor-crosshair overflow-visible"
        onMouseDown={handleInteraction} onMouseMove={handleInteraction}
        onTouchStart={handleInteraction} onTouchMove={handleInteraction}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <line x1={padding} y1={centerY} x2={width-padding} y2={centerY} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
        <path d={areaPoints} fill="url(#areaGradient)" />
        <path d={linePoints} fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinejoin="round" />
        <line x1={getX(currentIndex)} y1="0" x2={getX(currentIndex)} y2={height} stroke="#ef4444" strokeWidth={2} />
        {hoverIndex !== null && (
          <>
            <line x1={getX(data[hoverIndex].moveIndex)} y1="0" x2={getX(data[hoverIndex].moveIndex)} y2={height} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
            <circle cx={getX(data[hoverIndex].moveIndex)} cy={getY(data[hoverIndex].evaluation)} r="5" fill="#3b82f6" stroke="white" strokeWidth={2} />
          </>
        )}
      </svg>
      {currentMoveData && (
        <div className="absolute top-2 pointer-events-none bg-black/90 border border-blue-500/50 px-2 py-1 rounded text-[11px] font-black text-blue-400 shadow-2xl backdrop-blur-sm animate-in fade-in duration-200"
          style={{ left: `${(getX(currentMoveData.moveIndex) / width) * 100}%`, transform: 'translateX(-50%)' }}>
          {displayVal}
        </div>
      )}
    </div>
  );
};

export default function AnalysisPage() {
  const { selectedGame, username } = useChessStore();
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
  const [activeVariation, setActiveVariation] = useState<string[] | null>(null);

  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isEngineStale, setIsEngineStale] = useState(false);
  const [isEvalFrozen, setIsEvalFrozen] = useState(false);
  const isEngineStaleRef = useRef(false);
  const [engineInfo, setEngineInfo] = useState<EngineInfo>({ depth: 0, seldepth: 0, nps: 0, lines: [] });
  const [displayedEval, setDisplayedEval] = useState({ height: 50, text: "0.0" });
  const [hoveredPosition, setHoveredPosition] = useState<string | null>(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0, visible: false });

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
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const activeMoveRef = useRef<HTMLDivElement>(null);

  const TARGET_DEPTH = 18;
  const REVIEW_DEPTH = 18;

  const goToStart = useCallback(() => { setAnimateNext(true); setCurrentMoveIndex(-1); }, []);
  const goToPrev = useCallback(() => { setAnimateNext(true); setCurrentMoveIndex((i) => Math.max(-1, i - 1)); }, []);
  const goToNext = useCallback(() => { setAnimateNext(true); setCurrentMoveIndex((i) => Math.min(history.length - 1, i + 1)); }, [history.length]);
  const goToEnd = useCallback(() => { setAnimateNext(true); setCurrentMoveIndex(history.length - 1); }, [history.length]);

  const loadPgn = useCallback((pgnStr: string) => {
    if (!pgnStr) return;
    try {
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
    } catch (e) { console.error("PGN Error", e); }
  }, [isAnalyzing]);

  const processNextReviewMove = useCallback(() => {
    const idx = reviewCurrentIdx.current;
    if (idx >= reviewQueueRef.current.length) {
      setGameEvaluations([...reviewResultsRef.current.filter(Boolean)]);
      setIsReviewing(false);
      workerRef.current?.postMessage(`setoption name MultiPV value ${multiPv}`);
      if (isAnalyzing) { workerRef.current?.postMessage(`position fen ${fen}`); workerRef.current?.postMessage("go infinite"); }
      return;
    }
    setReviewProgress(Math.round((idx / (reviewQueueRef.current.length - 1)) * 100));
    setCurrentMoveIndex(idx - 1);
    if (idx > 0 && idx % 5 === 0) setGameEvaluations([...reviewResultsRef.current.filter(Boolean)]);

    const chess = new Chess(reviewQueueRef.current[idx]);
    if (chess.isGameOver()) {
      const turn = chess.turn();
      const winProb = chess.isCheckmate() ? (turn === 'w' ? -1 : 1) : 0;
      reviewResultsRef.current[idx] = { moveIndex: idx - 1, evaluation: winProb * 10, cp: winProb * 1000 };
      reviewCurrentIdx.current++; setTimeout(processNextReviewMove, 10);
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
      if (history[currentMoveIndex + 1] === move.san) setCurrentMoveIndex(currentMoveIndex + 1);
      else { setHistory([...history.slice(0, currentMoveIndex + 1), move.san]); setCurrentMoveIndex(currentMoveIndex + 1); setGameEvaluations([]); }
    }
  }, [fen, history, currentMoveIndex]);

  const handlePromotion = useCallback((piece: 'q' | 'r' | 'b' | 'n') => {
    if (!promotionMove) return;
    const chess = new Chess(fen);
    const move = chess.move({ from: promotionMove.orig, to: promotionMove.dest, promotion: piece });
    if (move) {
      setAnimateNext(false);
      if (history[currentMoveIndex + 1] === move.san) setCurrentMoveIndex(currentMoveIndex + 1);
      else { setHistory([...history.slice(0, currentMoveIndex + 1), move.san]); setCurrentMoveIndex(currentMoveIndex + 1); setGameEvaluations([]); }
    }
    setPromotionMove(null);
  }, [promotionMove, fen, history, currentMoveIndex]);

  useEffect(() => {
    if (selectedGame?.pgn) { loadPgn(selectedGame.pgn); setIsAnalyzing(true); setOrientation(selectedGame.black.username.toLowerCase() === username.toLowerCase() ? "black" : "white"); }
  }, [selectedGame, username, loadPgn]);

  useEffect(() => {
    // Si l'historique diverge du PGN principal, on sauvegarde cette variante
    const divIdx = history.findIndex((m, i) => m !== mainHistory[i]);
    if (divIdx !== -1) {
      setActiveVariation(history);
    } else if (history.length > mainHistory.length) {
      setActiveVariation(history);
    }
  }, [history, mainHistory]);

  useEffect(() => {
    const chess = new Chess();
    for (let i = 0; i <= currentMoveIndex; i++) { try { chess.move(history[i]); } catch(e) {} }
    
    const newFen = chess.fen();
    setFen(newFen);

    const isGameOver = chess.isGameOver();
    if (isGameOver) {
      if (chess.isCheckmate()) setDisplayedEval({ height: chess.turn() === 'w' ? 0 : 100, text: "MAT" });
      else setDisplayedEval({ height: 50, text: "1/2" });
    }
    
    // Gel de la barre d'évaluation pendant 200ms pour éviter le zig-zag
    setIsEvalFrozen(true);
    setTimeout(() => setIsEvalFrozen(false), 200);

    // RÉINITIALISATION CRITIQUE : Vider immédiatement les infos pour éviter le flash d'évaluation inversée
    engineUpdateRef.current = { depth: 0, seldepth: 0, nps: 0, lines: [] };
    setEngineInfo({ depth: 0, seldepth: 0, nps: 0, lines: [] });
    
    setIsEngineStale(true); 
    isEngineStaleRef.current = true; // Indique que les lignes actuelles sont obsolètes
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
        if (isReviewing && scoreMatch) {
          const turn = new Chess(reviewQueueRef.current[reviewCurrentIdx.current]).turn();
          const multiplier = turn === 'w' ? 1 : -1;
          const cp = scoreMatch[1] === "cp" ? parseInt(scoreMatch[2], 10) : undefined;
          const mate = scoreMatch[1] === "mate" ? parseInt(scoreMatch[2], 10) : undefined;
          const val = cp !== undefined ? cp * multiplier : getMateCp(mate! * multiplier);
          reviewResultsRef.current[reviewCurrentIdx.current] = { 
            moveIndex: reviewCurrentIdx.current - 1, 
            evaluation: getWinningChance(val) * 10, 
            mate: mate !== undefined ? mate * multiplier : undefined, 
            cp: val 
          };
        }
        if (!isReviewing) {
          const seldepth = parseInt(line.match(/\bseldepth (\d+)/)?.[1] || "0");
          const nps = parseInt(line.match(/\bnps (\d+)/)?.[1] || "0");
          const multipvIdx = parseInt(line.match(/\bmultipv (\d+)/)?.[1] || "1");
          engineUpdateRef.current.depth = depth; engineUpdateRef.current.seldepth = seldepth; engineUpdateRef.current.nps = nps;
          const pvMatch = line.match(/\bpv\s+(.*)$/);
          if (pvMatch && scoreMatch) {
            // Utilisation du Ref pour éviter les problèmes de closure
            if (isEngineStaleRef.current) {
              engineUpdateRef.current.lines = [];
              isEngineStaleRef.current = false;
              setIsEngineStale(false);
            }

            const pvStr = pvMatch[1].split(" ");
            const uciMoves = pvStr.filter(m => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m));
            const tempChess = new Chess(fen);
            const multiplier = tempChess.turn() === 'w' ? 1 : -1;
            const rawCp = scoreMatch[1] === "cp" ? parseInt(scoreMatch[2], 10) : undefined;
            const rawMate = scoreMatch[1] === "mate" ? parseInt(scoreMatch[2], 10) : undefined;
            
            const sanMoves: string[] = [];
            for (const uci of uciMoves) { try { const move = tempChess.move(uci); sanMoves.push(move.san); } catch (err) { break; } }
            
            const newLine = { 
              id: multipvIdx, 
              depth, 
              pv: uciMoves, 
              sanMoves, 
              cp: rawCp !== undefined ? rawCp * multiplier : undefined, 
              mate: rawMate !== undefined ? rawMate * multiplier : undefined 
            };
            const lines = [...engineUpdateRef.current.lines];
            const existingIdx = lines.findIndex(l => l.id === multipvIdx);
            if (existingIdx !== -1) lines[existingIdx] = newLine; else lines.push(newLine);
            engineUpdateRef.current.lines = lines.sort((a, b) => a.id - b.id);
          }
          if (Date.now() - lastUpdateTimeRef.current > 150) { setEngineInfo({ ...engineUpdateRef.current }); lastUpdateTimeRef.current = Date.now(); if (depth >= TARGET_DEPTH) setIsInitialLoading(false); }
        }
      }
    };
  }, [isReviewing, fen, processNextReviewMove, multiPv]);

  useEffect(() => {
    if (!workerRef.current || !isEngineReady || isReviewing) return;
    workerRef.current.postMessage(`setoption name MultiPV value ${multiPv}`);
    workerRef.current.postMessage("stop");
    if (isAnalyzing) {
      if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = setTimeout(() => { workerRef.current?.postMessage(`position fen ${fen}`); workerRef.current?.postMessage("go infinite"); }, 100);
    } else setIsInitialLoading(false);
  }, [fen, isAnalyzing, isEngineReady, isReviewing, multiPv]);

  useEffect(() => {
    if (!isAnalyzing || isEvalFrozen) { 
      if (!isAnalyzing) setDisplayedEval({ height: 50, text: "0.0" });
      return; 
    }

    // Vérifier si la position actuelle est déjà un MAT pour ne pas écraser l'affichage
    const chess = new Chess(fen);
    if (chess.isGameOver()) return;

    const best = engineInfo.lines.find(l => l.id === 1);
    if (engineInfo.depth >= 4 && best && (best.cp !== undefined || best.mate !== undefined)) {
      // Les scores dans engineInfo.lines sont DÉJÀ normalisés du point de vue des Blancs
      if (best.mate !== undefined) {
        setDisplayedEval({ 
          height: (best.mate > 0) ? 100 : 0, 
          text: (best.mate > 0 ? "#" : "-") + Math.abs(best.mate) 
        });
      } else {
        const val = best.cp!;
        setDisplayedEval({ 
          height: (getWinningChance(val) + 1) * 50, 
          text: (val / 100 > 0 ? "+" : "") + (val / 100).toFixed(1) 
        });
      }
    }
  }, [engineInfo, isAnalyzing, fen, isEvalFrozen]);

  useEffect(() => {
    if (activeMoveRef.current && historyContainerRef.current) {
      const container = historyContainerRef.current;
      const element = activeMoveRef.current;
      
      const elementTop = element.offsetTop;
      const elementHeight = element.offsetHeight;
      const containerTop = container.scrollTop;
      const containerHeight = container.offsetHeight;

      // Calcul manuel pour garder l'élément visible sans toucher au scroll global
      if (elementTop < containerTop) {
        container.scrollTo({ top: elementTop, behavior: 'smooth' });
      } else if (elementTop + elementHeight > containerTop + containerHeight) {
        container.scrollTo({ top: elementTop - containerHeight + elementHeight, behavior: 'smooth' });
      }
    }
  }, [currentMoveIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault(); // Bloque le défilement de la page par les flèches
      }

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

  const handlePvMoveClick = useCallback((line: PVLine, moveIdx: number) => {
    const chess = new Chess(fen); const newMoves = [];
    for (let i = 0; i <= moveIdx; i++) { try { const move = chess.move(line.pv[i]); newMoves.push(move.san); } catch (err) { break; } }
    if (newMoves.length > 0) {
      let isSame = true; for (let i = 0; i < newMoves.length; i++) { if (history[currentMoveIndex + 1 + i] !== newMoves[i]) { isSame = false; break; } }
      if (isSame) setCurrentMoveIndex(currentMoveIndex + newMoves.length);
      else { setHistory([...history.slice(0, currentMoveIndex + 1), ...newMoves]); setCurrentMoveIndex(currentMoveIndex + newMoves.length); setAnimateNext(true); setGameEvaluations([]); }
    }
  }, [fen, history, currentMoveIndex]);

  const isVariation = useMemo(() => history.length !== mainHistory.length || history.some((m, i) => m !== mainHistory[i]), [history, mainHistory]);
  const playerInfoDisplay = useMemo(() => {
    if (!selectedGame) return { white: { name: "Blanc", rating: "" }, black: { name: "Noir", rating: "" } };
    return { white: { name: selectedGame.white.username, rating: selectedGame.white.rating }, black: { name: selectedGame.black.username, rating: selectedGame.black.rating } };
  }, [selectedGame]);

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
    if (showPlayedArrows && actualNextMove) {
      shapes.push({ orig: actualNextMove.orig, dest: actualNextMove.dest, brush: "green" });
    }
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
    fen, orientation, turnColor: new Chess(fen).turn() === 'w' ? 'white' : 'black',
    movable: { color: new Chess(fen).turn() === 'w' ? 'white' : 'black', free: false, dests: (() => { const d = new Map(); new Chess(fen).moves({ verbose: true }).forEach(m => { if (!d.has(m.from)) d.set(m.from, []); d.get(m.from).push(m.to); }); return d; })(), events: { after: onMove } },
    drawable: { 
      enabled: true, 
      visible: true, 
      autoShapes 
    },
    animation: { enabled: animateNext, duration: 250 }
  };


  const handleWheel = useCallback((e: WheelEvent) => {
    const now = Date.now();
    // Bloque immédiatement le scroll de la page
    e.preventDefault();

    if (now - lastWheelTimeRef.current < 45) return;
    lastWheelTimeRef.current = now;
    
    if (e.deltaY > 0) goToNext();
    else if (e.deltaY < 0) goToPrev();
  }, [goToNext, goToPrev]);

  useEffect(() => {
    const board = boardContainerRef.current;
    const historyBox = historyContainerRef.current;
    const graphBox = graphContainerRef.current;
    const opts = { passive: false };

    if (board) board.addEventListener('wheel', handleWheel, opts);
    if (historyBox) historyBox.addEventListener('wheel', handleWheel, opts);
    if (graphBox) graphBox.addEventListener('wheel', handleWheel, opts);
    
    return () => {
      if (board) board.removeEventListener('wheel', handleWheel);
      if (historyBox) historyBox.removeEventListener('wheel', handleWheel);
      if (graphBox) graphBox.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  return (
    <main className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 text-white min-h-screen bg-[#0a0a0a]">
      <style dangerouslySetInnerHTML={{ __html: `
        .cg-wrap coords { 
          font-size: 8px !important; 
          font-weight: bold !important;
          line-height: 12px !important;
        }
        .cg-wrap coords.ranks { right: -12px !important; top: 0 !important; }
        .cg-wrap coords.files { bottom: -12px !important; left: 0 !important; text-align: center !important; }
        .cg-wrap piece { width: 12.5% !important; height: 12.5% !important; }
        cg-board { border-radius: 4px !important; }
      `}} />
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold tracking-tight">Analyse</h1>
          <p className="text-sm text-stone-500 font-manrope">
            {selectedGame ? `Partie contre ${selectedGame.white.username} vs ${selectedGame.black.username}` : "Échiquier d'analyse libre."}
          </p>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-8 items-start relative">
        {/* LEFT COLUMN: Board & Navigation */}
        <div className="w-full lg:w-[55%] xl:w-[60%] flex flex-col gap-6 relative">
          {/* HOVER PREVIEW BOARD */}
          <div 
            className={cn(
                "fixed z-[100] pointer-events-none shadow-2xl transition-all duration-300 ease-out rounded-xl border border-white/10 overflow-hidden bg-[#1a1a1a]", 
                previewPos.visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
            )} 
            style={{ top: previewPos.y, left: previewPos.x, width: 240, height: 240 }}
          >
            <div className="w-full h-full" style={{ boxSizing: 'content-box' }}>
              {hoveredPosition && (
                <ChessBoard 
                  config={{ 
                    fen: hoveredPosition, 
                    orientation, 
                    viewOnly: true, 
                    coordinates: false,
                    animation: { enabled: true, duration: 300 } 
                  }} 
                  className="w-full h-full" 
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 p-2 bg-white/[0.02] border border-white/5 rounded-xl h-[52px]">
            <Button variant="ghost" size="icon" onClick={goToStart} disabled={currentMoveIndex === -1}><ChevronFirst /></Button>
            <Button variant="ghost" size="icon" onClick={goToPrev} disabled={currentMoveIndex === -1}><ChevronLeft /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={cn(isSettingsOpen && "text-blue-400")}><Settings2 /></Button>
            <Button variant="ghost" size="icon" onClick={goToNext} disabled={currentMoveIndex === history.length - 1}><ChevronRight /></Button>
            <Button variant="ghost" size="icon" onClick={goToEnd} disabled={currentMoveIndex === history.length - 1}><ChevronLast /></Button>
          </div>

          {isSettingsOpen && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Vue</span>
                <Button variant="outline" size="sm" className="h-8 text-[10px] bg-white/5 border-white/10 hover:bg-white/10" onClick={() => setOrientation(orientation === "white" ? "black" : "white")}>
                  <ArrowUpDown className="size-3 mr-2" /> Tourner
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Moteur</span>
                <div className="flex items-center justify-between bg-white/5 px-2 h-8 rounded border border-white/5">
                  <span className="text-[9px] font-bold text-stone-400">Flèches SF</span>
                  <Switch checked={showEngineArrows} onCheckedChange={setShowEngineArrows} className="scale-75" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Partie</span>
                <div className="flex items-center justify-between bg-white/5 px-2 h-8 rounded border border-white/5">
                  <span className="text-[9px] font-bold text-stone-400">Flèches Coups</span>
                  <Switch checked={showPlayedArrows} onCheckedChange={setShowPlayedArrows} className="scale-75" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Analyse</span>
                <Select value={multiPv.toString()} onValueChange={(v) => setMultiPv(parseInt(v))}>
                  <SelectTrigger className="h-8 bg-white/5 border-white/10 text-[10px] font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={n.toString()} className="text-[10px]">{n} Lignes</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div ref={boardContainerRef} className="flex flex-row w-full gap-4 relative overscroll-none touch-none">
            <div className="w-8 shrink-0 bg-[#1a1a1a] border border-white/10 rounded-md overflow-hidden flex flex-col justify-end relative shadow-inner">
               <div className="w-full transition-all duration-700 bg-white" style={{ height: `${displayedEval.height}%` }} />
               <div className="absolute bottom-2 w-full text-center text-[10px] font-black mix-blend-difference">{displayedEval.text}</div>
            </div>
            <div className="flex-grow flex flex-col gap-2">
               <div className="flex items-center justify-between text-xs px-1">
                 <div className="flex items-center gap-2">
                   <div className="size-4 bg-white/10 rounded flex items-center justify-center text-[8px] font-black">{orientation === "white" ? "B" : "W"}</div>
                   <span className="font-bold text-stone-400">{orientation === "white" ? playerInfoDisplay.black.name : playerInfoDisplay.white.name}</span>
                 </div>
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
                 <div className="flex items-center gap-2">
                   <div className="size-4 bg-white/10 rounded flex items-center justify-center text-[8px] font-black">{orientation === "white" ? "W" : "B"}</div>
                   <span className="font-bold text-stone-200">{orientation === "white" ? playerInfoDisplay.white.name : playerInfoDisplay.black.name}</span>
                 </div>
                 <span className="font-mono text-white font-bold">{clocks[currentMoveIndex + 1] || "0:00"}</span>
               </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Tabs (Analyse & Bilan) */}
        <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col self-stretch">
          <Tabs defaultValue="analyse" className="w-full flex flex-col h-full gap-0">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 p-1 h-[52px] shrink-0">
              <TabsTrigger value="bilan" className="text-xs font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white">Bilan</TabsTrigger>
              <TabsTrigger value="analyse" className="text-xs font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white">Analyse</TabsTrigger>
            </TabsList>

            <TabsContent value="bilan" className="flex-1 hidden data-[state=active]:flex flex-col gap-4 mt-6 animate-in fade-in duration-300">
              <div ref={graphContainerRef} className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col items-center justify-center transition-all min-h-[240px] overscroll-none touch-none">
                {gameEvaluations.length > 0 ? (
                   <EvaluationGraph data={gameEvaluations} currentIndex={currentMoveIndex} totalMoves={history.length} onSelectMove={setCurrentMoveIndex} />
                ) : (
                  <div onClick={!isReviewing ? startReview : undefined} className="flex flex-col items-center gap-3 cursor-pointer group/bilan w-full py-12">
                    <BarChart3 className="text-stone-700 group-hover/bilan:text-blue-500 transition-colors size-10" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-600 group-hover/bilan:text-stone-300">Lancer l'analyse du bilan</span>
                    {isReviewing && <div className="mt-4 flex flex-col items-center gap-4 animate-in fade-in zoom-in-95"><Loader2 className="animate-spin text-blue-500 size-8" /><div className="w-64 space-y-1"><Progress value={reviewProgress} className="h-1 bg-white/10" /><p className="text-[10px] text-center font-mono text-stone-500 uppercase tracking-widest">{reviewProgress}% terminé</p></div></div>}
                  </div>
                )}
              </div>

              <div className="bg-[#141414] border border-white/[0.05] rounded-xl p-6 space-y-4 flex-grow shadow-xl">
                <div className="flex items-center gap-2 text-blue-400">
                  <Lightbulb className="size-4" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Conseils & Analyse</h3>
                </div>
                <div className="space-y-4 text-stone-400 text-sm leading-relaxed">
                   {gameEvaluations.length > 0 ? (
                     <div className="flex flex-col gap-4 animate-in fade-in duration-500">
                        <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                           <p className="italic text-[13px]">"L'analyse est terminée. Vous pouvez naviguer sur le graphique pour voir l'évolution de la partie."</p>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-help">
                           <Trophy className="size-5 text-yellow-500 shrink-0" />
                           <p className="text-[12px]">Précision estimée : <span className="text-white font-bold">--%</span>. (Fonctionnalité à venir)</p>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                           <MessageSquare className="size-5 text-blue-500 shrink-0" />
                           <p className="text-[12px]">Prochainement : Explications textuelles de vos erreurs et meilleurs coups.</p>
                        </div>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                       <p className="italic text-stone-600 text-sm italic">Aucune donnée d'analyse disponible.</p>
                       <p className="text-[11px] text-stone-700 uppercase font-bold tracking-tighter">Cliquez sur le bouton ci-dessus pour commencer.</p>
                     </div>
                   )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analyse" className="flex-1 hidden data-[state=active]:flex flex-col gap-4 mt-6 animate-in fade-in duration-300">
              <div className="bg-[#141414] border border-white/[0.05] rounded-xl p-4 shadow-xl flex flex-col min-h-[160px]">
                <div className="flex items-center justify-between pb-4">
                  <div className="flex items-center gap-3">
                    <Activity className={cn("size-4", isAnalyzing ? "text-blue-500 animate-pulse" : "text-stone-600")} /> 
                    <span className="text-sm font-bold text-stone-300">Stockfish 18</span>
                  </div>
                  <Switch checked={isAnalyzing} onCheckedChange={setIsAnalyzing} />
                </div>
                <div 
                  className={cn("space-y-0 pt-2 border-t border-white/5 transition-opacity duration-200", isEngineStale ? "opacity-40" : "opacity-100")}
                  style={{ minHeight: `${multiPv * 36 + 20}px` }}
                >
                  {(() => {
                    const chess = new Chess(fen);
                    if (chess.isGameOver()) {
                      return (
                        <div className="flex items-center justify-center h-full py-8 gap-4 animate-in fade-in">
                          <span className={cn(
                            "px-4 py-2 rounded-lg font-black tracking-widest text-lg shadow-2xl",
                            chess.isCheckmate() ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-stone-500/20 text-stone-400 border border-stone-500/30"
                          )}>
                            {chess.isCheckmate() ? "ÉCHEC ET MAT" : "PAT / NULLE"}
                          </span>
                        </div>
                      );
                    }

                    return isAnalyzing && engineInfo.lines.length > 0 ? (
                      engineInfo.lines.map(line => (
                        <div 
                          key={line.id} 
                          className="pv-line-container flex gap-3 items-center py-2.5 px-2 hover:bg-white/[0.04] border-b border-white/[0.03] last:border-0 transition-colors group relative text-[10px]"
                          onMouseEnter={(e) => {
                            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setPreviewPos({ x: rect.left, y: rect.bottom + 8, visible: true });
                          }}
                          onMouseLeave={() => {
                            hideTimeoutRef.current = setTimeout(() => setPreviewPos(p => ({ ...p, visible: false })), 200);
                          }}
                        >
                          <span className={cn(
                            "min-w-[42px] text-center px-1.5 py-0.5 rounded font-black tabular-nums", 
                            (line.mate !== undefined ? line.mate > 0 : line.cp! > 0) ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"
                          )}>
                            {line.mate !== undefined 
                              ? (line.mate > 0 ? `#${line.mate}` : `-${Math.abs(line.mate)}`) 
                              : (line.cp! / 100 > 0 ? "+" : "") + (line.cp! / 100).toFixed(1)}
                          </span>
                          <div className="flex flex-wrap gap-x-2 gap-y-1">
                            {line.sanMoves.slice(0, 6).map((m, i) => (
                              <span 
                                key={i} 
                                className="text-stone-500 hover:text-white cursor-pointer transition-colors font-mono text-[11px]" 
                                onMouseEnter={() => {
                                  if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                                  const t = new Chess(fen); 
                                  for(let j=0; j<=i; j++) t.move(line.pv[j]); 
                                  setHoveredPosition(t.fen());
                                }}
                                onClick={() => handlePvMoveClick(line, i)}
                              >
                                <FormattedMove move={m} />
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : isAnalyzing ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-stone-700 size-5" />
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col flex-grow min-h-[300px] overflow-hidden">
                <div className="flex items-center justify-between mb-6 shrink-0">
                   <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Historique</h2>
                </div>
                <div ref={historyContainerRef} className="flex-1 overflow-y-auto custom-scrollbar pr-2 font-mono overscroll-none touch-none">
                  {mainHistory.length > 0 ? (
                    <div className="space-y-1">
                      {(() => {
                        const variationToDisplay = activeVariation || (history.length > 0 ? history : null);
                        const divIdx = variationToDisplay ? variationToDisplay.findIndex((m, i) => m !== mainHistory[i]) : -1;
                        const splitIdx = divIdx !== -1 ? divIdx : (variationToDisplay && variationToDisplay.length > mainHistory.length ? mainHistory.length : -1);
                        const hasVariation = splitIdx !== -1;
                        const isCurrentlyInVariation = (currentMoveIndex >= splitIdx && hasVariation) && history[currentMoveIndex] !== mainHistory[currentMoveIndex];

                        const rows = [];
                        for (let i = 0; i < Math.ceil(mainHistory.length / 2); i++) {
                          const idx1 = i * 2;
                          const idx2 = i * 2 + 1;
                          const isDivergenceAtIdx1 = hasVariation && splitIdx === idx1;
                          const isDivergenceAtIdx2 = hasVariation && splitIdx === idx2;

                          rows.push(
                            <div key={`main-${i}`} className={cn("flex items-center py-0.5 px-2 rounded transition-all", (currentMoveIndex === idx1 || currentMoveIndex === idx2) && !isCurrentlyInVariation ? "bg-white/[0.03]" : "hover:bg-white/[0.01]")}>
                              <div className="w-8 text-stone-600 text-right pr-3 text-[10px] font-black">{i + 1}.</div>
                              <div 
                                ref={currentMoveIndex === idx1 && !isCurrentlyInVariation ? activeMoveRef : null}
                                className={cn(
                                  "flex-1 px-1.5 cursor-pointer rounded transition-all", 
                                  currentMoveIndex === idx1 && !isCurrentlyInVariation ? "text-blue-400 font-black scale-105" : "text-stone-300"
                                )} 
                                onClick={() => { setHistory(mainHistory); setCurrentMoveIndex(idx1); }}
                              >
                                <FormattedMove move={mainHistory[idx1]} />
                              </div>
                              {mainHistory[idx2] && (
                                <div 
                                  ref={currentMoveIndex === idx2 && !isCurrentlyInVariation ? activeMoveRef : null}
                                  className={cn(
                                    "flex-1 px-1.5 cursor-pointer rounded transition-all", 
                                    currentMoveIndex === idx2 && !isCurrentlyInVariation ? "text-blue-400 font-black scale-105" : "text-stone-300"
                                  )} 
                                  onClick={() => { setHistory(mainHistory); setCurrentMoveIndex(idx2); }}
                                >
                                  <FormattedMove move={mainHistory[idx2]} />
                                </div>
                              )}
                            </div>
                          );

                          if (isDivergenceAtIdx1 || isDivergenceAtIdx2) {
                            rows.push(
                              <div key="variation-block" className="my-2 ml-8 p-3 bg-blue-500/5 border-l-2 border-blue-500/30 rounded-r-lg animate-in slide-in-from-left-2 duration-300">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="size-1.5 rounded-full bg-blue-500" />
                                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-400/80">Variante</span>
                                </div>
                                <div className="flex flex-wrap gap-x-2 gap-y-1">
                                  {variationToDisplay!.slice(splitIdx).map((m, vIdx) => {
                                    const globalIdx = splitIdx + vIdx;
                                    const moveNum = Math.floor(globalIdx / 2) + 1;
                                    const isWhite = globalIdx % 2 === 0;
                                    const isHighlighted = currentMoveIndex === globalIdx && isCurrentlyInVariation;
                                    return (
                                      <span 
                                        key={vIdx}
                                        ref={isHighlighted ? activeMoveRef : null}
                                        className={cn(
                                          "text-[11px] cursor-pointer transition-colors flex items-center gap-0.5",
                                          isHighlighted ? "text-blue-400 font-black scale-110" : "text-stone-400 hover:text-white"
                                        )}
                                        onClick={() => { setHistory(variationToDisplay!); setCurrentMoveIndex(globalIdx); }}
                                      >
                                        {isWhite && <span className="text-stone-600 text-[9px] font-bold mr-0.5">{moveNum}.</span>}
                                        {!isWhite && (vIdx === 0 || isDivergenceAtIdx2) && <span className="text-stone-600 text-[9px] font-bold mr-0.5">{moveNum}...</span>}
                                        <FormattedMove move={m} />
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                        }

                        if (hasVariation && splitIdx >= mainHistory.length) {
                             rows.push(
                              <div key="variation-end" className="my-2 ml-8 p-3 bg-blue-500/5 border-l-2 border-blue-500/30 rounded-r-lg animate-in slide-in-from-left-2 duration-300">
                                 <div className="flex flex-wrap gap-x-2 gap-y-1">
                                  {variationToDisplay!.slice(splitIdx).map((m, vIdx) => {
                                    const globalIdx = splitIdx + vIdx;
                                    const isHighlighted = currentMoveIndex === globalIdx && isCurrentlyInVariation;
                                    const moveNum = Math.floor(globalIdx / 2) + 1;
                                    const isWhite = globalIdx % 2 === 0;
                                    return (
                                      <span key={vIdx} className={cn("text-[11px] cursor-pointer", isHighlighted ? "text-blue-400 font-black" : "text-stone-400 hover:text-white")} onClick={() => { setHistory(variationToDisplay!); setCurrentMoveIndex(globalIdx); }}>
                                        {isWhite ? `${moveNum}. ` : ""}<FormattedMove move={m} />
                                      </span>
                                    );
                                  })}
                                 </div>
                              </div>
                             );
                        }
                        return rows;
                      })()}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[10px] font-black text-stone-700 uppercase tracking-widest italic">Aucun coup</div>
                  )}
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-3 shrink-0 shadow-lg mt-auto">
                <Textarea placeholder="Coller un PGN ici..." className="text-[10px] h-20 bg-black/20 border-white/5 focus:border-blue-500/50 transition-colors custom-scrollbar" value={pgnInput} onChange={e => setPgnInput(e.target.value)} />
                <Button className="w-full h-8 text-[10px] uppercase font-black tracking-widest bg-white/5 hover:bg-white/10 border-white/5" onClick={() => loadPgn(pgnInput)}>Charger PGN</Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
