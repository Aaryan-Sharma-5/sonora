// The deterministic reference universe. Used when Claude is unavailable, fails
// twice, or before a key is configured. Written in the same name-referenced
// shape Claude returns, so it goes through the exact same normalization.

import {
  mergeExpansion,
  normalizeUniverse,
  slug,
  type RawExpansion,
  type RawUniverse,
  type UniverseData,
} from "./universe";

export const DEMO_ARTISTS = ["A.R. Rahman", "Kishore Kumar", "Lata Mangeshkar", "Arijit Singh", "Shreya Ghoshal"];
export const DEMO_ADDITION = "Sonu Nigam";

const RAW: RawUniverse = {
  summary: {
    headline: "Your selected music leans melodic and deeply emotional.",
    description:
      "Across five artists and multiple generations of Indian cinema, the recurring thread is timeless vocal melody: songs built on classical foundations, emotional resonance, and genre-defying fusion.",
  },
  genres: [
    { name: "Bollywood Playback", weight: 0.86, description: "The definitive sound of Indian cinema, spanning decades of legendary vocal performances." },
    { name: "Indian Classical", weight: 0.72, description: "Rooted in ragas and precise vocal discipline, forming the foundation of many iconic melodies." },
    { name: "Sufi & Ghazal", weight: 0.65, description: "Poetry and spirituality woven into music, focusing on devotion and heartache." },
    { name: "Fusion", weight: 0.64, description: "The blending of traditional Indian instrumentation with global electronic and orchestral sounds." },
    { name: "Romantic Pop", weight: 0.55, description: "Modern, emotionally driven ballads that dominate contemporary soundtracks." },
  ],
  traits: [
    { name: "Melodic", strength: 0.86, observation: "Vocal melody is the absolute center of this universe. Every artist here is defined by their voice or compositions." },
    { name: "Emotional", strength: 0.8, observation: "A strong undercurrent of deep sentiment, from classical devotion to modern heartbreak." },
    { name: "Versatile", strength: 0.72, observation: "These artists effortlessly cross regional, linguistic, and genre boundaries." },
    { name: "Classical Roots", strength: 0.68, observation: "A clear foundation in classical Indian training that elevates their pop and cinematic work." },
    { name: "Atmospheric", strength: 0.62, observation: "Expansive, layered instrumentation, heavily driven by A.R. Rahman's production." },
  ],
  artists: [
    {
      name: "A.R. Rahman",
      genres: ["Fusion", "Bollywood Playback", "Sufi & Ghazal"],
      traits: ["Atmospheric", "Versatile", "Melodic"],
      why: "A.R. Rahman sits at the structural center. His atmospheric fusion links the classical discipline of Lata Mangeshkar with the modern emotional weight of Arijit Singh.",
      certainty: "known",
    },
    {
      name: "Kishore Kumar",
      genres: ["Bollywood Playback", "Romantic Pop"],
      traits: ["Versatile", "Emotional", "Melodic"],
      why: "The maverick of the golden era. Kishore Kumar's raw, untrained emotional delivery contrasts with classical rigidity, echoing into modern pop.",
      certainty: "known",
    },
    {
      name: "Lata Mangeshkar",
      genres: ["Bollywood Playback", "Indian Classical"],
      traits: ["Classical Roots", "Melodic", "Emotional"],
      why: "The oldest light in your universe. Her precise, classical foundation set the gold standard for every playback singer that followed, including Shreya Ghoshal.",
      certainty: "known",
    },
    {
      name: "Arijit Singh",
      genres: ["Romantic Pop", "Bollywood Playback", "Sufi & Ghazal"],
      traits: ["Emotional", "Melodic", "Versatile"],
      why: "Arijit Singh anchors the contemporary era of your map, carrying the torch of emotional playback singing into the modern age.",
      certainty: "known",
    },
    {
      name: "Shreya Ghoshal",
      genres: ["Bollywood Playback", "Indian Classical", "Romantic Pop"],
      traits: ["Classical Roots", "Melodic", "Versatile"],
      why: "Shreya Ghoshal bridges the eras. Her classical training and pristine delivery draw a direct line back to Lata Mangeshkar.",
      certainty: "known",
    },
  ],
  relationships: [
    { a: "Lata Mangeshkar", b: "Kishore Kumar", strength: 0.86, reason: "The defining voices of Indian cinema's golden era, singing countless legendary duets together." },
    { a: "Lata Mangeshkar", b: "Shreya Ghoshal", strength: 0.78, reason: "A direct lineage of pristine, classically-trained female playback singing." },
    { a: "A.R. Rahman", b: "Shreya Ghoshal", strength: 0.74, reason: "Rahman frequently utilizes her classical versatility for his most complex, melodic compositions." },
    { a: "Arijit Singh", b: "Shreya Ghoshal", strength: 0.65, reason: "The defining romantic duet pairing of the modern Bollywood era." },
    { a: "A.R. Rahman", b: "Arijit Singh", strength: 0.5, reason: "Modern cinematic collaborations that blend Rahman's atmosphere with Arijit's emotional delivery." },
  ],
  discovery: [
    {
      name: "Qawwali",
      kind: "genre",
      description: "Devotional Sufi music built on rhythmic clapping and soaring, ecstatic vocals.",
      why: "Your pull toward emotional, spiritual music, especially around Rahman, points straight at Qawwali.",
      bridges: ["A.R. Rahman", "Sufi & Ghazal"],
      entryPoints: ["Nusrat Fateh Ali Khan · Mustt Mustt", "Sabri Brothers · Tajdar-e-Haram"],
    },
    {
      name: "Indian Indie Pop",
      kind: "genre",
      description: "Acoustic, singer-songwriter pop emerging outside the cinematic system.",
      why: "The modern romantic pop of Arijit Singh seamlessly transitions into today's indie singer-songwriters.",
      bridges: ["Arijit Singh", "Romantic Pop"],
      entryPoints: ["Prateek Kuhad · cold/mess", "Anuv Jain · Baarishein"],
    },
    {
      name: "Carnatic Classical",
      kind: "genre",
      description: "The highly structured, rhythmically complex classical music of South India.",
      why: "The classical roots of Lata Mangeshkar and the South Indian fusion of A.R. Rahman lead directly here.",
      bridges: ["Lata Mangeshkar", "A.R. Rahman", "Indian Classical"],
      entryPoints: ["M.S. Subbulakshmi · Venkatesa Suprabhatam", "L. Shankar · Pancha Nadai Pallavi"],
    },
    {
      name: "Sufi Rock",
      kind: "genre",
      description: "The fusion of traditional Sufi poetry with electric guitars and rock drums.",
      why: "The atmospheric fusion of Rahman meets the raw emotion of modern pop.",
      bridges: ["A.R. Rahman", "Fusion", "Arijit Singh"],
      entryPoints: ["Junoon · Azadi", "Jal · Aadat"],
    },
    {
      name: "R.D. Burman",
      kind: "artist",
      description: "The revolutionary composer who brought funk, disco, and electronic experimentation to Bollywood.",
      why: "Close to Kishore Kumar in era and spirit, but with the experimental fusion mindset of A.R. Rahman.",
      bridges: ["Kishore Kumar", "Fusion"],
      entryPoints: ["Teesri Manzil", "Hum Kisise Kum Naheen"],
    },
  ],
};

