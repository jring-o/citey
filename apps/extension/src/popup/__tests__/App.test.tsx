import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { PackageHit, MatchResult } from '@citey/citation-model';

// ---------------------------------------------------------------------------
// We test App indirectly by testing each visual state rendered from
// the state machine's renderBody. Since App wires side effects via
// chrome APIs, we stub chrome and control responses.
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
let scriptingExecuteScriptMock: ReturnType<typeof vi.fn>;
let runtimeSendMessageMock: ReturnType<typeof vi.fn>;

/** Helper: build a fake executeScript result (mimics InjectionResult[]). */
function execResult(text: string) {
  return [{ frameId: 0, result: text }];
}

function setupChrome() {
  tabsQueryMock = vi.fn();
  scriptingExecuteScriptMock = vi.fn();
  runtimeSendMessageMock = vi.fn();

  vi.stubGlobal('chrome', {
    tabs: {
      query: tabsQueryMock,
      create: vi.fn(),
    },
    scripting: {
      executeScript: scriptingExecuteScriptMock,
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
      session: {
        // Default: no pending query from the context menu, so the popup
        // falls through to chrome.scripting.executeScript.
        get: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue(undefined),
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

async function renderApp() {
  const mod = await import('../App');
  return render(<mod.App />);
}

describe('App — State 1: Loading', () => {
  it('shows loading spinner and text on mount', async () => {
    tabsQueryMock.mockReturnValue(new Promise(() => {}));

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText(/Looking for software/)).toBeDefined();
  });
});

describe('App — State 2: Hits high confidence', () => {
  it('renders citation cards for high-confidence hits', async () => {
    const matchResult: MatchResult = { kind: 'hits', high: [highHit], low: [] };
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    scriptingExecuteScriptMock.mockResolvedValue(execResult('numpy'));
    runtimeSendMessageMock.mockResolvedValue({ type: 'MATCH_RESULT', requestId: '2', result: matchResult });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText('numpy')).toBeDefined();
  });
});

describe('App — State 3: Hits mixed', () => {
  it('renders high and low hits with divider', async () => {
    const matchResult: MatchResult = { kind: 'hits', high: [highHit], low: [lowHit] };
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    scriptingExecuteScriptMock.mockResolvedValue(execResult('numpy'));
    runtimeSendMessageMock.mockResolvedValue({ type: 'MATCH_RESULT', requestId: '2', result: matchResult });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText('numpy')).toBeDefined();
    expect(screen.getByText('numpyish')).toBeDefined();
    expect(screen.getByText(/Possible matches/)).toBeDefined();
  });
});

describe('App — State 4: Hits low only', () => {
  it('renders low-confidence hits with banner', async () => {
    const matchResult: MatchResult = { kind: 'hits', high: [], low: [lowHit] };
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    scriptingExecuteScriptMock.mockResolvedValue(execResult('numpyish'));
    runtimeSendMessageMock.mockResolvedValue({ type: 'MATCH_RESULT', requestId: '2', result: matchResult });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText('numpyish')).toBeDefined();
    expect(screen.getByText(/Low confidence/)).toBeDefined();
  });
});

describe('App — State 5: Empty selection', () => {
  it('shows empty selection message when text is empty', async () => {
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    scriptingExecuteScriptMock.mockResolvedValue(execResult(''));

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText(/Highlight some text/)).toBeDefined();
  });

  it('returns the first non-empty frame across multiple frames (PDF.js / iframe case)', async () => {
    const matchResult: MatchResult = { kind: 'hits', high: [highHit], low: [] };
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com/file.pdf' }]);
    // Frame 0 (top page) has nothing, frame 1 (PDF.js iframe) has the
    // selected text. The popup should pick the non-empty result.
    scriptingExecuteScriptMock.mockResolvedValue([
      { frameId: 0, result: '' },
      { frameId: 99, result: 'numpy' },
    ]);
    runtimeSendMessageMock.mockResolvedValue({ type: 'MATCH_RESULT', requestId: '2', result: matchResult });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText('numpy')).toBeDefined();
  });

  it('uses the context-menu pending query (PDFium/right-click case) and skips executeScript', async () => {
    const matchResult: MatchResult = { kind: 'hits', high: [highHit], low: [] };
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com/file.pdf' }]);

    // Background script wrote the right-click selection here.
    const sessionGet = vi.fn().mockResolvedValue({ pendingQuery: 'numpy' });
    const sessionRemove = vi.fn().mockResolvedValue(undefined);
    (chrome as unknown as { storage: { session: { get: typeof sessionGet; remove: typeof sessionRemove } } })
      .storage.session.get = sessionGet;
    (chrome as unknown as { storage: { session: { get: typeof sessionGet; remove: typeof sessionRemove } } })
      .storage.session.remove = sessionRemove;

    runtimeSendMessageMock.mockResolvedValue({ type: 'MATCH_RESULT', requestId: '2', result: matchResult });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText('numpy')).toBeDefined();
    // Selection was taken from session storage, not from executeScript.
    expect(scriptingExecuteScriptMock).not.toHaveBeenCalled();
    // And the cached query was consumed.
    expect(sessionRemove).toHaveBeenCalledWith('pendingQuery');
  });
});

