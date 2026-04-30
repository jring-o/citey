import { describe, it, expect } from 'vitest';
import type { Package } from '@citey/citation-model';
import { toBibTeX } from '../bibtex';
import { bibKeyFor, dedupeKeys } from '../bibkey';
import { escapeLatex } from '../escape';
import { bibFilename } from '../filename';

// ---------------------------------------------------------------------------
// Fixtures (new SoftwareCitation model)
// ---------------------------------------------------------------------------

const basePkg: Package = {
  id: 'numpy',
  canonicalName: 'NumPy',
  aliases: ['numpy'],
  ecosystem: 'pypi',
  description: 'Fundamental package for scientific computing with Python.',
  homepage: 'https://numpy.org',
  dois: ['10.1038/s41586-020-2649-2'],
  citation: {
    title: 'NumPy',
    authors: [{ family: 'Harris', given: 'Charles', kind: 'person' }],
    year: '2020',
    doi: '10.1038/s41586-020-2649-2',
  },
  provenance: {
    source: 'hand-curated',
    curator: 'test',
    dateAdded: '2025-01-01',
    lastReviewed: '2025-01-01',
  },
  versionPolicy: 'latest',
};

function makePkg(overrides: Partial<Package> & { id: string }): Package {
  return { ...basePkg, ...overrides };
}

const meta = { extensionVersion: '0.1.0', dbVersion: '20250401' };

// ---------------------------------------------------------------------------
// bibKeyFor
// ---------------------------------------------------------------------------

describe('bibKeyFor', () => {
  it('generates harris2020numpy for NumPy example', () => {
    expect(bibKeyFor(basePkg)).toBe('harris2020numpy');
  });

  it('sanitizes canonical name: strips non-alphanumeric, truncates to 16', () => {
    const pkg = makePkg({
      id: 'long-pkg',
      canonicalName: 'Super-Long_Package.Name!@#$%^&*()_+1234567890abcdefghij',
      citation: {
        title: 'Long',
        authors: [{ family: 'Smith', given: 'John', kind: 'person' }],
        year: '2023',
        url: 'https://example.com',
      },
    });
    expect(bibKeyFor(pkg)).toBe('smith2023superlongpackage');
  });

  it('handles citeAs alias gracefully (no citation, returns "unknown" + name)', () => {
    const pkg = makePkg({
      id: 'no-author',
      citation: undefined,
      citeAs: 'numpy',
    });
    const key = bibKeyFor(pkg);
    expect(key).toMatch(/^unknown/);
  });
});

// ---------------------------------------------------------------------------
// dedupeKeys
// ---------------------------------------------------------------------------

