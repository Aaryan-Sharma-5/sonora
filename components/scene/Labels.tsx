"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { nodeAnims } from "@/lib/choreo";
import { UNCHARTED_ID, YOU_ID, type Layout, type LayoutNode } from "@/lib/layout";
import { useSonora, type SonoraState } from "@/lib/store";
import type { UniverseData } from "@/lib/universe";

// Labels are plain DOM, positioned once per frame by a single projector inside
// the canvas. Crisp type, one layer, no per-label React updates.

export const labelEls = new Map<string, HTMLDivElement>();

// Where a label sits relative to its body. Side labels can flip left, and labels
// below can flip above, when the preferred side would clip or collide.
type Side = "right" | "left" | "below" | "above" | "center";
const PLACE: Record<LayoutNode["kind"] | "uncharted", { side: Side; gap: number }> = {
  you: { side: "below", gap: 26 },
  artist: { side: "right", gap: 14 },
  genre: { side: "below", gap: 12 },
  trait: { side: "right", gap: 10 },
  discovery: { side: "right", gap: 14 },
  uncharted: { side: "center", gap: 0 },
};
const FLIP: Record<Side, Side> = { right: "left", left: "right", below: "above", above: "below", center: "center" };
// When labels collide, the more important one keeps its place.
const RANK: Record<LayoutNode["kind"] | "uncharted", number> = { artist: 0, discovery: 1, you: 2, genre: 3, trait: 4, uncharted: 5 };

function offsetFor(side: Side, gap: number) {
  if (side === "right") return `translate(${gap}px, -50%)`;
  if (side === "left") return `translate(calc(-100% - ${gap}px), -50%)`;
  if (side === "below") return `translate(-50%, ${gap}px)`;
  if (side === "above") return `translate(-50%, calc(-100% - ${gap}px))`;
  return "translate(-50%, -50%)";
}

function boxFor(side: Side, gap: number, x: number, y: number, w: number, h: number): [number, number, number, number] {
  if (side === "right") return [x + gap, y - h / 2, w, h];
  if (side === "left") return [x - gap - w, y - h / 2, w, h];
  if (side === "below") return [x - w / 2, y + gap, w, h];
  if (side === "above") return [x - w / 2, y - gap - h, w, h];
  return [x - w / 2, y - h / 2, w, h];
}

const STYLE: Record<LayoutNode["kind"], string> = {
  you: "text-[10px] font-medium tracking-[0.32em] text-text",
  artist: "text-[13px] font-medium tracking-[0.01em] text-text",
  genre: "text-[12px] tracking-[0.04em] text-text-2",
  trait: "text-[11.5px] tracking-[0.02em] text-[#b9c3d6]",
  discovery: "text-[13px] font-medium text-text",
};

export function strengthWord(s: number) {
  if (s >= 0.75) return "strongly leans";
  if (s >= 0.6) return "clearly present";
  if (s >= 0.45) return "present";
  return "a trace";
}

/** One line on what joins a traced pair of artists, taken only from the map's own data. */
function traceNote(trace: NonNullable<SonoraState["trace"]>, data: UniverseData) {
  if (trace.hops.length === 1) return trace.hops[0].reason || "Close neighbours on your map.";
  const name = (id: string) => [...data.artists, ...data.genres, ...data.traits].find((x) => x.id === id)?.name ?? "";
  const via = trace.ids.slice(1, -1).map(name).filter(Boolean);
  return `Through ${via.length > 1 ? via.slice(0, -1).join(", ") + " and " + via[via.length - 1] : via[0]}.`;
}

export function LabelLayer({ layout }: { layout: Layout }) {
  const data = useSonora((s) => s.data);
  const traits = data?.traits;
  const mode = useSonora((s) => s.mode);
  const trace = useSonora((s) => s.trace);
  const hoveredId = useSonora((s) => s.hoveredId);
  const note = trace && data && hoveredId ? traceNote(trace, data) : null;
  return (
    <div className="label-layer pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden>
      {layout.nodes.map((n) => {
        const trait = n.kind === "trait" ? traits?.find((t) => t.id === n.id) : undefined;
        return (
          <div
            key={n.id}
            ref={(el) => {
              if (el) labelEls.set(n.id, el);
              else labelEls.delete(n.id);
            }}
            data-kind={n.kind}
            className={STYLE[n.kind]}
          >
            {n.id === YOU_ID ? "YOU" : n.name}
            {trait && mode === "dna" && (
              <span className="mt-0.5 block text-[10.5px] tracking-[0.04em] text-text-3">{strengthWord(trait.strength)}</span>
            )}
            {note && n.id === hoveredId && (
              <span className="absolute top-full left-0 mt-1.5 w-[240px] text-[12px] leading-[1.5] font-normal tracking-normal whitespace-normal text-text-2">
                {note}
              </span>
            )}
          </div>
        );
      })}
      <div
        ref={(el) => {
          if (el) labelEls.set(UNCHARTED_ID, el);
          else labelEls.delete(UNCHARTED_ID);
        }}
        className="text-[10px] font-medium tracking-[0.32em] text-text-3"
      >
        UNCHARTED
      </div>
    </div>
  );
}

