import { describe, it, expect } from 'vitest';
import type { Package } from '@citey/citation-model';
import { toZoteroHtml } from '../zotero-html';

// ---------------------------------------------------------------------------
// Fixtures (new SoftwareCitation model)
// ---------------------------------------------------------------------------

const numpyPkg: Package = {
  id: 'numpy',
  canonicalName: 'NumPy',
  aliases: ['numpy'],
  ecosystem: 'pypi',
  description: 'Fundamental package for scientific computing with Python.',
  homepage: 'https://numpy.org',
  dois: ['10.1038/s41586-020-2649-2'],
  citation: {
    title: 'NumPy',
    authors: [
      { family: 'Harris', given: 'Charles', kind: 'person' },
      { family: 'Millman', given: 'K. Jarrod', kind: 'person' },
    ],
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

const noDOIPkg: Package = {
  id: 'nodoipkg',
  canonicalName: 'NoDOI',
  aliases: ['nodoipkg'],
  ecosystem: 'npm',
  description: 'A package with no DOI.',
  homepage: 'https://example.com',
  citation: {
    title: 'NoDOI',
    authors: [{ family: 'Doe', given: 'Jane', kind: 'person' }],
    year: '2024',
    url: 'https://example.com',
  },
  provenance: {
    source: 'hand-curated',
    curator: 'test',
    dateAdded: '2025-01-01',
    lastReviewed: '2025-01-01',
  },
  versionPolicy: 'latest',
};

const meta = { extensionVersion: '0.1.0', dbVersion: '20250401' };

describe('toZoteroHtml', () => {
  it('starts with <!DOCTYPE html> and contains structural elements', () => {
    const html = toZoteroHtml([numpyPkg], meta);
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('</html>');
  });

  it('contains a COinS Z3988 span per package', () => {
    const html = toZoteroHtml([numpyPkg, noDOIPkg], meta);
    expect((html.match(/<span class="Z3988"/g) ?? []).length).toBe(2);
  });

  it('always emits the software COinS genre (no entry-type variation)', () => {
    const html = toZoteroHtml([numpyPkg], meta);
    expect(html).toContain('rft.genre=software');
    expect(html).not.toContain('rft.genre=article');
    expect(html).not.toContain('rft.genre=book');
  });

  it('emits citation_title meta per package', () => {
    const html = toZoteroHtml([numpyPkg, noDOIPkg], meta);
    expect((html.match(/<meta name="citation_title"/g) ?? []).length).toBe(2);
    expect(html).toContain('<meta name="citation_title" content="NumPy">');
  });

  it('emits citation_author meta tags', () => {
    const html = toZoteroHtml([numpyPkg], meta);
    expect(html).toContain(
      '<meta name="citation_author" content="Harris, Charles">',
    );
    expect(html).toContain(
      '<meta name="citation_author" content="Millman, K. Jarrod">',
    );
  });

  it('emits DOI anchor when DOI exists', () => {
    const html = toZoteroHtml([numpyPkg], meta);
    expect(html).toContain('href="https://doi.org/10.1038/s41586-020-2649-2"');
  });

  it('falls back to citation URL when no DOI', () => {
    const html = toZoteroHtml([noDOIPkg], meta);
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain('href="https://doi.org/');
  });

  it('skips packages without a citation (citeAs aliases)', () => {
    const alias: Package = {
      id: 'alias',
      canonicalName: 'alias',
      aliases: ['alias'],
      ecosystem: 'pypi',
      description: 'alias',
      provenance: numpyPkg.provenance,
      versionPolicy: 'unversioned',
      citeAs: 'numpy',
    };
    const html = toZoteroHtml([numpyPkg, alias], meta);
    expect((html.match(/<section class="citation">/g) ?? []).length).toBe(1);
  });

  it('escapes HTML special characters in content', () => {
    const pkg: Package = {
      ...numpyPkg,
      id: 'html-escape',
      canonicalName: 'Test<>&"Pkg',
      description: 'A <b>bold</b> & "quoted" description',
      citation: {
        title: 'Test<>&"Pkg',
        authors: [{ family: 'Doe', given: 'Jane', kind: 'person' }],
        year: '2023',
        url: 'https://example.com',
      },
    };
    const html = toZoteroHtml([pkg], meta);
    expect(html).not.toContain('<b>bold</b>');
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(html).toContain('&amp;');
  });
});
