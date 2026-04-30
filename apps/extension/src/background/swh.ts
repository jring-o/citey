import type { PackageHit, SwhLive } from '@citey/citation-model';
import { isValidSwhid } from '@citey/citation-model';

// ---------------------------------------------------------------------------
// Software Heritage adapter
//
// Two endpoints, tried in order at click time:
//
//   1. /api/1/raw-intrinsic-metadata/citation/origin/  → BibTeX rendered
//      from the repo's CITATION.cff or codemeta.json (when present).
//   2. /api/1/origin/<url>/visit/latest/  → latest snapshot SWHID, used
//      when no BibTeX is available but we still want a current SWHID.
//
// Both are CORS-enabled (`Access-Control-Allow-Origin: *`). Anonymous rate
// limits: 60/h on citation, 700/h on visit/latest. Fine for typical
// research-session usage with the existing background cache.
// ---------------------------------------------------------------------------

const SWH_BASE = 'https://archive.softwareheritage.org/api/1';

type CitationResponse = {
  format?: string;
  content?: string;
  error?: string | null;
};

type VisitLatestResponse = {
  status?: string;
  snapshot?: string;
};

/**
 * Fetch SWH's rendered BibTeX for an origin. Returns the BibTeX string on
 * success or `null` if SWH 404s (no metadata files), the request errors, or
 * the response is malformed.
 */
export async function fetchSwhCitation(
  repoUrl: string,
  signal: AbortSignal,
): Promise<string | null> {
  const params = new URLSearchParams({
    origin_url: repoUrl,
    citation_format: 'bibtex',
  });
  const url = `${SWH_BASE}/raw-intrinsic-metadata/citation/origin/?${params.toString()}`;

  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit', signal });
    if (!res.ok) return null;
    const data = (await res.json()) as CitationResponse;
    if (data.error || !data.content) return null;
    return data.content;
  } catch (err) {
    console.info('citey: SWH citation lookup failed', err);
    return null;
  }
}

/**
 * Fetch the SWHID of the latest snapshot for an origin. Returns a
 * `swh:1:snp:<hex>` SWHID on success, or `null` if SWH has not archived the
 * origin or the request fails.
 */
export async function fetchLatestSnapshotSwhid(
  repoUrl: string,
  signal: AbortSignal,
): Promise<string | null> {
  const url = `${SWH_BASE}/origin/${encodeURIComponent(repoUrl)}/visit/latest/`;

  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit', signal });
    if (!res.ok) return null;
    const data = (await res.json()) as VisitLatestResponse;
    if (data.status !== 'full' && data.status !== 'partial') return null;
    if (typeof data.snapshot !== 'string' || data.snapshot.length === 0) {
      return null;
    }
    const swhid = `swh:1:snp:${data.snapshot}`;
    return isValidSwhid(swhid) ? swhid : null;
  } catch (err) {
    console.info('citey: SWH visit/latest lookup failed', err);
    return null;
  }
}

/**
 * Extract the SWHID from SWH-rendered BibTeX. SWH emits a single line of
 * the form `swhid = "swh:1:<type>:<hex>;origin=...;visit=..."` (with double
 * quotes) in every `@softwareversion` entry. Returns the full qualified
 * SWHID or `null` if not found / malformed.
 */
export function extractSwhidFromBibtex(bibtex: string): string | null {
  const match = bibtex.match(/swhid\s*=\s*"(swh:1:[^"]+)"/);
  if (match === null || match[1] === undefined) return null;
  return isValidSwhid(match[1]) ? match[1] : null;
}

/**
 * Augment a `PackageHit` with live Software Heritage data on a best-effort
 * basis. Returns the hit unchanged if it has no `repository` URL, the
 * lookups fail, or the timeout fires.
 *
 * The decision tree:
 *   1. Try SWH citation → if hit, attach `swh.bibtex` and the SWHID
 *      extracted from it (so the popup can render a chip without parsing
 *      BibTeX itself). Done.
 *   2. Else try visit/latest → if hit, attach `swh.swhid`. Done.
 *   3. Else return hit unchanged (the exporter falls back to the
 *      as-of-admission `package.swhid`, then to no SWHID at all).
 */
export async function enrichWithSwh(hit: PackageHit, signal: AbortSignal): Promise<PackageHit> {
  const repo = hit.package.repository;
  if (repo === undefined) return hit;

  const bibtex = await fetchSwhCitation(repo, signal);
  if (bibtex !== null) {
    const swhid = extractSwhidFromBibtex(bibtex) ?? undefined;
    return { ...hit, swh: { bibtex, swhid } };
  }

  const swhid = await fetchLatestSnapshotSwhid(repo, signal);
  if (swhid !== null) {
    return { ...hit, swh: { swhid } };
  }

  return hit;
}

/**
 * Run `enrichWithSwh` over an array of hits in parallel with a shared
 * timeout. Hits that don't complete in time are returned unchanged. The
 * order of the result matches the input.
 */
export async function enrichHitsWithSwh(
  hits: PackageHit[],
  timeoutMs: number,
): Promise<PackageHit[]> {
  if (hits.length === 0) return hits;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const settled = await Promise.allSettled(hits.map((h) => enrichWithSwh(h, controller.signal)));
    return settled.map((r, i) => (r.status === 'fulfilled' ? r.value : (hits[i] as PackageHit)));
  } finally {
    clearTimeout(timer);
  }
}

export type { SwhLive };
