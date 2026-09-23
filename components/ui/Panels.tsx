"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { annotation, strengthWord } from "@/components/scene/Labels";
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

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
const countWord = (n: number) => WORDS[n] ?? String(n);

/** Editorial headlines stay large when short, and step down when Claude runs long. */
function headlineSize(text: string) {
  if (text.length > 110) return "text-[21px]";
  if (text.length > 70) return "text-[25px]";
  return "text-[30px]";
}

function traitSentence(name: string, strength: number) {
  const w = strengthWord(strength);
  const n = name.toLowerCase();
  if (w === "strongly leans") return `Your selected music strongly leans ${n}.`;
  if (w === "clearly present") return `${name} is clearly present across your selection.`;
  if (w === "present") return `${name} runs through part of your selection.`;
  return `A trace of ${n} appears in your selection.`;
}

/** Starts "What connects these?" from an artist, or says what to do next. */
function ConnectEntry({ id, name }: { id: string; name: string }) {
  const mode = useSonora((s) => s.mode);
  const picking = useSonora((s) => s.connect?.from === id && !s.connect?.to);
  const count = useSonora((s) => s.data?.artists.length ?? 0);
  const startConnect = useSonora((s) => s.startConnect);
  if (mode !== "universe" || count < 2) return null;
  if (picking) return <p className="mt-8 text-[13px] text-text-2">Choose another artist on the map.</p>;
  return (
    <button
      type="button"
      onClick={() => startConnect(id)}
      className="mt-8 cursor-pointer border-b border-line pb-0.5 text-[13px] text-text-2 transition-colors duration-300 hover:border-line-strong hover:text-text"
    >
      What connects {name} to…
    </button>
  );
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
        <h2 className={`mt-3 ${headlineSize(data.summary.headline)} leading-[1.2] font-semibold tracking-[-0.015em] text-text`}>
          {data.summary.headline}
        </h2>
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
        <h2 className="mt-3 text-[36px] leading-[1.05] font-semibold tracking-[-0.02em] text-text">{artist.name}</h2>
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
            <p className="text-[14px] text-text">
              <Ref id={rels[0].other.id}>{rels[0].other.name}</Ref>
            </p>
            {rels[0].reason && <p className="mt-1 text-[13.5px] leading-[1.55] text-text-2">{rels[0].reason}</p>}
            {rels.length > 1 && (
              <p className="mt-3 text-[13px] text-text-2">
                <span className="mr-2 text-text-3">Also near</span>
                {joinRefs(rels.slice(1).map((r) => r.other))}
              </p>
            )}
          </Section>
        )}
        <ConnectEntry id={artist.id} name={artist.name} />
      </>
    );
  }

  const genre = data.genres.find((g) => g.id === id);
  if (genre) {
    const members = data.artists.filter((a) => a.genres.includes(id));
    return (
      <>
        <Caption>
          Genre{members.length > 0 && ` · ${members.length} of your artists`}
        </Caption>
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
        {bridges.length > 0 && (
          <Section label="Reached from your universe">
            <p className="text-[14px] text-text-2">{joinRefs(bridges)}</p>
          </Section>
        )}
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
      </>
    );
  }
  return null;
}

