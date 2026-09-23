"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { rand, type Layout } from "@/lib/layout";
import { Tween, now } from "@/lib/motion";
import { useSonora, type SonoraState } from "@/lib/store";
import { billboardVertex, nebulaFragment, orbitVertex, pointFragment } from "./shaders";

// The uncharted region at the edge of the map. Faint until the visitor chooses
// to explore it; then it brightens and its dust drifts open.
const DUST = 100;

function intensityFor(s: SonoraState) {
  if (s.phase === "landing") return 0.5;
  if (s.phase === "building") return s.dataReady ? 0.55 : 0.2;
  if (s.mode === "dna") return 0.12;
  if (s.mode === "discovery") return 1;
  return 0.8;
}

export default function Nebula({ layout }: { layout: Layout }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const intensity = useRef(new Tween(0));
  const spread = useRef(new Tween(0.55));

  const { center, mat } = useMemo(() => {
    const c = layout.sectorCenter;
    const d = Math.hypot(c[0], c[2]) || 1;
    // Sit slightly behind the discovery nodes, so they emerge in front of it.
    const center = new THREE.Vector3((c[0] / d) * (d + 6), c[1] - 2, (c[2] / d) * (d + 6));
    const mat = new THREE.ShaderMaterial({
      vertexShader: billboardVertex,
      fragmentShader: nebulaFragment,
      uniforms: { uSize: { value: 26 }, uNearClamp: { value: 0 }, uTime: { value: 0 }, uIntensity: { value: 0 }, uSeed: { value: layout.sectorAngle } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
    });
    return { center, mat };
  }, [layout.sectorCenter, layout.sectorAngle]);

  // Dust reuses the orbit shader: particles on slow, wide, tilted orbits around the nebula core.
  const dust = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const attrs = { aRadius: [] as number[], aSpeed: [] as number[], aPhase: [] as number[], aTilt: [] as number[], aSize: [] as number[] };
    for (let i = 0; i < DUST; i++) {
      attrs.aRadius.push(2 + Math.pow(rand("dr" + i), 0.8) * 14);
      attrs.aSpeed.push((rand("ds" + i) - 0.5) * 0.04);
      attrs.aPhase.push(rand("dp" + i) * Math.PI * 2);
      attrs.aTilt.push((rand("dt" + i) - 0.5) * 2.4);
      attrs.aSize.push(1.5 + rand("dz" + i) * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DUST * 3), 3));
    for (const [k, v] of Object.entries(attrs)) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(v), 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: orbitVertex,
      fragmentShader: pointFragment,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uPixelRatio: { value: dpr },
        uColor: { value: new THREE.Color("#E879F9").lerp(new THREE.Color("#F5F7FA"), 0.45) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
    });
    return { g, m };
  }, [dpr]);

  const dustGroup = useRef<THREE.Group>(null);
  const cloud = useRef<THREE.Mesh>(null);
  const dustPoints = useRef<THREE.Points>(null);

  useEffect(() => {
    const apply = (s: SonoraState) => {
      intensity.current.set(intensityFor(s), 2.2, s.mode === "discovery" ? 0.6 : 0);
      spread.current.set(s.mode === "discovery" && s.phase === "ready" ? 1.35 : 0.55, 3.2, 0.8);
    };
    apply(useSonora.getState());
    return useSonora.subscribe(apply);
  }, []);

  useFrame((state) => {
    const t = now();
    const i = intensity.current.update(t);
    const sp = spread.current.update(t);
    if (!cloud.current || !dustPoints.current) return;
    const cm = cloud.current.material as THREE.ShaderMaterial;
    const dm = dustPoints.current.material as THREE.ShaderMaterial;
    cm.uniforms.uTime.value = state.clock.elapsedTime;
    cm.uniforms.uIntensity.value = i * 0.16;
    dm.uniforms.uTime.value = state.clock.elapsedTime;
    dm.uniforms.uOpacity.value = 0.25 + i * 0.35;
    dustGroup.current?.scale.setScalar(sp);
  });

  return (
    <group position={center}>
      <mesh ref={cloud} material={mat} frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      <group ref={dustGroup}>
        <points ref={dustPoints} geometry={dust.g} material={dust.m} frustumCulled={false} />
      </group>
    </group>
  );
}
