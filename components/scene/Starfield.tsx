"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { rand } from "@/lib/layout";
import { starFragment, starVertex } from "./shaders";

// Two layers of depth: a distant shell of fixed-size stars, and a sparse near
// field of dust that parallaxes as the camera moves. 760 + 150 points.
const FAR = 760;
const NEAR = 150;

function buildStars(count: number, near: boolean) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const bright = new Float32Array(count);
  const phase = new Float32Array(count);
  const color = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const k = (near ? "n" : "f") + i;
    if (near) {
      const a = rand(k + "a") * Math.PI * 2;
      const r = 28 + Math.pow(rand(k + "r"), 0.7) * 90;
      pos.set([Math.cos(a) * r, (rand(k + "y") - 0.5) * 50, Math.sin(a) * r], i * 3);
      size[i] = 0.5 + rand(k + "s") * 1.1;
      bright[i] = 0.12 + rand(k + "b") * 0.35;
    } else {
      const u = rand(k + "u") * 2 - 1;
      const th = rand(k + "t") * Math.PI * 2;
      const r = 220 + rand(k + "r") * 160;
      const s = Math.sqrt(1 - u * u);
      pos.set([s * Math.cos(th) * r, u * r, s * Math.sin(th) * r], i * 3);
      const big = Math.pow(rand(k + "s"), 6);
      size[i] = 1.1 + big * 2.6;
      bright[i] = 0.22 + Math.pow(rand(k + "b"), 3) * 0.75 + big * 0.25;
    }
    phase[i] = rand(k + "p");
    const tint = rand(k + "c");
    const c = tint < 0.1 ? [0.62, 0.74, 1.0] : tint < 0.15 ? [0.78, 0.7, 1.0] : [0.92, 0.94, 1.0];
    color.set(c, i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aBright", new THREE.BufferAttribute(bright, 1));
  g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  g.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
  return g;
}

function starMaterial(near: boolean, dpr: number) {
  return new THREE.ShaderMaterial({
    vertexShader: starVertex,
    fragmentShader: starFragment,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: dpr }, uNear: { value: near ? 1 : 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
  });
}

export default function Starfield() {
  const dpr = useThree((s) => s.viewport.dpr);
  const group = useRef<THREE.Group>(null);
  const farPts = useRef<THREE.Points>(null);
  const nearPts = useRef<THREE.Points>(null);
  const far = useMemo(() => ({ geo: buildStars(FAR, false), mat: starMaterial(false, dpr) }), [dpr]);
  const near = useMemo(() => ({ geo: buildStars(NEAR, true), mat: starMaterial(true, dpr) }), [dpr]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (const p of [farPts.current, nearPts.current]) {
      if (p) (p.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    }
    if (group.current) group.current.rotation.y = t * 0.004;
  });

  return (
    <>
      <group ref={group}>
        <points ref={farPts} geometry={far.geo} material={far.mat} frustumCulled={false} />
      </group>
      <points ref={nearPts} geometry={near.geo} material={near.mat} frustumCulled={false} />
    </>
  );
}
