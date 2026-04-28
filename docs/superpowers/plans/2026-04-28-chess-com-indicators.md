# Indicateurs de coups style Chess.com Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les cercles de couleur par des badges SVG style Chess.com sur l'échiquier et ajouter des indicateurs dans l'historique.

**Architecture:** Utilisation de `customSvg` dans les `autoShapes` de Chessground pour l'échiquier, et injection d'icônes SVG compactes dans les composants de la liste d'historique.

**Tech Stack:** React, Next.js, Chessground, SVG.

---

### Task 1: Définition des constantes SVG et types

**Files:**
- Modify: `app/analysis/page.tsx`

- [ ] **Step 1: Ajouter les constantes d'icônes SVG et les couleurs**

```typescript
const CLASSIFICATION_ICONS: Record<MoveClassification, { icon: string, color: string, label: string }> = {
  incroyable: { 
    icon: '<path d="M10 17.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM8.5 4a1 1 0 0 0-1 1v9a1 1 0 0 0 2 0V5a1 1 0 0 0-1-1Zm6 13.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-1.5-13.5a1 1 0 0 0-1 1v9a1 1 0 0 0 2 0V5a1 1 0 0 0-1-1Z" fill="white"/>', 
    color: '#00bcd4', // Cyan
    label: '!!' 
  },
  excellent: { 
    icon: '<path d="M10.243 15.314L6 11.071l1.414-1.414 2.829 2.828 5.657-5.657 1.414 1.414z" fill="white"/>', 
    color: '#2196f3', // Blue
    label: '!!' 
  },
  meilleur: { 
    icon: '<path d="M10.243 15.314L6 11.071l1.414-1.414 2.829 2.828 5.657-5.657 1.414 1.414z" fill="white"/>', 
    color: '#4caf50', // Green
    label: '✓' 
  },
  tres_bien: { 
    icon: '<path d="M10.243 15.314L6 11.071l1.414-1.414 2.829 2.828 5.657-5.657 1.414 1.414z" fill="white"/>', 
    color: '#81c784', // Light Green
    label: '✓' 
  },
  bon: { 
    icon: '<path d="M10.243 15.314L6 11.071l1.414-1.414 2.829 2.828 5.657-5.657 1.414 1.414z" fill="white"/>', 
    color: '#a5d6a7', // Pale Green
    label: '✓' 
  },
  theorique: { 
    icon: '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Zm2 0v12h12V6H6Zm3 2h6v2H9V8Zm0 4h6v2H9v-2Z" fill="white"/>', 
    color: '#78909c', // Stone
    label: 'Livre' 
  },
  imprecision: { 
    icon: '<path d="M11 15v2h2v-2h-2Zm0-8v6h2V7h-2Zm5.17 8a2 2 0 1 1-2.83 2.83 2 2 0 0 1 2.83-2.83ZM13 7h2v6h-2V7Z" fill="white"/>', // Approximation of ?!
    color: '#fbc02d', // Yellow
    label: '?!' 
  },
  erreur: { 
    icon: '<path d="M11 15v2h2v-2h-2Zm0-8v6h2V7h-2Z" fill="white"/>', // ?
    color: '#fb8c00', // Orange
    label: '?' 
  },
  gaffe: { 
    icon: '<path d="M8 15v2h2v-2H8Zm5 0v2h2v-2h-2ZM9 7v6h2V7H9Zm5 0v6h2V7h-2Z" fill="white"/>', // ??
    color: '#e53935', // Red
    label: '??' 
  }
};
```

- [ ] **Step 2: Commit**
`git commit -m "chore: add classification icons and colors"`

### Task 2: Implémenter la génération de Badge SVG

**Files:**
- Modify: `app/analysis/page.tsx`

- [ ] **Step 1: Créer la fonction `generateBadgeSvg`**

