import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Chrome stub
// ---------------------------------------------------------------------------

const getURLMock = vi.fn(() => 'chrome-extension://abc/db.json');

vi.stubGlobal('chrome', {
  runtime: {
    onMessage: { addListener: vi.fn() },
    getURL: getURLMock,
  },
  storage: {
    sync: { get: vi.fn(() => Promise.resolve({})) },
    onChanged: { addListener: vi.fn() },
  },
});

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal('fetch', fetchMock);

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const dbFixture = {
  packages: [
    {
      id: 'numpy',
      canonicalName: 'NumPy',
      aliases: ['numpy', 'np'],
      ecosystem: 'pypi',
      description: 'Numerical Python',
      homepage: 'https://numpy.org',
      citation: {
        title: 'NumPy',
        authors: [{ family: 'Harris', given: 'Charles', kind: 'person' }],
        year: '2020',
        url: 'https://numpy.org',
      },
      provenance: {
        source: 'hand-curated',
        curator: 'admin',
        dateAdded: '2024-01-01',
        lastReviewed: '2024-01-01',
      },
      versionPolicy: 'latest',
    },
  ],
  aliasIndex: {
    numpy: ['numpy'],
    np: ['numpy'],
  },
  dbVersion: '1.0.0',
  packageCount: 1,
  builtAt: '2024-06-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('loader', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    getURLMock.mockReturnValue('chrome-extension://abc/db.json');
    vi.resetModules();
  });

  it('loads and parses db.json into correct structures', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(dbFixture), { status: 200 }),
    );

    const { loadDb, _resetLoaderCache } = await import('../../db/loader');
    _resetLoaderCache();

    const db = await loadDb();
    expect(db).not.toBeNull();
    expect(db!.packages).toHaveLength(1);
    expect(db!.packages[0]!.id).toBe('numpy');
    expect(db!.byId.get('numpy')).toBeDefined();
    expect(db!.byId.get('numpy')!.canonicalName).toBe('NumPy');
    expect(db!.aliasIndex.get('numpy')).toEqual(['numpy']);
    expect(db!.aliasIndex.get('np')).toEqual(['numpy']);
    expect(db!.dbVersion).toBe('1.0.0');
    expect(db!.packageCount).toBe(1);
    expect(db!.builtAt).toBe('2024-06-01T00:00:00Z');
  });

  it('memoizes: second call returns same object without re-fetching', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(dbFixture), { status: 200 }),
    );

    const { loadDb, _resetLoaderCache } = await import('../../db/loader');
    _resetLoaderCache();

    const first = await loadDb();
    const second = await loadDb();
    expect(first).toBe(second);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('returns null when fetch rejects (exit criterion #6)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('File not found'));

    const { loadDb, _resetLoaderCache } = await import('../../db/loader');
    _resetLoaderCache();

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const db = await loadDb();
    expect(db).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('returns null when response is not OK', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Not found', { status: 404 }),
    );

    const { loadDb, _resetLoaderCache } = await import('../../db/loader');
    _resetLoaderCache();

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const db = await loadDb();
    expect(db).toBeNull();
    errorSpy.mockRestore();
  });

  it('uses chrome.runtime.getURL to build the fetch URL', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(dbFixture), { status: 200 }),
    );

    const { loadDb, _resetLoaderCache } = await import('../../db/loader');
    _resetLoaderCache();

    await loadDb();
    expect(getURLMock).toHaveBeenCalledWith('db.json');
    expect(fetchMock).toHaveBeenCalledWith('chrome-extension://abc/db.json');
  });
});
