import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { ChessGame } from '@/types/chess';
import { get, set, del } from 'idb-keyval';

// Custom storage using IndexedDB to bypass 5MB limit of sessionStorage
const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

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
  
  // Reset for new sessions
  clearStorage: () => void;
}

// Session management: Clear IndexedDB if it's a brand new session (tab opened)
// This keeps data if you refresh or navigate, but clears if you close the tab.
if (typeof window !== 'undefined') {
  const SESSION_KEY = 'chessmaxer-session-active';
  if (!sessionStorage.getItem(SESSION_KEY)) {
    del('chessmaxer-storage').then(() => {
      sessionStorage.setItem(SESSION_KEY, 'true');
    });
  }
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
      
      clearStorage: () => {
        set({ games: [], username: '', statsCache: {} });
        del('chessmaxer-storage');
      }
    }),
    {
      name: 'chessmaxer-storage',
      storage: createJSONStorage(() => storage),
    }
  )
);