```typescript
const generateBadgeSvg = (classification: MoveClassification) => {
  const config = CLASSIFICATION_ICONS[classification];
  const size = 32; // On 100x100 square scale
  const offset = 68; // 100 - size
  
  return `
    <g transform="translate(${offset}, 0)">
      <rect width="${size}" height="${size}" rx="4" fill="${config.color}" filter="drop-shadow(0 2px 2px rgba(0,0,0,0.5))" />
      <svg width="${size}" height="${size}" viewBox="0 0 24 24">
        ${config.icon}
      </svg>
    </g>
  `;
};
```

- [ ] **Step 2: Mettre à jour `autoShapes`**

```typescript
// Dans le useMemo de autoShapes
if (activeTab === 'bilan' && gameEvaluations.length > 0 && currentMoveIndex >= 0) {
  const fens = reviewQueueRef.current;
  let theoreticalCount = 0;
  for (let i = 0; i < history.length; i++) {
    const seq = history.slice(0, i + 1).join(" ");
    if (ecoData[seq]) theoreticalCount = i + 1;
  }

  const moveEval = classifyMove(currentMoveIndex, gameEvaluations, fens, currentMoveIndex < theoreticalCount, history);
  const lastMoveSan = history[currentMoveIndex];
  try {
    const tempChess = new Chess(fens[currentMoveIndex]);
    const m = tempChess.move(lastMoveSan);
    const dest = m.to as Key;

    shapes.push({
      orig: dest,
      customSvg: {
        html: generateBadgeSvg(moveEval.classification),
        center: 'orig'
      }
    });
  } catch(e) {}
}
```

- [ ] **Step 3: Vérifier le rendu sur l'échiquier**
Run: `npm run dev` et tester une analyse.
Expected: Un badge coloré apparaît dans le coin de la case de destination du coup.

- [ ] **Step 4: Commit**
`git commit -m "feat: implement Chess.com style badges on board"`

### Task 3: Ajouter les indicateurs dans l'historique

**Files:**
- Modify: `app/analysis/page.tsx`

- [ ] **Step 1: Créer un composant `ClassificationIcon` compact**

```typescript
const ClassificationIcon = ({ classification }: { classification: MoveClassification }) => {
  const config = CLASSIFICATION_ICONS[classification];
  // Afficher seulement pour les catégories critiques demandées
  const showList = ['incroyable', 'excellent', 'erreur', 'gaffe'];
  if (!showList.includes(classification)) return null;

  return (
    <span className={cn("inline-flex items-center justify-center size-4 rounded-[2px] text-[8px] font-black text-white ml-1", 
      classification === 'incroyable' ? "bg-cyan-500" :
      classification === 'excellent' ? "bg-blue-500" :
      classification === 'erreur' ? "bg-orange-500" :
      "bg-red-500"
    )}>
      {classification === 'incroyable' || classification === 'excellent' ? '!!' : 
       classification === 'erreur' ? '?' : '??'}
    </span>
  );
};
```

- [ ] **Step 2: Intégrer `ClassificationIcon` dans `renderHistoryList`**

```typescript
// Dans renderHistoryList, pour chaque coup affiché
// Calculer la classification du coup i
const moveClass = classifications[i].classification;
// ...
<div ...><FormattedMove move={mainHistory[idx1]} /><ClassificationIcon classification={moveClass} /></div>
```

- [ ] **Step 3: Intégrer `ClassificationIcon` dans `renderReport` (Optionnel mais recommandé)**

- [ ] **Step 4: Commit**
`git commit -m "feat: add classification icons to history list"`

### Task 4: Finalisation et Nettoyage

**Files:**
- Modify: `app/analysis/page.tsx`

- [ ] **Step 1: Supprimer l'ancienne logique de cercle de couleur**
Retirer les `shapes.push({ orig: dest, dest: dest, brush: ... })` obsolètes.

- [ ] **Step 2: Vérification finale**
Tester la navigation complète, vérifier que l'orientation inversée (Noirs) positionne toujours le badge correctement (Chessground gère normalement la rotation du `customSvg` s'il est attaché à `orig`).

- [ ] **Step 3: Commit final**
`git commit -m "refactor: clean up old markers and finalize indicators"`
