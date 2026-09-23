# SONORA — TIGHTENED VISUAL & ENGINEERING SPECIFICATION

This document supplements and overrides the corresponding sections of the main Sonora specification where they conflict.

The goal is not to maximize feature count.

The goal is to maximize the quality of the **core visual experience** within a 3-hour implementation window.

---

# 1. HARD SCOPE RULE

The project is a desktop-first interactive visual experience.

Do not expand scope unless the core universe experience is already excellent.

Prioritize:

1. Universe
2. Interaction
3. Claude analysis
4. Music DNA
5. Discovery
6. Polish

If time becomes limited, remove features from the bottom.

Never sacrifice the quality of the universe to implement another feature.

---

# 2. HARD PERFORMANCE CAPS

The visual system must have explicit limits.

## Semantic nodes

Never render more than:

**40 total rendered semantic nodes**

This includes:

* artist stars
* genre objects
* trait objects
* discovery objects
* special nodes

The user's central `YOU` node counts toward this limit.

Claude may return more information internally, but the frontend must intelligently select the most important objects to render.

Recommended maximum:

```text
YOU                 1
Artists             8–10
Genres              5–7
Traits              6–8
Discovery           5
────────────────────────
Total               ≤ 40
```

Do not render every piece of returned metadata.

---

## Particles

Maximum:

**1200 particles**

Prefer:

* instanced particles
* CSS/SVG effects where sufficient
* lightweight shaders
* static background stars with subtle movement

Do not create thousands of individual React components.

Do not use expensive per-particle React state updates.

---

## Animation

Avoid continuous expensive animation loops where possible.

Prefer:

* GPU-friendly transforms
* CSS transforms
* opacity
* scale
* camera movement
* instanced rendering

The application must remain smooth on a normal modern laptop.

---

# 3. THE CENTRAL "YOU" NODE

The `YOU` node is the visual center of the entire universe.

It is NOT an artist.

It represents the aggregate musical landscape inferred from the user's selected artists.

Conceptually:

```text
                         ARTIST
                            \
                             \
                       GENRE ── ✦
                               \
                                \
                     TRAIT ──── ◉ YOU
                                /
                               /
                         ARTIST
```

The `YOU` node should have:

* the strongest visual presence
* a subtle gravitational halo
* a slow pulse
* surrounding particles
* connections to major recurring characteristics
* connections to major musical regions

It should feel like the center of gravity of the universe.

Do NOT make it look like a normal UI avatar.

It should be a celestial object.

---

# 4. HOW THE UNIVERSE IS COMPUTED

The frontend should derive a stable visual representation from Claude's structured output.

Use a deterministic layout.

Do not randomly rearrange the universe every render.

Given the same input, the universe should have approximately the same structure.

Suggested hierarchy:

```text
YOU
│
├── Major musical characteristics
│
├── Major genres
│
└── Selected artists
      │
      ├── relationships
      └── associated genres
```

Relationship strength should influence visual distance and connection prominence.

Stronger relationship:

```text
shorter distance
brighter connection
```

Weaker relationship:

```text
greater distance
subtler connection
```

The exact algorithm can be simple.

Visual consistency is more important than mathematical sophistication.

---

# 5. ONE CANONICAL ANIMATION LANGUAGE

Do NOT create a different animation system for every feature.

Use a single visual language throughout the product.

## Canonical transition

Every major transition should follow approximately:

```text
FOCUS
 ↓
CAMERA MOVE
 ↓
SCALE / OPACITY CHANGE
 ↓
OBJECT EMERGENCE
 ↓
SETTLE
```

Use consistent easing.

For example:

```text
easeOutCubic
```

or another single carefully selected easing curve.

---

## Universe creation

Use:

```text
empty space
     ↓
YOU emerges
     ↓
major traits appear
     ↓
genres appear
     ↓
artists materialize
     ↓
connections draw themselves
     ↓
universe settles
```

---

## Artist selection

Use:

```text
camera focus
+
selected node scales slightly
+
connected nodes brighten
+
unrelated nodes dim
```

Do not invent another animation system.

---

## DNA transition

Reuse the same primitives:

```text
camera movement
+
node movement
+
opacity
+
scale
```

The existing universe should transform into the DNA composition.

Do not rebuild the scene with a completely different rendering architecture.

---

## Discovery

New discoveries should emerge from the existing universe using the same:

```text
particle emergence
+
scale
+
opacity
```

