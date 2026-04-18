import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Minimal chrome stub (citeas.ts does not use chrome APIs directly, but
// citeas-to-package.ts uses crypto.subtle which is available in jsdom)
// ---------------------------------------------------------------------------

vi.stubGlobal('chrome', {
  runtime: { onMessage: { addListener: vi.fn() }, getURL: vi.fn() },
  storage: {
    sync: { get: vi.fn(() => Promise.resolve({})) },
    onChanged: { addListener: vi.fn() },
  },
});

// ---------------------------------------------------------------------------
// Mock fetch at the global level
// ---------------------------------------------------------------------------

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('lookupCiteAs', () => {
  it('builds the correct URL with email=citey%40scios.tech (exit criterion #4)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          name: 'NumPy',
          doi: '10.1234/numpy',
          url: 'https://numpy.org',
          authors: [{ family: 'Harris', given: 'Charles' }],
          year: '2020',
        }),
        { status: 200 },
      ),
    );

    const { lookupCiteAs } = await import('../citeas');
    const controller = new AbortController();
    await lookupCiteAs('numpy', controller.signal);

    expect(fetchMock).toHaveBeenCalledOnce();
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('email=citey%40scios.tech');
    expect(url).toContain('api.citeas.org/product/numpy');
  });

  it('returns a PackageHit on success', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          name: 'SciPy',
          doi: '10.5678/scipy',
          url: 'https://scipy.org',
          authors: [{ family: 'Virtanen', given: 'Pauli' }],
          year: '2020',
          publisher: 'Nature',
        }),
        { status: 200 },
      ),
    );

    const { lookupCiteAs } = await import('../citeas');
    const controller = new AbortController();
    const result = await lookupCiteAs('scipy', controller.signal);

    expect(result).not.toBeNull();
    expect(result!.package.canonicalName).toBe('SciPy');
    expect(result!.confidence).toBe('low');
    expect(result!.matchedAliases).toEqual(['scipy']);
    expect(result!.package.provenance.source).toBe('imported');
    expect(result!.package.provenance.curator).toBe('citeas');
    expect(result!.package.id).toMatch(/^citeas-[0-9a-f]{12}$/);
  });

  it('returns null when response is missing name', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          doi: '10.9999/unknown',
          url: 'https://example.com',
        }),
        { status: 200 },
      ),
    );

    const { lookupCiteAs } = await import('../citeas');
    const controller = new AbortController();

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const result = await lookupCiteAs('unknown-pkg', controller.signal);
    expect(result).toBeNull();
    infoSpy.mockRestore();
  });

  it('returns null on abort / timeout', async () => {
    fetchMock.mockImplementation(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (signal) {
            // If already aborted, reject immediately
            if (signal.aborted) {
              reject(new DOMException('Aborted', 'AbortError'));
              return;
            }
            signal.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }
        }),
    );

    const { lookupCiteAs } = await import('../citeas');
    const controller = new AbortController();

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    // Abort immediately before calling
    controller.abort();
    const result = await lookupCiteAs('timeout-pkg', controller.signal);
    expect(result).toBeNull();
    infoSpy.mockRestore();
  });

  it('returns null on fetch rejection', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network failure'));

    const { lookupCiteAs } = await import('../citeas');
    const controller = new AbortController();

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const result = await lookupCiteAs('fail-pkg', controller.signal);
    expect(result).toBeNull();
    infoSpy.mockRestore();
  });

  it('returns null on non-OK response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Not found', { status: 404 }));

    const { lookupCiteAs } = await import('../citeas');
    const controller = new AbortController();

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const result = await lookupCiteAs('notfound', controller.signal);
    expect(result).toBeNull();
    infoSpy.mockRestore();
  });
});
