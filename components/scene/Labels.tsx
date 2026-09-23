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

const v = new THREE.Vector3();
const last = new Map<string, number>();

export function LabelProjector() {
  useFrame(({ camera, size }) => {
    const s = useSonora.getState();
    const L = s.layout;
    if (!L) return;
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
      const sx = (v.x * 0.5 + 0.5) * size.width;
      // Labels give way to the panels that sit over the scene.
      if (s.selectedId && sx > size.width - 440) opacity *= 0.12;
      if (s.phase === "ready" && s.mode !== "universe" && sx < 440) opacity *= 0.12;
      const prev = last.get(id) ?? -1;
      if (opacity < 0.01 && prev < 0.01) continue;
      last.set(id, opacity);
      const x = sx;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) ${offset}`;
      el.style.opacity = opacity.toFixed(3);
    }
  });
  return null;
}