pattern.

Consistency is more important than animation complexity.

---

# 6. VISUAL DIRECTION

The design must feel:

**premium + atmospheric + editorial + astronomical + interactive**

It should NOT feel like a conventional SaaS product.

Think:

> an interactive music installation that happens to be a web application.

---

# 7. VISUAL REFERENCES

Use the following as conceptual references.

Do NOT copy their interfaces.

## Reference 1 — Linear

Reference qualities:

* disciplined dark UI
* excellent typography
* restrained color
* subtle borders
* precise spacing
* extremely low visual noise

Use this as the reference for **UI chrome**.

---

## Reference 2 — Apple Music

Reference qualities:

* music-first presentation
* large editorial typography
* strong imagery/visual identity
* immersive content
* minimal unnecessary interface

Use this as the reference for **music presentation**.

---

## Reference 3 — Astronomy / Planetarium Interfaces

Reference qualities:

* depth
* spatial relationships
* celestial objects
* subtle motion
* exploration
* scale
* information revealed through interaction

Use this as the reference for **the universe itself**.

The final product should combine:

```text
Linear
UI discipline

+

Apple Music
editorial music aesthetic

+

Astronomy visualization
spatial exploration
```

Do not literally reproduce any of these products.

---

# 8. COLOR SYSTEM

Use a restrained dark palette.

Suggested base:

```text
Background:
#05060A

Secondary background:
#090B12

Primary text:
#F5F7FA

Secondary text:
#9298A8

Muted text:
#5E6472

Primary celestial blue:
#7AA7FF

Secondary violet:
#A78BFA

Soft magenta:
#E879F9

Glow:
Use low-opacity versions of the celestial colors.
```

Do not use every accent color simultaneously.

Most of the universe should remain dark and restrained.

Color should primarily identify:

* selection
* relationships
* discovery
* hierarchy

Avoid huge colorful gradients behind text.

---

## 9. ANTI-VIBE-CODED DESIGN RULES

SONORA must NOT look like a generic AI-generated SaaS landing page.

The visual language should feel intentional, editorial, atmospheric, and product-specific. Avoid recognizable "vibecoded" design patterns unless there is a strong functional reason to use one.

### Typography & Copy

AVOID:
- Defaulting to trendy font combinations simply because they are popular:
  - Inter + Instrument Serif
  - Geist + serif italics
  - Space Grotesk + serif
  - Similar fashionable pairings
- Serif italic accent words used purely for decoration.
- Em dashes used repeatedly throughout copy.
- Emojis in headings, navigation, labels, or major UI elements.
- "It's not X, it's Y" style marketing headlines.
- Generic AI/SaaS buzzwords such as:
  - "Unlock"
  - "Supercharge"
  - "Reimagine"
  - "Revolutionize"
  - "Powered by AI"
  - "Next-generation"
  - "Seamless"
  - "Intelligent insights"
  - "Your journey"
- Marketing copy that could describe any AI product.

PREFER:
- Short, specific, observational copy.
- Language grounded in music, sound, relationships, space, and discovery.
- Typography chosen for readability and atmosphere rather than trendiness.
- Let the visual system communicate sophistication instead of decorative typography.

Example:
BAD:
"Unlock the future of your musical identity."

GOOD:
"YOUR TASTE, MAPPED."

The copy should sound like SONORA, not like an AI startup template.

---

### UI Layout & Components

AVOID:
- Three feature cards arranged in a row.
- Generic bento grids.
- Badge → headline → subheadline → CTA hero structures.
- Colored stripes or left-border cards used as decoration.
- Untouched shadcn/ui components.
- Generic shadcn dashboards.
- Terminal-window graphics.
- Excessive rounded cards.
- Soft corner radius applied to every element.
- Checkmark bullet lists.
- Three-column pricing-style layouts.
- Arbitrary card collections.
- Inconsistent spacing or component density.

DO NOT introduce cards merely because information exists.

SONORA's primary interface is a spatial universe, not a collection of UI cards.

Prefer:
- Large uninterrupted spatial areas.
- Floating contextual information.
- Small editorial metadata.
- Precise alignment.
- Clear hierarchy.
- Asymmetric composition where appropriate.
- UI that appears only when it helps the user understand or navigate the universe.

If a component does not improve the user's understanding or interaction with the music universe, question whether it needs to exist.

---

### Colors, Backgrounds & Textures

