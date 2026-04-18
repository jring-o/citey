import type { Package } from '@citey/citation-model';

// ---------------------------------------------------------------------------
// DB shape returned by loadDb
// ---------------------------------------------------------------------------

export type DbIndex = {
  packages: Package[];
  byId: Map<string, Package>;
  aliasIndex: Map<string, string[]>;
  dbVersion: string;
  packageCount: number;
  builtAt: string;
};

// ---------------------------------------------------------------------------
// Module-scope memoisation
// ---------------------------------------------------------------------------

let cached: DbIndex | null | undefined;

/**
 * Lazy-loads `db.json` from the extension bundle via `chrome.runtime.getURL`.
 * The parsed result is memoized in module scope so subsequent calls are free.
 *
 * Returns `null` on any load / parse failure (logged via `console.error`).
 */
export async function loadDb(): Promise<DbIndex | null> {
  // Already resolved (possibly to null on prior failure)
  if (cached !== undefined) return cached;

  try {
    const url = chrome.runtime.getURL('db.json');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`db.json fetch failed: ${response.status}`);
    }

    const raw = (await response.json()) as {
      packages?: unknown[];
      aliasIndex?: Record<string, string[]>;
      dbVersion?: string;
      packageCount?: number;
      builtAt?: string;
    };

    const packages = (raw.packages ?? []) as Package[];

    // Build byId lookup
    const byId = new Map<string, Package>();
    for (const pkg of packages) {
      byId.set(pkg.id, pkg);
    }

    // Build aliasIndex from pre-built map in db.json
    const aliasIndex = new Map<string, string[]>();
    if (raw.aliasIndex) {
      for (const [alias, ids] of Object.entries(raw.aliasIndex)) {
        aliasIndex.set(alias, ids);
      }
    }

    cached = {
      packages,
      byId,
      aliasIndex,
      dbVersion: (raw.dbVersion as string) ?? '0.0.0',
      packageCount: (raw.packageCount as number) ?? packages.length,
      builtAt: (raw.builtAt as string) ?? '',
    };

    return cached;
  } catch (err) {
    console.error('citey: failed to load db.json', err);
    cached = null;
    return null;
  }
}

/**
 * Reset the module-scope cache (used only in tests).
 */
export function _resetLoaderCache(): void {
  cached = undefined;
}
