import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { demoExpansion, demoUniverseFor } from "./demo";
import { mergeExpansion, normalizeUniverse, slug, type Artist, type RawExpansion, type UniverseData } from "./universe";

// Claude produces musical analysis only, as structured data. The frontend owns
// every visual decision. Any failure ends in the reference universe, never an error.

const MODEL = process.env.SONORA_MODEL || "claude-opus-5";

const ArtistSchema = z.object({
  name: z.string().describe("The artist's name as commonly written."),
  genres: z.array(z.string()).describe("1-3 names from the genres list, strongest first."),
  traits: z.array(z.string()).describe("2-4 names from the traits list, most characteristic first."),
  why: z.string().describe("One or two sentences, under 30 words: the specific musical link to another selected artist or listed genre."),
  certainty: z.enum(["known", "uncertain"]),
});

const RelationshipSchema = z.object({
  a: z.string(),
  b: z.string(),
  strength: z.number().describe("0 to 1, calibrated as in the instructions."),
  reason: z.string().describe("One sentence, under 20 words, naming the concrete link."),
});

const UniverseSchema = z.object({
  summary: z.object({
    headline: z.string().describe('One short observational sentence, at most 12 words, e.g. "Your selected music leans atmospheric and melodic."'),
    description: z.string().describe("Two sentences, under 40 words: the thread running through the selection, and the main contrast within it."),
  }),
  genres: z
    .array(z.object({ name: z.string(), weight: z.number().describe("0 to 1: share of the selection it covers."), description: z.string().describe("One sentence, under 15 words, on how it sounds.") }))
    .describe("5-6 genres for 5-8 artists; 4-5 for fewer; at most 7."),
  traits: z
    .array(
      z.object({
        name: z.string().describe("One or two words: a sonic or structural quality."),
        strength: z.number().describe("0 to 1: share of the selection that carries it."),
        observation: z.string().describe("One sentence, under 20 words: where and how it is heard in these artists."),
      }),
    )
    .describe("6-7 recurring musical characteristics, strongest first. At most 8."),
  artists: z.array(ArtistSchema).describe("Every input artist, in input order."),
  relationships: z.array(RelationshipSchema).describe("Links between input artists, by name. About as many links as artists; every artist in at least one."),
  discovery: z
    .array(
      z.object({
        name: z.string(),
        kind: z.enum(["genre", "artist", "scene"]),
        description: z.string().describe("One sentence, under 16 words, on how it sounds."),
        why: z.string().describe("One sentence, under 25 words: which points of the map lead here, and the quality they share with it."),
        bridges: z.array(z.string()).describe("2-3 names of input artists or listed genres that lead toward it."),
        entryPoints: z.array(z.string()).describe('2 real, widely known releases: "Artist · Album" for a genre or scene, album titles for an artist.'),
      }),
    )
    .describe("Exactly 5 adjacent territories NOT already in the selection. Mostly genres or scenes, at most 2 artists. Reach out from different parts of the map, not five neighbours of one artist."),
});

const ExpansionSchema = z.object({
  artist: ArtistSchema,
  newGenres: z.array(z.object({ name: z.string(), weight: z.number(), description: z.string() })).describe("0-1 genres this artist introduces that are not already listed."),
  newTraits: z.array(z.object({ name: z.string(), strength: z.number(), observation: z.string() })).describe("0-1 new traits, only if genuinely new."),
  relationships: z.array(RelationshipSchema).describe('1-3 links from the new artist (always "a") to existing artists.'),
  traitShifts: z.array(z.object({ name: z.string(), strength: z.number() })).describe("Existing traits whose strength changes, with the new value. Move each by at most 0.15."),
  shift: z.string().describe('One sentence, under 16 words, on how the landscape moved, e.g. "Daft Punk pulls your universe toward rhythm and electronic territory."'),
});

const SYSTEM = `You are the musical analyst behind SONORA. It draws a listener's selected artists as a universe: YOU at the center, recurring traits on an inner ring, genres on a middle ring, artists outside them, unexplored territory at the edge. Your numbers become distances and brightness, so calibrated structure matters more than prose.

Grounding
- Describe how the music sounds and where it comes from: production, texture, rhythm, voice, song structure, era, scene, lineage. Traits describe the music, never the person. Say "Your selected music leans atmospheric", never "you are 94% melancholic".
- If you do not clearly know an artist, set certainty to "uncertain", give one broad genre and at most two traits, base "why" only on what is safe to say, and keep its relationships at 0.4 or below. Never invent albums, collaborations or history.
- Name only real, widely known releases. Leave out anything you are unsure exists.
- Every genre or trait an artist references must appear by exact name in the genres or traits list.

Traits
- Qualities that separate artists as well as connect them, e.g. Hypnotic, Lo-fi, Groove-led, Cinematic, Motorik, Maximalist.
- Never generic praise or vague mood: no Catchy, Popular, Modern, Good, Emotional, Energetic, Unique, Iconic, Influential.
- Each trait is carried by at least one artist. Strength tracks how much of the selection carries it: 0.85+ nearly all, about 0.6 half, 0.4 one or two.

Genres
- Established names at the level that separates artists (Neo-Psychedelia rather than Rock), yet mostly shared by two or more of them. No invented hybrids. Weight uses the same scale as trait strength.

Relationships: strength sets distance, and links at 0.6 or above are always drawn, so only a few pairs should reach it.
- 0.8-0.95: direct lineage, the same scene, or a documented collaboration or influence.
- 0.6-0.75: a clearly shared sound or approach.
- 0.35-0.55: one specific shared thread.
- Skip pairs with nothing concrete in common. A reason names the actual link, never just a shared broad genre.

"Why" for an artist names another selected artist or listed genre and the specific musical link to it. No biography, no praise.

Discovery is territory the map borders but does not reach: where two or more of its points meet. Not the most famous next step, and never an artist or genre already listed.

Plain, specific, observational prose. No marketing language, no emojis, no em dashes.`;

