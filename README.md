# SONORA

Your taste, mapped. Enter the artists you love and SONORA turns the relationships
between them into a universe you can explore: artists as stars, genres as regions,
recurring musical traits around a central YOU, and uncharted territory at the edge.

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY (and ANTHROPIC_WORKSPACE_ID if your key needs one)
npm run dev
```

Open http://localhost:3000.

- Without a key, or if Claude fails twice, SONORA opens the reference universe
  (Radiohead, Pink Floyd, Tame Impala, Arctic Monkeys, The Strokes). Adding Daft Punk
  to it works offline too.
- `http://localhost:3000/?offline` forces the reference universe, a safety switch for live demos.
- Repeated requests for the same artist list are served from memory, so a rehearsed
  demo list is instant the second time.

## How it fits together

- `app/api/universe`, `app/api/expand`: server-only Claude calls (`lib/claude.ts`) with
  structured output, one stricter retry, then the reference universe. The key never
  reaches the browser.
- `lib/universe.ts`: the data contract and the tolerant normalizer. Missing or
  malformed fields are dropped or defaulted, never rendered as errors.
- `lib/layout.ts`: deterministic layout. The same universe always produces the same sky.
- `lib/choreo.ts` and `lib/motion.ts`: one motion language. Every animated value is an
  easeOutCubic tween, and every transition runs focus, camera move, scale/opacity,
  emergence, settle.
- `components/scene`: the React Three Fiber scene. At most 40 semantic nodes and
  under 1,200 particles, all per-frame work in refs rather than React state.
