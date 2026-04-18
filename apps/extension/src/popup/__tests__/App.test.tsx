import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { PackageHit, MatchResult } from '@citey/citation-model';

// ---------------------------------------------------------------------------
// We test App indirectly by testing each visual state rendered from
// the state machine's renderBody. Since App wires side effects via
// chrome APIs, we stub chrome and control responses.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeHit = (id: string, confidence: 'high' | 'low'): PackageHit => ({
  package: {
    id,
    canonicalName: id,
    aliases: [id],
    ecosystem: 'pypi',
    description: `${id} description`,
    homepage: `https://${id}.org`,
    citation: {
      title: id,
      authors: [{ family: 'Doe', given: 'Jane', kind: 'person' }],
      year: '2024',
      url: `https://${id}.org`,
    },
    provenance: {
      source: 'hand-curated',
      curator: 'test',
      dateAdded: '2025-01-01',
      lastReviewed: '2025-01-01',
    },
    versionPolicy: 'latest',
  },
  confidence,
  matchedAliases: [id],
});

const highHit = makeHit('numpy', 'high');
const lowHit = makeHit('numpyish', 'low');

// ---------------------------------------------------------------------------
// Chrome mock setup
// ---------------------------------------------------------------------------

let tabsQueryMock: ReturnType<typeof vi.fn>;
let tabsSendMessageMock: ReturnType<typeof vi.fn>;
let runtimeSendMessageMock: ReturnType<typeof vi.fn>;

