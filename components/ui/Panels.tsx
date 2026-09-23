"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { strengthWord } from "@/components/scene/Labels";
import { YOU_ID } from "@/lib/layout";
import { EASE } from "@/lib/motion";
import { useSonora } from "@/lib/store";
import type { UniverseData } from "@/lib/universe";

function Caption({ children }: { children: ReactNode }) {
  return <p className="caption text-text-3">{children}</p>;
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-8">
      <Caption>{label}</Caption>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** A name that focuses its object in the universe. */
function Ref({ id, children }: { id: string; children: ReactNode }) {
  const select = useSonora((s) => s.select);
  const hover = useSonora((s) => s.hover);
  return (
    <button
      type="button"
      onClick={() => select(id)}
      onMouseEnter={() => hover(id)}
      onMouseLeave={() => hover(null)}
      className="cursor-pointer text-left transition-colors duration-300 hover:text-text"
    >
      {children}
    </button>
  );
}

function joinRefs(items: { id: string; name: string }[]) {
  return items.map((it, i) => (
    <span key={it.id}>
      <Ref id={it.id}>{it.name}</Ref>
      {i < items.length - 1 && <span className="mx-2 text-text-3">·</span>}
    </span>
  ));
}

function traitSentence(name: string, strength: number) {
  const w = strengthWord(strength);
  const n = name.toLowerCase();
  if (w === "strongly leans") return `Your selected music strongly leans ${n}.`;
  if (w === "clearly present") return `${name} is clearly present across your selection.`;
  if (w === "present") return `${name} runs through part of your selection.`;
  return `A trace of ${n} appears in your selection.`;
}

function PanelBody({ id, data }: { id: string; data: UniverseData }) {
  const setMode = useSonora((s) => s.setMode);
  const byId = <T extends { id: string }>(list: T[], ids: string[]) =>
    ids.map((i) => list.find((x) => x.id === i)).filter((x): x is T => !!x);

  if (id === YOU_ID) {
    const top = data.traits.slice(0, 3);
    return (
      <>
        <Caption>Your universe</Caption>
        <h2 className="mt-3 text-[28px] leading-[1.2] font-semibold tracking-[-0.015em] text-text">{data.summary.headline}</h2>
        <p className="mt-4 text-[14.5px] leading-[1.65] text-text-2">{data.summary.description}</p>
        <Section label="Strongest currents">
          <ul className="space-y-1.5 text-[14px] text-text-2">
            {top.map((t) => (
              <li key={t.id}>
                <Ref id={t.id}>{t.name}</Ref>
                <span className="text-text-3"> · {strengthWord(t.strength)}</span>
              </li>
            ))}
          </ul>
        </Section>
        <button type="button" className="control mt-9" onClick={() => setMode("dna")}>
          Analyze my DNA
        </button>
      </>
    );
  }

  const artist = data.artists.find((a) => a.id === id);
  if (artist) {
    const rels = data.relationships
      .filter((r) => r.a === id || r.b === id)
      .slice(0, 3)
      .map((r) => ({ other: data.artists.find((a) => a.id === (r.a === id ? r.b : r.a))!, reason: r.reason }))
      .filter((r) => r.other);
    return (
      <>
        <Caption>{artist.uncertain ? "Limited information" : "Artist"}</Caption>
        <h2 className="mt-3 text-[40px] leading-[1.05] font-semibold tracking-[-0.02em] text-text">{artist.name}</h2>
        {artist.genres.length > 0 && (
          <p className="mt-4 text-[14px] text-text-2">{joinRefs(byId(data.genres, artist.genres))}</p>
        )}
        {artist.traits.length > 0 && (
          <p className="mt-1.5 text-[13px] text-text-3">{joinRefs(byId(data.traits, artist.traits))}</p>
        )}
        <Section label="Why it connects">
          <p className="text-[14.5px] leading-[1.65] text-text">{artist.why}</p>
        </Section>
        {rels.length > 0 && (
          <Section label="Nearest">
            <ul className="space-y-3">
              {rels.map((r) => (
                <li key={r.other.id} className="text-[13.5px] leading-[1.55]">
                  <span className="text-text">
                    <Ref id={r.other.id}>{r.other.name}</Ref>
                  </span>
                  {r.reason && <span className="block text-text-2">{r.reason}</span>}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </>
    );
  }

  const genre = data.genres.find((g) => g.id === id);
  if (genre) {
    const members = data.artists.filter((a) => a.genres.includes(id));
    return (
      <>
        <Caption>Genre</Caption>
        <h2 className="mt-3 text-[36px] leading-[1.08] font-semibold tracking-[-0.02em] text-text">{genre.name}</h2>
        {genre.description && <p className="mt-4 text-[14.5px] leading-[1.65] text-text-2">{genre.description}</p>}
        {members.length > 0 && (
          <Section label="In your universe">
            <p className="text-[14px] text-text-2">{joinRefs(members)}</p>
          </Section>
        )}
      </>
    );
  }

  const trait = data.traits.find((t) => t.id === id);
  if (trait) {
    const members = data.artists.filter((a) => a.traits.includes(id));
    return (
      <>
        <Caption>Recurring quality</Caption>
        <h2 className="mt-3 text-[36px] leading-[1.08] font-semibold tracking-[-0.02em] text-text">{trait.name}</h2>
        <p className="mt-4 text-[15px] leading-[1.6] text-text">{traitSentence(trait.name, trait.strength)}</p>
        {trait.observation && <p className="mt-3 text-[14px] leading-[1.65] text-text-2">{trait.observation}</p>}
        {members.length > 0 && (
          <Section label="Heard in">
            <p className="text-[14px] text-text-2">{joinRefs(members)}</p>
          </Section>
        )}
      </>
    );
  }

  const d = data.discovery.find((x) => x.id === id);
  if (d) {
    const bridges = d.bridges
      .map((b) => data.artists.find((a) => a.id === b) ?? data.genres.find((g) => g.id === b))
      .filter((x): x is NonNullable<typeof x> => !!x);
    return (
      <>
        <p className="caption text-magenta/80">Uncharted {d.kind}</p>
        <h2 className="mt-3 text-[36px] leading-[1.08] font-semibold tracking-[-0.02em] text-text">{d.name}</h2>
        {d.description && <p className="mt-4 text-[14.5px] leading-[1.65] text-text-2">{d.description}</p>}
        {d.why && (
          <Section label="Why it's near">
            <p className="text-[14.5px] leading-[1.65] text-text">{d.why}</p>
          </Section>
        )}
        {d.entryPoints.length > 0 && (
          <Section label="Start with">
            <ul className="space-y-1.5 text-[14px] text-text">
              {d.entryPoints.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Section>
        )}
        {bridges.length > 0 && (
          <Section label="Reached through">
            <p className="text-[14px] text-text-2">{joinRefs(bridges)}</p>
          </Section>
        )}
      </>
    );
  }
  return null;
}

export function DetailPanel() {
  const selectedId = useSonora((s) => s.selectedId);
  const data = useSonora((s) => s.data);
  const select = useSonora((s) => s.select);
  const open = !!selectedId && !!data;

  return (
    <>
      {/* A functional scrim so the panel stays legible over bright regions. */}
      <motion.div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[560px] bg-gradient-to-l from-[#05060A]/90 via-[#05060A]/55 to-transparent"
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.9, ease: EASE }}
      />
      <AnimatePresence mode="wait">
        {open && (
          <motion.aside
            key={selectedId}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.9, ease: EASE, delay: 0.35 } }}
            exit={{ opacity: 0, x: 8, transition: { duration: 0.35, ease: EASE } }}
            className="absolute top-28 right-10 z-20 max-h-[calc(100vh-220px)] w-[340px] overflow-y-auto pr-1"
          >
            <button
              type="button"
              onClick={() => select(null)}
              aria-label="Close"
              className="absolute top-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center border border-line text-[14px] text-text-3 transition-colors duration-300 hover:border-line-strong hover:text-text"
            >
              ×
            </button>
            <PanelBody id={selectedId!} data={data!} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

export function ModeReadout() {
  const mode = useSonora((s) => s.mode);
  const phase = useSonora((s) => s.phase);
  const data = useSonora((s) => s.data);
  const select = useSonora((s) => s.select);
  const hover = useSonora((s) => s.hover);
  const hoveredId = useSonora((s) => s.hoveredId);
  const show = phase === "ready" && data && mode !== "universe";

  return (
    <>
      {/* Mirrors the detail panel's scrim, so the readout stays legible. */}
      <motion.div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[520px] bg-gradient-to-r from-[#05060A]/85 via-[#05060A]/45 to-transparent"
        animate={{ opacity: show ? 1 : 0 }}
        transition={{ duration: 0.9, ease: EASE }}
      />
      <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 1, ease: EASE, delay: 1.1 } }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: EASE } }}
          className="absolute top-28 left-10 z-20 w-[360px]"
        >
          {mode === "dna" ? (
            <>
              <Caption>Music DNA</Caption>
              <h2 className="mt-3 text-[30px] leading-[1.18] font-semibold tracking-[-0.015em] text-text">{data.summary.headline}</h2>
              <p className="mt-4 text-[14px] leading-[1.65] text-text-2">{data.summary.description}</p>
              <ul className="mt-8 space-y-2">
                {data.traits.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onMouseEnter={() => hover(t.id)}
                      onMouseLeave={() => hover(null)}
                      onClick={() => select(t.id)}
                      className={`flex w-full cursor-pointer items-baseline justify-between text-left text-[14px] transition-colors duration-300 ${hoveredId === t.id ? "text-text" : "text-text-2"}`}
                    >
                      <span>{t.name}</span>
                      <span className="text-[12px] text-text-3">{strengthWord(t.strength)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[12px] leading-[1.6] text-text-3">
                Observations about the music you chose, not measurements of you.
              </p>
            </>
          ) : (
            <>
              <p className="caption text-magenta/80">Uncharted territory</p>
              <h2 className="mt-3 text-[30px] leading-[1.18] font-semibold tracking-[-0.015em] text-text">Just beyond your map.</h2>
              <p className="mt-4 text-[14px] leading-[1.65] text-text-2">
                Regions your selected music borders but does not yet reach.
              </p>
              <ul className="mt-8 space-y-2.5">
                {data.discovery.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onMouseEnter={() => hover(d.id)}
                      onMouseLeave={() => hover(null)}
                      onClick={() => select(d.id)}
                      className={`flex w-full cursor-pointer items-baseline justify-between text-left text-[14px] transition-colors duration-300 ${hoveredId === d.id ? "text-text" : "text-text-2"}`}
                    >
                      <span>{d.name}</span>
                      <span className="text-[12px] text-text-3">{d.kind}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
