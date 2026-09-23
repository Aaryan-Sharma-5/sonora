// Deterministic spatial layout. The same universe always produces the same sky:
// every position derives from hashes of stable ids, never from render order.
//
// The universe is a disc in the XZ plane with gentle vertical depth.
//   YOU at the origin, traits on an inner ring, genres on a middle ring,
//   artists outside them near the genres they belong to, and discovery
//   territory in the widest empty sector at the edge.

import type { UniverseData } from "./universe";

export type Kind = "you" | "artist" | "genre" | "trait" | "discovery";
export type EdgeKind = "you-trait" | "you-genre" | "artist-genre" | "artist-artist" | "artist-trait" | "bridge" | "dna-ring";
export type V3 = [number, number, number];

export interface LayoutNode {
  id: string;
  kind: Kind;
  name: string;
  pos: V3;
  dnaPos: V3;
  size: number;
  seed: number; // 0..1, for per-node shader variation
}

export interface LayoutEdge {
  id: string;
  a: string;
  b: string;
  kind: EdgeKind;
  strength: number;
  rest: boolean; // visible in the resting overview
}

export interface Layout {
  nodes: LayoutNode[];
  byId: Map<string, LayoutNode>;
  edges: LayoutEdge[];
  sectorAngle: number;
  sectorCenter: V3;
  radius: number; // outer radius of the artist ring, for camera framing
}

