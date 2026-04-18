import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Chrome storage stub
// ---------------------------------------------------------------------------

type StorageChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  area: string,
) => void;

let storageListeners: StorageChangeListener[] = [];
let syncStore: Record<string, unknown> = {};

const chromeStub = {
  runtime: {
    onMessage: { addListener: vi.fn() },
    getURL: vi.fn(),
  },
  storage: {
    sync: {
      get: vi.fn((key: string) => Promise.resolve({ [key]: syncStore[key] })),
    },
    onChanged: {
      addListener: vi.fn((fn: StorageChangeListener) => {
        storageListeners.push(fn);
      }),
    },
  },
};

vi.stubGlobal('chrome', chromeStub);

beforeEach(() => {
  storageListeners = [];
  syncStore = {};
  chromeStub.storage.sync.get.mockImplementation((key: string) =>
    Promise.resolve({ [key]: syncStore[key] }),
  );
  chromeStub.storage.onChanged.addListener.mockImplementation(
    (fn: StorageChangeListener) => {
      storageListeners.push(fn);
    },
  );
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fallback-flag', () => {
  it('defaults to true when storage returns undefined (exit criterion #5)', async () => {
    syncStore = {}; // key absent
    const mod = await import('../fallback-flag');
    expect(mod.useCiteAsFallback).toBe(true);

    // After init, flag should still be true
    mod.initFallbackFlag();
    // Wait for the async storage read to settle
    await new Promise((r) => setTimeout(r, 10));
    expect(mod.useCiteAsFallback).toBe(true);
  });

  it('reads false from storage and reflects it', async () => {
    syncStore = { useCiteAsFallback: false };
    const mod = await import('../fallback-flag');
    mod.initFallbackFlag();
    await new Promise((r) => setTimeout(r, 10));
    expect(mod.useCiteAsFallback).toBe(false);
  });

  it('updates flag when chrome.storage.onChanged fires', async () => {
    syncStore = { useCiteAsFallback: true };
    const mod = await import('../fallback-flag');
    mod.initFallbackFlag();
    await new Promise((r) => setTimeout(r, 10));
    expect(mod.useCiteAsFallback).toBe(true);

    // Simulate storage change
    for (const listener of storageListeners) {
      listener(
        { useCiteAsFallback: { oldValue: true, newValue: false } },
        'sync',
      );
    }
    expect(mod.useCiteAsFallback).toBe(false);
  });

  it('ignores changes from non-sync areas', async () => {
    syncStore = { useCiteAsFallback: true };
    const mod = await import('../fallback-flag');
    mod.initFallbackFlag();
    await new Promise((r) => setTimeout(r, 10));

    for (const listener of storageListeners) {
      listener(
        { useCiteAsFallback: { oldValue: true, newValue: false } },
        'local',
      );
    }
    // Should remain true (local area ignored)
    expect(mod.useCiteAsFallback).toBe(true);
  });
});
