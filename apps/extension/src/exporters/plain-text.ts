// ---------------------------------------------------------------------------
// §7.3 — Plain-text citation formatter
// ---------------------------------------------------------------------------

import type { Author, Package } from '@citey/citation-model';

/**
 * Render packages as a plain-text citation list.
 *
 * Each citation is one paragraph:
 *   `{Authors} ({year}). {Title}{ ' (version ' + version + ')'}. {publisher|"Software"}. {DOI URL|url}.`
 *
 * Author formatting:
 * - 1 author:  `Last, F.`
 * - 2 authors: `Last, F. & Other, G.`
 * - 3–8 authors: `Last, F., Second, G., & Third, H.` (Oxford comma + &)
 * - 9+ authors: first 8 then `et al.`
 *
 * Entries are separated by a blank line. Packages without a `citation`
 * (citeAs aliases) are skipped.
 */
export function toPlainText(packages: Package[]): string {
  return packages
    .filter((p) => p.citation !== undefined)
    .map(renderEntry)
    .join('\n\n');
}

function renderEntry(pkg: Package): string {
  const c = pkg.citation!;
  const authors = formatAuthors(c.authors);
  const versionSuffix = c.version !== undefined ? ` (version ${c.version})` : '';
  const venue = c.publisher ?? 'Software';
  const link = c.doi !== undefined ? `https://doi.org/${c.doi}` : c.url ?? pkg.homepage ?? '';

  return `${authors} (${c.year}). ${c.title}${versionSuffix}. ${venue}. ${link}.`;
}

/** Format a single author as `Last, F.` */
function shortAuthor(author: { family: string; given: string }): string {
  const initial = author.given.length > 0 ? `${author.given[0]}.` : '';
  return initial ? `${author.family}, ${initial}` : author.family;
}

/**
 * Format an author list according to §7.3 rules:
 * - 1: `Last, F.`
 * - 2: `Last, F. & Other, G.`
 * - 3–8: `Last, F., Second, G., & Third, H.`
 * - 9+: first 8 + `et al.`
 */
export function formatAuthors(authors: ReadonlyArray<Author>): string {
  if (authors.length === 0) {
    return 'Unknown';
  }

  if (authors.length === 1) {
    return shortAuthor(authors[0]!);
  }

  if (authors.length === 2) {
    return `${shortAuthor(authors[0]!)} & ${shortAuthor(authors[1]!)}`;
  }

  if (authors.length <= 8) {
    const allButLast = authors.slice(0, -1).map(shortAuthor).join(', ');
    const last = shortAuthor(authors[authors.length - 1]!);
    return `${allButLast}, & ${last}`;
  }

  const first8 = authors.slice(0, 8).map(shortAuthor).join(', ');
  return `${first8}, et al.`;
}
