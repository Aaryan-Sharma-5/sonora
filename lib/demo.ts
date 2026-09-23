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

export const DEMO_ARTISTS = ["Radiohead", "Pink Floyd", "Tame Impala", "Arctic Monkeys", "The Strokes"];
export const DEMO_ADDITION = "Daft Punk";

const RAW: RawUniverse = {
  summary: {
    headline: "Your selected music leans atmospheric and melodic.",
    description:
      "Across five artists and five decades, the recurring thread is space: records built as immersive environments, balanced by a strong pull toward melody and a guitar-driven, rhythmic edge.",
  },
  genres: [
    { name: "Alternative Rock", weight: 0.86, description: "Guitar music outside the mainstream, and the broad ground most of your artists share." },
    { name: "Indie Rock", weight: 0.72, description: "Direct, melodic guitar songwriting from independent scenes." },
    { name: "Art Rock", weight: 0.7, description: "Rock treated as a studio art form: ambitious structures, texture and concept." },
    { name: "Psychedelic Rock", weight: 0.64, description: "Expanded sound and altered perspective, from late-60s experiments to the modern revival." },
    { name: "Neo-Psychedelia", weight: 0.55, description: "Contemporary psychedelia: layered, hazy and production-led." },
    { name: "Garage Rock Revival", weight: 0.5, description: "The raw, stripped-back guitar sound that returned in the early 2000s." },
    { name: "Progressive Rock", weight: 0.44, description: "Long-form compositions and conceptual albums that stretch the song format." },
  ],
  traits: [
    { name: "Atmospheric", strength: 0.86, observation: "Records that build space as much as songs. This is the strongest current in your map." },
    { name: "Melodic", strength: 0.8, observation: "Strong melodic writing runs through nearly every artist you chose." },
    { name: "Introspective", strength: 0.72, observation: "Much of this music turns inward, toward distance, doubt and time." },
    { name: "Experimental", strength: 0.68, observation: "A clear appetite for studio experimentation and unconventional structure." },
    { name: "Psychedelic", strength: 0.62, observation: "A psychedelic thread connects the 1960s and 2010s ends of your map." },
    { name: "Melancholic", strength: 0.56, observation: "A quiet melancholy sits underneath, strongest near Radiohead." },
    { name: "Rhythmic", strength: 0.5, observation: "Groove and drive keep the guitar side of your universe moving." },
  ],
  artists: [
    {
      name: "Radiohead",
      genres: ["Alternative Rock", "Art Rock"],
      traits: ["Atmospheric", "Experimental", "Introspective", "Melancholic"],
      why: "Radiohead sits closest to the center of your map. Its atmospheric, experimental side links the art rock of Pink Floyd with the textures Tame Impala builds today.",
      certainty: "known",
    },
    {
      name: "Pink Floyd",
      genres: ["Progressive Rock", "Psychedelic Rock", "Art Rock"],
      traits: ["Atmospheric", "Psychedelic", "Experimental", "Introspective"],
      why: "The oldest light in your universe. Pink Floyd's long-form atmosphere and studio experimentation echo through both Radiohead and Tame Impala.",
      certainty: "known",
    },
    {
      name: "Tame Impala",
      genres: ["Neo-Psychedelia", "Psychedelic Rock"],
      traits: ["Psychedelic", "Melodic", "Rhythmic", "Atmospheric"],
      why: "Tame Impala carries the psychedelic thread forward, pairing Pink Floyd's haze with a rhythmic, dance-leaning pulse.",
      certainty: "known",
    },
    {
      name: "Arctic Monkeys",
      genres: ["Indie Rock", "Garage Rock Revival", "Alternative Rock"],
      traits: ["Melodic", "Rhythmic", "Introspective"],
      why: "Arctic Monkeys anchor the guitar-driven side of your map. Their later, slower records drift toward the atmospheric center.",
      certainty: "known",
    },
    {
      name: "The Strokes",
      genres: ["Garage Rock Revival", "Indie Rock"],
      traits: ["Rhythmic", "Melodic"],
      why: "The Strokes mark the tightest, most direct corner of your universe, sharing a garage rock revival lineage with Arctic Monkeys.",
      certainty: "known",
    },
  ],
  relationships: [
    { a: "Arctic Monkeys", b: "The Strokes", strength: 0.86, reason: "The same 2000s garage rock revival. Arctic Monkeys openly drew on The Strokes." },
    { a: "Radiohead", b: "Pink Floyd", strength: 0.78, reason: "OK Computer was widely heard as a Dark Side of the Moon for its decade: albums built as immersive wholes." },
    { a: "Pink Floyd", b: "Tame Impala", strength: 0.74, reason: "A direct psychedelic lineage, from studio haze to modern layered production." },
    { a: "Radiohead", b: "Tame Impala", strength: 0.5, reason: "Both fold electronic texture into guitar records, from Kid A to the synth haze of Currents." },
    { a: "Radiohead", b: "Arctic Monkeys", strength: 0.44, reason: "British guitar bands that later traded urgency for slower, mood-led records." },
    { a: "Tame Impala", b: "Arctic Monkeys", strength: 0.4, reason: "Both moved toward groove-led, melodic production in the 2010s." },
  ],
  discovery: [
    {
      name: "Shoegaze",
      kind: "genre",
      description: "Walls of guitar noise and buried vocals, built for immersion.",
      why: "Your pull toward atmosphere and texture, especially around Radiohead, points straight at shoegaze.",
      bridges: ["Radiohead", "Alternative Rock"],
      entryPoints: ["My Bloody Valentine · Loveless", "Slowdive · Souvlaki"],
    },
    {
      name: "Post-Rock",
      kind: "genre",
      description: "Instrumental rock that builds slowly, trading verses for crescendos and space.",
      why: "The long-form, atmospheric side of Pink Floyd and Radiohead continues here without words.",
      bridges: ["Pink Floyd", "Radiohead", "Art Rock"],
      entryPoints: ["Sigur Rós · Ágætis byrjun", "Explosions in the Sky · The Earth Is Not a Cold Dead Place"],
    },
    {
      name: "Dream Pop",
      kind: "genre",
      description: "Hazy, melodic and reverb-soaked. Pop songs heard through fog.",
      why: "Tame Impala's melodic haze sits right at the border of dream pop.",
      bridges: ["Tame Impala", "Neo-Psychedelia"],
      entryPoints: ["Beach House · Teen Dream", "Cocteau Twins · Heaven or Las Vegas"],
    },
    {
      name: "Krautrock",
      kind: "genre",
      description: "Hypnotic, repetitive grooves from 1970s Germany.",
      why: "The motorik pulse meets your psychedelic and rhythmic threads halfway.",
      bridges: ["Pink Floyd", "Psychedelic Rock", "Tame Impala"],
      entryPoints: ["Can · Tago Mago", "Neu! · Neu!"],
    },
    {
      name: "Unknown Mortal Orchestra",
      kind: "artist",
      description: "Lo-fi psychedelic funk with a warped, homemade sound.",
      why: "Close to Tame Impala in sound and era, with a looser, rhythmic edge that nods toward Arctic Monkeys.",
      bridges: ["Tame Impala", "Arctic Monkeys"],
      entryPoints: ["Multi-Love", "II"],
    },
  ],
};

