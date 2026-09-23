"use client";

import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { nodeAnims } from "@/lib/choreo";
import type { Layout, LayoutNode } from "@/lib/layout";
import { useSonora } from "@/lib/store";
import { billboardVertex, nodeFragment } from "./shaders";

const KIND = { artist: 0, genre: 1, trait: 2, discovery: 3 } as const;

// World-space billboard half-size per kind.
const BASE = { artist: 3.1, genre: 5.6, trait: 1.5, discovery: 2.6 } as const;

// Palette: artists are the blue stars, genres violet regions, traits pale,
// and magenta only ever marks the unexplored.
const COLOR = {
  artist: new THREE.Color("#7AA7FF").lerp(new THREE.Color("#F5F7FA"), 0.15),
  genre: new THREE.Color("#A78BFA").lerp(new THREE.Color("#7AA7FF"), 0.25),
  trait: new THREE.Color("#F5F7FA").lerp(new THREE.Color("#7AA7FF"), 0.35),
  discovery: new THREE.Color("#E879F9"),
} as const;

// Hit radius per kind: generous, so hovering never feels fiddly.
const HIT = { artist: 1.3, genre: 1.6, trait: 0.9, discovery: 1.3 } as const;

function isInteractive(node: LayoutNode) {
  const s = useSonora.getState();
  if (s.phase !== "ready") return false;
  if (s.mode === "dna") return node.kind === "trait" || node.kind === "artist";
  if (node.kind === "discovery") return s.mode === "discovery";
  return true;
}

function CelestialNode({ node }: { node: LayoutNode }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const kind = node.kind as Exclude<LayoutNode["kind"], "you">;

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: billboardVertex,
        fragmentShader: nodeFragment,
        uniforms: {
          uSize: { value: 0 },
          uNearClamp: { value: kind === "genre" ? 0 : 30 },
          uColor: { value: COLOR[kind] },
          uOpacity: { value: 0 },
          uGlow: { value: 0 },
          uKind: { value: KIND[kind] },
          uTime: { value: 0 },
          uSeed: { value: node.seed },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        premultipliedAlpha: true,
      }),
    [kind, node.seed],
  );

  useFrame((state) => {
    const a = nodeAnims.get(node.id);
    if (!a || !group.current || !body.current) return;
    const mat = body.current.material as THREE.ShaderMaterial;
    group.current.position.set(a.pos.x.value, a.pos.y.value, a.pos.z.value);
    const s = a.scale.value;
    group.current.scale.setScalar(Math.max(0.001, s));
    mat.uniforms.uSize.value = BASE[kind] * node.size * s;
    // Dimmed objects recede but never vanish; the sky stays whole.
    mat.uniforms.uOpacity.value = a.opacity.value * (0.14 + 0.86 * a.emphasis.value);
    mat.uniforms.uGlow.value = a.glow.value;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <group ref={group}>
      <mesh ref={body} material={mat} frustumCulled={false} renderOrder={kind === "genre" ? 0 : 2}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      <mesh
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (!isInteractive(node)) return;
          e.stopPropagation();
          useSonora.getState().hover(node.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          if (useSonora.getState().hoveredId === node.id) useSonora.getState().hover(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          if (!isInteractive(node) || e.delta > 5) return;
          e.stopPropagation();
          useSonora.getState().select(node.id);
        }}
      >
        <sphereGeometry args={[HIT[kind] * node.size, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function CelestialNodes({ layout }: { layout: Layout }) {
  return (
    <>
      {layout.nodes
        .filter((n) => n.kind !== "you")
        .map((n) => (
          <CelestialNode key={n.id} node={n} />
        ))}
    </>
  );
}