export const YOU_ID = "you";
/** The uncharted region itself, as a hover target: not a node, a direction. */
export const UNCHARTED_ID = "__uncharted";
const TAU = Math.PI * 2;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable pseudo-random number in [0, 1) for a key. */
export function rand(key: string): number {
  let t = (hash(key) + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const polar = (angle: number, r: number, y: number): V3 => [Math.cos(angle) * r, y, Math.sin(angle) * r];

/** Middle of the widest angular gap, optionally only among the gaps that touch `near`. */
function openBearing(angles: number[], near?: number): number {
  const s = angles.map((a) => ((a % TAU) + TAU) % TAU).sort((x, y) => x - y);
  const at = (a: number) => near !== undefined && Math.abs(Math.atan2(Math.sin(a - near), Math.cos(a - near))) < 1e-6;
  let best = -1;
  let mid = near ?? 0;
  s.forEach((a, i) => {
    const next = i === s.length - 1 ? s[0] + TAU : s[i + 1];
    if (near !== undefined && !at(a) && !at(next)) return;
    if (next - a > best) {
      best = next - a;
      mid = a + (next - a) / 2;
    }
  });
  return mid;
}

/**
 * Adding to an existing universe: everything already on the map keeps its
 * bearing, and newcomers settle into open space beside their closest neighbour.
 */
function keepBearings(ids: string[], angles: Map<string, number>, prev: Layout, neighbour: (id: string, placed: string[]) => string | undefined) {
  const placed = new Map<string, number>();
  for (const id of ids) {
    const p = prev.byId.get(id);
    if (p) placed.set(id, Math.atan2(p.pos[2], p.pos[0]));
  }
  if (placed.size === 0) return;
  for (const id of ids) {
    if (placed.has(id)) continue;
    const near = neighbour(id, [...placed.keys()]);
    placed.set(id, openBearing([...placed.values()], near === undefined ? undefined : placed.get(near)));
  }
  for (const [id, a] of placed) angles.set(id, a);
}

/** `prev` is the layout being grown (adding an artist); omit it for a fresh universe. */
export function computeLayout(u: UniverseData, prev?: Layout | null): Layout {
  const n = u.artists.length;
  // 5 to 8 artists is the tuned range. Smaller sets contract a little so they stay
  // connected, but keep the same spatial scale: a small universe, not a shrunken one.
  const k = n <= 3 ? 0.92 : n === 4 ? 0.96 : n <= 8 ? 1 : 1.08;
  const nodes: LayoutNode[] = [];

  nodes.push({ id: YOU_ID, kind: "you", name: "YOU", pos: [0, 0, 0], dnaPos: [0, 0, 0], size: 1, seed: 0.5 });

  // Traits: inner ring, strongest closest to YOU.
  const traitOffset = rand("traits") * TAU;
  const traitAngle = new Map<string, number>();
  const traitDnaAngle = new Map<string, number>();
  u.traits.forEach((t, i) => traitAngle.set(t.id, traitOffset + (i * TAU) / u.traits.length + (rand(t.id + "a") - 0.5) * 0.25));
  if (prev) keepBearings(u.traits.map((t) => t.id), traitAngle, prev, () => undefined);
  u.traits.forEach((t, i) => {
    const a = traitAngle.get(t.id)!;
    const r = (4.6 + (1 - t.strength) * 3.4) * k;
    const dnaA = -Math.PI / 2 + (i * TAU) / u.traits.length;
    traitDnaAngle.set(t.id, dnaA);
    nodes.push({
      id: t.id,
      kind: "trait",
      name: t.name,
      pos: polar(a, r, (rand(t.id + "y") - 0.5) * 1.4),
      dnaPos: polar(dnaA, 4 + t.strength * 13, 0),
      size: 0.5 + t.strength * 0.25,
      seed: rand(t.id),
    });
  });

  // Genres: middle ring. Order them so genres that share artists sit next to
  // each other, which keeps artist placement meaningful.
  const cooc = (x: string, y: string) => u.artists.filter((a) => a.genres.includes(x) && a.genres.includes(y)).length;
  const order: string[] = [];
  const pool = u.genres.map((g) => g.id);
  if (pool.length) order.push(pool.shift()!);
  while (pool.length) {
    const last = order[order.length - 1];
    pool.sort((x, y) => cooc(last, y) - cooc(last, x));
    order.push(pool.shift()!);
  }
  const genreOffset = rand("genres") * TAU;
  const genreAngle = new Map<string, number>();
  order.forEach((id, i) => genreAngle.set(id, genreOffset + (i * TAU) / order.length + (rand(id + "a") - 0.5) * 0.18));
  if (prev) {
    keepBearings(order, genreAngle, prev, (id, placed) => {
      let best: string | undefined;
      for (const x of placed) if (cooc(id, x) > (best ? cooc(id, best) : 0)) best = x;
      return best;
    });
  }
  order.forEach((id) => {
    const g = u.genres.find((x) => x.id === id)!;
    const a = genreAngle.get(id)!;
    const r = (10.8 + (1 - g.weight) * 3.6) * k;
    nodes.push({
      id,
      kind: "genre",
      name: g.name,
      pos: polar(a, r, (rand(id + "y") - 0.5) * 2.2),
      dnaPos: polar(a, 27, -3.5),
      size: 0.75 + g.weight * 0.45,
      seed: rand(id),
    });
  });

  // Artists: pulled toward their genres, pushed outward, then relaxed apart.
  const artistPts = u.artists.map((a) => {
    let sx = 0;
    let sz = 0;
    a.genres.forEach((gid, i) => {
      const ang = genreAngle.get(gid);
      if (ang === undefined) return;
      const w = [1, 0.55, 0.35][i] ?? 0.25;
      sx += Math.cos(ang) * w;
      sz += Math.sin(ang) * w;
    });
    const angle = sx === 0 && sz === 0 ? rand(a.id) * TAU : Math.atan2(sz, sx) + (rand(a.id + "a") - 0.5) * 0.3;
    const strengths = a.traits.map((t) => u.traits.find((x) => x.id === t)?.strength ?? 0);
    const centrality = a.uncertain ? 0 : Math.min(1, (strengths.reduce((s, v) => s + v, 0) / 3) * 0.9 + a.genres.length * 0.05);
    const r = (16 + (1 - centrality) * 5.5 + rand(a.id + "r") * 1.5) * k;
    return { a, x: Math.cos(angle) * r, z: Math.sin(angle) * r, r, centrality };
  });

  const minSep = 7 * k;
  for (let iter = 0; iter < 60; iter++) {
    for (let i = 0; i < artistPts.length; i++) {
      for (let j = i + 1; j < artistPts.length; j++) {
        const p = artistPts[i];
        const q = artistPts[j];
        let dx = q.x - p.x;
        let dz = q.z - p.z;
        let d = Math.hypot(dx, dz);
        if (d >= minSep) continue;
        if (d < 1e-4) {
          dx = Math.cos(rand(p.a.id + q.a.id) * TAU);
          dz = Math.sin(rand(p.a.id + q.a.id) * TAU);
          d = 1;
        }
        const push = (minSep - d) / 2;
        p.x -= (dx / d) * push;
        p.z -= (dz / d) * push;
        q.x += (dx / d) * push;
        q.z += (dz / d) * push;
      }
    }
    // Keep each artist on its own ring so the disc keeps its shape.
    for (const p of artistPts) {
      const d = Math.hypot(p.x, p.z) || 1;
      p.x = (p.x / d) * p.r;
      p.z = (p.z / d) * p.r;
    }
  }

  // DNA ring: each artist sits on an outer orbit beside the traits it carries,
  // so hovering it reads as "this is what I bring".
  const dnaAngles = artistPts.map((p, i) => {
    let sx = 0;
    let sz = 0;
    for (const t of p.a.traits) {
      const ang = traitDnaAngle.get(t);
      if (ang === undefined) continue;
      sx += Math.cos(ang);
      sz += Math.sin(ang);
    }
    return sx === 0 && sz === 0 ? -Math.PI / 2 + ((i + 0.5) * TAU) / artistPts.length : Math.atan2(sz, sx);
  });
  const minGap = TAU / (artistPts.length * 1.7);
  for (let iter = 0; iter < 40; iter++) {
    for (let i = 0; i < dnaAngles.length; i++) {
      for (let j = i + 1; j < dnaAngles.length; j++) {
        let d = dnaAngles[j] - dnaAngles[i];
        d = Math.atan2(Math.sin(d), Math.cos(d));
        if (Math.abs(d) >= minGap) continue;
        const push = (minGap - Math.abs(d)) / 2 || minGap / 2;
        const dir = d >= 0 ? 1 : -1;
        dnaAngles[i] -= push * dir;
        dnaAngles[j] += push * dir;
      }
    }
  }

  let radius = 0;
  artistPts.forEach((p, i) => {
    radius = Math.max(radius, p.r);
    nodes.push({
      id: p.a.id,
      kind: "artist",
      name: p.a.name,
      pos: [p.x, (rand(p.a.id + "y") - 0.5) * 3.6, p.z],
      // An ellipse, wider than tall, to fit the frame around the trait constellation.
      dnaPos: [Math.cos(dnaAngles[i]) * 23, -1.5, Math.sin(dnaAngles[i]) * 18],
      size: 0.85 + p.centrality * 0.35,
      seed: rand(p.a.id),
    });
  });

  // Discovery sector: the widest angular gap between artists and genres. A growing
  // universe keeps its uncharted region where the visitor last saw it.
  const angles = nodes.filter((nd) => nd.kind === "artist" || nd.kind === "genre").map((nd) => Math.atan2(nd.pos[2], nd.pos[0]));
  const sectorAngle = prev ? prev.sectorAngle : angles.length > 1 ? openBearing(angles) : rand("sector") * TAU;
  const sectorR = 33 * k;
  const sectorCenter = polar(sectorAngle, sectorR, -1.5);

  u.discovery.forEach((d, i) => {
    // Scattered like destinations, not lined up like a list.
    const spread = (i - (u.discovery.length - 1) / 2) * 0.27;
    const a = sectorAngle + spread + (rand(d.id + "a") - 0.5) * 0.1;
    const r = (30 + (i % 2 ? 5 : -1) + rand(d.id + "r") * 4) * k;
    nodes.push({
      id: d.id,
      kind: "discovery",
      name: d.name,
      pos: polar(a, r, (i % 2 ? 2.5 : -1.5) + (rand(d.id + "y") - 0.5) * 3),
      dnaPos: sectorCenter,
      size: d.kind === "artist" ? 0.8 : 0.95,
      seed: rand(d.id),
    });
  });

  // Edges. Only a few are visible at rest; the rest appear on focus.
  const edges: LayoutEdge[] = [];
  const add = (a: string, b: string, kind: EdgeKind, strength: number, rest: boolean) =>
    edges.push({ id: `${kind}:${a}>${b}`, a, b, kind, strength, rest });

  u.traits.forEach((t, i) => add(YOU_ID, t.id, "you-trait", t.strength, i < 3));
  u.genres.forEach((g, i) => add(YOU_ID, g.id, "you-genre", g.weight, i < 2));
  for (const a of u.artists) {
    if (a.genres.length === 0) add(YOU_ID, a.id, "you-genre", 0.25, true);
    a.genres.forEach((g, i) => add(a.id, g, "artist-genre", i === 0 ? 0.7 : 0.45, i === 0));
  }
  for (const r of u.relationships) add(r.a, r.b, "artist-artist", r.strength, r.strength >= 0.6);
  for (const d of u.discovery) for (const b of d.bridges) add(b, d.id, "bridge", 0.5, false);
  if (u.traits.length >= 3) {
    u.traits.forEach((t, i) => add(t.id, u.traits[(i + 1) % u.traits.length].id, "dna-ring", 0.5, false));
  }
  // Artist-trait links are never shown at rest; they carry the DNA contribution view.
  for (const a of u.artists) for (const t of a.traits) if (edges.length < 110) add(a.id, t, "artist-trait", 0.4, false);

  return {
    nodes,
    byId: new Map(nodes.map((nd) => [nd.id, nd])),
    edges,
    sectorAngle,
    sectorCenter,
    radius,
  };
}

/** Everything directly connected to a node, including itself. */
export function relatedSet(layout: Layout, id: string): Set<string> {
  const set = new Set([id]);
  for (const e of layout.edges) {
    if (e.kind === "dna-ring") continue;
    if (e.a === id) set.add(e.b);
    if (e.b === id) set.add(e.a);
  }
  return set;
}

export interface Hop {
  from: string;
  to: string;
  kind: EdgeKind;
  reason: string; // only ever taken from the data; empty when the link is shared membership
}

/**
 * What connects two artists on this map? The cheapest path through links that
 * already exist: direct relationships first, then a shared genre or quality.
 * Returns null when no short, real path exists; nothing is ever invented.
 */
export function findConnection(layout: Layout, u: UniverseData, from: string, to: string): { ids: string[]; hops: Hop[] } | null {
  const cost: Partial<Record<EdgeKind, (e: LayoutEdge) => number>> = {
    "artist-artist": (e) => 1 + (1 - e.strength) * 1.5,
    "artist-genre": () => 1.25,
    "artist-trait": () => 1.45,
  };
  const adj = new Map<string, { to: string; w: number; e: LayoutEdge }[]>();
  for (const e of layout.edges) {
    const c = cost[e.kind];
    if (!c) continue;
    const w = c(e);
    for (const [x, y] of [
      [e.a, e.b],
      [e.b, e.a],
    ]) {
      if (!adj.has(x)) adj.set(x, []);
      adj.get(x)!.push({ to: y, w, e });
    }
  }

  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, { id: string; e: LayoutEdge }>();
  const open = new Set([from]);
  while (open.size) {
    let cur = "";
    let best = Infinity;
    for (const id of open) if ((dist.get(id) ?? Infinity) < best) [cur, best] = [id, dist.get(id)!];
    open.delete(cur);
    if (cur === to) break;
    for (const n of adj.get(cur) ?? []) {
      const d = best + n.w;
      if (d < (dist.get(n.to) ?? Infinity)) {
        dist.set(n.to, d);
        prev.set(n.to, { id: cur, e: n.e });
        open.add(n.to);
      }
    }
  }
  if (!prev.has(to)) return null;

  const ids = [to];
  const hops: Hop[] = [];
  let cur = to;
  while (cur !== from) {
    const p = prev.get(cur)!;
    const rel =
      p.e.kind === "artist-artist"
        ? u.relationships.find((r) => (r.a === p.id && r.b === cur) || (r.b === p.id && r.a === cur))
        : undefined;
    hops.unshift({ from: p.id, to: cur, kind: p.e.kind, reason: rel?.reason ?? "" });
    ids.unshift(p.id);
    cur = p.id;
  }
  // A path longer than two intermediate stops no longer explains anything.
  return ids.length <= 5 ? { ids, hops } : null;
}
