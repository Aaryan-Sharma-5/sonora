"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { LabelLayer } from "./scene/Labels";
import { ActionBar, StatusLine, TopChrome } from "./ui/Chrome";
import Landing from "./ui/Landing";
import { DetailPanel, ModeReadout } from "./ui/Panels";
import { useSonora } from "@/lib/store";

const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });

export default function Experience() {
  const phase = useSonora((s) => s.phase);
  const layout = useSonora((s) => s.layout);
  const down = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const s = useSonora.getState();
      if (s.selectedId) s.select(null);
      else if (s.mode !== "universe") s.setMode("universe");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Clicking empty space releases focus, but a drag to orbit does not.
  const onMissed = () => {
    const s = useSonora.getState();
    if (s.phase === "ready" && s.selectedId && !down.current) s.select(null);
  };

  return (
    <main
      className="fixed inset-0 overflow-hidden bg-bg"
      onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const d = down.current;
        const dragged = d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5;
        // Released on the next tick, after the canvas has handled the click.
        setTimeout(() => (down.current = null), 0);
        if (!dragged) down.current = null;
      }}
    >
      <Scene onMissed={onMissed} />
      {layout && <LabelLayer layout={layout} />}

      <AnimatePresence>{phase === "landing" && <Landing key="landing" />}</AnimatePresence>
      <TopChrome />
      <ModeReadout />
      <DetailPanel />
      <ActionBar />
      <StatusLine />
    </main>
  );
}
