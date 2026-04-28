# History UI and Variant Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Améliorer l'interface de l'historique (2 colonnes, auto-scroll) et analyser automatiquement les variantes jouées hors ligne principale.

**Architecture:** Refonte du rendu React pour l'historique, utilisation de `useEffect` pour le scroll, et extension de la logique Stockfish pour traiter les coups de variante à la volée.

**Tech Stack:** React, Tailwind CSS, Stockfish (Worker).

---

### Task 1: Refonte de l'interface de l'historique (2 colonnes)

**Files:**
- Modify: `app/analysis/page.tsx`

- [ ] **Step 1: Modifier `renderHistoryList` pour une grille à 2 colonnes**
Réorganiser le rendu pour que chaque ligne contienne le numéro du coup, le coup blanc et le coup noir.

```tsx
const renderHistoryList = () => {
  if (mainHistory.length === 0) return <div className="...">...</div>;
  
  const variationToDisplay = activeVariation || (history.length > 0 ? history : null);
  const divIdx = variationToDisplay ? variationToDisplay.findIndex((m, i) => m !== mainHistory[i]) : -1;
  const splitIdx = divIdx !== -1 ? divIdx : (variationToDisplay && variationToDisplay.length > mainHistory.length ? mainHistory.length : -1);
  const hasVariation = splitIdx !== -1;
  const isCurrentlyInVariation = (currentMoveIndex >= splitIdx && hasVariation) && history[currentMoveIndex] !== mainHistory[currentMoveIndex];

  const rows = [];
  for (let i = 0; i < Math.ceil(mainHistory.length / 2); i++) {
    const idx1 = i * 2, idx2 = i * 2 + 1;
    const isDivergenceAtIdx1 = hasVariation && splitIdx === idx1;
    const isDivergenceAtIdx2 = hasVariation && splitIdx === idx2;
    
    // Si la divergence arrive exactement ici, on affiche la ligne principale puis le bloc de variante
    rows.push(
      <div key={`main-${i}`} className={cn("grid grid-cols-[32px_1fr_1fr] items-center py-1 px-2 rounded transition-all", (currentMoveIndex === idx1 || currentMoveIndex === idx2) && !isCurrentlyInVariation ? "bg-white/[0.03]" : "hover:bg-white/[0.01]")}>
        <div className="text-stone-600 text-right pr-3 text-[10px] font-black">{i + 1}.</div>
        <div 
          ref={currentMoveIndex === idx1 && !isCurrentlyInVariation ? activeMoveRef : null}
          className={cn("px-1.5 cursor-pointer rounded flex items-center justify-between", currentMoveIndex === idx1 && !isCurrentlyInVariation ? "text-blue-400 font-black" : "text-stone-300")}
          onClick={() => { setHistory(mainHistory); setCurrentMoveIndex(idx1); }}
        >
          <FormattedMove move={mainHistory[idx1]} />
          {/* ClassificationIcon sera ajouté ici par une autre tâche */}
        </div>
        {mainHistory[idx2] && (
          <div 
            ref={currentMoveIndex === idx2 && !isCurrentlyInVariation ? activeMoveRef : null}
            className={cn("px-1.5 cursor-pointer rounded flex items-center justify-between", currentMoveIndex === idx2 && !isCurrentlyInVariation ? "text-blue-400 font-black" : "text-stone-300")}
            onClick={() => { setHistory(mainHistory); setCurrentMoveIndex(idx2); }}
          >
            <FormattedMove move={mainHistory[idx2]} />
          </div>
        )}
      </div>
    );

    // Insertion des blocs de variantes
    if (isDivergenceAtIdx1 || isDivergenceAtIdx2) {
       // ... (Logique existante de bloc de variante mais avec défilement amélioré)
    }
  }
  return rows;
};
```

- [ ] **Step 2: Ajuster les styles CSS pour la hauteur de l'historique**
Remplacer les hauteurs fixes par des classes `flex-1` ou augmenter le `max-h`.

- [ ] **Step 3: Commit**
`git commit -m "feat: redesign history list to 2-column grid"`

### Task 2: Auto-scroll de l'historique

**Files:**
- Modify: `app/analysis/page.tsx`

- [ ] **Step 1: Améliorer le `useEffect` d'auto-scroll**
S'assurer que le scroll est fluide et centre bien l'élément.

```tsx
useEffect(() => {
  if (activeMoveRef.current && historyContainerRef.current) {
    activeMoveRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }
}, [currentMoveIndex]);
```

- [ ] **Step 2: Commit**
`git commit -m "feat: implement auto-scroll for active move in history"`

### Task 3: Analyse automatique des variantes

**Files:**
- Modify: `app/analysis/page.tsx`

- [ ] **Step 1: Ajouter un état pour les évaluations de variantes**
`const [variationEvaluations, setVariationEvaluations] = useState<MoveEval[]>([]);`

- [ ] **Step 2: Modifier la logique de Stockfish pour analyser la variante courante**
Dans le `useEffect` qui gère Stockfish, si `isVariation` est vrai et que l'index actuel n'est pas analysé, lancer une analyse courte (profondeur `reviewDepth`).

```tsx
useEffect(() => {
  if (isVariation && engineMode === 'idle') {
    // Vérifier si le coup actuel a déjà une évaluation dans variationEvaluations
    const hasEval = variationEvaluations.some(e => e.moveIndex === currentMoveIndex);
    if (!hasEval) {
       // Lancer l'analyse Stockfish pour CE coup précis
       // Note: Il faut calculer l'eval de la position AVANT et APRÈS le coup pour classer
    }
  }
}, [currentMoveIndex, isVariation, engineMode]);
```

- [ ] **Step 3: Gérer les résultats de l'analyse de variante dans le worker**
Mettre à jour `variationEvaluations` avec les résultats reçus.

- [ ] **Step 4: Commit**
`git commit -m "feat: implement automatic Stockfish analysis for variations"`

### Task 4: Intégration des badges pour les variantes

**Files:**
- Modify: `app/analysis/page.tsx`

- [ ] **Step 1: Fusionner les évaluations pour l'affichage**
Mettre à jour `autoShapes` et `ClassificationIcon` pour chercher d'abord dans `variationEvaluations` si on est dans une variante.

- [ ] **Step 2: Commit**
`git commit -m "feat: display badges for analyzed variations"`
