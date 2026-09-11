/**
 * Finds a technique video for exercises the vetted catalogue does not cover —
 * anything a user types in, and the picker entries without a clip of their own.
 *
 * There is no key for YouTube's data API, so this reads the ordinary results
 * page, the same one the "Auf YouTube suchen" link opens. Only regular video
 * results are taken, which leaves out Shorts and ads, and each candidate must
 * pass YouTube's oEmbed endpoint: that confirms the video exists, supplies its
 * real title and channel, and turns away videos whose owners disabled
 * embedding, which would otherwise show up as a dead player.
 */
import { techniqueSearchQuery } from "../src/data/techniqueVideos";

export interface FoundVideo {
  id: string;
  title: string;
  channel: string;
}

const found = new Map<string, FoundVideo>();

const headers = (lang: "de" | "en") => ({
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  "Accept-Language": lang === "en" ? "en-GB,en;q=0.9" : "de-CH,de;q=0.9",
  // skips the cookie-consent page YouTube puts in front of European visitors
  Cookie: "CONSENT=YES+1",
});

export async function findVideoBySearch(
  exercise: string,
  lang: "de" | "en" = "de"
): Promise<FoundVideo | null> {
  const name = exercise.trim().toLowerCase();
  if (!name) return null;
  // an English page gets an English tutorial, so each language is cached apart
  const key = `${lang}:${name}`;
  const cached = found.get(key);
  if (cached) return cached;

  const page = await fetch(
    `https://www.youtube.com/results?hl=${lang}&search_query=${encodeURIComponent(
      techniqueSearchQuery(exercise.trim(), lang)
    )}`,
    { headers: headers(lang), signal: AbortSignal.timeout(8000) }
  );
  if (!page.ok) return null;
  const html = await page.text();

  const ids = [...html.matchAll(/"videoRenderer":\{"videoId":"([\w-]{11})"/g)].map((m) => m[1]);
  const candidates = await Promise.all([...new Set(ids)].slice(0, 5).map(checked));

  // YouTube always returns something, even for gibberish, so a result has to
  // name the exercise to count. The closest title wins, the earlier rank on a tie.
  let best: FoundVideo | null = null;
  let bestScore = MIN_RELEVANCE;
  for (const video of candidates) {
    if (!video) continue;
    const score = relevance(exercise, video.title);
    if (score > bestScore) {
      best = video;
      bestScore = score;
    }
  }
  if (best) found.set(key, best);
  return best;
}

async function checked(id: string): Promise<FoundVideo | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${id}`
      )}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const meta = (await res.json()) as { title?: string; author_name?: string };
    return meta.title ? { id, title: meta.title, channel: meta.author_name ?? "" } : null;
  } catch {
    return null;
  }
}

// Below this share a title only brushes the exercise name in passing
const MIN_RELEVANCE = 0.3;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/**
 * How much of the exercise name turns up in a title, from 0 to 1. Compared in
 * five-letter pieces so German compounds still meet: "Frontkniebeuge" shares
 * half its pieces with "Kniebeugen lernen", all of them with "Frontkniebeuge
 * Tutorial", and a made-up name none with anything.
 */
function relevance(exercise: string, title: string): number {
  const t = norm(title);
  const words = norm(exercise).match(/[a-z]{4,}/g) ?? [];
  const pieces = words.flatMap((w) =>
    w.length <= 5 ? [w] : Array.from({ length: w.length - 4 }, (_, i) => w.slice(i, i + 5))
  );
  if (!pieces.length) return 0;
  return pieces.filter((p) => t.includes(p)).length / pieces.length;
}
