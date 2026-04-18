import type { MatchResult } from '@citey/citation-model';

// ---------------------------------------------------------------------------
// LRU cache (insertion-order eviction)
// ---------------------------------------------------------------------------

const MAX_CACHE_ENTRIES = 256;

const sessionCache = new Map<string, MatchResult>();

/**
 * Retrieve a cached `MatchResult` by normalised query key.
 * Returns `undefined` on miss.
 */
export function cacheGet(key: string): MatchResult | undefined {
  return sessionCache.get(key);
}

/**
 * Store a `MatchResult` under `key`. When the cache exceeds
 * `MAX_CACHE_ENTRIES`, the oldest entry (by insertion order) is evicted.
 */
export function cacheSet(key: string, value: MatchResult): void {
  // Delete first so re-insertion moves the key to the end (most recent)
  sessionCache.delete(key);
  sessionCache.set(key, value);

  if (sessionCache.size > MAX_CACHE_ENTRIES) {
    // Map iterates in insertion order; first key is the oldest
    const oldest = sessionCache.keys().next().value;
    if (oldest !== undefined) {
      sessionCache.delete(oldest);
    }
  }
}

/**
 * Expose the underlying map size (for testing).
 */
export function _cacheSize(): number {
  return sessionCache.size;
}

/**
 * Clear the cache (for testing).
 */
export function _cacheClear(): void {
  sessionCache.clear();
}
