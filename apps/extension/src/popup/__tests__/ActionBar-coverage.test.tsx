import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ActionBar } from '../ActionBar';
import type { PackageHit } from '@citey/citation-model';

// ---------------------------------------------------------------------------
// Chrome API stubs
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
  vi.useFakeTimers();

  const chromeMock = {
    runtime: {
      getManifest: () => ({ version: '0.1.0' }),
    },
    storage: {
      sync: {
        get: vi.fn().mockResolvedValue({}),
      },
    },
    tabs: {
      create: vi.fn(),
    },
  };

  vi.stubGlobal('chrome', chromeMock);
});

afterEach(() => {
  vi.useRealTimers();
});

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

const hits: PackageHit[] = [makeHit('numpy', 'high')];

// ---------------------------------------------------------------------------
// packagesForExport filtering (§5.1.3)
// ---------------------------------------------------------------------------

describe('ActionBar — packagesForExport filtering', () => {
  it('exports only high-confidence hits when mixed hits are provided', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    const mixedHits: PackageHit[] = [
      makeHit('numpy', 'high'),
      makeHit('numpyish', 'low'),
    ];

    render(<ActionBar hits={mixedHits} />);
    const copyButton = screen.getByText('Copy');

    await act(async () => {
      copyButton.click();
    });

    // The copied text should contain 'numpy' (high) but NOT 'numpyish' (low)
    const copiedText = writeTextMock.mock.calls[0][0] as string;
    expect(copiedText).toContain('numpy');
    expect(copiedText).not.toContain('numpyish');
  });

  it('exports low-confidence hits when no high-confidence hits exist', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    const lowOnlyHits: PackageHit[] = [makeHit('numpyish', 'low')];

    render(<ActionBar hits={lowOnlyHits} />);
    const copyButton = screen.getByText('Copy');

    await act(async () => {
      copyButton.click();
    });

    const copiedText = writeTextMock.mock.calls[0][0] as string;
    expect(copiedText).toContain('numpyish');
  });
});

// ---------------------------------------------------------------------------
// Export .bib button
// ---------------------------------------------------------------------------

describe('ActionBar — Export .bib', () => {
  it('creates a download link when Export .bib is clicked', async () => {
    // Spy on anchor click
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: any) => {
      const el = originalCreateElement(tag, options);
      if (tag === 'a') {
        vi.spyOn(el, 'click').mockImplementation(clickSpy);
      }
      return el;
    });

    // Stub URL.createObjectURL
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectURLMock,
      revokeObjectURL: vi.fn(),
    });

    render(<ActionBar hits={hits} />);
    const bibButton = screen.getByText('Export .bib');

    await act(async () => {
      bibButton.click();
    });

    // A Blob was passed to URL.createObjectURL
    expect(createObjectURLMock).toHaveBeenCalledOnce();
    // Anchor click was triggered for download
    expect(clickSpy).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Copy with plain text format
// ---------------------------------------------------------------------------

describe('ActionBar — Copy with plain text format', () => {
  it('copies plain text when clipboardFormat is "plain"', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    // Override chrome.storage.sync.get to return plain format
    vi.stubGlobal('chrome', {
      runtime: {
        getManifest: () => ({ version: '0.1.0' }),
      },
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue({ clipboardFormat: 'plain' }),
        },
      },
      tabs: {
        create: vi.fn(),
      },
    });

    render(<ActionBar hits={hits} />);
    const copyButton = screen.getByText('Copy');

    await act(async () => {
      copyButton.click();
    });

    // Plain text format should NOT contain BibTeX markers like @software{
    const copiedText = writeTextMock.mock.calls[0][0] as string;
    expect(copiedText).not.toContain('@software{');
  });
});

// ---------------------------------------------------------------------------
// Copy label revert after timeout
// ---------------------------------------------------------------------------

describe('ActionBar — Copy label timeout', () => {
  it('reverts Copy label from "Copied!" back to "Copy" after 1500ms', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<ActionBar hits={hits} />);
    const copyButton = screen.getByText('Copy');

    await act(async () => {
      copyButton.click();
    });

    expect(screen.getByText('Copied!')).toBeDefined();

    // Advance past the 1500ms timeout
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText('Copy')).toBeDefined();
  });
});
