// ---------------------------------------------------------------------------
// §6.1 — Normalization and tokenization
// ---------------------------------------------------------------------------

/**
 * Normalize an input string per spec §6.1:
 *  1. Unicode-normalize NFKC
 *  2. Lowercase
 *  3. Replace any sequence of whitespace + punctuation other than [a-z0-9._+-] with a single space
 *  4. Trim leading/trailing spaces
 */
export function normalize(input: string): string {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9._+\-]+/g, ' ')
    .trim();
}

/**
 * Tokenize a normalized string:
 *  - Split on whitespace
 *  - Drop tokens shorter than 2 chars
 *  - Dedupe preserving order
 */
export function tokenize(input: string): string[] {
  const normalized = normalize(input);
  const raw = normalized.split(/\s+/).filter((t) => t.length >= 2);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of raw) {
    if (!seen.has(token)) {
      seen.add(token);
      result.push(token);
    }
  }
  return result;
}
