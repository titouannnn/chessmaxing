"use client";

import { useEffect, useRef } from "react";
import { Chessground } from "chessground";
import { Config } from "chessground/config";
import { Api } from "chessground/api";

import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

interface ChessBoardProps {
  config?: Config;
  className?: string;
}
export function ChessBoard({ config, className = "w-full aspect-square" }: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const cgRef = useRef<Api | null>(null);

  useEffect(() => {
    if (boardRef.current && !cgRef.current) {
      cgRef.current = Chessground(boardRef.current, {
        coordinates: true, // Activé par défaut pour les petits échiquiers si demandé
        ...config,
        viewOnly: config?.viewOnly || false,
      });
    }

    return () => {
      if (cgRef.current) {
        cgRef.current.destroy();
        cgRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (cgRef.current && config) {
      cgRef.current.set(config);
      // Force un redessin pour garantir le centrage des pièces
      requestAnimationFrame(() => {
        cgRef.current?.redrawAll();
      });
    }
  }, [config]);


  return (
    <div className={className}>
      <div ref={boardRef} className="w-full h-full" style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
