import { describe, it, expect } from 'vitest';
import type { Author, Package } from '@citey/citation-model';
import { toPlainText, formatAuthors } from '../plain-text';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAuthor(family: string, given: string): Author {
  return { family, given, kind: 'person' };
}

function makePkg(
  id: string,
  authors: Author[],
  overrides?: Partial<Package>,
): Package {
  return {
    id,
    canonicalName: id,
    aliases: [id],
    ecosystem: 'pypi',
    description: `${id} package`,
    homepage: `https://${id}.org`,
    citation: {
      title: id,
      authors,
      year: '2023',
      url: `https://${id}.org`,
    },
    provenance: {
      source: 'hand-curated',
      curator: 'test',
      dateAdded: '2025-01-01',
      lastReviewed: '2025-01-01',
    },
    versionPolicy: 'latest',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Author formatting
// ---------------------------------------------------------------------------

describe('formatAuthors', () => {
  it('renders 1 author as "Last, F."', () => {
    expect(formatAuthors([makeAuthor('Harris', 'Charles')])).toBe('Harris, C.');
  });

  it('renders 2 authors with &', () => {
    expect(
      formatAuthors([
        makeAuthor('Harris', 'Charles'),
        makeAuthor('Millman', 'K. Jarrod'),
      ]),
    ).toBe('Harris, C. & Millman, K.');
  });

  it('renders 3 authors with Oxford comma + &', () => {
    expect(
      formatAuthors([
        makeAuthor('Harris', 'Charles'),
        makeAuthor('Millman', 'K. Jarrod'),
        makeAuthor('van der Walt', 'Stefan'),
      ]),
    ).toBe('Harris, C., Millman, K., & van der Walt, S.');
  });

  it('renders 8 authors with Oxford comma + &', () => {
    const authors = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((f) =>
      makeAuthor(f, `X${f.toLowerCase()}`),
    );
    expect(formatAuthors(authors)).toBe(
      'A, X., B, X., C, X., D, X., E, X., F, X., G, X., & H, X.',
    );
  });

  it('renders 9 authors as first 8 + et al.', () => {
    const authors = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((f) =>
      makeAuthor(f, `X${f.toLowerCase()}`),
    );
    const result = formatAuthors(authors);
    expect(result).toContain(', et al.');
    expect(result).not.toContain('I, X.');
  });
});

// ---------------------------------------------------------------------------
// toPlainText
// ---------------------------------------------------------------------------

describe('toPlainText', () => {
  it('renders a basic citation', () => {
    const pkg = makePkg('pkg', [makeAuthor('Last', 'First')]);
    const result = toPlainText([pkg]);
    expect(result).toBe(
      'Last, F. (2023). pkg. Software. https://pkg.org.',
    );
  });

  it('uses DOI URL over citation URL when DOI is present', () => {
    const pkg = makePkg('mypkg', [makeAuthor('A', 'X')], {
      citation: {
        title: 'mypkg',
        authors: [makeAuthor('A', 'X')],
        year: '2023',
        doi: '10.1234/mypkg',
      },
    });
    expect(toPlainText([pkg])).toContain('https://doi.org/10.1234/mypkg');
  });

  it('separates entries with blank line', () => {
    const pkg1 = makePkg('pkg1', [makeAuthor('A', 'X')]);
    const pkg2 = makePkg('pkg2', [makeAuthor('B', 'Y')]);
    const parts = toPlainText([pkg1, pkg2]).split('\n\n');
    expect(parts).toHaveLength(2);
  });

  it('uses publisher when present, else "Software"', () => {
    const withPub = makePkg('p', [makeAuthor('A', 'X')], {
      citation: {
        title: 'p',
        authors: [makeAuthor('A', 'X')],
        year: '2023',
        url: 'https://p.org',
        publisher: 'Zenodo',
      },
    });
    expect(toPlainText([withPub])).toContain('Zenodo');

    const noPub = makePkg('q', [makeAuthor('A', 'X')]);
    expect(toPlainText([noPub])).toContain('Software');
  });

  it('includes version when present', () => {
    const pkg = makePkg('p', [makeAuthor('A', 'X')], {
      citation: {
        title: 'p',
        authors: [makeAuthor('A', 'X')],
        year: '2023',
        version: '1.2.3',
        url: 'https://p.org',
      },
    });
    expect(toPlainText([pkg])).toContain('(version 1.2.3)');
  });

  it('skips packages without a citation (citeAs aliases)', () => {
    const real = makePkg('real', [makeAuthor('A', 'X')]);
    const alias: Package = {
      id: 'alias',
      canonicalName: 'alias',
      aliases: ['alias'],
      ecosystem: 'pypi',
      description: 'alias',
      provenance: {
        source: 'hand-curated',
        curator: 'test',
        dateAdded: '2025-01-01',
        lastReviewed: '2025-01-01',
      },
      versionPolicy: 'unversioned',
      citeAs: 'real',
    };
    const result = toPlainText([real, alias]);
    expect(result.split('\n\n')).toHaveLength(1);
  });
});
