import { NextRequest, NextResponse } from "next/server";
import { ChessArchiveResponse, ChessGame } from "@/types/chess";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const daysStr = searchParams.get("days");
  
  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const now = new Date();
  const nowTs = Math.floor(now.getTime() / 1000);
  const isTotal = daysStr === "total";
  const days = isTotal ? 365 * 20 : parseInt(daysStr || "30");
  const secondsLimit = days * 24 * 60 * 60;
  const timestampLimit = nowTs - secondsLimit;

  // Calculate start year and month for pre-filtering archive URLs
  const startDate = new Date(now.getTime() - (secondsLimit * 1000));
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;

  try {
    const archiveRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`, {
      headers: { "User-Agent": "Chessmaxing (Analysis App)" },
    });

    if (!archiveRes.ok) throw new Error("Joueur introuvable");

    const { archives }: ChessArchiveResponse = await archiveRes.json();
    if (!archives || archives.length === 0) return NextResponse.json({ games: [] });

    // Filter archive URLs by date to avoid fetching unnecessary data
    const filteredArchiveUrls = archives.filter(url => {
      if (isTotal) return true;
      const parts = url.split("/");
      const year = parseInt(parts[parts.length - 2]);
      const month = parseInt(parts[parts.length - 1]);
      
      if (year > startYear) return true;
      if (year === startYear && month >= startMonth) return true;
      return false;
    });

    // Fetch archives in parallel for better performance
    // We limit to most recent archives if it's too many, but here we try all filtered
    const archivePromises = filteredArchiveUrls.reverse().map(url => 
      fetch(url, { headers: { "User-Agent": "Chessmaxing (Analysis App)" } })
        .then(res => res.ok ? res.json() : { games: [] })
        .catch(() => ({ games: [] }))
    );

    const archivesData = await Promise.all(archivePromises);
    
    let allGames: ChessGame[] = [];
    for (const data of archivesData) {
      if (data.games) {
        const filtered = data.games.filter((g: ChessGame) => g.end_time >= timestampLimit);
        allGames.push(...filtered);
      }
    }
    
    // Sort by most recent
    allGames.sort((a, b) => b.end_time - a.end_time);

    return NextResponse.json({ games: allGames });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