AVOID:
- Harsh gradients.
- Purple-to-blue gradient backgrounds.
- Gradient hero text.
- Generic glassmorphism.
- "Liquid glass" surfaces.
- Grain textures layered over gradients.
- Low-contrast dark mode where text and controls become difficult to read.
- Pure white backgrounds.
- Generic purple + black AI aesthetic.
- Rainbow color systems.
- Neon colors used indiscriminately.
- Generic pastel palettes.
- Radial gradient orbs used as decoration.
- Dot-grid backgrounds.
- Background effects that exist only to make the page look "AI".

SONORA should use darkness as spatial depth, not as an excuse for low contrast.

Use the established palette:

- Background: `#05060A`
- Secondary background: `#090B12`
- Primary text: `#F5F7FA`
- Secondary text: `#9298A8`
- Muted text: `#5E6472`
- Celestial blue: `#7AA7FF`
- Violet: `#A78BFA`
- Magenta: `#E879F9`

These colors should be used selectively.

Do not turn every element purple, blue, or magenta.

Color should communicate:
- hierarchy
- relationship
- selection
- musical characteristics
- spatial depth

It should not exist merely as decoration.

---

### Icons & Graphics

AVOID:
- Lucide icons everywhere.
- Icons added to every button or label.
- Sparkle icons.
- Generic AI sparkle/star symbols.
- Decorative icon boxes.
- Drop shadows on everything.
- Generic illustrations that do not relate to the universe.

Use icons only when they communicate a real interaction or state.

SONORA's primary visual vocabulary should come from:
- stars
- celestial bodies
- orbital relationships
- particles
- spatial depth
- connection lines
- light
- typography

The universe itself is the graphic system.

---

### Motion & Interaction

AVOID:
- Hover animations on every element.
- Buttons that fade/scale simply because they can.
- Fade-in-on-scroll effects.
- Cursor-following beams.
- Animated arrows.
- Constant floating/bobbing animations.
- Decorative particle motion without purpose.
- Excessive spring animations.
- Motion used to compensate for weak visual design.
- Generic AI loading animations.
- Skeleton loaders for experiences that do not require them.

SONORA should have a restrained, cinematic motion language.

Use the canonical transition:

FOCUS
→ CAMERA MOVE
→ SCALE / OPACITY
→ OBJECT EMERGENCE
→ SETTLE

Reuse this language across:
- Universe creation
- Artist selection
- Artist focus
- Music DNA
- Discovery
- Adding an artist

Do not invent a separate animation style for every interaction.

Motion should communicate:
- spatial movement
- relationship
- discovery
- transformation
- hierarchy

If removing an animation makes the interface clearer, remove it.

---

### Component Philosophy

Do not build the interface by asking:

"What UI component should go here?"

Instead ask:

"What does the user need to understand or do here?"

Then choose the smallest visual mechanism that communicates it.

Prefer:
- spatial relationships over cards
- direct manipulation over dashboards
- contextual panels over permanent panels
- typography over badges
- atmosphere over decoration
- meaningful motion over hover effects
- visual hierarchy over component quantity

A sophisticated interface may contain fewer components.

---

### Explicit Design Bans

Unless required for functionality, DO NOT introduce:

- Bento grids
- Three-card feature sections
- Pricing-style three-column layouts
- Badge-over-headline hero sections
- Gradient hero text
- Purple/blue gradient backgrounds
- Glassmorphism
- Liquid glass
- Grain overlays
- Dot grids
- Radial decorative orbs
- Neon color systems
- Rainbow gradients
- Pastel UI systems
- Generic AI sparkle icons
- Lucide icons everywhere
- Terminal mockups
- Excessive rounded cards
- Colored left borders
- Checkmark feature lists
- Cursor-following effects
- Scroll-triggered fade-ins
- Animated arrows
- Decorative hover animations
- Generic "AI-powered" marketing copy
- Emoji headings
- Repeated em dashes
- Serif italic decoration
- Generic SaaS dashboard layouts
- Generic shadcn styling without modification

These are not absolute prohibitions when a specific interaction genuinely requires one. The default is **do not use them**.

### Core Rule

SONORA should look like a **purpose-built interactive music installation**, not an AI SaaS template.

When choosing between:

1. A familiar UI pattern that is easy to implement
2. A simpler, more spatial, product-specific solution

Choose the second when it improves the experience.

The goal is not to make SONORA look "fancy."

The goal is to make someone see it and immediately understand:

**"This could only be SONORA."**

