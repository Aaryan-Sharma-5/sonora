"use client";

import { create } from "zustand";
import { computeLayout, findConnection, type Hop, type Layout } from "./layout";
import { demoExpansion, demoUniverse, demoUniverseFor } from "./demo";
import { LIMITS, mergeExpansion, slug, type UniverseData } from "./universe";

export type Phase = "landing" | "building" | "ready";
export type Mode = "universe" | "dna" | "discovery";

export interface SonoraState {
  phase: Phase;
  mode: Mode;
  data: UniverseData | null;
  layout: Layout | null;
  dataReady: boolean; // the requested universe (not the landing ghost) is loaded
  buildId: number;
  hoveredId: string | null;
  selectedId: string | null;
  status: { text: string; sentence?: boolean } | null;
  adding: boolean;
  // "What connects these?": picking a second artist (no `to` yet), then the found path.
  connect: { from: string; to?: string; ids?: string[]; hops?: Hop[] } | null;

  create: (artists: string[]) => Promise<void>;
  hover: (id: string | null) => void;
  select: (id: string | null) => void;
  setMode: (mode: Mode) => void;
  addArtist: (name: string) => Promise<void>;
  startConnect: (from: string) => void;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// `?offline` forces the reference universe: a safety switch for live demos.
const offline = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("offline");

async function fetchUniverse(artists: string[]): Promise<UniverseData> {
  if (offline()) return demoUniverseFor(artists);
  try {
    const res = await fetch("/api/universe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ artists }),
      signal: AbortSignal.timeout(70_000),
    });
    const json = await res.json();
    const u = json?.universe as UniverseData | undefined;
    if (u && Array.isArray(u.artists) && u.artists.length > 0) return u;
  } catch {
    // fall through to the reference universe
  }
  return demoUniverseFor(artists);
}

async function fetchExpansion(u: UniverseData, name: string) {
  if (offline()) return mergeExpansion(u, demoExpansion(name, u), "demo");
  try {
    const res = await fetch("/api/expand", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ universe: u, artist: name }),
      signal: AbortSignal.timeout(70_000),
    });
    const json = await res.json();
    const merged = mergeExpansion(u, json?.expansion, json?.source === "claude" ? "claude" : "demo");
    if (merged.artistId) return merged;
  } catch {
    // fall through
  }
  return mergeExpansion(u, demoExpansion(name, u), "demo");
}

let statusTimer: ReturnType<typeof setTimeout> | undefined;

const ghost = demoUniverse();

export const useSonora = create<SonoraState>((set, get) => {
  const flash = (text: string | null, ms?: number, sentence = false) => {
    clearTimeout(statusTimer);
    set({ status: text ? { text, sentence } : null });
    if (ms) statusTimer = setTimeout(() => set({ status: null }), ms);
  };

  return {
    phase: "landing",
    mode: "universe",
    data: ghost,
    layout: computeLayout(ghost),
    dataReady: false,
    buildId: 0,
    hoveredId: null,
    selectedId: null,
    status: null,
    adding: false,
    connect: null,

    async create(artists) {
      if (get().phase !== "landing") return;
      set({ phase: "building", hoveredId: null, selectedId: null, mode: "universe" });
      flash("Mapping your sound…");

      const started = performance.now();
      const pending = fetchUniverse(artists);
      // While Claude listens, name each artist in turn: the wait is part of the map being drawn.
      let beat = 0;
      const tracing = setInterval(() => {
        if (get().dataReady) return;
        flash(beat === 0 ? "Tracing connections…" : `Tracing ${artists[(beat - 1) % artists.length]}…`);
        beat++;
      }, 2600);

      const data = await pending;
      // Let the camera arrive and YOU settle before the universe unfolds.
      const elapsed = performance.now() - started;
      if (elapsed < 3400) await wait(3400 - elapsed);
      clearInterval(tracing);

      set({ data, layout: computeLayout(data), dataReady: true, buildId: get().buildId + 1 });
      flash("Building constellations…");
      await wait(4300);
      set({ phase: "ready" });
      flash("Your universe is ready.", 2800);
    },

    hover(id) {
      if (get().hoveredId !== id) set({ hoveredId: id });
    },

    select(id) {
      const s = get();
      if (s.connect && !s.connect.to && id && id.startsWith("a:") && id !== s.connect.from && s.layout && s.data) {
        const path = findConnection(s.layout, s.data, s.connect.from, id);
        if (path) {
          set({ connect: { from: s.connect.from, to: id, ...path }, selectedId: null, hoveredId: null });
          flash(null);
        } else {
          flash("Nothing on this map connects them yet.", 3200);
        }
        return;
      }
      if (s.connect) {
        flash(null);
        set({ connect: null });
      }
      if (get().selectedId !== id) set({ selectedId: id, hoveredId: null });
    },

    startConnect(from) {
      if (get().phase !== "ready" || (get().data?.artists.length ?? 0) < 2) return;
      set({ connect: { from }, selectedId: from });
      flash("Choose another artist.");
    },

    setMode(mode) {
      if (get().phase !== "ready" || get().mode === mode) return;
      set({ mode, selectedId: null, hoveredId: null, connect: null });
    },

    async addArtist(name) {
      const s = get();
      const clean = name.trim();
      if (!clean || !s.data || s.adding || s.phase !== "ready") return;
      if (s.data.artists.some((a) => slug(a.name) === slug(clean))) {
        set({ selectedId: "a:" + slug(clean), mode: "universe" });
        return;
      }
      if (s.data.artists.length >= LIMITS.artists) {
        flash("Your universe is full.", 3000);
        return;
      }
      set({ adding: true, mode: "universe", selectedId: null, hoveredId: null, connect: null });
      flash(`Adding ${clean}…`);

      const merged = await fetchExpansion(s.data, clean);
      set({ data: merged.universe, layout: computeLayout(merged.universe), adding: false });
      flash(merged.shift || null, 7000, true);
      // Once it has emerged, focus the newcomer so the panel explains its place.
      if (merged.artistId) {
        await wait(2400);
        if (!get().selectedId) set({ selectedId: merged.artistId });
      }
    },
  };
});

// Development only: lets visual QA scripts inspect and drive the store.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __sonora: typeof useSonora }).__sonora = useSonora;
}