/** The metadata annotation and its hairline leader, positioned by the projector below. */
export const annotation: { el: HTMLDivElement | null; leader: SVGLineElement | null } = { el: null, leader: null };

/** The node the annotation is attached to: the selection, or the end of a found connection. */
export function annotatedId(s: { selectedId: string | null; connect: { to?: string } | null }) {
  return s.selectedId ?? s.connect?.to ?? null;
}

const v = new THREE.Vector3();
const last = new Map<string, number>();
const rect = { x: 0, y: 0, w: 0, h: 0, on: false };
const GAP = 118; // clears the body's own label
const EDGE = 40;

/**
 * Keep the annotation attached to its object: beside it on screen, on whichever
 * side has room, clamped inside the viewport and clear of the controls.
 */
function placeAnnotation(s: ReturnType<typeof useSonora.getState>, camera: THREE.Camera, W: number, H: number) {
  const el = annotation.el;
  const line = annotation.leader;
  rect.on = false;
  if (!el || !line) return;
  const id = annotatedId(s);
  const a = id ? nodeAnims.get(id) : undefined;
  if (!id || !a) {
    line.style.opacity = "0";
    return;
  }
  v.set(a.pos.x.value, a.pos.y.value, a.pos.z.value).project(camera);
  const nx = (v.x * 0.5 + 0.5) * W;
  const ny = (-v.y * 0.5 + 0.5) * H;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const minX = s.phase === "ready" && s.mode !== "universe" ? 440 : EDGE;
  let x = nx + GAP;
  const leftSide = x + w > W - EDGE;
  if (leftSide) x = nx - 48 - w;
  x = Math.min(Math.max(x, minX), W - EDGE - w);
  // The title sits level with the body; the rest reads downward, clamped above the controls.
  const y = Math.min(Math.max(ny - 64, 92), Math.max(92, H - 140 - h));
  el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  Object.assign(rect, { x, y, w, h, on: true });

  // The leader runs from just outside the body to the annotation's first line.
  const ex = leftSide ? x + w + 12 : x - 12;
  const ey = y + 10;
  const dx = ex - nx;
  const dy = ey - ny;
  const len = Math.hypot(dx, dy) || 1;
  const start = Math.min(18, len);
  line.setAttribute("x1", (nx + (dx / len) * start).toFixed(1));
  line.setAttribute("y1", (ny + (dy / len) * start).toFixed(1));
  line.setAttribute("x2", ex.toFixed(1));
  line.setAttribute("y2", ey.toFixed(1));
  line.style.opacity = v.z > 1 || len < 30 ? "0" : "1";
}

interface Placed {
  id: string;
  el: HTMLDivElement;
  kind: LayoutNode["kind"] | "uncharted";
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  focus: boolean;
  note: boolean; // carries the trace note beneath it
}

const side = new Map<string, Side>();
const clear = new Map<string, number>(); // eased 0..1: how visible a label is after collisions
const raw = new Map<string, number>(); // last opacity before collisions
const frame: Placed[] = [];

