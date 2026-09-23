import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { demoExpansion, demoUniverseFor } from "./demo";
import { mergeExpansion, normalizeUniverse, type RawExpansion, type UniverseData } from "./universe";

// Claude produces musical analysis only, as structured data. The frontend owns
// every visual decision. Any failure ends in the reference universe, never an error.

const MODEL = process.env.SONORA_MODEL || "claude-opus-5";

const ArtistSchema = z.object({
  name: z.string().describe("The artist's name as commonly written."),
  genres: z.array(z.string()).describe("1-3 genre names, each exactly matching a name in the genres list. Strongest first."),
  traits: z.array(z.string()).describe("2-4 trait names, each exactly matching a name in the traits list."),
  why: z.string().describe("One or two short sentences (under 35 words) on why this artist belongs here and what links it to the others."),
  certainty: z.enum(["known", "uncertain"]),
});

const UniverseSchema = z.object({
  summary: z.object({
    headline: z.string().describe('One observational sentence, e.g. "Your selected music leans atmospheric and melodic."'),
    description: z.string().describe("Two short sentences (under 45 words) on the recurring thread across the selection."),
  }),
  genres: z
    .array(z.object({ name: z.string(), weight: z.number().describe("0 to 1: prominence across the selection."), description: z.string().describe("One short sentence.") }))
    .describe("5-6 genres for 5-8 artists; 4-5 for fewer; at most 7."),
  traits: z
    .array(z.object({ name: z.string().describe("One word, e.g. Atmospheric."), strength: z.number().describe("0 to 1"), observation: z.string().describe("One short sentence about the music.") }))
    .describe("6-7 recurring musical characteristics, strongest first. At most 8."),
  artists: z.array(ArtistSchema).describe("Every input artist, in input order."),
  relationships: z
    .array(z.object({ a: z.string(), b: z.string(), strength: z.number().describe("0 to 1"), reason: z.string().describe("One short sentence.") }))
    .describe("Meaningful artist-to-artist links only, using input artist names. Roughly one per artist."),
  discovery: z
    .array(
      z.object({
        name: z.string(),
        kind: z.enum(["genre", "artist", "scene"]),
        description: z.string(),
        why: z.string(),
        bridges: z.array(z.string()).describe("Names of input artists or listed genres that lead toward it."),
        entryPoints: z.array(z.string()).describe('2 real starting points, formatted "Artist · Album" or album titles.'),
      }),
    )
    .describe("Exactly 5 adjacent territories NOT already in the selection. Mostly genres, at most 2 artists."),
});

const ExpansionSchema = z.object({
  artist: ArtistSchema,
  newGenres: z.array(z.object({ name: z.string(), weight: z.number(), description: z.string() })).describe("0-1 genres this artist introduces that are not already listed."),
  newTraits: z.array(z.object({ name: z.string(), strength: z.number(), observation: z.string() })).describe("0-1 new traits, only if genuinely new."),
  relationships: z.array(z.object({ a: z.string(), b: z.string(), strength: z.number(), reason: z.string() })).describe("1-3 links from the new artist to existing artists."),
  traitShifts: z.array(z.object({ name: z.string(), strength: z.number() })).describe("Existing traits whose strength changes, with the new value."),
  shift: z.string().describe('One sentence on how the landscape moved, e.g. "Daft Punk pulls your universe toward rhythm and electronic territory."'),
});

const SYSTEM = `You are the musical analyst behind SONORA, which maps a listener's selected artists into a universe of artists, genres and recurring musical traits.

Rules:
- Return musical analysis only. Be specific, observational and grounded in how the music actually sounds.
- Traits describe the music, never the person. Say "Your selected music leans atmospheric", never "you are 94% melancholic".
- If you are not confident about an artist, set certainty to "uncertain", give broad conservative genres, and do not invent facts, albums or history.
- Every genre or trait an artist references must appear by exact name in the genres or traits list.
- Discovery must suggest real music adjacent to the selection that is not already in it.
- Plain, confident prose. No marketing language, no emojis, no em dashes.`;

const STRICT = `
Your previous answer could not be used. Return only data matching the schema. Use exact names from your own lists for every reference, include every input artist, and prefer fewer, conservative claims over invented ones.`;

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return null;
  // Keys that are not scoped to a workspace must name one on every request.
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
  client ??= new Anthropic({
    timeout: 60_000,
    maxRetries: 1,
    defaultHeaders: workspace ? { "anthropic-workspace-id": workspace } : undefined,
  });
  return client;
}

async function ask<T extends z.ZodType>(schema: T, user: string, strict: boolean): Promise<z.infer<T> | null> {
  const c = getClient();
  if (!c) return null;
  const res = await c.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: strict ? SYSTEM + STRICT : SYSTEM,
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(schema), effort: "low" },
  });
  if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
  return (res.parsed_output as z.infer<T> | null) ?? null;
}

// Same artists, same universe: repeat requests (a rehearsed demo) return instantly.
const cache = new Map<string, UniverseData>();
const cacheKey = (artists: string[]) => artists.map((a) => a.toLowerCase().trim()).sort().join("|");

/** Claude, then a stricter retry, then the reference universe. */
export async function generateUniverse(artists: string[]): Promise<UniverseData> {
  const cached = cache.get(cacheKey(artists));
  if (cached) return cached;
  const user = `Map the universe for these artists:\n${artists.map((a) => `- ${a}`).join("\n")}`;
  for (const strict of [false, true]) {
    try {
      const raw = await ask(UniverseSchema, user, strict);
      if (!raw) {
        if (!getClient()) break;
        continue;
      }
      const u = normalizeUniverse(raw, "claude");
      // Require that the map actually contains most of what was asked for.
      if (u && u.artists.length >= Math.ceil(artists.length * 0.6) && u.genres.length >= 2 && u.traits.length >= 3) {
        cache.set(cacheKey(artists), u);
        return u;
      }
    } catch (err) {
      console.error("[sonora] universe attempt failed", strict ? "(strict)" : "", err instanceof Error ? err.message : err);
      if (!getClient()) break;
    }
  }
  return demoUniverseFor(artists);
}

export async function generateExpansion(u: UniverseData, name: string): Promise<{ expansion: RawExpansion; source: "claude" | "demo" }> {
  const context = [
    `Current artists: ${u.artists.map((a) => a.name).join(", ")}`,
    `Current genres: ${u.genres.map((g) => `${g.name} (${g.weight.toFixed(2)})`).join(", ")}`,
    `Current traits: ${u.traits.map((t) => `${t.name} (${t.strength.toFixed(2)})`).join(", ")}`,
    `New artist to add: ${name}`,
    `Place the new artist. Prefer existing genre and trait names where they fit; reference only existing artists in relationships.`,
  ].join("\n");

  for (const strict of [false, true]) {
    try {
      const raw = await ask(ExpansionSchema, context, strict);
      if (!raw) {
        if (!getClient()) break;
        continue;
      }
      if (mergeExpansion(u, raw, "claude").artistId) return { expansion: raw, source: "claude" };
    } catch (err) {
      console.error("[sonora] expansion attempt failed", strict ? "(strict)" : "", err instanceof Error ? err.message : err);
      if (!getClient()) break;
    }
  }
  return { expansion: demoExpansion(name, u), source: "demo" };
}
