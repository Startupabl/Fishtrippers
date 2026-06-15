// Multi-factor fuzzy search across Title, Tags, and Category for Courses.
// Ranking priority: Title > Tags > Category. Combined with optional Category
// filter (logical AND with keyword match). Integrates the safety firewall.

import { PATHS, type PathFixture } from "@/data/lesson-paths";
import { containsForbiddenKeyword } from "@/lib/forbidden-keywords";

export interface JourneySearchInput {
  q?: string;
  category?: string;
  subcategory?: string;
}

const PRIORITY_TITLE = 100;
const PRIORITY_TAG = 50;
const PRIORITY_CATEGORY = 20;
const FUZZY_BONUS_EXACT = 10;

/** Lowercase + strip non-alphanumerics. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Strip common English suffixes for stem-style fuzzy matching. */
function stem(s: string): string {
  let w = norm(s);
  if (w.length <= 3) return w;
  for (const suf of ["ing", "ers", "ies", "ied", "ed", "es", "er", "ly", "s"]) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  return w;
}

/** Fuzzy contains: matches if either side's stem appears in the other. */
function fuzzyMatch(needle: string, haystack: string): "exact" | "fuzzy" | null {
  const n = norm(needle);
  const h = norm(haystack);
  if (!n || !h) return null;
  if (h.includes(n)) return "exact";
  const ns = stem(n);
  const hs = stem(h);
  if (!ns || !hs) return null;
  if (hs.includes(ns) || ns.includes(hs)) return "fuzzy";
  return null;
}

export interface ScoredPath {
  path: PathFixture;
  score: number;
}

/**
 * Run the multi-factor search. Returns paths sorted by score (desc).
 * If the query trips the safety firewall, returns []. Empty query returns
 * all paths (filtered by category/subcategory if present), unsorted.
 */
export function searchJourneys(input: JourneySearchInput): PathFixture[] {
  const q = (input.q ?? "").trim();
  const category = (input.category ?? "").trim();
  const subcategory = (input.subcategory ?? "").trim();

  // Safety firewall — silently zero out forbidden searches.
  if (q && containsForbiddenKeyword(q)) return [];

  // Pre-filter by Category/Subcategory (these are AND filters with the keyword).
  const pool = PATHS.filter((p) => {
    if (category && p.category !== category) return false;
    if (subcategory && p.subcategory !== subcategory) return false;
    return true;
  });

  if (!q) return pool;

  const scored: ScoredPath[] = [];
  for (const p of pool) {
    let score = 0;

    // Priority 1: Title
    const titleMatch = fuzzyMatch(q, p.title);
    if (titleMatch) {
      score += PRIORITY_TITLE + (titleMatch === "exact" ? FUZZY_BONUS_EXACT : 0);
    }

    // Priority 2: Tags
    const tags = p.tags ?? [];
    let bestTag: "exact" | "fuzzy" | null = null;
    for (const t of tags) {
      const m = fuzzyMatch(q, t);
      if (m === "exact") {
        bestTag = "exact";
        break;
      }
      if (m === "fuzzy") bestTag = bestTag ?? "fuzzy";
    }
    if (bestTag) {
      score += PRIORITY_TAG + (bestTag === "exact" ? FUZZY_BONUS_EXACT : 0);
    }

    // Priority 3: Category (and subcategory)
    const catMatch =
      fuzzyMatch(q, p.category) ??
      (p.subcategory ? fuzzyMatch(q, p.subcategory) : null);
    if (catMatch) {
      score += PRIORITY_CATEGORY + (catMatch === "exact" ? FUZZY_BONUS_EXACT : 0);
    }

    if (score > 0) scored.push({ path: p, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.path);
}
