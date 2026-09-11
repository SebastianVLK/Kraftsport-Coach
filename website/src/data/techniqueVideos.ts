export interface TechniqueVideo {
  id: string;
  title: string;
  channel: string;
}

/**
 * Every id below was verified against YouTube's oEmbed endpoint, so the titles
 * and channels are the real ones rather than remembered guesses. Exercises with
 * no vetted clip get the top search result instead, found and checked by
 * server/techniqueVideoSearch.ts and labelled as unvetted; only if that fails
 * too does a plain search link remain.
 */
const CATALOGUE: { test: RegExp; video?: TechniqueVideo }[] = [
  // must come before the generic deadlift rule — "Rumänisches Kreuzheben"
  // contains "Kreuzheben" and would otherwise match the conventional pull
  { test: /rum(ä|ae)nisch|\brdl\b/i },
  {
    test: /liegest(ü|ue)tz|push[\s-]?up/i,
    video: {
      id: "IODxDxX7oi4",
      title: "The Perfect Push Up | Do it right!",
      channel: "Calisthenicmovement",
    },
  },
  {
    test: /\bdip/i,
    video: {
      id: "2z8JmcrW-As",
      title: "The Perfect Dip – Do it right",
      channel: "Calisthenicmovement",
    },
  },
  {
    test: /klimmzug|klimmz(ü|ue)ge|pull[\s-]?up/i,
    video: {
      id: "eGo4IYlbE5g",
      title: "The Perfect Pull Up – Do it right!",
      channel: "Calisthenicmovement",
    },
  },
  {
    test: /kniebeuge|squat/i,
    video: {
      id: "bEv6CCg2BC8",
      title: "How To Get A Huge Squat With Perfect Technique",
      channel: "Jeff Nippard",
    },
  },
  {
    test: /kreuzheben|deadlift/i,
    video: {
      id: "VL5Ab0T07e4",
      title: "Build A Bigger Deadlift With Perfect Technique",
      channel: "Jeff Nippard",
    },
  },
  {
    test: /bankdr(ü|ue)cken|bench/i,
    video: {
      id: "hWbUlkb5Ms4",
      title: "How To Bench Press With Perfect Technique (5 Steps)",
      channel: "Jeff Nippard",
    },
  },
  {
    test: /schulterdr(ü|ue)cken|overhead|military/i,
    video: {
      id: "2yjwXTZQDDI",
      title: "How To: Standing Straight-Bar Military / Overhead Press",
      channel: "ScottHermanFitness",
    },
  },
  {
    test: /rudern|\brow\b/i,
    video: {
      id: "kBWAon7ItDw",
      title: "How To PROPERLY Barbell Row For A Bigger Back",
      channel: "Jeremy Ethier",
    },
  },
];

export function findTechniqueVideo(exerciseName: string): TechniqueVideo | null {
  const entry = CATALOGUE.find((c) => c.test.test(exerciseName));
  return entry?.video ?? null;
}

/** What gets searched for without a vetted clip — shared by the link and the lookup. */
export function techniqueSearchQuery(exerciseName: string, lang: "de" | "en" = "de"): string {
  return `${exerciseName} ${lang === "en" ? "proper form technique" : "Technik richtig ausführen"}`;
}

export function youtubeSearchUrl(exerciseName: string, lang: "de" | "en" = "de"): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    techniqueSearchQuery(exerciseName, lang)
  )}`;
}
