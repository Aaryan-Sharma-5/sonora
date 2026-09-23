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

export function computeLayout(u: UniverseData): Layout {
  const n = u.artists.length;
  // 5 to 8 artists is the tuned range. Smaller sets contract so they never look sparse.
  const k = n <= 3 ? 0.78 : n === 4 ? 0.88 : n <= 8 ? 1 : 1.08;
  const nodes: LayoutNode[] = [];

  nodes.push({ id: YOU_ID, kind: "you", name: "YOU", pos: [0, 0, 0], dnaPos: [0, 0, 0], size: 1, seed: 0.5 });

  // Traits: inner ring, strongest closest to YOU.
  const traitOffset = rand("traits") * TAU;
  const traitAngle = new Map<string, number>();
  u.traits.forEach((t, i) => {
    const a = traitOffset + (i * TAU) / u.traits.length + (rand(t.id + "a") - 0.5) * 0.25;
    traitAngle.set(t.id, a);
    const r = (4.6 + (1 - t.strength) * 3.4) * k;
    const dnaA = -Math.PI / 2 + (i * TAU) / u.traits.length;
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
  order.forEach((id, i) => {
    const g = u.genres.find((x) => x.id === id)!;
    const a = genreOffset + (i * TAU) / order.length + (rand(id + "a") - 0.5) * 0.18;
    genreAngle.set(id, a);
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

  let radius = 0;
  for (const p of artistPts) {
    const angle = Math.atan2(p.z, p.x);
    radius = Math.max(radius, p.r);
    nodes.push({
      id: p.a.id,
      kind: "artist",
      name: p.a.name,
      pos: [p.x, (rand(p.a.id + "y") - 0.5) * 3.6, p.z],
      dnaPos: polar(angle, 32, -3.5),
      size: 0.85 + p.centrality * 0.35,
      seed: rand(p.a.id),
    });
  }

  // Discovery sector: the widest angular gap between artists and genres.
  const angles = nodes
    .filter((nd) => nd.kind === "artist" || nd.kind === "genre")
    .map((nd) => (Math.atan2(nd.pos[2], nd.pos[0]) + TAU) % TAU)
    .sort((x, y) => x - y);
  let sectorAngle = rand("sector") * TAU;
  if (angles.length > 1) {
    let best = -1;
    for (let i = 0; i < angles.length; i++) {
      const next = i === angles.length - 1 ? angles[0] + TAU : angles[i + 1];
      const gap = next - angles[i];
      if (gap > best) {
        best = gap;
        sectorAngle = angles[i] + gap / 2;
      }
    }
  }
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
  // Artist-trait links are the least important; include them only while under budget.
  for (const a of u.artists) for (const t of a.traits) if (edges.length < 72) add(a.id, t, "artist-trait", 0.4, false);

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
