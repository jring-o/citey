// ---------------------------------------------------------------------------
// §6.3 — Fuse.js fuzzy matching wrapper
// ---------------------------------------------------------------------------

import Fuse from 'fuse.js';

/** A single fuzzy match result. */
export type FuzzyHit = {
  alias: string;
  score: number;
};

/** Maximum number of results returned per token (§6.3.3). */
const MAX_RESULTS = 5;

/** Default Fuse.js threshold for tokens >=6 chars (§6.3). */
const THRESHOLD_LONG = 0.2;

/** Tighter threshold for tokens 4-5 chars (§6.3.2). */
const THRESHOLD_SHORT = 0.1;

/**
 * Minimum length-coverage ratio between query and alias.
 *
 * Guards against the substring/prefix hazard inherent in Fuse.js with
 * `ignoreLocation: true`: without this gate, a 4-char query like "open"
 * substring-matches "openbabel" (9 chars) with score ≈ 0 and gets flagged
 * high-confidence. Requiring min(q,a)/max(q,a) ≥ 0.75 forces the query to
 * cover most of the alias (and vice versa for long-typo queries).
 */
const LENGTH_RATIO_MIN = 0.75;

/**
 * Number of leading characters that must match byte-for-byte between query
 * and alias. Distinguishes genuine typos (which almost always agree at the
 * start — "matplotlb" vs "matplotlib", "astropi" vs "astropy") from common
 * English/CS words that happen to be substrings of package names ("python"
 * vs "ipython", "analysis" vs "mdanalysis"). Set to 2 because real package
 * name typos overwhelmingly start from the right first couple of letters.
 */
const PREFIX_CHARS = 2;

/**
 * Run a fuzzy search for `token` against the given alias list.
 *
 * Honors the per-token-length threshold override (§6.3.2):
 *  - 4-5 chars → threshold 0.10
 *  - 6+  chars → threshold 0.20
 *
 * Returns at most 5 candidates (§6.3.3), each with score ≤ the active threshold.
 *
 * The caller is responsible for checking:
 *  - Token length ≥ 4 (2-3 chars are exact-only per §6.3.2)
 *  - Token is not in FUZZY_BLOCKLIST
 */
export function fuzzyMatch(token: string, aliases: string[]): FuzzyHit[] {
  const threshold = token.length <= 5 ? THRESHOLD_SHORT : THRESHOLD_LONG;

  const fuse = new Fuse(aliases, {
    includeScore: true,
    threshold,
    distance: 50,
    ignoreLocation: true,
    minMatchCharLength: 4,
    isCaseSensitive: false,
    shouldSort: true,
  });

  const results = fuse.search(token);

  const queryPrefix = token.slice(0, PREFIX_CHARS).toLowerCase();

  return results
    .filter((r) => r.score !== undefined && r.score <= threshold)
    .filter((r) => {
      const q = token.length;
      const a = r.item.length;
      return Math.min(q, a) / Math.max(q, a) >= LENGTH_RATIO_MIN;
    })
    .filter((r) => r.item.slice(0, PREFIX_CHARS).toLowerCase() === queryPrefix)
    .slice(0, MAX_RESULTS)
    .map((r) => ({
      alias: r.item,
      score: r.score!,
    }));
}
