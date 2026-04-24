# ChessMaxer - Project Overview (Simplified)

Application minimaliste pour récupérer les dernières parties jouées sur Chess.com par un utilisateur.

## Tech Stack
- **Frontend/Backend**: Next.js 14 (App Router), TypeScript.
- **Styling**: Tailwind CSS, Shadcn UI.
- **Data Source**: Chess.com Public API.

## Fonctionnalités
- Recherche par pseudo Chess.com.
- Affichage des 20 dernières parties du mois en cours.
- Affichage simple : Date, Joueurs (Eros/Pseudo), et Résultat.

## Structure
- `app/page.tsx` : Interface unique de recherche et d'affichage.
- `app/api/chess/route.ts` : Proxy API pour récupérer les archives et les parties.
- `lib/chess-utils.ts` : Utilitaire de formatage de date.
- `types/chess.ts` : Types TypeScript pour les données Chess.com.
- `data/` : Dossier conservé pour le stockage de données JSON locales.

## Commandes
- `npm run dev` : Lancer le projet en local.
- `npm run build` : Compiler pour la production.
