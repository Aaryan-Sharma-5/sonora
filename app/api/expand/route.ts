import { generateExpansion } from "@/lib/claude";
import { demoExpansion } from "@/lib/demo";
import { normalizeUniverse, toRaw, type UniverseData } from "@/lib/universe";

export const maxDuration = 90;

export async function POST(request: Request) {
  let universe: UniverseData | null = null;
  let artist = "";
  try {
    const body = await request.json();
    artist = typeof body?.artist === "string" ? body.artist.trim().slice(0, 80) : "";
    // Never trust the client's copy: re-normalize it before using it as context.
    if (body?.universe && Array.isArray(body.universe.artists)) {
      universe = normalizeUniverse(toRaw(body.universe as UniverseData), "demo");
    }
  } catch {
    // fall through
  }

  if (!universe || !artist) return Response.json({ expansion: null, source: "demo" });

  try {
    return Response.json(await generateExpansion(universe, artist));
  } catch (err) {
    console.error("[sonora] expand route", err);
    return Response.json({ expansion: demoExpansion(artist, universe), source: "demo" });
  }
}
