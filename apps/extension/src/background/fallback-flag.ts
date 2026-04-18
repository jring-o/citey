// ---------------------------------------------------------------------------
// CiteAs fallback gating flag
// ---------------------------------------------------------------------------

/**
 * Module-scope flag controlling whether CiteAs lookups are performed on
 * local miss. Default `true`; updated from `chrome.storage.sync`.
 */
export let useCiteAsFallback = true;

/**
 * Initialise the flag from `chrome.storage.sync` and subscribe to changes.
 * Call once at service-worker boot.
 */
export function initFallbackFlag(): void {
  // Read initial value
  chrome.storage.sync
    .get('useCiteAsFallback')
    .then((items: Record<string, unknown>) => {
      const val = items['useCiteAsFallback'];
      if (typeof val === 'boolean') {
        useCiteAsFallback = val;
      }
      // If key absent / undefined → keep default (true)
    })
    .catch((err: unknown) => {
      console.warn('citey: failed to read useCiteAsFallback from storage', err);
    });

  // Subscribe to runtime changes
  chrome.storage.onChanged.addListener(
    (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'sync') return;
      const change = changes['useCiteAsFallback'];
      if (change && typeof change.newValue === 'boolean') {
        useCiteAsFallback = change.newValue;
      }
    },
  );
}
