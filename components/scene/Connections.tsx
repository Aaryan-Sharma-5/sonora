"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { edgeAnims, nodeAnims } from "@/lib/choreo";
import type { EdgeKind, Layout } from "@/lib/layout";
import { lineFragment, lineVertex } from "./shaders";

// Every connection in a single LineSegments draw call. Each edge is split into
// short segments so the draw-in and the soft end fades read smoothly.
const SEGMENTS = 12;

const EDGE_COLOR: Record<EdgeKind, THREE.Color> = {
  "you-trait": new THREE.Color("#F5F7FA").lerp(new THREE.Color("#7AA7FF"), 0.4),
  "you-genre": new THREE.Color("#A78BFA").lerp(new THREE.Color("#F5F7FA"), 0.2),
  "artist-genre": new THREE.Color("#A78BFA").lerp(new THREE.Color("#7AA7FF"), 0.4),
  "artist-artist": new THREE.Color("#7AA7FF"),
  "artist-trait": new THREE.Color("#F5F7FA").lerp(new THREE.Color("#7AA7FF"), 0.5),
  bridge: new THREE.Color("#E879F9"),
  "dna-ring": new THREE.Color("#7AA7FF").lerp(new THREE.Color("#F5F7FA"), 0.3),
};

export default function Connections({ layout }: { layout: Layout }) {
  const line = useRef<THREE.LineSegments>(null);
  const { geo, mat, edges } = useMemo(() => {
    const edges = layout.edges;
    const verts = edges.length * SEGMENTS * 2;
    const g = new THREE.BufferGeometry();
    const t = new Float32Array(verts);
    const color = new Float32Array(verts * 3);
    edges.forEach((e, i) => {
      const c = EDGE_COLOR[e.kind];
      for (let s = 0; s < SEGMENTS; s++) {
        const v = (i * SEGMENTS + s) * 2;
        t[v] = s / SEGMENTS;
        t[v + 1] = (s + 1) / SEGMENTS;
        color.set([c.r, c.g, c.b, c.r, c.g, c.b], v * 3);
      }
    });
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    g.setAttribute("aT", new THREE.BufferAttribute(t, 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(verts), 1));
    g.setAttribute("aReveal", new THREE.BufferAttribute(new Float32Array(verts), 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: lineVertex,
      fragmentShader: lineFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
    });
    return { geo: g, mat: m, edges };
  }, [layout]);

  useEffect(() => () => geo.dispose(), [geo]);

  useFrame(() => {
    if (!line.current) return;
    const g = line.current.geometry;
    const pos = g.attributes.position.array as Float32Array;
    const alpha = g.attributes.aAlpha.array as Float32Array;
    const reveal = g.attributes.aReveal.array as Float32Array;
    edges.forEach((e, i) => {
      const na = nodeAnims.get(e.a);
      const nb = nodeAnims.get(e.b);
      const ea = edgeAnims.get(e.id);
      if (!na || !nb || !ea) return;
      const ax = na.pos.x.value, ay = na.pos.y.value, az = na.pos.z.value;
      const bx = nb.pos.x.value, by = nb.pos.y.value, bz = nb.pos.z.value;
      // A line is only as present as the fainter of the two bodies it joins.
      const presence = Math.min(na.opacity.value, nb.opacity.value);
      const a = ea.alpha.value * presence;
      const r = ea.reveal.value;
      for (let s = 0; s < SEGMENTS; s++) {
        const v = (i * SEGMENTS + s) * 2;
        const t0 = s / SEGMENTS;
        const t1 = (s + 1) / SEGMENTS;
        pos[v * 3] = ax + (bx - ax) * t0;
        pos[v * 3 + 1] = ay + (by - ay) * t0;
        pos[v * 3 + 2] = az + (bz - az) * t0;
        pos[v * 3 + 3] = ax + (bx - ax) * t1;
        pos[v * 3 + 4] = ay + (by - ay) * t1;
        pos[v * 3 + 5] = az + (bz - az) * t1;
        alpha[v] = alpha[v + 1] = a;
        reveal[v] = reveal[v + 1] = r;
      }
    });
    g.attributes.position.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    g.attributes.aReveal.needsUpdate = true;
  });

  return <lineSegments ref={line} geometry={geo} material={mat} frustumCulled={false} renderOrder={1} />;
}
