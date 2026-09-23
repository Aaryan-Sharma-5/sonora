---
name: creative-frontend-design
description: >-
  Use this skill to guide the frontend UI, visual aesthetics, layout, and interaction design of the music installation app. It enforces a cinematic, premium editorial aesthetic and prohibits generic UI dashboard patterns.
---

# Creative Frontend & Visual Design

You are building an interactive music installation that happens to be a web app. The goal is to avoid creating a technically impressive 3D graph that looks like a developer demo or a generic SaaS dashboard.

## Core Directives

### DO (Enforce these Aesthetics)
- **Cinematic Composition:** Treat the screen like a camera frame. Use deep atmospheric depth.
- **Restrained UI:** Keep UI elements minimal and out of the way of the primary 3D/music experience.
- **Editorial Music Aesthetic:** Think modern, high-end music magazines or premium artist portfolio sites.
- **Subtle Glow & Lighting:** Use lighting to create spatial depth rather than flat, bright colors.
- **Spatial Hierarchy:** Clearly define foreground (UI) and background (3D universe/nodes).
- **Intentional Negative Space:** Let the layout breathe; don't pack the screen with information.
- **Smooth Camera Choreography:** Transitions between states/nodes should feel deliberate and smooth (using Framer Motion or R3F camera controls).
- **Beautiful Typography:** Use refined, modern typefaces. Establish a clear typographic scale.
- **Premium Dark Interface:** Default to a deep, rich dark mode for an immersive feel.

### DO NOT (Avoid these Patterns)
- **NO Generic SaaS Dashboard:** No left-rail nav, no top-bar heavy layouts, no standard admin panels.
- **NO Card Grids Everywhere:** Avoid putting everything in boxed cards.
- **NO Excessive Rounded Rectangles / Pill-shaped UI:** Keep borders and shapes intentional, not just default web styling.
- **NO Giant Gradients or Rainbow Neon:** Avoid "gamer" or "web3" neon aesthetics. Use restraint.
- **NO Generic AI Sparkle Effects:** Avoid cheap generative UI tropes.
- **NO Excessive Glassmorphism:** Use blurs sparingly for functional hierarchy, not everywhere.
- **NO Monospace "TECH" Labels:** Do not make it look like a developer tool or IDE.
- **NO Unnecessary Sidebar Navigation:** Only show navigation when absolutely necessary for the experience.
- **NO Conventional Graph-editor Appearance:** The network of artists/music should look like a universe, not a node-based programming tool.
- **NO Excessive Data Visualization Chrome:** Avoid axis lines, legends, and typical chart elements.

## Tech Stack Context
When implementing these designs, you will likely rely on:
- **Next.js, React, TypeScript** for component architecture and routing.
- **Tailwind CSS** (if used, apply very custom theme values to avoid default looks).
- **Framer Motion** for micro-interactions, transitions, and easing.
- **Three.js / React Three Fiber / @react-three/drei** for the 3D music universe.

## Implementation Workflow
1. **Focus on the 3D Canvas:** Let the `Three.js` canvas be the hero.
2. **Layer UI on top:** Use absolute positioning to float necessary UI elements (like playback controls or artist info) gracefully over the 3D scene.
3. **Animate State Changes:** Use Framer Motion or R3F to smoothly interpolate between views (e.g., zooming from a galaxy view to a specific artist node).
