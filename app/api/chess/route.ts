import { NextRequest, NextResponse } from "next/server";
import { ChessArchiveResponse, ChessGame } from "@/types/chess";
import fs from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const daysStr = searchParams.get("days");
  
  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  // Si "total", on met une limite très lointaine (ex: 20 ans), sinon on utilise le nombre de jours
  const days = daysStr === "total" ? 365 * 20 : parseInt(daysStr || "30");
  const secondsLimit = days * 24 * 60 * 60;
  const timestampLimit = now - secondsLimit;

  try {
    if (process.env.DEV === "1") {
      const filePath = path.join(process.cwd(), "data", "titouannnnnn_1y.json");
      try {
        const fileContent = await fs.readFile(filePath, "utf-8");
        const allGames: ChessGame[] = JSON.parse(fileContent);
        const filteredGames = allGames.filter((g) => g.end_time >= timestampLimit);
        return NextResponse.json({ games: filteredGames.sort((a, b) => b.end_time - a.end_time) });
      } catch (err) {
        console.error("Failed to read local DEV file:", err);
      }
    }

    const archiveRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`, {
      headers: { "User-Agent": "Chessmaxing (Minimal App)" },
    });

    if (!archiveRes.ok) throw new Error("Joueur introuvable");

    const { archives }: ChessArchiveResponse = await archiveRes.json();
    if (!archives || archives.length === 0) return NextResponse.json({ games: [] });

    const allGames: ChessGame[] = [];
    const reversedArchives = [...archives].reverse();

    for (const archiveUrl of reversedArchives) {
      const gamesRes = await fetch(archiveUrl, {
        headers: { "User-Agent": "Chessmaxing (Minimal App)" },
      });

      if (gamesRes.ok) {
        const { games } = await gamesRes.json();
        const filtered = games.filter((g: ChessGame) => g.end_time >= timestampLimit);
        allGames.push(...filtered);

        const oldestInArchive = games[0]?.end_time;
        if (oldestInArchive && oldestInArchive < timestampLimit) break;
      }
      // Sécurité pour éviter d'exploser les limites de l'API gratuite
      if (allGames.length > 500) break;
    }
    
    return NextResponse.json({ 
      games: allGames.sort((a, b) => b.end_time - a.end_time)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
