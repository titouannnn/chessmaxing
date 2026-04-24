"use client";

import { useEffect } from "react";
import { useChessStore } from "@/lib/store";
import localGames from "@/data/titouannnnnn_1y.json";
import { ChessGame } from "@/types/chess";

export function DataInitializer() {
  const { games, setGames, setUsername, username } = useChessStore();

  useEffect(() => {
    // Mode DEV : chargement automatique si le store est vide
    if (process.env.NEXT_PUBLIC_DEV === "1" && games.length === 0) {
      console.log("Initializer: Mode DEV détecté. Pré-remplissage des données...");
      
      // On utilise le pseudo du fichier local par défaut
      if (!username) setUsername("titouannnnnn");
      
      // On charge toutes les données locales
      setGames(localGames as ChessGame[]);
    }
  }, [games.length, setGames, setUsername, username]);

  return null; // Composant invisible
}