describe('dedupeKeys', () => {
  it('returns keys unchanged when no collisions', () => {
    expect(dedupeKeys(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('appends b, c for collisions', () => {
    expect(dedupeKeys(['key', 'key', 'key'])).toEqual(['key', 'keyb', 'keyc']);
  });

  it('handles mixed collisions', () => {
    expect(dedupeKeys(['x', 'y', 'x', 'z', 'y'])).toEqual(['x', 'y', 'xb', 'z', 'yb']);
  });
});

// ---------------------------------------------------------------------------
// escapeLatex (sanity)
// ---------------------------------------------------------------------------

describe('escapeLatex', () => {
  it('escapes BibTeX special characters', () => {
    expect(escapeLatex('a & b')).toContain('\\&');
    expect(escapeLatex('100%')).toContain('\\%');
  });
});

// ---------------------------------------------------------------------------
// toBibTeX
// ---------------------------------------------------------------------------

describe('toBibTeX', () => {
  it('always emits @software entries (Citey is software-only)', () => {
    const out = toBibTeX([basePkg], meta);
    expect(out).toContain('@software{harris2020numpy,');
    expect(out).not.toContain('@article');
    expect(out).not.toContain('@misc');
  });

  it('renders required fields (author, title, year) and optional doi', () => {
    const out = toBibTeX([basePkg], meta);
    expect(out).toContain('author = {Harris, Charles}');
    expect(out).toContain('title = {NumPy}');
    expect(out).toContain('year = {2020}');
    expect(out).toContain('doi = {10.1038/s41586-020-2649-2}');
  });

  it('includes optional version, url, publisher when present', () => {
    const pkg = makePkg({
      id: 'with-extras',
      citation: {
        title: 'Extras',
        authors: [{ family: 'Doe', given: 'Jane', kind: 'person' }],
        year: '2024',
        version: '1.2.3',
        url: 'https://example.com',
        publisher: 'Zenodo',
      },
    });
    const out = toBibTeX([pkg], meta);
    expect(out).toContain('version = {1.2.3}');
    expect(out).toContain('url = {https://example.com}');
    expect(out).toContain('publisher = {Zenodo}');
  });

  it('joins multiple authors with " and "', () => {
    const pkg = makePkg({
      id: 'multi',
      citation: {
        title: 'Multi',
        authors: [
          { family: 'Doe', given: 'Jane', kind: 'person' },
          { family: 'Roe', given: 'John', kind: 'person' },
        ],
        year: '2024',
        url: 'https://example.com',
      },
    });
    expect(toBibTeX([pkg], meta)).toContain('author = {Doe, Jane and Roe, John}');
  });

  it('skips packages without a citation (citeAs aliases)', () => {
    const alias = makePkg({
      id: 'alias',
      citation: undefined,
      citeAs: 'numpy',
    });
    const out = toBibTeX([basePkg, alias], meta);
    // Only one entry — the alias was skipped.
    expect((out.match(/@software\{/g) ?? []).length).toBe(1);
  });

  it('includes the standard header', () => {
    const out = toBibTeX([basePkg], meta);
    expect(out).toContain(`% Generated by Citey v${meta.extensionVersion}`);
    expect(out).toContain(`% Database v${meta.dbVersion}`);
    expect(out).toContain('% UTF-8');
  });

  // ---- Software Heritage integration ----

  it('passes SWH-rendered BibTeX through verbatim', () => {
    const swhBibtex =
      '@softwareversion{swh-rev-abc,\n' +
      '    author = "Doe, J.",\n' +
      '    title = "X",\n' +
      '    swhid = "swh:1:rev:' +
      'a'.repeat(40) +
      '"\n' +
      '}';
    const map = new Map([['numpy', { bibtex: swhBibtex }]]);
    const out = toBibTeX([basePkg], meta, map);
    expect(out).toContain(swhBibtex);
    expect(out).not.toContain('@software{harris2020numpy,');
  });

  it('embeds live SWHID in locally-constructed entry', () => {
    const swhid = 'swh:1:snp:' + 'a'.repeat(40);
    const map = new Map([['numpy', { swhid }]]);
    const out = toBibTeX([basePkg], meta, map);
    expect(out).toContain('@software{harris2020numpy,');
    expect(out).toContain(`swhid = {${swhid}}`);
  });

  it('falls back to as-of-admission swhid when no live SWH data', () => {
    const stored = 'swh:1:snp:' + 'b'.repeat(40);
    const pkg = makePkg({ id: 'numpy', swhid: stored });
    const out = toBibTeX([pkg], meta);
    expect(out).toContain(`swhid = {${stored}}`);
  });

  it('prefers live SWHID over as-of-admission', () => {
    const stored = 'swh:1:snp:' + 'b'.repeat(40);
    const live = 'swh:1:snp:' + 'c'.repeat(40);
    const pkg = makePkg({ id: 'numpy', swhid: stored });
    const map = new Map([['numpy', { swhid: live }]]);
    const out = toBibTeX([pkg], meta, map);
    expect(out).toContain(`swhid = {${live}}`);
    expect(out).not.toContain(`swhid = {${stored}}`);
  });

  it('omits swhid field when no SWH data is available anywhere', () => {
    const out = toBibTeX([basePkg], meta);
    expect(out).not.toContain('swhid =');
  });
});

// ---------------------------------------------------------------------------
// bibFilename — sanity
// ---------------------------------------------------------------------------

describe('bibFilename', () => {
  it('returns a non-empty filename ending in .bib', () => {
    const f = bibFilename(new Date());
    expect(f).toMatch(/\.bib$/);
    expect(f.length).toBeGreaterThan(4);
  });
});