const STRICT = `
Your previous answer could not be used. Return only data matching the schema. Use exact names from your own lists for every reference, include every input artist, keep every sentence short, and prefer fewer, conservative claims over invented ones.`;

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

// A link to an artist Claude does not know stays below the always-drawn threshold.
const UNCERTAIN_LINK = 0.4;
const round = (v: number) => Math.round(v * 100) / 100;

/**
 * Ground Claude's numbers in its own assignments so the sky has structure and
 * repeat runs agree. A trait carried by most artists sits close to YOU; one
 * carried by a single artist drifts outward. Genres and traits nothing carries
 * are dropped while enough remain, and artists keep the order they were entered.
 */
function refineUniverse(u: UniverseData, input: string[]): UniverseData {
  const n = u.artists.length;
  const share = (count: number) => 0.35 + 0.55 * (count / n);
  const carried = (ids: (a: Artist) => string[], id: string) => u.artists.filter((a) => ids(a).includes(id)).length;
  const inUse = <T extends { id: string }>(list: T[], ids: (a: Artist) => string[], min: number) => {
    const used = list.filter((x) => carried(ids, x.id) > 0);
    return used.length >= min ? used : list;
  };

  const traits = inUse(u.traits, (a) => a.traits, 4)
    .map((t) => ({ ...t, strength: round(0.5 * t.strength + 0.5 * share(carried((a) => a.traits, t.id))) }))
    .sort((x, y) => y.strength - x.strength);
  const genres = inUse(u.genres, (a) => a.genres, 3)
    .map((g) => ({ ...g, weight: round(0.5 * g.weight + 0.5 * share(carried((a) => a.genres, g.id))) }))
    .sort((x, y) => y.weight - x.weight);

  const order = input.map(slug);
  const rank = (a: Artist) => {
    const i = order.indexOf(a.id.slice(2));
    return i < 0 ? order.length : i;
  };
  const artists = [...u.artists].sort((x, y) => rank(x) - rank(y));

  const uncertain = new Set(u.artists.filter((a) => a.uncertain).map((a) => a.id));
  const relationships = u.relationships
    .map((r) => (uncertain.has(r.a) || uncertain.has(r.b) ? { ...r, strength: Math.min(r.strength, UNCERTAIN_LINK) } : r))
    .sort((x, y) => y.strength - x.strength);

  const kept = new Set([...artists.map((a) => a.id), ...genres.map((g) => g.id)]);
  const discovery = u.discovery.map((d) => ({ ...d, bridges: d.bridges.filter((b) => kept.has(b)) }));

  return { ...u, artists, genres, traits, relationships, discovery };
}

/** Keep an addition to links from the new artist, and to gradual trait movement. */
function refineExpansion(u: UniverseData, raw: RawExpansion): RawExpansion {
  const self = slug(raw.artist?.name ?? "");
  const known = new Set(u.artists.map((a) => a.id.slice(2)));
  const uncertain = raw.artist?.certainty === "uncertain";
  const relationships = (raw.relationships ?? [])
    .map((r) => (slug(r.b ?? "") === self ? { ...r, a: r.b, b: r.a } : r))
    .filter((r) => slug(r.a ?? "") === self && known.has(slug(r.b ?? "")))
    .map((r) => (uncertain ? { ...r, strength: Math.min(r.strength ?? UNCERTAIN_LINK, UNCERTAIN_LINK) } : r))
    .slice(0, 3);
  const current = new Map(u.traits.map((t) => [t.id, t.strength]));
  const traitShifts = (raw.traitShifts ?? []).flatMap((t) => {
    const was = current.get("t:" + slug(t.name ?? ""));
    if (was === undefined || typeof t.strength !== "number") return [];
    return [{ name: t.name, strength: round(Math.min(was + 0.2, Math.max(was - 0.2, t.strength))) }];
  });
  return { ...raw, relationships, traitShifts };
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
      const normalized = normalizeUniverse(raw, "claude");
      const u = normalized && refineUniverse(normalized, artists);
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
  const genreName = new Map(u.genres.map((g) => [g.id, g.name]));
  const context = [
    `Current artists: ${u.artists
      .map((a) => (a.genres.length ? `${a.name} (${a.genres.map((g) => genreName.get(g)).join(", ")})` : a.name))
      .join("; ")}`,
    `Current genres: ${u.genres.map((g) => `${g.name} (${g.weight.toFixed(2)})`).join(", ")}`,
    `Current traits: ${u.traits.map((t) => `${t.name} (${t.strength.toFixed(2)})`).join(", ")}`,
    `New artist to add: ${name}`,
    `Place the new artist. Use existing genre and trait names wherever they fit, and add a new one only for something the map genuinely lacks. Link it only to existing artists it has a concrete musical connection with.`,
  ].join("\n");

  for (const strict of [false, true]) {
    try {
      const raw = await ask(ExpansionSchema, context, strict);
      if (!raw) {
        if (!getClient()) break;
        continue;
      }
      const expansion = refineExpansion(u, raw);
      if (mergeExpansion(u, expansion, "claude").artistId) return { expansion, source: "claude" };
    } catch (err) {
      console.error("[sonora] expansion attempt failed", strict ? "(strict)" : "", err instanceof Error ? err.message : err);
      if (!getClient()) break;
    }
  }
  return { expansion: demoExpansion(name, u), source: "demo" };
}
