# Design Spec - Amélioration de l'Historique et Analyse des Variantes

Ce document détaille l'amélioration de l'interface de l'historique des coups et l'ajout de l'analyse automatique des variantes.

## Objectifs
- **Interface** : Refondre l'historique des coups pour afficher deux coups par ligne (Blanc/Noir) dans une grille compacte.
- **UX** : Implémenter le défilement automatique (auto-scroll) pour que le coup actif soit toujours visible.
- **Analyse** : Déclencher automatiquement Stockfish pour classer les coups joués dans une variante (hors ligne principale) avec la même profondeur que le bilan initial.

## 1. Interface de l'Historique (`app/analysis/page.tsx`)
- **Structure de la Grille** :
  - Ligne : `[Numéro] [Coup Blanc + Badge] [Coup Noir + Badge]`.
  - Alignement fixe pour que les colonnes soient droites.
  - Conservation des "blocs de variante" indentés entre les lignes de la partie principale.
- **Dimensions** : Augmenter la hauteur maximale du conteneur de l'historique (ex: de `h-[400px]` à `flex-1` ou une valeur plus grande selon le contexte Flex).
- **Auto-scroll** :
  - Utilisation de `useEffect` branché sur `currentMoveIndex`.
  - Utilisation de `scrollIntoView({ block: 'center', behavior: 'smooth' })` sur l'élément du coup actif.

## 2. Analyse Automatique des Variantes
- **Logique de déclenchement** :
  - Détection de variante : `currentMoveIndex` appartient à une séquence qui diffère de `mainHistory`.
  - Si `isVariation` est vrai et que le coup actuel n'a pas encore d'évaluation dans `gameEvaluations` (ou un état dédié `variationEvaluations`).
- **Moteur Stockfish** :
  - Utilisation du worker existant.
  - Profondeur : Identique à `reviewDepth` (par défaut 16).
  - Paramètres : `MultiPV 2` pour pouvoir calculer le `deltaW` (différence entre le meilleur coup et le coup joué).
- **Stockage** : Les évaluations des variantes seront fusionnées ou stockées parallèlement à `gameEvaluations` pour être affichées sur l'échiquier (badges) et dans la liste.

## 3. Détails Techniques
- **Calcul de classification** : Réutilisation de la fonction `classifyMove` pour assurer la cohérence des labels (!!, ?, etc.).
- **Synchronisation** : S'assurer que l'analyse du bilan initial n'est pas interrompue par une navigation accidentelle, ou que l'analyse de variante s'arrête si on lance un nouveau bilan complet.

## 4. Validation
- Vérifier que l'auto-scroll fonctionne lors de la navigation au clavier (flèches).
- Vérifier que le badge SVG Chess.com apparaît sur l'échiquier dès qu'une variante est jouée et analysée.
- Vérifier que la mise en page à deux colonnes reste lisible sur petit écran.