const DAFT_PUNK: RawExpansion = {
  artist: {
    name: "Daft Punk",
    genres: ["French House"],
    traits: ["Rhythmic", "Electronic", "Melodic"],
    why: "Daft Punk opens a new electronic region. The link runs through rhythm: Tame Impala's groove-led production is its nearest neighbor on your map.",
    certainty: "known",
  },
  newGenres: [
    { name: "French House", weight: 0.42, description: "Filtered disco loops and a four-on-the-floor pulse, rooted in 1990s Paris." },
  ],
  newTraits: [{ name: "Electronic", strength: 0.46, observation: "A new electronic current, entering through Daft Punk." }],
  relationships: [
    { a: "Daft Punk", b: "Tame Impala", strength: 0.62, reason: "Both build records around hypnotic, looping grooves. Tame Impala's later work leans openly toward disco and house." },
    { a: "Daft Punk", b: "The Strokes", strength: 0.4, reason: "Julian Casablancas sang on Daft Punk's Random Access Memories." },
  ],
  traitShifts: [{ name: "Rhythmic", strength: 0.7 }],
  shift: "Daft Punk pulls your universe toward rhythm and electronic territory.",
};

export function demoUniverse(): UniverseData {
  return normalizeUniverse(RAW, "demo")!;
}

/** The reference universe, including Daft Punk if the visitor asked for it. */
export function demoUniverseFor(artists: string[]): UniverseData {
  const base = demoUniverse();
  if (artists.some((a) => slug(a) === slug(DEMO_ADDITION))) {
    return mergeExpansion(base, DAFT_PUNK, "demo").universe;
  }
  return base;
}

/** Offline expansion: the cached Daft Punk addition, or a conservative placement. */
export function demoExpansion(name: string, u: UniverseData): RawExpansion {
  if (slug(name) === slug(DEMO_ADDITION)) return DAFT_PUNK;
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
