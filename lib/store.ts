import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ChessGame } from '@/types/chess';

interface ChessStats {
  winRate: number;
  totalGames: number;
  accuracy?: number;
  lastUpdated: number;
}

interface ChessState {
  // Global State
  username: string;
  setUsername: (username: string) => void;
  
  // Games
  games: ChessGame[];
  setGames: (games: ChessGame[]) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Game Analysis
  selectedGame: ChessGame | null;
  setSelectedGame: (game: ChessGame | null) => void;

  // Stats Cache
  statsCache: Record<string, ChessStats>;
  setStats: (username: string, stats: ChessStats) => void;

  // History
  recentSearches: string[];
  addRecentSearch: (username: string) => void;
}

export const useChessStore = create<ChessState>()(
  persist(
    (set) => ({
      username: '',
      setUsername: (username) => set({ username }),

      games: [],
      setGames: (games) => set({ games }),
      isLoading: false,
      setLoading: (isLoading) => set({ isLoading }),

      selectedGame: null,
      setSelectedGame: (game) => set({ selectedGame: game }),

      statsCache: {},
      setStats: (username, stats) => 
        set((state) => ({
          statsCache: { ...state.statsCache, [username.toLowerCase()]: stats }
        })),

      recentSearches: [],
      addRecentSearch: (username) =>
        set((state) => {
          const lowerUsername = username.toLowerCase();
          const filtered = state.recentSearches.filter((u) => u !== lowerUsername);
          return {
            recentSearches: [lowerUsername, ...filtered].slice(0, 5)
          };
        }),
    }),
    {
      name: 'chessmaxer-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