/** A found connection, read top to bottom along the path. */
function ConnectionBody({ data }: { data: UniverseData }) {
  const connect = useSonora((s) => s.connect);
  if (!connect?.ids || !connect.hops) return null;
  const lookup = (id: string) =>
    data.artists.find((x) => x.id === id) ?? data.genres.find((x) => x.id === id) ?? data.traits.find((x) => x.id === id);
  return (
    <>
      <Caption>What connects these?</Caption>
      <ol className="mt-4">
        {connect.ids.map((id, i) => {
          const node = lookup(id);
          if (!node) return null;
          const isArtist = id.startsWith("a:");
          const hop = i > 0 ? connect.hops![i - 1] : null;
          return (
            <li key={id}>
              {hop && (
                <div className="ml-[3px] border-l border-line py-2.5 pl-4 text-[13px] leading-[1.55] text-text-2">
                  {hop.reason || <span className="block h-2" />}
                </div>
              )}
              {isArtist ? (
                <p className="text-[22px] leading-[1.15] font-semibold tracking-[-0.015em] text-text">
                  <Ref id={id}>{node.name}</Ref>
                </p>
              ) : (
                <p className="text-[15px] text-text-2">
                  <Ref id={id}>{node.name}</Ref>
                  <span className="ml-2 text-[12px] text-text-3">shared {id.startsWith("g:") ? "genre" : "quality"}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

/**
 * Editorial metadata attached to the selected object in the universe. The label
 * projector keeps it beside its body on screen, clamped inside the viewport, and
 * draws a hairline leader between the two.
 */
export function Annotation() {
  const selectedId = useSonora((s) => s.selectedId);
  const connectTo = useSonora((s) => s.connect?.to);
  const data = useSonora((s) => s.data);
  const select = useSonora((s) => s.select);
  const id = selectedId ?? connectTo ?? null;

  return (
    <>
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden>
        <line
          ref={(el) => {
            annotation.leader = el;
          }}
          stroke="rgba(245,247,250,0.24)"
          strokeWidth={1}
          style={{ opacity: 0, transition: "opacity 0.6s cubic-bezier(0.33, 1, 0.68, 1)" }}
        />
      </svg>
      <div
        ref={(el) => {
          annotation.el = el;
        }}
        className="absolute top-0 left-0 z-20 w-[320px]"
      >
        <AnimatePresence mode="wait">
          {id && data && (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE, delay: 0.45 } }}
              exit={{ opacity: 0, transition: { duration: 0.3, ease: EASE } }}
              // A feathered patch of darkness, not a panel: lines passing behind the text recede.
              className="relative max-h-[calc(100vh-240px)] overflow-y-auto bg-[rgba(5,6,10,0.72)] pr-1 shadow-[0_0_56px_40px_rgba(5,6,10,0.72)]"
            >
              <button
                type="button"
                onClick={() => select(null)}
                aria-label="Close"
                className="absolute top-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center border border-line text-[14px] text-text-3 transition-colors duration-300 hover:border-line-strong hover:text-text"
              >
                ×
              </button>
              <div className="pr-10">{selectedId ? <PanelBody id={selectedId} data={data} /> : <ConnectionBody data={data} />}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
  const selectedId = useSonora((s) => s.selectedId);
  const show = phase === "ready" && data && mode !== "universe";
  // In DNA, hovering an artist on the orbit shows the traits it carries.
  const focusId = hoveredId ?? selectedId;
  const focusArtist = focusId?.startsWith("a:") ? data?.artists.find((a) => a.id === focusId) : undefined;
  const hoveredTrait = hoveredId?.startsWith("t:") ? hoveredId : null;

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
          className="absolute top-28 bottom-32 left-10 z-20 flex w-[360px] flex-col"
        >
          {mode === "dna" ? (
            <>
              <Caption>Music DNA</Caption>
              <h2 className={`mt-3 shrink-0 ${headlineSize(data.summary.headline)} leading-[1.18] font-semibold tracking-[-0.015em] text-text`}>
                {data.summary.headline}
              </h2>
              <p className="mt-4 line-clamp-3 shrink-0 text-[14px] leading-[1.65] text-text-2">{data.summary.description}</p>

              <div className="mt-6 shrink-0">
                <Caption>Your sound</Caption>
                <p className="mt-2 text-[15px] text-text">
                  {data.traits
                    .slice(0, 3)
                    .map((t) => t.name)
                    .join("  ·  ")}
                </p>
              </div>

              <div className="mt-7 shrink-0">
                <Caption>{focusArtist ? `${focusArtist.name} contributes to` : "Recurring qualities"}</Caption>
              </div>
              <ul className="mt-3 min-h-0 space-y-1.5 overflow-y-auto pr-1">
                {data.traits.map((t) => {
                  const lit = hoveredId === t.id || selectedId === t.id || !!focusArtist?.traits.includes(t.id);
                  const quiet = (!!focusArtist || !!hoveredTrait) && !lit;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onMouseEnter={() => hover(t.id)}
                        onMouseLeave={() => hover(null)}
                        onClick={() => select(t.id)}
                        className={`flex w-full cursor-pointer items-baseline justify-between text-left text-[14px] transition-colors duration-300 ${lit ? "text-text" : quiet ? "text-text-3" : "text-text-2"}`}
                      >
                        <span>{t.name}</span>
                        <span className={`text-[12px] ${lit ? "text-text-2" : "text-text-3"}`}>{strengthWord(t.strength)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 shrink-0 text-[12px] leading-[1.6] text-text-3">
                Hover an artist on the outer orbit to see what it brings. Observations about the music you chose, not
                measurements of you.
              </p>
            </>
          ) : (
            <>
              <p className="caption text-magenta/80">Uncharted</p>
              <h2 className="mt-3 text-[28px] leading-[1.2] font-semibold tracking-[-0.015em] text-text">
                {countWord(data.discovery.length)} {data.discovery.length === 1 ? "territory sits" : "territories sit"} just outside your
                current orbit.
              </h2>
              <p className="mt-4 text-[14px] leading-[1.65] text-text-2">
                Each is reached from somewhere you already know. Choose one to travel there.
              </p>
              <ul className="mt-8 min-h-0 space-y-2.5 overflow-y-auto pr-1">
                {data.discovery.map((d) => {
                  const lit = hoveredId === d.id || selectedId === d.id;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onMouseEnter={() => hover(d.id)}
                        onMouseLeave={() => hover(null)}
                        onClick={() => select(d.id)}
                        className={`flex w-full cursor-pointer items-baseline justify-between text-left text-[13px] font-medium tracking-[0.14em] uppercase transition-colors duration-300 ${lit ? "text-text" : "text-text-2"}`}
                      >
                        <span>{d.name}</span>
                        <span className="text-[11px] font-normal tracking-[0.04em] text-text-3 normal-case">{d.kind}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
