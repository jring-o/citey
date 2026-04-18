// ---------------------------------------------------------------------------
// Options page — Settings persistence via chrome.storage.sync
// ---------------------------------------------------------------------------

export type ClipboardFormat = 'bibtex' | 'plain';

export interface Settings {
  useCiteAsFallback: boolean;
  clipboardFormat: ClipboardFormat;
}

const DEFAULTS: Settings = {
  useCiteAsFallback: true,
  clipboardFormat: 'bibtex',
};

/**
 * Read the current settings from `chrome.storage.sync`.
 * Returns defaults for any missing keys.
 */
export async function getSettings(): Promise<Settings> {
  const items = await chrome.storage.sync.get(['useCiteAsFallback', 'clipboardFormat']);

  return {
    useCiteAsFallback:
      typeof items['useCiteAsFallback'] === 'boolean'
        ? items['useCiteAsFallback']
        : DEFAULTS.useCiteAsFallback,
    clipboardFormat:
      items['clipboardFormat'] === 'bibtex' || items['clipboardFormat'] === 'plain'
        ? items['clipboardFormat']
        : DEFAULTS.clipboardFormat,
  };
}

/**
 * Persist the CiteAs fallback toggle.
 */
export async function setUseCiteAsFallback(v: boolean): Promise<void> {
  await chrome.storage.sync.set({ useCiteAsFallback: v });
}

/**
 * Persist the default clipboard format.
 */
export async function setClipboardFormat(v: ClipboardFormat): Promise<void> {
  await chrome.storage.sync.set({ clipboardFormat: v });
}
