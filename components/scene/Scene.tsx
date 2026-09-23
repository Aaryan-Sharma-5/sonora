"use client";

import { useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { sync, tick } from "@/lib/choreo";
import { now } from "@/lib/motion";
import { useSonora } from "@/lib/store";
import CameraRig from "./CameraRig";
import CelestialNodes from "./CelestialNodes";
import Connections from "./Connections";
import { LabelProjector } from "./Labels";
import Nebula from "./Nebula";
import Starfield from "./Starfield";
import YouNode from "./YouNode";

/** Advances every tween once per frame, before anything reads them. */
function Animator() {
  useEffect(() => {
    sync(useSonora.getState(), null);
    return useSonora.subscribe((s, prev) => sync(s, prev));
  }, []);
  useFrame(() => tick(now()), -1);
  return null;
}

function Universe() {
  const layout = useSonora((s) => s.layout);
  if (!layout) return null;
  return (
    <>
      <Nebula layout={layout} />
      <Connections layout={layout} />
      <CelestialNodes layout={layout} />
      <YouNode />
    </>
  );
}

export default function Scene({ onMissed }: { onMissed: () => void }) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 2]}
      camera={{ fov: 42, near: 0.1, far: 1200, position: [-11, 25, 56] }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor("#05060A")}
      onPointerMissed={onMissed}
    >
      <Animator />
      <Starfield />
      <Universe />
      <CameraRig />
      <LabelProjector />
    </Canvas>
  );
}
