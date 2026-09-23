"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { nodeAnims } from "@/lib/choreo";
import { rand, YOU_ID } from "@/lib/layout";
import { useSonora } from "@/lib/store";
import { billboardVertex, orbitVertex, pointFragment, youFragment } from "./shaders";

// The center of gravity: a warm core, a breathing blue halo, and a disc of
// particles on slow, slightly inclined orbits. 150 particles.
const ORBITERS = 150;

export default function YouNode() {
  const dpr = useThree((s) => s.viewport.dpr);
  const group = useRef<THREE.Group>(null);
  const coreMesh = useRef<THREE.Mesh>(null);
  const orbitPts = useRef<THREE.Points>(null);

  const core = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: billboardVertex,
        fragmentShader: youFragment,
        uniforms: { uSize: { value: 7 }, uNearClamp: { value: 0 }, uOpacity: { value: 0 }, uTime: { value: 0 }, uGlow: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        premultipliedAlpha: true,
      }),
    [],
  );

  const orbit = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const attrs = { aRadius: [] as number[], aSpeed: [] as number[], aPhase: [] as number[], aTilt: [] as number[], aSize: [] as number[] };
    for (let i = 0; i < ORBITERS; i++) {
      const r = 1.3 + Math.pow(rand("or" + i), 1.4) * 3.1;
      attrs.aRadius.push(r);
      // Inner orbits move faster, like a real system.
      attrs.aSpeed.push((0.16 / Math.sqrt(r)) * (0.7 + rand("os" + i) * 0.6));
      attrs.aPhase.push(rand("op" + i) * Math.PI * 2);
      attrs.aTilt.push((rand("ot" + i) - 0.5) * 0.5);
      attrs.aSize.push(0.8 + rand("oz" + i) * 1.6);
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ORBITERS * 3), 3));
    for (const [k, v] of Object.entries(attrs)) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(v), 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: orbitVertex,
      fragmentShader: pointFragment,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uPixelRatio: { value: dpr },
        uColor: { value: new THREE.Color("#7AA7FF").lerp(new THREE.Color("#F5F7FA"), 0.55) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
    });
    return { g, m };
  }, [dpr]);

  useFrame((state) => {
    const a = nodeAnims.get(YOU_ID);
    if (!a || !group.current || !coreMesh.current || !orbitPts.current) return;
    const cm = coreMesh.current.material as THREE.ShaderMaterial;
    const om = orbitPts.current.material as THREE.ShaderMaterial;
    const t = state.clock.elapsedTime;
    group.current.position.set(a.pos.x.value, a.pos.y.value, a.pos.z.value);
    const s = a.scale.value;
    cm.uniforms.uSize.value = 7 * (0.35 + 0.65 * s);
    cm.uniforms.uOpacity.value = a.opacity.value * (0.6 + 0.4 * a.emphasis.value);
    cm.uniforms.uTime.value = t;
    cm.uniforms.uGlow.value = a.glow.value;
    om.uniforms.uTime.value = t;
    om.uniforms.uOpacity.value = a.opacity.value * s * 0.9;
    group.current.scale.setScalar(Math.max(0.001, 0.4 + 0.6 * s));
  });

  const interactive = (e: ThreeEvent<PointerEvent>) => {
    const st = useSonora.getState();
    if (st.phase !== "ready") return false;
    e.stopPropagation();
    return true;
  };

  return (
    <group ref={group}>
      <mesh ref={coreMesh} material={core} frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      <points ref={orbitPts} geometry={orbit.g} material={orbit.m} frustumCulled={false} />
      <mesh
        onPointerOver={(e) => {
          if (!interactive(e)) return;
          useSonora.getState().hover(YOU_ID);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          if (useSonora.getState().hoveredId === YOU_ID) useSonora.getState().hover(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          if (!interactive(e as unknown as ThreeEvent<PointerEvent>) || e.delta > 5) return;
          useSonora.getState().select(YOU_ID);
        }}
      >
        <sphereGeometry args={[1.6, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
