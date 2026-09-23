// The universe data contract, plus the tolerant normalization that turns anything
// Claude (or the demo) returns into a render-safe structure. Nothing downstream
// should ever need to guard against missing fields.

export type Source = "claude" | "demo";

export interface Artist {
  id: string;
  name: string;
  genres: string[]; // genre ids, strongest first
  traits: string[]; // trait ids
  why: string;
  uncertain: boolean;
}

export interface Genre {
  id: string;
  name: string;
  weight: number; // 0..1, prominence across the selection
  description: string;
}

export interface Trait {
  id: string;
  name: string;
  strength: number; // 0..1
  observation: string;
}

export interface Relationship {
  a: string;
  b: string;
  strength: number;
  reason: string;
}

export interface Discovery {
  id: string;
  name: string;
  kind: "genre" | "artist" | "scene";
  description: string;
  why: string;
  bridges: string[]; // ids of existing artists/genres
  entryPoints: string[];
}

export interface UniverseData {
  source: Source;
  summary: { headline: string; description: string };
  artists: Artist[];
  genres: Genre[];
  traits: Trait[];
  relationships: Relationship[];
  discovery: Discovery[];
}

// Name-referenced shapes, as produced by Claude and by the demo dataset.
export interface RawUniverse {
  summary?: { headline?: string; description?: string };
  artists?: { name?: string; genres?: string[]; traits?: string[]; why?: string; certainty?: string }[];
  genres?: { name?: string; weight?: number; description?: string }[];
  traits?: { name?: string; strength?: number; observation?: string }[];
  relationships?: { a?: string; b?: string; strength?: number; reason?: string }[];
  discovery?: {
    name?: string;
    kind?: string;
    description?: string;
    why?: string;
    bridges?: string[];
    entryPoints?: string[];
  }[];
}

export interface RawExpansion {
  artist?: NonNullable<RawUniverse["artists"]>[number];
  newGenres?: RawUniverse["genres"];
  newTraits?: RawUniverse["traits"];
  relationships?: RawUniverse["relationships"];
  traitShifts?: { name?: string; strength?: number }[];
  shift?: string;
}

export const LIMITS = { artists: 12, genres: 7, genresExpanded: 8, traits: 8, discovery: 5 };

export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "x"
  );
}

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

const num = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const strings = (v: unknown): string[] => arr<unknown>(v).map((s) => str(s)).filter(Boolean);

function uniqueBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((t) => {
    const k = key(t);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Normalize a raw (name-referenced) universe. Returns null only if there is
 * nothing to render at all (no artists).
 */
export function normalizeUniverse(
  input: unknown,
  source: Source,
  genreLimit = LIMITS.genres,
): UniverseData | null {
  const raw = (input && typeof input === "object" ? input : {}) as RawUniverse;

  const genres: Genre[] = uniqueBy(
    arr<NonNullable<RawUniverse["genres"]>[number]>(raw.genres)
      .filter((g) => str(g?.name))
      .map((g) => ({
        id: "g:" + slug(str(g.name)),
        name: str(g.name),
        weight: num(g.weight, 0.5),
        description: str(g.description),
      })),
    (g) => g.id,
  )
    .sort((a, b) => b.weight - a.weight)
    .slice(0, genreLimit);

  const traits: Trait[] = uniqueBy(
    arr<NonNullable<RawUniverse["traits"]>[number]>(raw.traits)
      .filter((t) => str(t?.name))
      .map((t) => ({
        id: "t:" + slug(str(t.name)),
        name: str(t.name),
        strength: num(t.strength, 0.5),
        observation: str(t.observation),
      })),
    (t) => t.id,
  )
    .sort((a, b) => b.strength - a.strength)
    .slice(0, LIMITS.traits);

  const genreIds = new Set(genres.map((g) => g.id));
  const traitIds = new Set(traits.map((t) => t.id));

  const artists: Artist[] = uniqueBy(
    arr<NonNullable<RawUniverse["artists"]>[number]>(raw.artists)
      .filter((a) => str(a?.name))
      .map((a) => {
        const uncertain = str(a.certainty) === "uncertain";
        return {
          id: "a:" + slug(str(a.name)),
          name: str(a.name),
          genres: [...new Set(strings(a.genres).map((n) => "g:" + slug(n)))].filter((id) => genreIds.has(id)),
          traits: [...new Set(strings(a.traits).map((n) => "t:" + slug(n)))].filter((id) => traitIds.has(id)),
          why: str(
            a.why,
            uncertain
              ? "Little is known about this artist, so it sits loosely at the edge of your map."
              : "Part of the landscape your selection describes.",
          ),
          uncertain,
        };
      }),
    (a) => a.id,
  ).slice(0, LIMITS.artists);

  if (artists.length === 0) return null;

  const artistIds = new Set(artists.map((a) => a.id));

  const relationships: Relationship[] = uniqueBy(
    arr<NonNullable<RawUniverse["relationships"]>[number]>(raw.relationships)
      .map((r) => ({
        a: "a:" + slug(str(r?.a)),
        b: "a:" + slug(str(r?.b)),
        strength: num(r?.strength, 0.4),
        reason: str(r?.reason),
      }))
      .filter((r) => r.a !== r.b && artistIds.has(r.a) && artistIds.has(r.b)),
    (r) => [r.a, r.b].sort().join("|"),
  )
    .sort((x, y) => y.strength - x.strength)
    .slice(0, 24);

  const existing = new Set([...artistIds, ...genreIds]);
  const resolveBridge = (n: string) => {
    for (const id of ["a:" + slug(n), "g:" + slug(n)]) if (existing.has(id)) return id;
    return null;
  };

  const discovery: Discovery[] = uniqueBy(
    arr<NonNullable<RawUniverse["discovery"]>[number]>(raw.discovery)
      .filter((d) => str(d?.name))
      .map((d) => {
        const kind = str(d.kind);
        return {
          id: "d:" + slug(str(d.name)),
          name: str(d.name),
          kind: (kind === "artist" || kind === "scene" ? kind : "genre") as Discovery["kind"],
          description: str(d.description),
          why: str(d.why),
          bridges: [...new Set(strings(d.bridges).map(resolveBridge).filter((x): x is string => !!x))],
          entryPoints: strings(d.entryPoints).slice(0, 4),
        };
      }),
    (d) => d.id,
  )
    // A discovery must not duplicate something already on the map.
    .filter((d) => !existing.has("a:" + slug(d.name)) && !existing.has("g:" + slug(d.name)))
    .slice(0, LIMITS.discovery);

  return {
    source,
    summary: {
      headline: str(raw.summary?.headline, "A landscape of your own."),
      description: str(
        raw.summary?.description,
        "These are the recurring qualities across the artists you chose.",
      ),
    },
    artists,
    genres,
    traits,
    relationships,
    discovery,
  };
}

/** Convert back to the name-referenced form so it can be merged and re-normalized. */
export function toRaw(u: UniverseData): RawUniverse {
  const name = new Map<string, string>();
  for (const x of [...u.artists, ...u.genres, ...u.traits]) name.set(x.id, x.name);
  return {
    summary: u.summary,
    artists: u.artists.map((a) => ({
      name: a.name,
      genres: a.genres.map((id) => name.get(id) ?? ""),
      traits: a.traits.map((id) => name.get(id) ?? ""),
      why: a.why,
      certainty: a.uncertain ? "uncertain" : "known",
    })),
    genres: u.genres,
    traits: u.traits,
    relationships: u.relationships.map((r) => ({ ...r, a: name.get(r.a), b: name.get(r.b) })),
    discovery: u.discovery.map((d) => ({ ...d, bridges: d.bridges.map((id) => name.get(id) ?? "") })),
  };
}

/** Fold an expansion into an existing universe. Ids stay stable, so the layout only shifts. */
export function mergeExpansion(
  u: UniverseData,
  input: unknown,
  source: Source,
): { universe: UniverseData; artistId: string | null; shift: string } {
  const exp = (input && typeof input === "object" ? input : {}) as RawExpansion;
  const artistName = str(exp.artist?.name);
  if (!artistName || u.artists.length >= LIMITS.artists) {
    return { universe: u, artistId: null, shift: "" };
  }

  const raw = toRaw(u);
  const shifts = new Map(
    arr<{ name?: string; strength?: number }>(exp.traitShifts)
      .filter((t) => str(t?.name))
      .map((t) => ["t:" + slug(str(t.name)), num(t.strength, 0.5)]),
  );

  const merged: RawUniverse = {
    ...raw,
    artists: [...(raw.artists ?? []).filter((a) => slug(a.name ?? "") !== slug(artistName)), exp.artist!],
    // New genres enter with enough weight to survive the cap.
    genres: [
      ...(raw.genres ?? []),
      ...arr<NonNullable<RawUniverse["genres"]>[number]>(exp.newGenres).map((g) => ({
        ...g,
        weight: Math.max(num(g?.weight, 0.5), 0.35),
      })),
    ],
    traits: [
      ...(raw.traits ?? []).map((t) => ({
        ...t,
        strength: shifts.get("t:" + slug(t.name ?? "")) ?? t.strength,
      })),
      ...arr<NonNullable<RawUniverse["traits"]>[number]>(exp.newTraits),
    ],
    relationships: [...(raw.relationships ?? []), ...arr<NonNullable<RawUniverse["relationships"]>[number]>(exp.relationships)],
  };

  const universe = normalizeUniverse(merged, u.source === "claude" && source === "claude" ? "claude" : "demo", LIMITS.genresExpanded);
  if (!universe) return { universe: u, artistId: null, shift: "" };
  const artistId = "a:" + slug(artistName);
  return {
    universe,
    artistId: universe.artists.some((a) => a.id === artistId) ? artistId : null,
    shift: str(exp.shift, `${artistName} joins your universe.`),
  };
}