---

# 10. TYPOGRAPHY

Use a modern sans-serif.

Preferred:

```text
Inter
```

or another excellent contemporary sans-serif already available in the project.

Typography hierarchy should be strong.

Large:

```text
SONORA
```

Small:

```text
YOUR TASTE, MAPPED.
```

Universe labels should remain clean and unobtrusive.

Do not use decorative monospace typography for random labels.

Do not italicize random words merely to create "design."

Do not use excessive uppercase micro-labels.

---

# 11. UI CHROME

The actual UI controls should remain minimal.

Examples:

```text
SONORA

[ ANALYZE MY DNA ]
[ EXPLORE THE UNKNOWN ]
```

Use buttons with:

* subtle borders
* restrained glow on hover
* clean typography
* clear hierarchy

Avoid pill-shaped UI everywhere.

Not every control needs a rounded container.

The universe itself should occupy most of the screen.

---

# 12. UNIVERSE COMPOSITION

The initial universe should feel spatial rather than like a graph editor.

Avoid:

```text
node
 ├── node
 ├── node
 └── node
```

looking like a developer visualization.

Instead create:

```text
                         ✦
                  ✧             ✦


             ✦          ◉          ✧
                        YOU


       ✦                             ✦


                    ✧       ✦
```

with meaningful connections and hierarchy.

Use depth and scale to create visual interest.

---

# 13. DEPTH

The universe should have at least three conceptual depth layers:

### Background

Very distant stars and subtle nebula-like texture.

### Midground

Genres, traits and relationships.

### Foreground

Selected artists and the `YOU` node.

Do not overdo blur or bloom.

Depth should remain readable.

---

# 14. CONNECTIONS

Connections should be visually subtle.

Do not draw thick lines everywhere.

Suggested:

```text
strong relationship
→ slightly brighter/thicker

weak relationship
→ faint/thinner

unselected relationship
→ very subtle
```

When an artist is selected:

```text
selected connections
→ brighten

unrelated connections
→ fade
```

This creates the feeling that the universe is responding to the user's attention.

---

# 15. ARTIST SELECTION

When the user hovers over an artist:

```text
node enlarges slightly
glow increases
name becomes clearer
related nodes brighten
unrelated nodes dim
```

When clicked:

```text
camera smoothly moves toward artist
```

A small information panel appears.

The panel should not cover the universe.

Example:

```text
RADIOHEAD

Alternative Rock
Art Rock

Atmospheric
Experimental
Introspective

WHY IT CONNECTS

Your selected artists share strong
overlap around atmospheric production
and experimental arrangements.
```

---

# 16. MUSIC DNA VISUALIZATION

The DNA screen should NOT simply become:

```text
Trait     █████████
Trait     ███████
Trait     ██████████
```

That is too generic.

Prefer a radial or orbital composition.

Example conceptual structure:

```text
                    ATMOSPHERIC
                         ✦
                         |
                         |
       EXPERIMENTAL ✦ — ◉ — ✦ INTROSPECTIVE
                         |
                         |
                    PSYCHEDELIC
```

The visual can become more sophisticated if time permits.

However, prioritize clarity over complexity.

The DNA visualization should clearly communicate:

> These are recurring characteristics across your selected music.

---

# 17. DISCOVERY VISUALIZATION

Discovery should feel like finding unexplored space.

Existing universe:

```text
         ● ● ●
      ●    YOU    ●
         ● ● ●
```

Unexplored region:

```text
                         ·
                    ·
               ✧
                    ?
```

When the user selects:

```text
EXPLORE THE UNKNOWN
```

new objects should emerge from the distant region.

Example:

```text
SHOEGAZE
POST-ROCK
DREAM POP
KRAUTROCK
```

They should feel like destinations rather than list items.

---

# 18. "WHAT HAPPENS IF I ADD..."

This interaction should reuse the same universe.

Example:

```text
Current universe

        ✦
     ✦     ✦
       ◉
     ✦     ✦
```

User adds:

```text
Daft Punk
```

The universe changes.

New connections appear.

Existing objects subtly reposition.

The system explains the new territory.

Do NOT destroy and recreate the entire scene abruptly.

Make it feel like the universe is expanding.

---

# 19. CLAUDE FAILURE HANDLING

The application must never fail visibly because Claude returns malformed JSON.

Implement:

