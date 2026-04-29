# Correction du Timing et de la Synchronisation des Flèches

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** S'assurer que les flèches du moteur s'affichent uniquement pour le joueur dont c'est le tour et disparaissent immédiatement après le coup.

**Architecture:** Simplification de `autoShapes` pour n'afficher qu'une seule flèche suggérée à la fois, basée sur le tour actuel de la position affichée. Suppression de la flèche persistante de l'adversaire.

**Tech Stack:** Next.js, Chess.js, Chessground

---

### Task 1: Simplification de la logique autoShapes

**Files:**
- Modify: `app/analysis/page.tsx`

- [ ] **Step 1: Remplacer la logique autoShapes**
Supprimer la détection de l'erreur de l'adversaire et la comparaison avec `actualNextMove` pour simplement afficher le meilleur coup de la position actuelle.

```typescript
  const autoShapes = useMemo(() => {
    const shapes = [];
    if (showEngineArrows) {
      if (engineMode === 'analysis') {
        const best = engineInfo.lines.find(l => l.id === 1);
        if (best && engineInfo.depth > 0 && best.pv.length > 0) {
          const move = best.pv[0], orig = move.substring(0, 2) as Key, dest = move.substring(2, 4) as Key;
          shapes.push({ orig, dest, brush: "blue" });
        }
      } else if (activeTab === 'bilan') {
        // On affiche uniquement le meilleur coup pour la position ACTUELLE sur l'échiquier
        const currentEval = gameEvaluations.find(e => e.moveIndex === currentMoveIndex + 1);
        if (currentEval?.bestMove) {
          const move = currentEval.bestMove, orig = move.substring(0, 2) as Key, dest = move.substring(2, 4) as Key;
          shapes.push({ orig, dest, brush: "blue" });
        }
      }
    }
    return shapes;
  }, [engineMode, engineInfo, currentMoveIndex, showEngineArrows, activeTab, gameEvaluations]);
```

- [ ] **Step 2: Vérifier la dépendance `fen`**
S'assurer que `autoShapes` se met bien à jour quand la position change.

- [ ] **Step 3: Build et test**
Run: `npm run build`
Vérifier qu'en naviguant avec les flèches du clavier, une seule flèche bleue est visible à la fois et qu'elle correspond au meilleur coup du joueur qui doit jouer.
