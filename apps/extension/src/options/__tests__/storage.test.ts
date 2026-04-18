import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Chrome storage stub
// ---------------------------------------------------------------------------

let syncStore: Record<string, unknown> = {};

const chromeStub = {
  storage: {
    sync: {
      get: vi.fn((keys: string[]) => {
        const result: Record<string, unknown> = {};
        for (const k of keys) {
          if (k in syncStore) {
            result[k] = syncStore[k];
          }
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(syncStore, items);
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    getManifest: () => ({ version: '0.1.0' }),
    getURL: (path: string) => `chrome-extension://test-id/${path}`,
  },
};

vi.stubGlobal('chrome', chromeStub);

beforeEach(() => {
  syncStore = {};
  chromeStub.storage.sync.get.mockImplementation((keys: string[]) => {
    const result: Record<string, unknown> = {};
    for (const k of keys) {
      if (k in syncStore) {
        result[k] = syncStore[k];
      }
    }
    return Promise.resolve(result);
  });
  chromeStub.storage.sync.set.mockImplementation((items: Record<string, unknown>) => {
    Object.assign(syncStore, items);
    return Promise.resolve();
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('storage', () => {
  it('getSettings() returns defaults when storage is empty (exit criterion #2)', async () => {
    const { getSettings } = await import('../storage');
    const settings = await getSettings();
    expect(settings).toEqual({
      useCiteAsFallback: true,
      clipboardFormat: 'bibtex',
    });
  });

  it('getSettings() reads stored values', async () => {
    syncStore = { useCiteAsFallback: false, clipboardFormat: 'plain' };
    const { getSettings } = await import('../storage');
    const settings = await getSettings();
    expect(settings).toEqual({
      useCiteAsFallback: false,
      clipboardFormat: 'plain',
    });
  });

  it('getSettings() applies defaults for invalid values', async () => {
    syncStore = { useCiteAsFallback: 'yes', clipboardFormat: 'markdown' };
    const { getSettings } = await import('../storage');
    const settings = await getSettings();
    expect(settings).toEqual({
      useCiteAsFallback: true,
      clipboardFormat: 'bibtex',
    });
  });

  it('setUseCiteAsFallback() persists to chrome.storage.sync (exit criterion #3)', async () => {
    const { setUseCiteAsFallback, getSettings } = await import('../storage');
    await setUseCiteAsFallback(false);
    expect(chromeStub.storage.sync.set).toHaveBeenCalledWith({
      useCiteAsFallback: false,
    });
    // Round-trip
    const settings = await getSettings();
    expect(settings.useCiteAsFallback).toBe(false);
  });

  it('setClipboardFormat() persists to chrome.storage.sync', async () => {
    const { setClipboardFormat, getSettings } = await import('../storage');
    await setClipboardFormat('plain');
    expect(chromeStub.storage.sync.set).toHaveBeenCalledWith({
      clipboardFormat: 'plain',
    });
    // Round-trip
    const settings = await getSettings();
    expect(settings.clipboardFormat).toBe('plain');
  });

  it('setters round-trip back through getSettings()', async () => {
    const { setUseCiteAsFallback, setClipboardFormat, getSettings } = await import('../storage');
    await setUseCiteAsFallback(false);
    await setClipboardFormat('plain');
    const settings = await getSettings();
    expect(settings).toEqual({
      useCiteAsFallback: false,
      clipboardFormat: 'plain',
    });
  });
});
