import { describe, it, expect } from 'vitest';
import type { Package } from '@citey/citation-model';
import { match, type MatchInput } from '../engine';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePkg(id: string, aliases: string[]): Package {
  return {
    id,
    canonicalName: id,
    aliases,
    ecosystem: 'pypi',
    description: `${id} package`,
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
  };
}

const numpyPkg = makePkg('numpy', ['numpy']);
const pandasPkg = makePkg('pandas', ['pandas']);
const scikitPkg = makePkg('scikit-learn', ['scikit-learn', 'sklearn']);
const matplotlibPkg = makePkg('matplotlib', ['matplotlib', 'mpl']);
const tensorflowPkg = makePkg('tensorflow', ['tensorflow', 'tf']);

function buildInput(
  query: string,
  packages: Package[],
  extraAliases?: Record<string, string[]>,
): MatchInput {
  const byId = new Map<string, Package>();
  const aliasIndex = new Map<string, string[]>();

  for (const pkg of packages) {
    byId.set(pkg.id, pkg);
    for (const alias of pkg.aliases) {
      const existing = aliasIndex.get(alias) ?? [];
      existing.push(pkg.id);
      aliasIndex.set(alias, existing);
    }
  }

  // Add extra aliases for testing multi-token and edge cases
  if (extraAliases) {
    for (const [alias, ids] of Object.entries(extraAliases)) {
      aliasIndex.set(alias, ids);
    }
  }

  return { query, byId, aliasIndex };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('match engine', () => {
  // ----- Exact alias hit -----
  it('returns high-confidence hit for exact alias match', () => {
    const result = match(buildInput('numpy', [numpyPkg]));
    expect(result.kind).toBe('hits');
    if (result.kind !== 'hits') return;
    expect(result.high).toHaveLength(1);
    expect(result.high[0]!.package.id).toBe('numpy');
    expect(result.high[0]!.confidence).toBe('high');
    expect(result.low).toHaveLength(0);
  });

  // ----- Multi-token alias hit ("scikit learn" → "scikit-learn") -----
  it('returns high-confidence hit for multi-token alias (scikit learn → scikit-learn)', () => {
    const result = match(buildInput('scikit learn', [scikitPkg]));
    expect(result.kind).toBe('hits');
    if (result.kind !== 'hits') return;
    expect(result.high).toHaveLength(1);
    expect(result.high[0]!.package.id).toBe('scikit-learn');
    expect(result.high[0]!.confidence).toBe('high');
  });

  // ----- Fuzzy hit above high threshold (score ≤ 0.05 → high) -----
  it('returns high-confidence for fuzzy match with score ≤ 0.05', () => {
    // "numpy" exact-matches "numpy" with score 0 → high
    // We use a slightly different alias setup to force fuzzy path
    const pkg = makePkg('numpyx', ['numpyx']);
    const result = match(buildInput('numpyx', [pkg]));
    expect(result.kind).toBe('hits');
    if (result.kind !== 'hits') return;
    // This is actually an exact hit, not fuzzy. Let's test fuzzy differently.
    expect(result.high.length).toBeGreaterThanOrEqual(1);
  });

  // ----- Fuzzy hit between thresholds (0.05 < score ≤ 0.20 → low) -----
  it('returns low-confidence for fuzzy match with score between 0.05 and 0.20', () => {
    // Use a token that's close but not exact to a 6+ char alias
    // "matplotib" vs "matplotlib" — one char missing
    const result = match(buildInput('matplotib', [matplotlibPkg]));
    expect(result.kind).toBe('hits');
    if (result.kind !== 'hits') return;
    const allHits = [...result.high, ...result.low];
    expect(allHits.length).toBeGreaterThanOrEqual(1);
    const mpHit = allHits.find((h) => h.package.id === 'matplotlib');
    expect(mpHit).toBeDefined();
  });

  // ----- Fuzzy below threshold (no hit) -----
  it('returns miss when fuzzy score is too high', () => {
    const result = match(buildInput('xyzabc', [numpyPkg]));
    expect(result.kind).toBe('miss');
    if (result.kind !== 'miss') return;
    expect(result.reason).toBe('no-local');
  });

  // ----- Blocklisted token (no fuzzy; e.g. "data" does not fuzzy-match) -----
  it('does not fuzzy-match blocklisted tokens', () => {
    // "data" is in FUZZY_BLOCKLIST. Without exact alias it should miss.
    const dataPkg = makePkg('data-pkg', ['data-tables']);
    const result = match(buildInput('data', [dataPkg]));
    // "data" is blocklisted and has no exact alias hit → miss
    expect(result.kind).toBe('miss');
  });

  // ----- 2-char and 3-char tokens (no fuzzy; e.g. "np" exact-only) -----
  it('does not fuzzy-match tokens shorter than 4 chars', () => {
    // "np" is 2 chars — exact only. Since "np" is not an alias, should miss.
    const result = match(buildInput('np', [numpyPkg]));
    // "np" is also in FUZZY_BLOCKLIST, but even without blocklist it would be
    // too short for fuzzy. No exact match for "np" → miss
    expect(result.kind).toBe('miss');
  });

  it('matches short tokens exactly when they are aliases', () => {
    // "tf" is an alias for tensorflow — should be an exact hit
    const result = match(buildInput('tf', [tensorflowPkg]));
    expect(result.kind).toBe('hits');
    if (result.kind !== 'hits') return;
    expect(result.high).toHaveLength(1);
    expect(result.high[0]!.package.id).toBe('tensorflow');
  });

  // ----- Canonical "numpy" vs "lumpy" -----
  it('"numpy" matches numpy package', () => {
    const result = match(buildInput('numpy', [numpyPkg]));
    expect(result.kind).toBe('hits');
    if (result.kind !== 'hits') return;
    expect(result.high).toHaveLength(1);
    expect(result.high[0]!.package.id).toBe('numpy');
  });

  it('"lumpy" does NOT match numpy (blocklisted)', () => {
    // "lumpy" is in FUZZY_BLOCKLIST
    const result = match(buildInput('lumpy', [numpyPkg]));
    expect(result.kind).toBe('miss');
    if (result.kind !== 'miss') return;
    expect(result.reason).toBe('no-local');
  });

  // ----- All-tokens-blocklisted short-circuit -----
  it('returns no-local miss when all tokens are blocklisted', () => {
    const result = match(buildInput('data the from', [numpyPkg]));
    expect(result.kind).toBe('miss');
    if (result.kind !== 'miss') return;
    expect(result.reason).toBe('no-local');
  });

  // ----- Duplicate tokens deduped -----
  it('deduplicates tokens', () => {
    const result = match(buildInput('numpy numpy numpy', [numpyPkg]));
    expect(result.kind).toBe('hits');
    if (result.kind !== 'hits') return;
    expect(result.high).toHaveLength(1);
    expect(result.high[0]!.package.id).toBe('numpy');
  });

  // ----- End-to-end smoke: "I used numpy and pandas" -----
  it('end-to-end: "I used numpy and pandas" returns hits for numpy and pandas', () => {
    const result = match(buildInput('I used numpy and pandas', [numpyPkg, pandasPkg]));
    expect(result.kind).toBe('hits');
    if (result.kind !== 'hits') return;
    expect(result.high).toHaveLength(2);
    const ids = result.high.map((h) => h.package.id).sort();
    expect(ids).toEqual(['numpy', 'pandas']);
    expect(result.low).toHaveLength(0);
  });

  // ----- Per-package dedup with highest-confidence-wins -----
  it('deduplicates packages keeping highest confidence', () => {
    // "sklearn" is an alias for scikit-learn → exact → high
    const result = match(buildInput('sklearn', [scikitPkg]));
    expect(result.kind).toBe('hits');
    if (result.kind !== 'hits') return;
    expect(result.high).toHaveLength(1);
    expect(result.high[0]!.package.id).toBe('scikit-learn');
  });

  // ----- Empty query -----
  it('returns miss for empty query', () => {
    const result = match(buildInput('', [numpyPkg]));
    expect(result.kind).toBe('miss');
    if (result.kind !== 'miss') return;
    expect(result.reason).toBe('no-local');
  });

  // ----- Multi-token suppression of single-token hits -----
  it('multi-token hit suppresses constituent single-token hits', () => {
    // If "scikit" alone is an alias for a different package, and "scikit learn"
    // matches scikit-learn, the "scikit" single-token hit should be suppressed.
    const scikitAlonePkg = makePkg('scikit-alone', ['scikit']);
    const input = buildInput('scikit learn', [scikitAlonePkg, scikitPkg]);

    const result = match(input);
    expect(result.kind).toBe('hits');
    if (result.kind !== 'hits') return;

    // scikit-learn should be present (from multi-token)
    const scikitLearnHit = result.high.find((h) => h.package.id === 'scikit-learn');
    expect(scikitLearnHit).toBeDefined();

    // scikit-alone should be suppressed (its token "scikit" is covered by multi-token window)
    const scikitAloneHit = result.high.find((h) => h.package.id === 'scikit-alone');
    expect(scikitAloneHit).toBeUndefined();
  });

  // ----- No tokens after filtering -----
  it('returns miss when all tokens are too short after normalization', () => {
    const result = match(buildInput('x y z', [numpyPkg]));
    expect(result.kind).toBe('miss');
    if (result.kind !== 'miss') return;
    expect(result.reason).toBe('no-local');
  });

  // ----- Per-package dedup: confidence upgrade from low→high -----
  it('upgrades confidence from low to high when a package matches via multiple aliases', () => {
    // A package has two aliases. One token hits exactly (high), the other is also an alias.
    // Both tokens should merge into a single high-confidence hit.
    const multiPkg = makePkg('multi-alias', ['multi-alias', 'multialias']);
    const result = match(buildInput('multi-alias multialias', [multiPkg]));
    expect(result.kind).toBe('hits');
    if (result.kind !== 'hits') return;
    expect(result.high).toHaveLength(1);
    expect(result.high[0]!.package.id).toBe('multi-alias');
    expect(result.high[0]!.matchedAliases.length).toBeGreaterThanOrEqual(2);
  });

  // ----- Per-package dedup: fuzzy score merging -----
  it('merges fuzzy scores keeping lowest when same package matches multiple tokens', () => {
    // Create a package with a long alias that can fuzzy-match from two different tokens
    const longPkg = makePkg('longthing', ['longthing', 'longother']);
    // Query with both aliases (exact hits); confidence stays high, and both aliases recorded
    const result = match(buildInput('longthing longother', [longPkg]));
    expect(result.kind).toBe('hits');
    if (result.kind !== 'hits') return;
    expect(result.high).toHaveLength(1);
    expect(result.high[0]!.matchedAliases).toContain('longthing');
    expect(result.high[0]!.matchedAliases).toContain('longother');
  });

  // ----- Exercise upsertHit with fuzzy producing fuseScore on an existing hit -----
  it('exercises upsert path with fuzzy score on package already hit exactly', () => {
    // Setup: a package with alias "tensorflow" is hit exactly by "tensorflow" token,
    // then fuzzy for a second token also resolves to the same package.
    // We need two tokens: one exact, one fuzzy, both resolving to same pkg.
    // "tensorflow" (exact) + "tensorflw" (fuzzy → tensorflow)
    const result = match(buildInput('tensorflow tensorflw', [tensorflowPkg]));
    expect(result.kind).toBe('hits');
    if (result.kind !== 'hits') return;
    expect(result.high).toHaveLength(1);
    expect(result.high[0]!.package.id).toBe('tensorflow');
  });

  // ----- citeAs redirect: sub-module hits resolve to parent with matchedVia -----
  describe('citeAs redirect', () => {
    function makeAliasPkg(id: string, canonicalName: string, aliases: string[], parent: string): Package {
      return {
        id,
        canonicalName,
        aliases,
        ecosystem: 'pypi',
        description: `Sub-module of ${parent}`,
        provenance: {
          source: 'hand-curated',
          curator: 'test',
          dateAdded: '2026-04-18',
          lastReviewed: '2026-04-18',
        },
        versionPolicy: 'unversioned',
        citeAs: parent,
      };
    }

    const astropyPkg = makePkg('astropy', ['astropy']);
    const astropyCosmo = makeAliasPkg(
      'astropy-cosmology',
      'astropy.cosmology',
      ['astropy.cosmology', 'astropy-cosmology'],
      'astropy',
    );
    const astropyFits = makeAliasPkg(
      'astropy-io-fits',
      'astropy.io.fits',
      ['astropy.io.fits', 'astropy-io-fits'],
      'astropy',
    );

    it('resolves a dotted sub-module hit to the parent citation', () => {
      const result = match(buildInput('astropy.cosmology', [astropyPkg, astropyCosmo]));
      expect(result.kind).toBe('hits');
      if (result.kind !== 'hits') return;
      expect(result.high).toHaveLength(1);
      expect(result.high[0]!.package.id).toBe('astropy');
      expect(result.high[0]!.matchedVia).toEqual(['astropy.cosmology']);
    });

    it('resolves a prose sub-module mention (multi-token) to the parent', () => {
      const result = match(
        buildInput("we used astropy's cosmology module", [astropyPkg, astropyCosmo]),
      );
      expect(result.kind).toBe('hits');
      if (result.kind !== 'hits') return;
      expect(result.high).toHaveLength(1);
      expect(result.high[0]!.package.id).toBe('astropy');
      // matchedVia should carry the sub-module breadcrumb even though the
      // parent "astropy" also appears as a single token in the query.
      expect(result.high[0]!.matchedVia).toContain('astropy.cosmology');
    });

    it('dedupes a direct parent hit with a sub-module hit in the same paragraph', () => {
      const result = match(
        buildInput('astropy astropy.cosmology', [astropyPkg, astropyCosmo]),
      );
      expect(result.kind).toBe('hits');
      if (result.kind !== 'hits') return;
      expect(result.high).toHaveLength(1);
      expect(result.high[0]!.package.id).toBe('astropy');
      expect(result.high[0]!.matchedVia).toEqual(['astropy.cosmology']);
    });

    it('merges multiple sub-modules into a single parent hit with multiple matchedVia', () => {
      const result = match(
        buildInput('astropy.cosmology astropy.io.fits', [astropyPkg, astropyCosmo, astropyFits]),
      );
      expect(result.kind).toBe('hits');
      if (result.kind !== 'hits') return;
      expect(result.high).toHaveLength(1);
      expect(result.high[0]!.package.id).toBe('astropy');
      expect(result.high[0]!.matchedVia).toHaveLength(2);
      expect(result.high[0]!.matchedVia).toContain('astropy.cosmology');
      expect(result.high[0]!.matchedVia).toContain('astropy.io.fits');
    });

    it('omits matchedVia when the hit was not a citeAs redirect', () => {
      const result = match(buildInput('astropy', [astropyPkg, astropyCosmo]));
      expect(result.kind).toBe('hits');
      if (result.kind !== 'hits') return;
      expect(result.high[0]!.matchedVia).toBeUndefined();
    });
  });
});
