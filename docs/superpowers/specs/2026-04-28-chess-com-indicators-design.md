# Design Spec - Indicateurs de coups style Chess.com

Amélioration visuelle de la classification des coups sur l'échiquier et l'historique dans la page d'analyse.

## Objectifs
- Remplacer le cercle de couleur sur l'échiquier par un badge style "Chess.com" (coin supérieur droit avec icône SVG).
- Afficher l'indicateur uniquement pour le coup actuellement sélectionné sur l'échiquier.
- Ajouter des indicateurs visuels dans la liste de l'historique des coups pour les catégories critiques.

## Modifications de l'Échiquier (`app/analysis/page.tsx`)

### 1. Système de Badges SVG
Utilisation de `customSvg` dans les `autoShapes` de Chessground.
- **Positionnement** : Les coordonnées seront calculées pour placer le badge dans le coin supérieur droit de la case de destination du coup actuel.
- **Style** : Badge carré (environ 30% de la taille de la case), bordure arrondie, ombre portée.
- **Icônes et Couleurs** :
  - `incroyable` (!!): Cyan, icône double exclamation.
  - `excellent` / `meilleur` / `tres_bien` / `bon` (✓): Vert/Bleu, icône coche.
  - `theorique` (Livre): Gris/Stone, icône livre.
  - `imprecision` (?!): Jaune, icône ?!
  - `erreur` (?): Orange, icône ?
  - `gaffe` (??): Rouge, icône ??

### 2. Logique d'affichage
- Seul le coup à l'index `currentMoveIndex` sera marqué d'un badge sur l'échiquier.
- Si `currentMoveIndex < 0`, aucun badge ne s'affiche.

## Modifications de l'Historique (`app/analysis/page.tsx`)

### 1. Indicateurs critiques dans la liste
Dans le rendu de l'historique (`renderHistoryList` et le tableau de bilan), ajout d'un indicateur compact à côté du coup pour les catégories suivantes :
- **Incroyable** (!!)
- **Excellent** (!!) (Mentionné comme "exceptionnel" par l'utilisateur)
- **Erreur** (?)
- **Gaffe** (??)

## Technique
- Les SVGs seront définis sous forme de constantes de chaînes de caractères pour être injectés dans `customSvg.html`.
- Mise à jour de la fonction `autoShapes` pour générer le `customSvg` dynamiquement.
- Conservation des couleurs existantes pour la cohérence.

## Validation
- Vérifier que le badge suit bien la pièce lors de la navigation.
- Vérifier que l'orientation (Blanc/Noir) ne casse pas le positionnement du badge.
- Confirmer que les icônes sont lisibles sur mobile et desktop.
