// Choreography: turns app state into animation targets. This is the one place
// the canonical transition (focus, camera move, scale/opacity, emergence,
// settle) is expressed for the scene's objects. All values live outside React
// and are advanced once per frame by `tick`.

import { DUR, Tween, Tween3 } from "./motion";
import { relatedSet, YOU_ID, type LayoutEdge, type LayoutNode } from "./layout";
import type { SonoraState } from "./store";

export interface NodeAnim {
  pos: Tween3;
  scale: Tween;
  opacity: Tween;
  emphasis: Tween;
  glow: Tween;
  label: Tween;
}

export interface EdgeAnim {
  reveal: Tween;
  alpha: Tween;
}

export const nodeAnims = new Map<string, NodeAnim>();
export const edgeAnims = new Map<string, EdgeAnim>();

function nodeAnim(n: LayoutNode, spawn: readonly [number, number, number]): NodeAnim {
  let a = nodeAnims.get(n.id);
  if (!a) {
    a = {
      pos: new Tween3(spawn),
      scale: new Tween(0),
      opacity: new Tween(0),
      emphasis: new Tween(1),
      glow: new Tween(0),
      label: new Tween(0),
    };
    nodeAnims.set(n.id, a);
  }
  return a;
}

function edgeAnim(e: LayoutEdge): EdgeAnim {
  let a = edgeAnims.get(e.id);
  if (!a) {
    a = { reveal: new Tween(0), alpha: new Tween(0) };
    edgeAnims.set(e.id, a);
  }
  return a;
}

export function tick(t: number) {
  for (const a of nodeAnims.values()) {
    a.pos.update(t);
    a.scale.update(t);
    a.opacity.update(t);
    a.emphasis.update(t);
    a.glow.update(t);
    a.label.update(t);
  }
  for (const a of edgeAnims.values()) {
    a.reveal.update(t);
    a.alpha.update(t);
  }
}

type Reason = "build" | "layout" | "mode" | "phase" | "focus";

const ORIGIN = [0, 0, 0] as const;

/** Emergence order during universe creation: YOU, traits, genres, artists. */
const BUILD_DELAY: Record<LayoutNode["kind"], number> = {
  you: 0,
  trait: 0.15,
  genre: 0.95,
  artist: 1.75,
  discovery: 0,
};
const BUILD_STAGGER: Record<LayoutNode["kind"], number> = { you: 0, trait: 0.08, genre: 0.09, artist: 0.13, discovery: 0 };

