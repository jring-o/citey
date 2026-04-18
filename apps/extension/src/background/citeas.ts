import type { PackageHit } from '@citey/citation-model';
import { citeAsToPackage } from './citeas-to-package';
import type { CiteAsResponse } from './citeas-to-package';

// ---------------------------------------------------------------------------
// CiteAs adapter
// ---------------------------------------------------------------------------

const CITEAS_BASE = 'https://api.citeas.org/product';
const CITEAS_EMAIL = 'citey@scios.tech';

/**
 * Query the CiteAs API for `query`. Returns a synthetic `PackageHit` on
 * success or `null` on any error (timeout, network, missing fields).
 *
 * Errors are logged at `info` level only.
 */
export async function lookupCiteAs(
  query: string,
  signal: AbortSignal,
): Promise<PackageHit | null> {
  const url = `${CITEAS_BASE}/${encodeURIComponent(query)}?email=${encodeURIComponent(CITEAS_EMAIL)}`;

  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      signal,
    });

    if (!response.ok) {
      console.info(`citey: CiteAs returned ${response.status} for "${query}"`);
      return null;
    }

    const data = (await response.json()) as CiteAsResponse;
    const pkg = await citeAsToPackage(data, query);

    if (!pkg) {
      console.info(`citey: CiteAs response missing name for "${query}"`);
      return null;
    }

    return {
      package: pkg,
      confidence: 'low',
      matchedAliases: [query],
    };
  } catch (err) {
    console.info('citey: CiteAs lookup failed', err);
    return null;
  }
}
