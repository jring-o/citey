import type { Author, Package, SoftwareCitation } from '@citey/citation-model';

// ---------------------------------------------------------------------------
// CiteAs response shape (subset we care about)
// ---------------------------------------------------------------------------

export type CiteAsResponse = {
  name?: string;
  doi?: string;
  url?: string;
  authors?: Array<{ family?: string; given?: string; name?: string }>;
  year?: string;
  publisher?: string;
  journal?: string;
  version?: string;
};

// ---------------------------------------------------------------------------
// SHA-256 helper (Web Crypto — available in service workers)
// ---------------------------------------------------------------------------

export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Author mapping
// ---------------------------------------------------------------------------

function mapAuthors(raw: CiteAsResponse['authors']): Author[] {
  if (!raw || raw.length === 0) return [];
  return raw.map((a) => {
    if (a.family) {
      return {
        family: a.family,
        given: a.given ?? '',
        kind: 'person' as const,
      };
    }
    // Fallback: single `name` field — split naively
    const parts = (a.name ?? '').split(/\s+/);
    const family = parts.pop() ?? '';
    const given = parts.join(' ');
    return { family, given, kind: 'person' as const };
  });
}

// ---------------------------------------------------------------------------
// SoftwareCitation builder
// ---------------------------------------------------------------------------

function buildCitation(
  resp: CiteAsResponse,
  authors: Author[],
): SoftwareCitation | null {
  if (!resp.name) return null;

  // Need either a doi or a url to satisfy the schema.
  const doi = resp.doi;
  const url = resp.url;
  if (!doi && !url) return null;

  // Year is required; default to current year if CiteAs didn't supply one.
  const year =
    resp.year && /^\d{4}$/.test(resp.year)
      ? resp.year
      : String(new Date().getFullYear());

  const citation: SoftwareCitation = {
    title: resp.name,
    authors: authors.length > 0 ? authors : [{ family: 'Unknown', given: '', kind: 'person' }],
    year,
  };

  if (resp.version) citation.version = resp.version;
  if (doi) citation.doi = doi;
  if (url) citation.url = url;
  if (resp.publisher) citation.publisher = resp.publisher;

  return citation;
}

// ---------------------------------------------------------------------------
// Public mapper
// ---------------------------------------------------------------------------

/**
 * Convert a CiteAs API response into a synthetic `Package`.
 *
 * Returns `null` if the response is missing critical fields (`name`, or
 * lacks both `doi` and `url`).
 */
export async function citeAsToPackage(
  resp: CiteAsResponse,
  query: string,
): Promise<Package | null> {
  if (!resp.name) return null;

  const authors = mapAuthors(resp.authors);
  const citation = buildCitation(resp, authors);
  if (!citation) return null;

  const hash = await sha256Hex(query);
  const id = `citeas-${hash.slice(0, 12)}`;
  const today = new Date().toISOString().slice(0, 10);

  return {
    id,
    canonicalName: resp.name,
    aliases: [],
    ecosystem: 'generic',
    description: `Imported from CiteAs for query "${query}"`,
    homepage: resp.url ?? citation.url ?? `https://doi.org/${citation.doi}`,
    citation,
    provenance: {
      source: 'imported',
      curator: 'citeas',
      dateAdded: today,
      lastReviewed: today,
    },
    versionPolicy: 'unversioned',
    tags: ['citeas-fallback'],
  };
}
