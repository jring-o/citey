import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PackageHit } from '@citey/citation-model';

// ---------------------------------------------------------------------------
// Minimal chrome stub (swh.ts does not use chrome APIs)
// ---------------------------------------------------------------------------

vi.stubGlobal('chrome', {
  runtime: { onMessage: { addListener: vi.fn() }, getURL: vi.fn() },
});

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHit(repo?: string): PackageHit {
  return {
    package: {
      id: 'numpy',
      canonicalName: 'NumPy',
      aliases: ['numpy'],
      ecosystem: 'pypi',
      description: 'd',
      homepage: 'https://numpy.org',
      ...(repo !== undefined ? { repository: repo } : {}),
      citation: {
        title: 'NumPy',
        authors: [{ family: 'Harris', given: 'C', kind: 'person' }],
        year: '2020',
        url: 'https://numpy.org',
      },
      provenance: {
        source: 'hand-curated',
        curator: 't',
        dateAdded: '2025-01-01',
        lastReviewed: '2025-01-01',
      },
      versionPolicy: 'latest',
    },
    confidence: 'high',
    matchedAliases: ['numpy'],
  };
}

// ---------------------------------------------------------------------------
// fetchSwhCitation
// ---------------------------------------------------------------------------

describe('fetchSwhCitation', () => {
  it('hits /raw-intrinsic-metadata/citation/origin/ with bibtex format', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ format: 'bibtex', content: '@software{x,}\n', error: null }), {
        status: 200,
      }),
    );
    const { fetchSwhCitation } = await import('../swh');
    const out = await fetchSwhCitation('https://github.com/foo/bar', new AbortController().signal);
    expect(out).toBe('@software{x,}\n');
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const url = firstCall?.[0] as string;
    expect(url).toContain('/raw-intrinsic-metadata/citation/origin/');
    expect(url).toContain('citation_format=bibtex');
    expect(url).toContain('origin_url=https');
  });

  it('returns null on 404 (no metadata file)', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 404 }));
    const { fetchSwhCitation } = await import('../swh');
    const out = await fetchSwhCitation('https://github.com/foo/bar', new AbortController().signal);
    expect(out).toBeNull();
  });

  it('returns null when error field is set', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'boom' }), { status: 200 }),
    );
    const { fetchSwhCitation } = await import('../swh');
    const out = await fetchSwhCitation('https://github.com/foo/bar', new AbortController().signal);
    expect(out).toBeNull();
  });

  it('returns null on network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    const { fetchSwhCitation } = await import('../swh');
    const out = await fetchSwhCitation('https://github.com/foo/bar', new AbortController().signal);
    expect(out).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchLatestSnapshotSwhid
// ---------------------------------------------------------------------------

describe('fetchLatestSnapshotSwhid', () => {
  it('returns swh:1:snp:<hex> for a successful visit', async () => {
    const snap = '71bc55edf92d87fa1cc295d7effec3a938486d8d';
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'full', snapshot: snap }), { status: 200 }),
    );
    const { fetchLatestSnapshotSwhid } = await import('../swh');
    const out = await fetchLatestSnapshotSwhid(
      'https://github.com/numpy/numpy',
      new AbortController().signal,
    );
    expect(out).toBe(`swh:1:snp:${snap}`);
  });

  it('returns null for non-full / non-partial visit status', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'failed', snapshot: 'a'.repeat(40) }), { status: 200 }),
    );
    const { fetchLatestSnapshotSwhid } = await import('../swh');
    const out = await fetchLatestSnapshotSwhid(
      'https://github.com/x/y',
      new AbortController().signal,
    );
    expect(out).toBeNull();
  });

  it('returns null when snapshot is missing', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'full' }), { status: 200 }),
    );
    const { fetchLatestSnapshotSwhid } = await import('../swh');
    const out = await fetchLatestSnapshotSwhid(
      'https://github.com/x/y',
      new AbortController().signal,
    );
    expect(out).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// enrichWithSwh
// ---------------------------------------------------------------------------

describe('enrichWithSwh', () => {
  it('returns hit unchanged when package has no repository', async () => {
    const { enrichWithSwh } = await import('../swh');
    const hit = makeHit();
    const out = await enrichWithSwh(hit, new AbortController().signal);
    expect(out).toBe(hit);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('attaches swh.bibtex on citation success', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ format: 'bibtex', content: '@software{x,}\n', error: null }), {
        status: 200,
      }),
    );
    const { enrichWithSwh } = await import('../swh');
    const hit = makeHit('https://github.com/foo/bar');
    const out = await enrichWithSwh(hit, new AbortController().signal);
    expect(out.swh).toEqual({ bibtex: '@software{x,}\n' });
  });

  it('falls back to swh.swhid when citation 404s but visit succeeds', async () => {
    const snap = 'a'.repeat(40);
    fetchMock
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'full', snapshot: snap }), { status: 200 }),
      );
    const { enrichWithSwh } = await import('../swh');
    const hit = makeHit('https://github.com/foo/bar');
    const out = await enrichWithSwh(hit, new AbortController().signal);
    expect(out.swh).toEqual({ swhid: `swh:1:snp:${snap}` });
  });

  it('returns hit unchanged when both endpoints fail', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(new Response('{}', { status: 404 }));
    const { enrichWithSwh } = await import('../swh');
    const hit = makeHit('https://github.com/foo/bar');
    const out = await enrichWithSwh(hit, new AbortController().signal);
    expect(out.swh).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// enrichHitsWithSwh — timeout behavior
// ---------------------------------------------------------------------------

describe('enrichHitsWithSwh', () => {
  it('returns empty array unchanged', async () => {
    const { enrichHitsWithSwh } = await import('../swh');
    const out = await enrichHitsWithSwh([], 1000);
    expect(out).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves order of input hits', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ format: 'bibtex', content: '@A,', error: null }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ format: 'bibtex', content: '@B,', error: null }), {
          status: 200,
        }),
      );
    const a = makeHit('https://github.com/foo/a');
    const b = makeHit('https://github.com/foo/b');
    const { enrichHitsWithSwh } = await import('../swh');
    const out = await enrichHitsWithSwh([a, b], 5000);
    expect(out[0]?.swh?.bibtex).toBe('@A,');
    expect(out[1]?.swh?.bibtex).toBe('@B,');
  });
});
