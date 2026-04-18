import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ActionBar } from '../ActionBar';
import type { PackageHit } from '@citey/citation-model';

// ---------------------------------------------------------------------------
// Chrome API stubs
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();

  // Minimal chrome stubs
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
// Tests
// ---------------------------------------------------------------------------

describe('ActionBar', () => {
  it('renders three action buttons', () => {
    render(<ActionBar hits={hits} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(3);
  });

  it('renders Open HTML (Zotero) button', () => {
    render(<ActionBar hits={hits} />);
    expect(screen.getByText('Open HTML (Zotero)')).toBeDefined();
  });

  it('renders Export .bib button', () => {
    render(<ActionBar hits={hits} />);
    expect(screen.getByText('Export .bib')).toBeDefined();
  });

  it('renders Copy button', () => {
    render(<ActionBar hits={hits} />);
    expect(screen.getByText('Copy')).toBeDefined();
  });

  it('flips Copy label to "Copied!" on successful copy', async () => {
    // Mock successful clipboard
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
  });

  it('shows inline error when copy fails', async () => {
    // Mock failing clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    });

    // Also fail execCommand
    document.execCommand = vi.fn().mockReturnValue(false);

    render(<ActionBar hits={hits} />);
    const copyButton = screen.getByText('Copy');

    await act(async () => {
      copyButton.click();
    });

    const errorMsg = screen.getByRole('alert');
    expect(errorMsg.textContent).toContain("Couldn't copy");
  });

  it('has role="toolbar" with aria-label', () => {
    render(<ActionBar hits={hits} />);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar.getAttribute('aria-label')).toBe('Citation actions');
  });
});
