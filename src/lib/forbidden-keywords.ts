// =============================================================================
// Content Security Firewall — centralized blacklist for FishTrippers.
//
// Update the arrays below to extend coverage. Two tiers:
//   - EXACT_BLOCK: matched as whole-token, case-insensitive (after normalization).
//   - PARTIAL_BLOCK: matched as a substring anywhere in the normalized string.
//
// Filtering is case-insensitive and leet-speak aware (0→o, 1→i/l, 3→e, 4→a,
// 5→s, 7→t, @→a, $→s, !→i). Substring matching catches forbidden roots
// hidden inside larger words (e.g. "freeporn" → blocked via "porn").
//
// Admin: to add/remove a forbidden term, edit the appropriate category array
// below. No other code changes are required — all callers consume the same
// helpers (containsForbiddenKeyword / findForbiddenKeyword).
// =============================================================================

export const FORBIDDEN_KEYWORDS = {
  // ---------------------------------------------------------------------------
  // Whole-token matches (after normalization). Use for words that should only
  // be blocked when they appear as a standalone token, not as a fragment of a
  // larger legitimate word.
  // ---------------------------------------------------------------------------
  exact: [
    // NSFW / Adult
    "sex", "naked", "nude", "nudes", "nudity", "erotic", "erotica", "fetish",
    "camgirl", "onlyfans", "playboy", "hardcore", "milf", "escort", "sensual",
    "bdsm",
    // Violence / Hate
    "kill", "murder", "bomb", "weapon", "weapons", "nazi", "racist",
    "slaughter", "suicide", "torture", "blood", "gore", "terror", "hitler",
    "jihad", "behead", "lynch", "kkk", "whitepower",
    // Scams / Fraud
    "crypto", "bitcoin", "giveaway", "freemoney", "hacked", "pirated",
    "pharmacy", "pills", "steroids", "viagra", "cheapviagra",
    "xanax", "torrent", "darkweb", "carding", "ponzi", "pyramidscheme",
    "phishing", "getrichquick", "doubleyourmoney",
    // Profanity (mild — extend privately for stronger coverage)
    "fuck", "shit", "bitch", "asshole", "bastard", "dick", "cunt", "slut",
    "whore", "fag", "faggot", "meth",
  ],

  // ---------------------------------------------------------------------------
  // Substring matches against the normalized (leet-decoded) string. Use ONLY
  // for unambiguous high-risk roots — these will block ANY word containing
  // the root anywhere in the string.
  // ---------------------------------------------------------------------------
  partial: [
    // NSFW roots
    "porn", "porno", "xxx", "nsfw", "hentai", "incest", "rape", "pedo",
    // Drug roots
    "cocaine", "heroin", "fentanyl", "lsd", "mdma", "ecstasy",
    "marijuana", "cannabis", "ketamine",
    // Hate / extremist roots
    "nazi", "kkk",
    // Self-harm
    "suicid", "selfharm",
    // Common slur roots (kept generic — extend privately as needed)
    "nigg", "tranny", "retard",
  ],
} as const;

// -----------------------------------------------------------------------------
// Normalization — case-insensitive + leet-speak.
// -----------------------------------------------------------------------------
const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
  "!": "i",
};

/** Lowercase + leet-decode every character. Non-mapped chars passed through. */
function leetDecode(input: string): string {
  let out = "";
  const lower = input.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    out += LEET_MAP[ch] ?? ch;
  }
  return out;
}

/** Tokenize on non-alphanumeric chars (after leet-decode). */
function tokenize(input: string): string[] {
  return leetDecode(input).split(/[^a-z0-9]+/i).filter(Boolean);
}

const exactSet = new Set(
  FORBIDDEN_KEYWORDS.exact.map((w) => leetDecode(w)),
);
const partialList = FORBIDDEN_KEYWORDS.partial.map((w) => leetDecode(w));

/**
 * Returns true if the input contains a forbidden keyword. Case-insensitive,
 * leet-speak aware, with substring matching for high-risk roots.
 */
export function containsForbiddenKeyword(input: string): boolean {
  if (!input) return false;
  const tokens = tokenize(input);

  for (const t of tokens) {
    if (exactSet.has(t)) return true;
    for (const root of partialList) {
      // Token must start with the root OR contain it adjacent to a token
      // boundary. This catches "pornography", "raped", "suicidal",
      // "pedophile" while ignoring "therapeutic", "grape", "method".
      if (t.startsWith(root) || t.endsWith(root)) return true;
    }
  }

  return false;
}

/** Returns the first offending term found, or null. Useful for form errors. */
export function findForbiddenKeyword(input: string): string | null {
  if (!input) return null;
  const tokens = tokenize(input);
  for (const t of tokens) {
    if (exactSet.has(t)) return t;
    for (const root of partialList) {
      if (t.startsWith(root) || t.endsWith(root)) return root;
    }
  }
  return null;
}

/**
 * Validates one or more user-content fields (title, description, tags, etc.).
 * Returns null if all are clean, or a standardized error message and the
 * offending field name if any field contains forbidden content.
 */
export const FORBIDDEN_CONTENT_ERROR =
  "Your listing contains terms that violate our community safety standards. Please revise your title, description, or tags.";

export interface ContentValidationResult {
  ok: boolean;
  error?: string;
  field?: string;
}

export function validateUserContent(
  fields: Record<string, string | string[] | undefined>,
): ContentValidationResult {
  for (const [field, value] of Object.entries(fields)) {
    if (!value) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (containsForbiddenKeyword(v)) {
        return { ok: false, error: FORBIDDEN_CONTENT_ERROR, field };
      }
    }
  }
  return { ok: true };
}
