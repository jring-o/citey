import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Fixture db.json metadata
// ---------------------------------------------------------------------------

const DB_FIXTURE = {
  dbVersion: '5400b15f606d',
  packageCount: 150,
  builtAt: '2026-04-17T04:42:20.815Z',
  packages: [],
};

// ---------------------------------------------------------------------------
// Chrome stub
// ---------------------------------------------------------------------------

let syncStore: Record<string, unknown> = {};

const chromeStub = {
  runtime: {
    getManifest: () => ({ version: '0.1.0' }),
    getURL: (path: string) => `chrome-extension://test-id/${path}`,
  },
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
};

vi.stubGlobal('chrome', chromeStub);

// Stub global fetch to return fixture db.json
const fetchMock = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(DB_FIXTURE),
  }),
) as unknown as typeof globalThis.fetch;

vi.stubGlobal('fetch', fetchMock);

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
  (fetchMock as ReturnType<typeof vi.fn>).mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(DB_FIXTURE),
    }),
  );
});

// ---------------------------------------------------------------------------
// Helper: render Options and wait for async effects
// ---------------------------------------------------------------------------

async function renderOptions() {
  const mod = await import('../Options');
  await act(async () => {
    render(<mod.Options />);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Options', () => {
  it('renders DB info with version/count/date matching expected format (exit criterion #4)', async () => {
    await renderOptions();
    const dbInfo = screen.getByText(
      /^Database v[0-9a-f]{12} \(\d+ packages, built \d{4}-\d{2}-\d{2}\)$/,
    );
    expect(dbInfo).toBeDefined();
    expect(dbInfo.textContent).toBe('Database v5400b15f606d (150 packages, built 2026-04-17)');
  });

  it('renders extension version from manifest', async () => {
    await renderOptions();
    expect(screen.getByText(/Citey v0\.1\.0/)).toBeDefined();
  });

  it("'Browse all packages' link href equals https://citey.scios.tech/packages (exit criterion #6)", async () => {
    await renderOptions();
    const link = screen.getByText('Browse all packages') as HTMLAnchorElement;
    expect(link.tagName).toBe('A');
    expect(link.href).toBe('https://citey.scios.tech/packages');
  });

  it('toggling the fallback toggle calls chrome.storage.sync.set with useCiteAsFallback (exit criterion #3)', async () => {
    await renderOptions();

    // The toggle should start checked (default true)
    const toggle = screen.getByRole('switch') as HTMLInputElement;
    expect(toggle.checked).toBe(true);

    // Click to toggle off
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(chromeStub.storage.sync.set).toHaveBeenCalledWith({
      useCiteAsFallback: false,
    });
  });

  it("selecting Plain text radio calls chrome.storage.sync.set with clipboardFormat:'plain'", async () => {
    await renderOptions();

    const plainRadio = screen.getByLabelText('Plain text') as HTMLInputElement;
    await act(async () => {
      fireEvent.click(plainRadio);
    });

    expect(chromeStub.storage.sync.set).toHaveBeenCalledWith({
      clipboardFormat: 'plain',
    });
  });

  it('renders the About section with project description', async () => {
    await renderOptions();
    expect(screen.getByText(/free, open-source Chrome extension/)).toBeDefined();
  });

  it('renders three section headings', async () => {
    await renderOptions();
    expect(screen.getByText('Database')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
    expect(screen.getByText('About')).toBeDefined();
  });
});
