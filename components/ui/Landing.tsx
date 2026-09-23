"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { DEMO_ARTISTS } from "@/lib/demo";
import { EASE } from "@/lib/motion";
import { slug } from "@/lib/universe";
import { useSonora } from "@/lib/store";

const MIN = 3;
const MAX = 10;

export default function Landing() {
  const create = useSonora((s) => s.create);
  const [artists, setArtists] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const commit = (value: string) => {
    const name = value.trim().replace(/,+$/, "");
    if (!name) return;
    setArtists((list) =>
      list.length >= MAX || list.some((a) => slug(a) === slug(name)) ? list : [...list, name],
    );
    setDraft("");
  };

  const typeDemo = async () => {
    if (typing) return;
    setTyping(true);
    setArtists([]);
    for (const name of DEMO_ARTISTS) {
      for (let i = 1; i <= name.length; i++) {
        setDraft(name.slice(0, i));
        await new Promise((r) => setTimeout(r, 38));
      }
      await new Promise((r) => setTimeout(r, 160));
      setArtists((list) => [...list, name]);
      setDraft("");
    }
    setTyping(false);
    input.current?.focus();
  };

  const pending = draft.trim() && !artists.some((a) => slug(a) === slug(draft)) ? 1 : 0;
  const count = artists.length + pending;
  const ready = count >= MIN && !typing;

  const submit = () => {
    if (!ready) return;
    const list = pending ? [...artists, draft.trim()] : artists;
    create(list.slice(0, MAX));
  };

  return (
    <motion.section
      className="absolute inset-y-0 left-0 z-10 flex w-full max-w-[640px] flex-col justify-center pl-[clamp(40px,8vw,128px)] pr-10"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 1.4, ease: EASE, delay: 0.3 } }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.9, ease: EASE } }}
    >
      <h1 className="text-[clamp(64px,8.4vw,124px)] leading-[0.9] font-semibold tracking-[0.14em] text-text">SONORA</h1>
      <p className="caption mt-6 !tracking-[0.34em] text-text-2">Your taste, mapped.</p>

      <p className="mt-14 max-w-[420px] text-[15px] leading-[1.6] text-text-2">
        Name the artists you love. SONORA traces what connects them and turns it into a sky you can explore.
      </p>

      <div className="mt-10 max-w-[460px]">
        {artists.length > 0 && (
          <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
            {artists.map((a) => (
              <li key={a} className="group flex items-baseline gap-2 text-[15px] text-text">
                <span>{a}</span>
                <button
                  type="button"
                  aria-label={`Remove ${a}`}
                  onClick={() => setArtists((list) => list.filter((x) => x !== a))}
                  className="cursor-pointer text-[13px] text-text-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 hover:text-text"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center border-b border-line focus-within:border-[rgba(122,167,255,0.55)] transition-colors duration-300">
          <input
            ref={input}
            value={draft}
            disabled={typing || artists.length >= MAX}
            onChange={(e) => {
              const v = e.target.value;
              if (v.endsWith(",")) commit(v);
              else setDraft(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (draft.trim()) commit(draft);
                else submit();
              }
              if (e.key === "Backspace" && !draft && artists.length) setArtists((l) => l.slice(0, -1));
            }}
            placeholder={artists.length >= MAX ? "That's ten. Ready when you are." : artists.length ? "Another artist" : "An artist you love"}
            className="h-12 w-full bg-transparent text-[17px] text-text placeholder:text-text-3 outline-none"
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
          <span className="shrink-0 pl-3 text-[12px] tabular-nums text-text-3">{count}/{MAX}</span>
        </div>
        <p className="mt-3 text-[12px] text-text-3">Between three and ten. Press Enter after each.</p>

        <div className="mt-9 flex flex-wrap items-center gap-6">
          <button type="button" className="control" disabled={!ready} onClick={submit}>
            Create my universe
          </button>
          {artists.length === 0 && !typing && (
            <button
              type="button"
              onClick={typeDemo}
              className="cursor-pointer text-[13px] text-text-3 transition-colors duration-300 hover:text-text-2"
            >
              Or start with A.R. Rahman, Kishore Kumar, Lata Mangeshkar…
            </button>
          )}
        </div>
      </div>
    </motion.section>
  );
}
