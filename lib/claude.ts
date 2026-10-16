import "server-only";

// Compatibility re-export: SONORA now uses Groq (llama-3.3-70b-versatile) for high-speed analysis.
export { generateExpansion, generateUniverse } from "./groq";
