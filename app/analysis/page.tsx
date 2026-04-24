"use client";

import { useChessStore } from "@/lib/store";

export default function AnalysisPage() {
  const selectedGame = useChessStore((state) => state.selectedGame);

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Analyse</h1>
        <p className="text-sm text-muted-foreground">
          {selectedGame 
            ? `Partie contre ${selectedGame.white.username} vs ${selectedGame.black.username}`
            : "Sélectionnez une partie pour commencer l'analyse."}
        </p>
      </div>

      <div className="aspect-square w-full bg-muted/30 border border-dashed border-border flex items-center justify-center rounded-lg">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Échiquier (Prochainement)</p>
      </div>
    </main>
  );
}
