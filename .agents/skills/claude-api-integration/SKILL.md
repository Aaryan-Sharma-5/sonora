---
name: claude-api-integration
description: >-
  Use this skill for generating structured musical universe data (artists, DNA, relationships) using the Anthropic API (Claude) with structured JSON generation.
---

# Claude API & Structured Outputs

This skill guides the process of converting artist or musical concepts into a structured musical universe for 3D visualization.

## Guidelines for AI Integration

1. **Structured JSON Generation:** Use Claude API to generate strict JSON schemas. Ensure you provide clear schemas in your prompts.
2. **Schema Validation:** Validate all responses (e.g., using Zod) before feeding them into the UI or 3D scene.
3. **Server-side API Routes:** Keep API keys secure by wrapping Claude API calls in Next.js server-side API routes (`app/api/...` or `pages/api/...`).
4. **Retry & Fallback Handling:** Implement robust retry logic for API timeouts or malformed JSON. Provide fallback data so the music universe doesn't break.
5. **Data Visualization Mapping:** Ensure the output JSON maps smoothly to the spatial visualizations (relationships, music DNA) required by the Three.js scene.
