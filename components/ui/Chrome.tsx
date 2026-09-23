"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { useSonora } from "@/lib/store";

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.9, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.5, ease: EASE } },
};

export function TopChrome() {
  const phase = useSonora((s) => s.phase);
  const data = useSonora((s) => s.data);
  const dataReady = useSonora((s) => s.dataReady);
  if (phase === "landing") return null;
  return (
    <motion.header {...fade} className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-10 pt-8">
      <span className="text-[13px] font-semibold tracking-[0.34em] text-text">SONORA</span>
      {dataReady && data && (
        <div className="text-right text-[12px] leading-[1.7] text-text-3">
          <div>
            <span className="text-text-2">{data.artists.length}</span> artists
            <span className="mx-2">·</span>
            <span className="text-text-2">{data.genres.length}</span> genres
            <span className="mx-2">·</span>
            <span className="text-text-2">{data.traits.length}</span> traits
          </div>
          {data.source === "demo" && <div>Reference universe</div>}
        </div>
      )}
    </motion.header>
  );
}

export function StatusLine() {
  const status = useSonora((s) => s.status);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-11 z-20 flex justify-center px-10">
      <AnimatePresence mode="wait">
        {status && (
          <motion.p
            key={status.text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.5, ease: EASE } }}
            className={
              status.sentence
                ? "max-w-[440px] text-center text-[14px] leading-[1.5] text-text"
                : "caption !tracking-[0.3em] text-text-2"
            }
          >
            {status.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ActionBar() {
  const phase = useSonora((s) => s.phase);
  const mode = useSonora((s) => s.mode);
  const adding = useSonora((s) => s.adding);
  const setMode = useSonora((s) => s.setMode);
  const addArtist = useSonora((s) => s.addArtist);
  const [draft, setDraft] = useState("");

  return (
    <AnimatePresence>
      {phase === "ready" && (
        <motion.div {...fade} className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-10 pb-9">
          <div className="pointer-events-auto flex gap-3">
            {mode === "universe" ? (
              <>
                <button type="button" className="control" onClick={() => setMode("dna")}>
                  Analyze my DNA
                </button>
                <button type="button" className="control" onClick={() => setMode("discovery")}>
                  Explore the unknown
                </button>
              </>
            ) : (
              <>
                <button type="button" className="control" onClick={() => setMode("universe")}>
                  Back to universe
                </button>
                <button
                  type="button"
                  className="control"
                  onClick={() => setMode(mode === "dna" ? "discovery" : "dna")}
                >
                  {mode === "dna" ? "Explore the unknown" : "Analyze my DNA"}
                </button>
              </>
            )}
          </div>

          <form
            className="pointer-events-auto flex w-[280px] items-center border-b border-line transition-colors duration-300 focus-within:border-[rgba(122,167,255,0.55)]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim() || adding) return;
              addArtist(draft);
              setDraft("");
            }}
          >
            <span className="pr-3 text-[15px] text-text-3">+</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={adding}
              placeholder={adding ? "Placing…" : "What if I add…"}
              className="h-10 w-full bg-transparent text-[14px] text-text placeholder:text-text-3 outline-none"
              spellCheck={false}
              autoComplete="off"
            />
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