function setupChrome() {
  tabsQueryMock = vi.fn();
  tabsSendMessageMock = vi.fn();
  runtimeSendMessageMock = vi.fn();

  vi.stubGlobal('chrome', {
    tabs: {
      query: tabsQueryMock,
      sendMessage: tabsSendMessageMock,
      create: vi.fn(),
    },
    runtime: {
      sendMessage: runtimeSendMessageMock,
      openOptionsPage: vi.fn(),
      getManifest: () => ({ version: '0.1.0' }),
    },
    storage: {
      sync: {
        get: vi.fn().mockResolvedValue({}),
      },
    },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  setupChrome();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Dynamic import after chrome is stubbed
async function renderApp() {
  // Clear module cache to get fresh App with our chrome mock
  const mod = await import('../App');
  return render(<mod.App />);
}

// ---------------------------------------------------------------------------
// State 1: Loading
// ---------------------------------------------------------------------------

describe('App — State 1: Loading', () => {
  it('shows loading spinner and text on mount', async () => {
    // tabs.query never resolves — keeps us in loading
    tabsQueryMock.mockReturnValue(new Promise(() => {}));

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText(/Looking for software/)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// State 2: Hits — high confidence
// ---------------------------------------------------------------------------

describe('App — State 2: Hits high confidence', () => {
  it('renders citation cards for high-confidence hits', async () => {
    const matchResult: MatchResult = { kind: 'hits', high: [highHit], low: [] };
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    tabsSendMessageMock.mockResolvedValue({ type: 'SELECTION_RESULT', requestId: '1', text: 'numpy' });
    runtimeSendMessageMock.mockResolvedValue({ type: 'MATCH_RESULT', requestId: '2', result: matchResult });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText('numpy')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// State 3: Hits — mixed
// ---------------------------------------------------------------------------

describe('App — State 3: Hits mixed', () => {
  it('renders high and low hits with divider', async () => {
    const matchResult: MatchResult = { kind: 'hits', high: [highHit], low: [lowHit] };
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    tabsSendMessageMock.mockResolvedValue({ type: 'SELECTION_RESULT', requestId: '1', text: 'numpy' });
    runtimeSendMessageMock.mockResolvedValue({ type: 'MATCH_RESULT', requestId: '2', result: matchResult });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText('numpy')).toBeDefined();
    expect(screen.getByText('numpyish')).toBeDefined();
    expect(screen.getByText(/Possible matches/)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// State 4: Hits — low confidence only
// ---------------------------------------------------------------------------

describe('App — State 4: Hits low only', () => {
  it('renders low-confidence hits with banner', async () => {
    const matchResult: MatchResult = { kind: 'hits', high: [], low: [lowHit] };
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    tabsSendMessageMock.mockResolvedValue({ type: 'SELECTION_RESULT', requestId: '1', text: 'numpyish' });
    runtimeSendMessageMock.mockResolvedValue({ type: 'MATCH_RESULT', requestId: '2', result: matchResult });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText('numpyish')).toBeDefined();
    expect(screen.getByText(/Low confidence/)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// State 5: Empty selection
// ---------------------------------------------------------------------------

describe('App — State 5: Empty selection', () => {
  it('shows empty selection message when text is empty', async () => {
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    tabsSendMessageMock.mockResolvedValue({ type: 'SELECTION_RESULT', requestId: '1', text: '' });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText(/Highlight some text/)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// State 6: Restricted page
// ---------------------------------------------------------------------------

describe('App — State 6: Restricted page', () => {
  it('shows restricted message for chrome:// URL', async () => {
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'chrome://settings' }]);

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText(/Chrome restricts access/)).toBeDefined();
  });

  it('shows restricted message when content script is unreachable', async () => {
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    tabsSendMessageMock.mockRejectedValue(
      new Error('Could not establish connection. Receiving end does not exist.'),
    );

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText(/Chrome restricts access/)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// State 7: No hits, fallback in flight
// ---------------------------------------------------------------------------

describe('App — State 7: Fallback in flight', () => {
  it('shows "Asking CiteAs" when miss with no-local reason', async () => {
    const matchResult: MatchResult = { kind: 'miss', reason: 'no-local' };
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    tabsSendMessageMock.mockResolvedValue({ type: 'SELECTION_RESULT', requestId: '1', text: 'obscure-pkg' });
    runtimeSendMessageMock.mockResolvedValue({ type: 'MATCH_RESULT', requestId: '2', result: matchResult });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText(/Asking CiteAs/)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// State 8: No hits, CiteAs hit
// ---------------------------------------------------------------------------

describe('App — State 8: CiteAs hit', () => {
  it('renders CiteAs hit with citeas confidence', async () => {
    const matchResult: MatchResult = { kind: 'fallback', source: 'citeas', hits: [highHit] };
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    tabsSendMessageMock.mockResolvedValue({ type: 'SELECTION_RESULT', requestId: '1', text: 'numpy' });
    runtimeSendMessageMock.mockResolvedValue({ type: 'MATCH_RESULT', requestId: '2', result: matchResult });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText('numpy')).toBeDefined();
    expect(screen.getByText('From CiteAs')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// State 9: No hits, total miss
// ---------------------------------------------------------------------------

describe('App — State 9: Total miss', () => {
  it('renders Did-we-miss full state', async () => {
    const matchResult: MatchResult = { kind: 'miss', reason: 'fallback-disabled' };
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    tabsSendMessageMock.mockResolvedValue({ type: 'SELECTION_RESULT', requestId: '1', text: 'unknown-pkg' });
    runtimeSendMessageMock.mockResolvedValue({ type: 'MATCH_RESULT', requestId: '2', result: matchResult });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText(/Help us add it/)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// State 10: Error (timeout)
// ---------------------------------------------------------------------------

describe('App — State 10: Error', () => {
  it('shows error state on timeout', async () => {
    // tabs.query never resolves, so the 4500ms timer fires
    tabsQueryMock.mockReturnValue(new Promise(() => {}));

    await act(async () => {
      await renderApp();
    });

    // Advance past the 4500ms timeout
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText(/Something went wrong/)).toBeDefined();
    expect(screen.getByText('Retry')).toBeDefined();
  });

  it('shows error state on generic error', async () => {
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    tabsSendMessageMock.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText(/Something went wrong/)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// aria-live on results region
// ---------------------------------------------------------------------------

describe('App — a11y', () => {
  it('has aria-live="polite" on the results region', async () => {
    tabsQueryMock.mockReturnValue(new Promise(() => {}));

    await act(async () => {
      await renderApp();
    });

    const main = document.querySelector('[aria-live="polite"]');
    expect(main).not.toBeNull();
  });
});