```text
Claude request
      ↓
JSON parse
      ↓
VALID?
 ┌────┴────┐
YES       NO
 │         │
render    retry once
           │
         valid?
       ┌────┴────┐
      YES       NO
       │         │
    render    cached demo
```

If the first response cannot be parsed:

Retry once with a stricter request.

If the second attempt fails:

Use the deterministic cached demo universe.

The user should still see a complete experience.

Do not display raw JSON errors.

Do not display stack traces.

Do not make the user understand API failures.

---

# 20. ARTIST UNCERTAINTY

If Claude is uncertain about an artist:

Do not fabricate detailed facts.

Use conservative categorization.

The frontend should tolerate:

* missing genre
* missing relationship
* missing trait
* unknown artist

The universe must still render.

A missing piece of metadata must never crash the experience.

---

# 21. CACHED DEMO UNIVERSE

Maintain a deterministic fallback dataset based on:

```text
Radiohead
Pink Floyd
Tame Impala
Arctic Monkeys
The Strokes
Daft Punk
```

This dataset should be sufficient to demonstrate:

* artist nodes
* genres
* relationships
* DNA
* discovery
* adding an artist

The application should be capable of launching into the demo universe even if the API is unavailable.

---

# 22. NO MOBILE WORK FOR MVP

Desktop only.

Do not spend implementation time on:

* mobile navigation
* mobile-specific universe layouts
* mobile gestures
* touch optimization
* responsive 3D choreography

The landing page may naturally resize, but no dedicated mobile experience is required.

The core desktop experience is the product.

---

# 24. NO GENERIC AI LOADING SCREEN

Never display:

```text
Loading...
```

Use the product language:

```text
MAPPING YOUR SOUND...
```

then:

```text
TRACING CONNECTIONS...
```

then:

```text
BUILDING CONSTELLATIONS...
```

then:

```text
YOUR UNIVERSE IS READY.
```

These messages should accompany the actual visual construction.

---

# 25. NO FEATURE THEATRE

Do not add a feature simply because it sounds impressive.

Every interaction should strengthen the core metaphor:

> **music → relationships → universe**

If an interaction does not strengthen this metaphor, remove it.

---

# 26. DEMO EXPERIENCE

The default demo should be optimized around:

```text
Radiohead
Pink Floyd
Tame Impala
Arctic Monkeys
The Strokes
Daft Punk
```

Ideal demonstration:

### Step 1

Landing page.

User sees:

> YOUR TASTE, MAPPED.

### Step 2

Artists appear in the input.

### Step 3

Click:

> CREATE MY UNIVERSE

### Step 4

Universe materializes.

### Step 5

Hover Radiohead.

Connected artists react.

### Step 6

Click Radiohead.

Camera moves closer.

Explanation appears.

### Step 7

Click:

> ANALYZE MY DNA

Universe transforms.

### Step 8

Click:

> EXPLORE THE UNKNOWN

New musical territories appear.

### Step 9

Add:

> Daft Punk

Universe expands.

This entire sequence should feel like one coherent experience.

---

# 25. DEFINITION OF VISUAL DONE

The project is not visually done merely because the components work.

It is visually done when:

* the landing page immediately communicates the concept
* the universe fills the screen
* the `YOU` node feels like the center of gravity
* artist nodes feel like celestial objects
* relationships are visually understandable
* hover interactions feel responsive
* camera movement feels smooth
* DNA feels like a transformation of the universe
* discovery feels like entering unexplored space
* typography is restrained and premium
* there is no generic AI-dashboard aesthetic
* the interface looks good in a screenshot
* the product feels worth showing to another person

---

# 26. FINAL QUALITY CHECK

Before declaring completion, inspect the actual application rather than relying only on code correctness.

Ask:

### Visual

Does this look like something someone would voluntarily explore?

### Interaction

Does every click produce a meaningful visual response?

### Hierarchy

Can I immediately tell what is important?

### Restraint

Are there too many colors, labels, lines or particles?

### Performance

Is the universe smooth?

### AI

Does Claude meaningfully drive the experience?

### Product

Would someone want to enter their own music?

### Shareability

Would someone screenshot this?

If the answer to any of these is no, improve the core experience before adding anything else.

---

# 27. FINAL IMPLEMENTATION PRINCIPLE

Do not optimize for:

> "How many features can I ship?"

Optimize for:

> **"How magical can the first 60 seconds feel?"**

The product should leave the user thinking:

> **"I want to see what my friend's universe looks like."**

That is the success criterion.
