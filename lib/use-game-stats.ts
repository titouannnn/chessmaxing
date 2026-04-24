import { useMemo } from 'react';
import { ChessGame } from '@/types/chess';

export interface GameStats {
  total: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  drawRate: number;
  lossRate: number;
  avgAccuracy: number | null;
  avgAccuracyWin: number | null;
  avgAccuracyDraw: number | null;
  avgAccuracyLoss: number | null;
}

export function useGameStats(games: ChessGame[], username: string): GameStats {
  return useMemo(() => {
    let wins = 0;
    let draws = 0;
    let losses = 0;

    let accSum = 0;
    let accWinSum = 0;
    let accDrawSum = 0;
    let accLossSum = 0;

    let accCount = 0;
    let accWinCount = 0;
    let accDrawCount = 0;
    let accLossCount = 0;

    games.forEach((game) => {
      const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
      const playerResult = isWhite ? game.white.result : game.black.result;
      
      const accuracy = isWhite ? game.accuracies?.white : game.accuracies?.black;

      let resultType = 'draw';
      if (playerResult === 'win') {
        resultType = 'win';
        wins++;
      } else if (
        playerResult === 'checkmated' ||
        playerResult === 'timeout' ||
        playerResult === 'resigned' ||
        playerResult === 'abandoned' ||
        playerResult === 'lose'
      ) {
        resultType = 'loss';
        losses++;
      } else {
        // agreed, stalemate, repetition, insufficient, timevsinsufficient, 50move
        draws++;
      }

      if (accuracy !== undefined) {
        accSum += accuracy;
        accCount++;
        if (resultType === 'win') {
          accWinSum += accuracy;
          accWinCount++;
        } else if (resultType === 'draw') {
          accDrawSum += accuracy;
          accDrawCount++;
        } else {
          accLossSum += accuracy;
          accLossCount++;
        }
      }
    });

    const total = games.length;

    return {
      total,
      wins,
      draws,
      losses,
      winRate: total > 0 ? (wins / total) * 100 : 0,
      drawRate: total > 0 ? (draws / total) * 100 : 0,
      lossRate: total > 0 ? (losses / total) * 100 : 0,
      avgAccuracy: accCount > 0 ? accSum / accCount : null,
      avgAccuracyWin: accWinCount > 0 ? accWinSum / accWinCount : null,
      avgAccuracyDraw: accDrawCount > 0 ? accDrawSum / accDrawCount : null,
      avgAccuracyLoss: accLossCount > 0 ? accLossSum / accLossCount : null,
    };
  }, [games, username]);
}