describe('App — State 6: Restricted page', () => {
  it('shows restricted message for chrome:// URL', async () => {
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'chrome://settings' }]);

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText(/Chrome restricts access/)).toBeDefined();
  });

  it('shows restricted message when scripting cannot inject', async () => {
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    scriptingExecuteScriptMock.mockRejectedValue(
      new Error('Cannot access contents of the page.'),
    );

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText(/Chrome restricts access/)).toBeDefined();
  });
});

describe('App — State 7: Fallback in flight', () => {
  it('shows "Asking CiteAs" when miss with no-local reason', async () => {
    const matchResult: MatchResult = { kind: 'miss', reason: 'no-local' };
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    scriptingExecuteScriptMock.mockResolvedValue(execResult('obscure-pkg'));
    runtimeSendMessageMock.mockResolvedValue({ type: 'MATCH_RESULT', requestId: '2', result: matchResult });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText(/Asking CiteAs/)).toBeDefined();
  });
});

describe('App — State 8: CiteAs hit', () => {
  it('renders CiteAs hit with citeas confidence', async () => {
    const matchResult: MatchResult = { kind: 'fallback', source: 'citeas', hits: [highHit] };
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    scriptingExecuteScriptMock.mockResolvedValue(execResult('numpy'));
    runtimeSendMessageMock.mockResolvedValue({ type: 'MATCH_RESULT', requestId: '2', result: matchResult });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText('numpy')).toBeDefined();
    expect(screen.getByText('From CiteAs')).toBeDefined();
  });
});

describe('App — State 9: Total miss', () => {
  it('renders Did-we-miss full state', async () => {
    const matchResult: MatchResult = { kind: 'miss', reason: 'fallback-disabled' };
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    scriptingExecuteScriptMock.mockResolvedValue(execResult('unknown-pkg'));
    runtimeSendMessageMock.mockResolvedValue({ type: 'MATCH_RESULT', requestId: '2', result: matchResult });

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText(/Help us add it/)).toBeDefined();
  });
});

describe('App — State 10: Error', () => {
  it('shows error state on timeout', async () => {
    tabsQueryMock.mockReturnValue(new Promise(() => {}));

    await act(async () => {
      await renderApp();
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText(/Something went wrong/)).toBeDefined();
    expect(screen.getByText('Retry')).toBeDefined();
  });

  it('shows error state on generic error', async () => {
    tabsQueryMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    scriptingExecuteScriptMock.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await renderApp();
    });

    expect(screen.getByText(/Something went wrong/)).toBeDefined();
  });
});

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
