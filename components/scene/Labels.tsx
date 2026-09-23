"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { nodeAnims } from "@/lib/choreo";
import { YOU_ID, type Layout, type LayoutNode } from "@/lib/layout";
import { useSonora } from "@/lib/store";

// Labels are plain DOM, positioned once per frame by a single projector inside
// the canvas. Crisp type, one layer, no per-label React updates.

export const labelEls = new Map<string, HTMLDivElement>();
export const UNCHARTED_ID = "__uncharted";

const OFFSET: Record<LayoutNode["kind"], string> = {
  you: "translate(-50%, 26px)",
  artist: "translate(14px, -50%)",
  genre: "translate(-50%, 12px)",
  trait: "translate(10px, -50%)",
  discovery: "translate(14px, -50%)",
};

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

export function LabelLayer({ layout }: { layout: Layout }) {
  const traits = useSonora((s) => s.data?.traits);
  const mode = useSonora((s) => s.mode);
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

export function LabelProjector() {
  useFrame(({ camera, size }) => {
    const s = useSonora.getState();
    const L = s.layout;
    if (!L) return;
    placeAnnotation(s, camera, size.width, size.height);
    const anchor = annotatedId(s);
    for (const [id, el] of labelEls) {
      let opacity = 0;
      let offset = "translate(-50%, -50%)";
      if (id === UNCHARTED_ID) {
        v.set(...L.sectorCenter);
        v.y += 5;
        opacity = s.phase === "ready" && s.mode === "universe" && !s.selectedId ? 0.8 : 0;
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
        offset = OFFSET[n.kind];
      }
      v.project(camera);
      if (v.z > 1) opacity = 0;
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      // Labels give way to the annotation and the mode readout that sit over the scene.
      const underAnnotation = rect.on && id !== anchor && x > rect.x - 16 && x < rect.x + rect.w + 16 && y > rect.y - 16 && y < rect.y + rect.h + 16;
      if (underAnnotation) opacity *= 0.1;
      if (s.phase === "ready" && s.mode !== "universe" && x < 440) opacity *= 0.12;
      const prev = last.get(id) ?? -1;
      if (opacity < 0.01 && prev < 0.01) continue;
      last.set(id, opacity);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) ${offset}`;
      el.style.opacity = opacity.toFixed(3);
    }
  });
  return null;
}
