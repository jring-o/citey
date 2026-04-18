// ---------------------------------------------------------------------------
// §7.1.2 — BibKey generation
// ---------------------------------------------------------------------------

import type { Package } from '@citey/citation-model';

/**
 * Generate a BibTeX citation key for a package.
 *
 *   bibKey = lowercase(firstAuthorFamily) + year + lowercase(canonicalName, sanitized)
 *
 * Where `sanitized` strips non-`[a-z0-9]` and truncates to 16 characters.
 *
 * Example: `harris2020numpy`, `pedregosa2011scikitlearn`.
 *
 * Caller must ensure `pkg.citation` is defined (i.e. don't pass `citeAs`
 * alias packages).
 */
export function bibKeyFor(pkg: Package): string {
  const c = pkg.citation;
  const firstAuthor = c?.authors[0];
  const family =
    firstAuthor !== undefined
      ? firstAuthor.family.toLowerCase().replace(/[^a-z]/g, '')
      : 'unknown';

  const year = c?.year ?? '';

  const sanitized = pkg.canonicalName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 16);

  return `${family}${year}${sanitized}`;
}

/**
 * Deduplicate an ordered list of BibTeX keys by appending `b`, `c`, ... to
 * colliding keys (in order of appearance). The first occurrence is unchanged;
 * subsequent duplicates get `b`, `c`, `d`, etc.
 */
export function dedupeKeys(keys: string[]): string[] {
  const counts = new Map<string, number>();
  const result: string[] = [];

  for (const key of keys) {
    const count = counts.get(key) ?? 0;
    counts.set(key, count + 1);

    if (count === 0) {
      result.push(key);
    } else {
      const suffix = String.fromCharCode(97 + count); // 'a' + count
      result.push(`${key}${suffix}`);
    }
  }

  return result;
}
