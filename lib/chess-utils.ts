/**
 * Formate une date au format lisible
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Extrait les métadonnées de base d'un PGN (basique)
 */
export function parseBasicPgn(pgn: string) {
  const result: Record<string, string> = {};
  if (!pgn) return result;
  
  const tags = pgn.match(/\[(\w+)\s+"(.*?)"\]/g) || [];
  
  tags.forEach(tag => {
    const match = tag.match(/\[(\w+)\s+"(.*?)"\]/);
    if (match) {
      result[match[1]] = match[2];
    }
  });
  
  return result;
}
