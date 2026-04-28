import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractFromGithub,
  parseGithubUrl,
  ExtractError,
} from '../extract';

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal('fetch', fetchMock);
beforeEach(() => {
  fetchMock.mockReset();
});

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

// ─── Helpers for common mock setups ───

function mockMinimalRepo(overrides: Record<string, unknown> = {}) {
  return jsonResponse({
    name: 'cat',
    html_url: 'https://github.com/octo/cat',
    description: null,
    topics: [],
    license: null,
    ...overrides,
  });
}

function mockRelease(overrides: Record<string, unknown> = {}) {
  return jsonResponse({
    tag_name: 'v1.0.0',
    published_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });
}

// ─── 11.2.1 Happy path ───

describe('happy path', () => {
  it('extracts all fields from a complete repo', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          name: 'cat',
          html_url: 'https://github.com/octo/cat',
          description: 'A cat repo',
          topics: ['cats', 'meow'],
          license: { spdx_id: 'MIT' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          tag_name: 'v1.2.3',
          published_at: '2024-06-01T10:00:00Z',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          { login: 'alice', type: 'User' },
          { login: 'bob', type: 'User' },
          { login: 'carol', type: 'User' },
        ]),
      )
      .mockResolvedValueOnce(jsonResponse({ name: 'Alice Anderson' }))
      .mockResolvedValueOnce(jsonResponse({ name: 'Bob Brown' }))
      .mockResolvedValueOnce(jsonResponse({ name: 'Carol Cole' }));

    const result = await extractFromGithub('https://github.com/octo/cat');

    expect(result).toEqual({
      title: 'cat',
      version: '1.2.3',
      dateReleased: '2024-06-01',
      repositoryCode: 'https://github.com/octo/cat',
      url: 'https://github.com/octo/cat',
      license: 'MIT',
      keywords: 'cats, meow',
      abstract: 'A cat repo',
      authors: [
        { family: 'Anderson', given: 'Alice', orcid: '', affiliation: '', kind: 'person' },
        { family: 'Brown', given: 'Bob', orcid: '', affiliation: '', kind: 'person' },
        { family: 'Cole', given: 'Carol', orcid: '', affiliation: '', kind: 'person' },
      ],
    });

    // No commits-fallback fetch occurred — exactly 6 calls
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });
});

// ─── 11.2.2 No releases ───