const SONU_NIGAM: RawExpansion = {
  artist: {
    name: "Sonu Nigam",
    genres: ["Bollywood Playback", "Romantic Pop"],
    traits: ["Versatile", "Emotional", "Melodic"],
    why: "Sonu Nigam bridges the gap between the golden era and the modern age, carrying Kishore Kumar's expressive legacy forward.",
    certainty: "known",
  },
  newGenres: [],
  newTraits: [],
  relationships: [
    { a: "Sonu Nigam", b: "Kishore Kumar", strength: 0.7, reason: "Sonu openly models his early emotional delivery and versatility on Kishore Kumar." },
    { a: "Sonu Nigam", b: "Arijit Singh", strength: 0.65, reason: "The sequential kings of modern Bollywood romantic playback singing." },
    { a: "Sonu Nigam", b: "Shreya Ghoshal", strength: 0.8, reason: "The defining duet pairing of the 2000s, singing countless hits together." }
  ],
  traitShifts: [{ name: "Versatile", strength: 0.8 }],
  shift: "Sonu Nigam pulls your universe tightly together, connecting three different eras of playback singing.",
};

export function demoUniverse(): UniverseData {
  return normalizeUniverse(RAW, "demo")!;
}

/** The reference universe, including Sonu Nigam if the visitor asked for it. */
export function demoUniverseFor(artists: string[]): UniverseData {
  const base = demoUniverse();
  if (artists.some((a) => slug(a) === slug(DEMO_ADDITION))) {
    return mergeExpansion(base, SONU_NIGAM, "demo").universe;
  }
  return base;
}

/** Offline expansion: the cached Sonu Nigam addition, or a conservative placement. */
export function demoExpansion(name: string, u: UniverseData): RawExpansion {
  if (slug(name) === slug(DEMO_ADDITION)) return SONU_NIGAM;
  const nearest = u.genres[0];
  return {
    artist: {
      name,
      genres: nearest ? [nearest.name] : [],
      traits: [],
      why: nearest
        ? `SONORA could not place ${name} with confidence, so it sits loosely near ${nearest.name}.`
        : `SONORA could not place ${name} with confidence, so it sits loosely at the edge of your map.`,
      certainty: "uncertain",
    },
    shift: `${name} enters at the edge of your map.`,
  };
}
