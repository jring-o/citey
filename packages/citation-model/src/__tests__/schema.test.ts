import { describe, it, expect } from 'vitest';
import { packageSchema, softwareCitationSchema, authorSchema } from '../index.js';

// ---------------------------------------------------------------------------
// authorSchema
// ---------------------------------------------------------------------------

describe('authorSchema', () => {
  it('accepts a minimal valid person', () => {
    const r = authorSchema.safeParse({
      family: 'Doe',
      given: 'Jane',
      kind: 'person',
    });
    expect(r.success).toBe(true);
  });

  it('accepts an organization with empty given', () => {
    const r = authorSchema.safeParse({
      family: 'Astropy Collaboration',
      given: '',
      kind: 'organization',
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing family', () => {
    const r = authorSchema.safeParse({ given: 'Jane', kind: 'person' });
    expect(r.success).toBe(false);
  });

  it('rejects bad ORCID format', () => {
    const r = authorSchema.safeParse({
      family: 'Doe',
      given: 'Jane',
      kind: 'person',
      orcid: '1234',
    });
    expect(r.success).toBe(false);
  });

  it('rejects ORCID with bad checksum', () => {
    const r = authorSchema.safeParse({
      family: 'Doe',
      given: 'Jane',
      kind: 'person',
      orcid: '0000-0002-1825-0090',
    });
    expect(r.success).toBe(false);
  });

  it('accepts a valid ORCID', () => {
    const r = authorSchema.safeParse({
      family: 'Doe',
      given: 'Jane',
      kind: 'person',
      orcid: '0000-0002-1825-0097',
    });
    expect(r.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// softwareCitationSchema
// ---------------------------------------------------------------------------

const validCitation = {
  title: 'Test',
  authors: [{ family: 'Doe', given: 'Jane', kind: 'person' as const }],
  year: '2024',
  doi: '10.5281/zenodo.1234567',
};

describe('softwareCitationSchema', () => {
  it('accepts a minimal valid citation with DOI', () => {
    expect(softwareCitationSchema.safeParse(validCitation).success).toBe(true);
  });

  it('accepts a minimal valid citation with URL instead of DOI', () => {
    const r = softwareCitationSchema.safeParse({
      title: validCitation.title,
      authors: validCitation.authors,
      year: validCitation.year,
      url: 'https://example.com',
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing both DOI and URL', () => {
    const r = softwareCitationSchema.safeParse({
      title: 'Test',
      authors: [{ family: 'Doe', given: 'Jane', kind: 'person' }],
      year: '2024',
    });
    expect(r.success).toBe(false);
  });

  it('rejects empty title', () => {
    const r = softwareCitationSchema.safeParse({ ...validCitation, title: '' });
    expect(r.success).toBe(false);
  });

  it('rejects empty authors array', () => {
    const r = softwareCitationSchema.safeParse({
      ...validCitation,
      authors: [],
    });
    expect(r.success).toBe(false);
  });

  it('rejects non-4-digit year', () => {
    const r = softwareCitationSchema.safeParse({ ...validCitation, year: '99' });
    expect(r.success).toBe(false);
  });

  it('rejects out-of-range year (1969)', () => {
    const r = softwareCitationSchema.safeParse({
      ...validCitation,
      year: '1969',
    });
    expect(r.success).toBe(false);
  });

  it('accepts year at upper bound (currentYear + 1)', () => {
    const next = new Date().getFullYear() + 1;
    const r = softwareCitationSchema.safeParse({
      ...validCitation,
      year: String(next),
    });
    expect(r.success).toBe(true);
  });

  it('rejects malformed DOI', () => {
    const r = softwareCitationSchema.safeParse({
      ...validCitation,
      doi: 'not-a-doi',
    });
    expect(r.success).toBe(false);
  });

  it('rejects malformed URL', () => {
    const r = softwareCitationSchema.safeParse({
      title: 'Test',
      authors: [{ family: 'Doe', given: 'Jane', kind: 'person' }],
      year: '2024',
      url: 'not-a-url',
    });
    expect(r.success).toBe(false);
  });

  it('accepts optional version and publisher', () => {
    const r = softwareCitationSchema.safeParse({
      ...validCitation,
      version: '1.0.0',
      publisher: 'Zenodo',
    });
    expect(r.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// packageSchema
// ---------------------------------------------------------------------------

const validPkg = {
  id: 'numpy',
  canonicalName: 'NumPy',
  aliases: ['numpy'],
  ecosystem: 'pypi' as const,
  description: 'Fundamental package for scientific computing.',
  homepage: 'https://numpy.org',
  citation: validCitation,
  provenance: {
    source: 'hand-curated' as const,
    curator: 'test',
    dateAdded: '2025-01-01',
    lastReviewed: '2025-01-01',
  },
  versionPolicy: 'latest' as const,
};

describe('packageSchema', () => {
  it('accepts a minimal valid primary package', () => {
    expect(packageSchema.safeParse(validPkg).success).toBe(true);
  });

  it('rejects bad id format (uppercase)', () => {
    const r = packageSchema.safeParse({ ...validPkg, id: 'NumPy' });
    expect(r.success).toBe(false);
  });

  it('rejects when aliases do not include lowercased canonicalName', () => {
    const r = packageSchema.safeParse({
      ...validPkg,
      aliases: ['something-else'],
    });
    expect(r.success).toBe(false);
  });

  it('rejects duplicate aliases', () => {
    const r = packageSchema.safeParse({
      ...validPkg,
      aliases: ['numpy', 'numpy'],
    });
    expect(r.success).toBe(false);
  });

  it('rejects unknown SPDX license', () => {
    const r = packageSchema.safeParse({
      ...validPkg,
      license: 'NOT-A-LICENSE',
    });
    expect(r.success).toBe(false);
  });

  it('accepts a known SPDX license', () => {
    const r = packageSchema.safeParse({ ...validPkg, license: 'MIT' });
    expect(r.success).toBe(true);
  });

  it('rejects primary package without citation', () => {
    const withoutCitation: Record<string, unknown> = { ...validPkg };
    delete withoutCitation['citation'];
    const r = packageSchema.safeParse(withoutCitation);
    expect(r.success).toBe(false);
  });

  it('rejects primary package without homepage', () => {
    const withoutHomepage: Record<string, unknown> = { ...validPkg };
    delete withoutHomepage['homepage'];
    const r = packageSchema.safeParse(withoutHomepage);
    expect(r.success).toBe(false);
  });

  // ---- citeAs alias entries ----

  const aliasPkg = {
    id: 'numpy-array',
    canonicalName: 'numpy.array',
    aliases: ['numpy.array'],
    ecosystem: 'pypi' as const,
    description: 'Sub-module of NumPy',
    citeAs: 'numpy',
    provenance: validPkg.provenance,
    versionPolicy: 'unversioned' as const,
  };

  it('accepts a citeAs alias entry without homepage or citation', () => {
    expect(packageSchema.safeParse(aliasPkg).success).toBe(true);
  });

  it('rejects citeAs alias that also declares citation', () => {
    const r = packageSchema.safeParse({ ...aliasPkg, citation: validCitation });
    expect(r.success).toBe(false);
  });

  it('rejects citeAs that points at the package itself', () => {
    const r = packageSchema.safeParse({ ...aliasPkg, citeAs: aliasPkg.id });
    expect(r.success).toBe(false);
  });

  it('rejects citeAs alias with versionPolicy other than "unversioned"', () => {
    const r = packageSchema.safeParse({ ...aliasPkg, versionPolicy: 'latest' });
    expect(r.success).toBe(false);
  });

  // ---- Software Heritage fields ----

  const validSwhid = 'swh:1:snp:' + 'a'.repeat(40);

  it('accepts a package with a valid swhid', () => {
    const r = packageSchema.safeParse({ ...validPkg, swhid: validSwhid });
    expect(r.success).toBe(true);
  });

  it('rejects a package with a malformed swhid', () => {
    const r = packageSchema.safeParse({ ...validPkg, swhid: 'not-a-swhid' });
    expect(r.success).toBe(false);
  });

  it('accepts swhPending: true with swhSubmittedAt', () => {
    const r = packageSchema.safeParse({
      ...validPkg,
      swhPending: true,
      swhSubmittedAt: '2026-04-30T11:11:27Z',
    });
    expect(r.success).toBe(true);
  });

  it('rejects swhPending: true without swhSubmittedAt', () => {
    const r = packageSchema.safeParse({ ...validPkg, swhPending: true });
    expect(r.success).toBe(false);
  });

  it('rejects malformed swhSubmittedAt', () => {
    const r = packageSchema.safeParse({
      ...validPkg,
      swhPending: true,
      swhSubmittedAt: '2026-04-30',
    });
    expect(r.success).toBe(false);
  });

  it('accepts swhFailed: true alone', () => {
    const r = packageSchema.safeParse({ ...validPkg, swhFailed: true });
    expect(r.success).toBe(true);
  });

  it('rejects swhid and swhPending together', () => {
    const r = packageSchema.safeParse({
      ...validPkg,
      swhid: validSwhid,
      swhPending: true,
      swhSubmittedAt: '2026-04-30T11:11:27Z',
    });
    expect(r.success).toBe(false);
  });

  it('rejects swhid and swhFailed together', () => {
    const r = packageSchema.safeParse({
      ...validPkg,
      swhid: validSwhid,
      swhFailed: true,
    });
    expect(r.success).toBe(false);
  });

  it('rejects swhPending and swhFailed together', () => {
    const r = packageSchema.safeParse({
      ...validPkg,
      swhPending: true,
      swhSubmittedAt: '2026-04-30T11:11:27Z',
      swhFailed: true,
    });
    expect(r.success).toBe(false);
  });
});
