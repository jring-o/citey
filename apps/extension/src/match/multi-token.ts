// ---------------------------------------------------------------------------
// §6.2 — Multi-token window generation
// ---------------------------------------------------------------------------

/**
 * A window result: the joined tokens and the canonical form for index lookup.
 */
export type TokenWindow = {
  /** Tokens joined with a single space (e.g. "scikit learn"). */
  joined: string;
  /** Canonical form: `[ -._]` collapsed to `-` for alias-index lookup. */
  canonical: string;
  /** Indices of the source tokens this window spans. */
  indices: number[];
};

/**
 * Collapse `[ -._]` sequences to a single hyphen for canonical lookup.
 * This allows "scikit learn" to match "scikit-learn" in the alias index.
 */
function canonicalize(s: string): string {
  return s.replace(/[\s\-._]+/g, '-');
}

/**
 * Generate all 2-token and 3-token sliding windows from the given token list.
 * Each window yields both the space-joined form and the canonical form.
 */
export function multiTokenWindows(tokens: string[]): TokenWindow[] {
  const windows: TokenWindow[] = [];

  // 2-token windows
  for (let i = 0; i <= tokens.length - 2; i++) {
    const joined = `${tokens[i]} ${tokens[i + 1]}`;
    windows.push({
      joined,
      canonical: canonicalize(joined),
      indices: [i, i + 1],
    });
  }

  // 3-token windows
  for (let i = 0; i <= tokens.length - 3; i++) {
    const joined = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
    windows.push({
      joined,
      canonical: canonicalize(joined),
      indices: [i, i + 1, i + 2],
    });
  }

  return windows;
}