export function sync(s: SonoraState, prev: SonoraState | null) {
  const L = s.layout;
  if (!L) return;

  const reason: Reason = !prev
    ? "build"
    : s.buildId !== prev.buildId
      ? "build"
      : s.layout !== prev.layout
        ? "layout"
        : s.mode !== prev.mode
          ? "mode"
          : s.phase !== prev.phase
            ? "phase"
            : "focus";

  const dur = reason === "focus" ? DUR.hover : reason === "phase" ? 0.9 : reason === "build" ? DUR.emerge : DUR.mode;

  const focusId = s.hoveredId ?? s.selectedId;
  const related = focusId && L.byId.has(focusId) ? relatedSet(L, focusId) : null;
  if (related && focusId && s.data) {
    // Membership comes from the data itself, so it holds even for links not drawn as edges.
    const artist = s.data.artists.find((x) => x.id === focusId);
    if (artist) for (const id of [...artist.genres, ...artist.traits]) related.add(id);
    for (const x of s.data.artists) if (x.traits.includes(focusId) || x.genres.includes(focusId)) related.add(x.id);
  }
  related?.add(YOU_ID);
  const dna = s.mode === "dna" && s.phase === "ready";
  const focusKind = focusId ? L.byId.get(focusId)?.kind : undefined;

  // A found connection takes over: only the path is lit.
  const path = s.connect?.ids ? new Set(s.connect.ids) : null;
  const pathEdges = new Set<string>();
  if (s.connect?.hops) for (const h of s.connect.hops) pathEdges.add([h.from, h.to].sort().join("|"));
  const picking = s.connect && !s.connect.to ? s.connect.from : null;

  const discoveryOpen = s.mode === "discovery" && s.phase === "ready";
  const bridged = new Set<string>();
  if (discoveryOpen) for (const e of L.edges) if (e.kind === "bridge") bridged.add(e.a);

  const kindIndex: Record<string, number> = {};
  const hiddenBeforeData = s.phase === "building" && !s.dataReady;

  for (const n of L.nodes) {
    const idx = (kindIndex[n.kind] = (kindIndex[n.kind] ?? -1) + 1);
    const isNew = !nodeAnims.has(n.id);
    const spawn = n.kind === "discovery" ? L.sectorCenter : ORIGIN;
    const a = nodeAnim(n, spawn);

    // Target state
    let pos: readonly [number, number, number] = n.pos;
    let scale = 1;
    let opacity = 1;
    let label = 0;

    if (dna) {
      pos = n.dnaPos;
      if (n.kind === "trait") {
        scale = 2.1;
        label = 1;
      } else if (n.kind === "artist") {
        // Artists orbit the constellation quietly; they wake when they contribute to the focus.
        const lit = n.id === focusId || (focusKind === "trait" && (related?.has(n.id) ?? false));
        scale = lit ? 0.95 : 0.7;
        opacity = lit ? 1 : 0.55;
        label = lit ? 0.9 : 0.4;
      } else if (n.kind === "genre") {
        scale = 0.5;
        opacity = 0;
      }
    }

    if (n.kind === "discovery") {
      if (discoveryOpen) {
        label = 1;
      } else {
        pos = L.sectorCenter;
        scale = 0.2;
        opacity = 0;
      }
    }

    if (n.kind === "artist" && !dna) label = 0.6;
    if (n.kind === "you") label = s.phase === "landing" ? 0 : 0.85;

    if (s.phase === "landing") {
      // The ghost universe behind the landing copy: present, quiet, unlabeled.
      opacity *= n.kind === "you" ? 0.8 : 0.5;
      label = 0;
    }
    if (hiddenBeforeData) {
      opacity = n.kind === "you" ? 1 : 0;
      scale = n.kind === "you" ? 1.15 : 0.2;
      pos = n.kind === "you" ? ORIGIN : pos;
      label = 0;
    }

    // Focus: related things brighten, everything else recedes.
    let emphasis = 1;
    let glow = 0;
    if (path) {
      emphasis = path.has(n.id) ? 1 : 0.15;
      label = path.has(n.id) ? 1 : 0;
      if (n.id === s.connect?.from || n.id === s.connect?.to) glow = 1;
    } else if (picking) {
      // Choosing a second artist: every artist is a candidate, the first one glows.
      emphasis = n.kind === "artist" || n.kind === "you" ? 1 : 0.3;
      if (n.kind === "artist") label = Math.max(label, 0.85);
      if (n.id === picking) glow = 1;
      if (n.id === s.hoveredId && n.id !== picking) {
        glow = 1;
        scale *= 1.28;
        label = 1;
      }
    } else if (related) {
      emphasis = related.has(n.id) ? 1 : 0.2;
      if (related.has(n.id) && n.kind !== "discovery") label = Math.max(label, n.id === focusId ? 1 : 0.8);
      else if (dna && n.kind === "trait") label = 0.3;
      else if (n.kind !== "discovery" || !discoveryOpen) label = 0;
      if (n.id === focusId) {
        glow = 1;
        scale *= n.id === s.hoveredId ? 1.28 : 1.15;
        label = 1;
      }
    } else if (discoveryOpen && n.kind !== "discovery") {
      emphasis = bridged.has(n.id) || n.kind === "you" ? 0.85 : 0.4;
      if (bridged.has(n.id)) label = Math.max(label, 0.7);
    }

    // In DNA, an artist's focus is about its traits, not its neighbours.
    if (dna && n.kind === "artist" && focusKind === "artist" && n.id !== focusId) {
      emphasis = 0.4;
      label = 0.2;
    }

    // Timing
    if (reason === "build") {
      const delay = BUILD_DELAY[n.kind] + idx * BUILD_STAGGER[n.kind];
      if (n.kind !== "you") {
        a.pos.jump(spawn);
        a.scale.jump(0);
        a.opacity.jump(0);
        a.label.jump(0);
      }
      a.pos.set(pos, dur + 0.4, delay);
      a.scale.set(scale, dur, delay);
      a.opacity.set(opacity, dur, delay);
      a.label.set(label, 1.2, delay + 1.0);
    } else if (isNew) {
      // Something new enters the existing universe: it emerges from YOU.
      a.pos.set(pos, DUR.emerge + 0.3, 0.35);
      a.scale.set(scale, DUR.emerge, 0.35);
      a.opacity.set(opacity, DUR.emerge, 0.35);
      a.label.set(label, 1, 1.3);
    } else if (n.kind === "discovery" && discoveryOpen && reason === "mode") {
      // Discovery emerges from the uncharted region, one destination at a time.
      const delay = 1.1 + idx * 0.16;
      a.pos.jump(L.sectorCenter);
      a.pos.set(pos, DUR.emerge + 0.4, delay);
      a.scale.set(scale, DUR.emerge, delay);
      a.opacity.set(opacity, DUR.emerge, delay);
      a.label.set(label, 1, delay + 0.8);
    } else {
      const modeDelay = reason === "mode" ? 0.25 : 0;
      a.pos.set(pos, dur, modeDelay);
      a.scale.set(scale, reason === "focus" ? DUR.hover : dur, reason === "focus" ? 0 : modeDelay);
      a.opacity.set(opacity, reason === "focus" ? DUR.hover : dur * 0.8, reason === "focus" ? 0 : modeDelay);
      a.label.set(label, reason === "focus" ? 0.3 : 0.9, reason === "mode" ? 0.9 : 0);
    }
    // YOU brightens while a new artist is being placed: the universe is listening.
    if (n.kind === "you" && s.adding) glow = 1;
    a.emphasis.set(emphasis, DUR.hover);
    a.glow.set(glow, DUR.hover);
  }

  // Edges
  L.edges.forEach((e, i) => {
    const isNew = !edgeAnims.has(e.id);
    const a = edgeAnim(e);
    const touchesFocus = focusId !== null && (e.a === focusId || e.b === focusId);

    let alpha = 0;
    if (dna) {
      if (e.kind === "you-trait") alpha = 0.3 + e.strength * 0.35;
      if (e.kind === "dna-ring") alpha = 0.22;
      if (focusId) {
        // Spokes of the traits in play brighten; the rest of the constellation recedes.
        if (e.kind === "you-trait") alpha = related?.has(e.b) ? 0.85 : 0.12;
        if (e.kind === "dna-ring") alpha = 0.1;
        if (e.kind === "artist-trait" && touchesFocus) alpha = 0.32;
      }
    } else if (path) {
      alpha = pathEdges.has([e.a, e.b].sort().join("|")) ? 0.75 : e.rest && e.kind !== "bridge" ? 0.015 : 0;
    } else if (e.kind !== "dna-ring") {
      alpha = e.rest && e.kind !== "bridge" ? 0.035 + e.strength * 0.11 : 0;
      if (discoveryOpen) {
        if (e.kind === "bridge") alpha = 0.1;
        else alpha *= 0.45;
      }
      if (focusId) {
        if (touchesFocus && (e.kind !== "bridge" || discoveryOpen)) {
          // Structure links brighten fully; trait links stay a whisper.
          // Nearest-artist paths are the brightest: they are what a selection is about.
          alpha =
            e.kind === "artist-trait" ? 0.14 : e.kind === "bridge" ? 0.45 : e.kind === "artist-artist" ? 0.42 + e.strength * 0.45 : 0.24 + e.strength * 0.4;
        }
        else alpha *= 0.3;
      }
    }
    if (s.phase === "landing") alpha *= 0.55;
    if (hiddenBeforeData) alpha = 0;

    if (reason === "build") {
      a.reveal.jump(0);
      a.alpha.jump(alpha);
      a.reveal.set(1, 1.3, 2.9 + i * 0.025);
    } else {
      const drawIn = e.kind === "bridge" || e.kind === "dna-ring" || isNew;
      if (alpha > 0 && a.reveal.target === 0) {
        const delay = isNew ? 1.4 : e.kind === "bridge" ? 1.8 : e.kind === "dna-ring" ? 1.5 : 0;
        a.reveal.set(1, drawIn ? 1.2 : 0.01, delay);
      } else if (alpha === 0 && drawIn && a.reveal.target === 1) {
        a.reveal.set(0, 0, DUR.hover);
      } else if (a.reveal.target === 0 && !drawIn) {
        a.reveal.set(1, 0.01);
      }
      a.alpha.set(alpha, reason === "focus" ? DUR.hover : dur * 0.7, reason === "mode" && alpha > a.alpha.value ? 0.6 : 0);
    }
  });
}