export function LabelProjector() {
  useFrame(({ camera, size }, delta) => {
    const s = useSonora.getState();
    const L = s.layout;
    if (!L) return;
    placeAnnotation(s, camera, size.width, size.height);
    const anchor = annotatedId(s);
    const W = size.width;
    const H = size.height;

    // Pass 1: project every label and read its size, before any style is written.
    frame.length = 0;
    for (const [id, el] of labelEls) {
      let opacity = 0;
      let kind: Placed["kind"] = "uncharted";
      if (id === UNCHARTED_ID) {
        v.set(...L.sectorCenter);
        v.y += 5;
        opacity = s.phase === "ready" && s.mode === "universe" && !s.selectedId ? (s.hoveredId === UNCHARTED_ID ? 1 : 0.8) : 0;
      } else {
        const n = L.byId.get(id);
        const a = nodeAnims.get(id);
        if (!n || !a) continue;
        v.set(a.pos.x.value, a.pos.y.value, a.pos.z.value);
        const dist = camera.position.distanceTo(v);
        let label = a.label.value;
        // Genre names surface as the camera comes close to their region.
        if (n.kind === "genre" && s.mode === "universe" && s.phase === "ready") {
          label = Math.max(label, (1 - THREE.MathUtils.smoothstep(dist, 19, 30)) * 0.85 * a.emphasis.value);
        }
        opacity = label * a.opacity.value;
        kind = n.kind;
      }
      v.project(camera);
      if (v.z > 1) opacity = 0;
      let x = (v.x * 0.5 + 0.5) * W;
      let y = (-v.y * 0.5 + 0.5) * H;
      // A traced artist can sit outside the focused view; its name and note wait at the edge of the frame.
      if (s.trace && id === s.hoveredId) {
        x = Math.min(Math.max(x, EDGE), W - EDGE - 280);
        y = Math.min(Math.max(y, 72), H - 190);
      }
      // Labels give way to the annotation and the mode readout that sit over the scene.
      const underAnnotation = rect.on && id !== anchor && x > rect.x - 16 && x < rect.x + rect.w + 16 && y > rect.y - 16 && y < rect.y + rect.h + 16;
      if (underAnnotation) opacity *= 0.1;
      if (s.phase === "ready" && s.mode !== "universe" && x < 440) opacity *= 0.12;
      const prev = last.get(id) ?? -1;
      if (opacity < 0.01 && prev < 0.01) continue;
      const focus = id === s.hoveredId || id === anchor || id === s.connect?.from;
      const measured = opacity > 0.15;
      const note = !!(measured && s.trace && id === s.hoveredId);
      frame.push({ id, el, kind, x, y, w: measured ? el.offsetWidth : 0, h: measured ? el.offsetHeight : 0, opacity, focus, note });
    }

    // Pass 2: the focused label first, then by kind. Each label takes its preferred side,
    // or the opposite side when the preferred one clips the frame or covers a label
    // already placed. Only when both are blocked does it fade out.
    frame.sort((p, q) => Number(q.focus) - Number(p.focus) || RANK[p.kind] - RANK[q.kind] || (p.id < q.id ? -1 : 1));
    // The annotation is occupied space too: its own body's label turns away from it.
    const taken: [number, number, number, number][] = rect.on ? [[rect.x - 12, rect.y - 12, rect.w + 24, rect.h + 24]] : [];
    const ease = 1 - Math.exp(-delta * 10);
    for (const p of frame) {
      const { side: pref, gap } = PLACE[p.kind];
      const appearing = (raw.get(p.id) ?? 0) < 0.01;
      raw.set(p.id, p.opacity);
      let chosen = (appearing ? undefined : side.get(p.id)) ?? pref;
      let visible = 1;
      if (p.w > 0 && pref !== "center") {
        const fits = (sd: Side) => {
          const b = boxFor(sd, gap, p.x, p.y, p.w, p.h);
          const inside = b[0] >= 8 && b[0] + b[2] <= W - 8;
          return inside && !taken.some((t) => b[0] < t[0] + t[2] + 4 && t[0] < b[0] + b[2] + 4 && b[1] < t[1] + t[3] && t[1] < b[1] + b[3]);
        };
        // Stay on the current side while it works, so labels don't flicker between sides.
        if (!fits(chosen)) {
          if (fits(FLIP[chosen])) chosen = FLIP[chosen];
          else if (!p.focus) visible = 0;
        }
        side.set(p.id, chosen);
        if (visible) {
          const b = boxFor(chosen, gap, p.x, p.y, p.w, p.h);
          taken.push(b);
          // The trace note hangs beneath the name, left-aligned with it; it claims that space too.
          if (p.note) taken.push([b[0], b[1] + b[3], 240, 64]);
        }
      }
      const before = appearing ? visible : (clear.get(p.id) ?? 1);
      const c = before + (visible - before) * ease;
      clear.set(p.id, c);
      const opacity = p.opacity * c;
      last.set(p.id, opacity);
      p.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) ${offsetFor(chosen, gap)}`;
      p.el.style.opacity = opacity.toFixed(3);
    }
  });
  return null;
}