describe('no releases', () => {
  it('falls back to commit date when releases returns 404', async () => {
    fetchMock
      .mockResolvedValueOnce(mockMinimalRepo())
      .mockResolvedValueOnce(jsonResponse({}, 404))
      .mockResolvedValueOnce(
        jsonResponse([
          { commit: { author: { date: '2024-03-15T08:00:00Z' } } },
        ]),
      )
      .mockResolvedValueOnce(jsonResponse([]));

    const result = await extractFromGithub('https://github.com/octo/cat');

    expect(result.version).toBeUndefined();
    expect(result.dateReleased).toBe('2024-03-15');
    expect(result.authors).toEqual([]);
    // No /users calls — exactly 4 fetches
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

// ─── 11.2.3 All-bot contributors ───

describe('all-bot contributors', () => {
  it('returns empty authors when all contributors are bots', async () => {
    fetchMock
      .mockResolvedValueOnce(mockMinimalRepo())
      .mockResolvedValueOnce(mockRelease())
      .mockResolvedValueOnce(
        jsonResponse([
          { login: 'dependabot[bot]', type: 'Bot' },
          { login: 'github-actions', type: 'User' },
          { login: 'renovate[bot]', type: 'User' },
        ]),
      );

    const result = await extractFromGithub('https://github.com/octo/cat');

    expect(result.authors).toEqual([]);
    // No /users calls — exactly 3 fetches
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

// ─── 11.2.4 Repo not found ───

describe('repo not found', () => {
  it('throws ExtractError with code not_found on 404', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404));

    const promise = extractFromGithub('https://github.com/octo/cat');

    await expect(promise).rejects.toBeInstanceOf(ExtractError);
    await expect(
      extractFromGithub('https://github.com/octo/cat').catch((e) => e.code),
    ).resolves.toBe('not_found');
  });
});

// ─── 11.2.5 Rate limited ───

describe('rate limited', () => {
  it('throws ExtractError with code rate_limited and resetAt', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({}, 403, {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1700000000',
      }),
    );

    const promise = extractFromGithub('https://github.com/octo/cat');

    await expect(promise).rejects.toBeInstanceOf(ExtractError);

    try {
      await extractFromGithub('https://github.com/octo/cat');
    } catch (e) {
      const err = e as ExtractError;
      expect(err.code).toBe('rate_limited');
      expect(err.resetAt).toBe(new Date(1700000000 * 1000).toISOString());
    }
  });
});

// ─── 11.2.6 NOASSERTION license ───

describe('NOASSERTION license', () => {
  it('omits license key when spdx_id is NOASSERTION', async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockMinimalRepo({ license: { spdx_id: 'NOASSERTION' } }),
      )
      .mockResolvedValueOnce(mockRelease())
      .mockResolvedValueOnce(jsonResponse([]));

    const result = await extractFromGithub('https://github.com/octo/cat');

    expect(result.license).toBeUndefined();
    expect('license' in result).toBe(false);
  });
});

// ─── 11.2.7 URL normalization matrix ───

describe('URL normalization matrix', () => {
  const validCases: [string, { owner: string; repo: string }][] = [
    ['https://github.com/owner/repo', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo/', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo.git', { owner: 'owner', repo: 'repo' }],
    ['http://github.com/owner/repo', { owner: 'owner', repo: 'repo' }],
    ['https://www.github.com/owner/repo', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo?ref=main', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo#readme', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo/tree/main', { owner: 'owner', repo: 'repo' }],
  ];

  const nullCases: string[] = [
    'https://gitlab.com/owner/repo',
    'git@github.com:owner/repo.git',
    'owner/repo',
    'https://github.com/owner',
    'https://github.com/',
    '',
    '   ',
    'https://github.com/owner/repo$$$',
  ];

  describe('parseGithubUrl returns expected result', () => {
    it.each(validCases)('parses %s correctly', (input, expected) => {
      expect(parseGithubUrl(input)).toEqual(expected);
    });

    it.each(nullCases)('returns null for %s', (input) => {
      expect(parseGithubUrl(input)).toBeNull();
    });
  });

  describe('extractFromGithub hits correct API URL for valid inputs', () => {
    it.each(validCases)(
      'for %s calls /repos/owner/repo',
      async (input) => {
        fetchMock.mockReset();
        fetchMock
          .mockResolvedValueOnce(mockMinimalRepo())
          .mockResolvedValueOnce(jsonResponse({}, 404))
          .mockResolvedValueOnce(jsonResponse([]))
          .mockResolvedValueOnce(jsonResponse([]));

        await extractFromGithub(input);

        const firstCall = fetchMock.mock.calls[0];
        expect(firstCall).toBeDefined();
        expect(firstCall?.[0]).toBe('https://api.github.com/repos/owner/repo');
      },
    );
  });

  describe('extractFromGithub throws for null-case inputs', () => {
    it.each(nullCases)('throws ExtractError for %s', async (input) => {
      await expect(extractFromGithub(input)).rejects.toBeInstanceOf(ExtractError);
      await expect(extractFromGithub(input).catch((e) => e.code)).resolves.toBe(
        'invalid_url',
      );
    });
  });
});

// ─── 11.2.8 Name splitting matrix ───

describe('name splitting matrix', () => {
  const nameCases: [string, string, string][] = [
    ['Doe, Jane', 'Doe', 'Jane'],
    ['Jane Doe', 'Doe', 'Jane'],
    ['Mary Jane Doe', 'Doe', 'Mary Jane'],
    ['  octocat  ', 'octocat', ''],
    ['  Jane   Doe  ', 'Doe', 'Jane'],
  ];

  it.each(nameCases)(
    'splits "%s" into family="%s", given="%s"',
    async (nameInput, expectedFamily, expectedGiven) => {
      fetchMock.mockReset();
      fetchMock
        .mockResolvedValueOnce(mockMinimalRepo())
        .mockResolvedValueOnce(mockRelease())
        .mockResolvedValueOnce(
          jsonResponse([{ login: 'testuser', type: 'User' }]),
        )
        .mockResolvedValueOnce(jsonResponse({ name: nameInput }));

      const result = await extractFromGithub('https://github.com/octo/cat');

      expect(result.authors).toHaveLength(1);
      const author = result.authors?.[0];
      expect(author?.family).toBe(expectedFamily);
      expect(author?.given).toBe(expectedGiven);
    },
  );

  it('sets kind to person for single-token name (D009)', async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(mockMinimalRepo())
      .mockResolvedValueOnce(mockRelease())
      .mockResolvedValueOnce(
        jsonResponse([{ login: 'testuser', type: 'User' }]),
      )
      .mockResolvedValueOnce(jsonResponse({ name: '  octocat  ' }));

    const result = await extractFromGithub('https://github.com/octo/cat');

    expect(result.authors?.[0]?.kind).toBe('person');
  });
});
