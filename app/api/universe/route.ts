import { generateUniverse } from "@/lib/claude";
import { demoUniverseFor } from "@/lib/demo";

export const maxDuration = 90;

export async function POST(request: Request) {
  let artists: string[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body?.artists)) {
      artists = body.artists
        .filter((a: unknown): a is string => typeof a === "string")
        .map((a: string) => a.trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 10);
    }
  } catch {
    // An unreadable request still gets a universe.
  }

  if (artists.length === 0) return Response.json({ universe: demoUniverseFor([]) });

  try {
    return Response.json({ universe: await generateUniverse(artists) });
  } catch (err) {
    console.error("[sonora] universe route", err);
    return Response.json({ universe: demoUniverseFor(artists) });
  }
}
