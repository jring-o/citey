import { describe, it, expect } from 'vitest';
import { fuzzyMatch } from '../fuzzy';

const ALIASES = [
  'numpy',
  'pandas',
  'scipy',
  'scikit-learn',
  'matplotlib',
  'tensorflow',
  'pytorch',
  'keras',
  'seaborn',
  'statsmodels',
];

describe('fuzzyMatch', () => {
  it('returns exact matches with score 0', () => {
    const hits = fuzzyMatch('numpy', ALIASES);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    const numpyHit = hits.find((h) => h.alias === 'numpy');
    expect(numpyHit).toBeDefined();
    expect(numpyHit!.score).toBe(0);
  });

  it('returns at most 5 results (cap)', () => {
    // Use a very broad match token
    const bigList = Array.from({ length: 100 }, (_, i) => `test${i}`);
    const hits = fuzzyMatch('test', bigList);
    expect(hits.length).toBeLessThanOrEqual(5);
  });

  it('uses tighter threshold (0.10) for tokens 4-5 chars', () => {
    // "nupy" is 4 chars — should use threshold 0.10
    // This is a close typo of "numpy" — score should be low enough to pass 0.10
    const hits = fuzzyMatch('nupy', ALIASES);
    // The result depends on Fuse.js scoring; it should either match or not
    // depending on the score. The point is it uses the tighter threshold.
    for (const h of hits) {
      expect(h.score).toBeLessThanOrEqual(0.10);
    }
  });

  it('uses wider threshold (0.20) for tokens 6+ chars', () => {
    const hits = fuzzyMatch('matplotlb', ALIASES);
    for (const h of hits) {
      expect(h.score).toBeLessThanOrEqual(0.20);
    }
  });

  it('returns empty array when nothing matches', () => {
    const hits = fuzzyMatch('zzzzzzz', ALIASES);
    expect(hits).toEqual([]);
  });

  it('rejects short prefix queries against longer aliases (length-coverage gate)', () => {
    // "open" is a 4-char English word that is a prefix of real packages.
    // Without the length-coverage gate, Fuse's `ignoreLocation: true` +
    // `minMatchCharLength: 4` would return "openbabel" / "opencv" at
    // near-zero scores (flagged high confidence) — the bug from the smoke test.
    const aliases = ['openbabel', 'opencv', 'openssl', 'open-mpi'];
    const hits = fuzzyMatch('open', aliases);
    // ratio 4/9, 4/6, 4/7, 4/8 — all below 0.75 → filtered out
    expect(hits).toEqual([]);
  });

  it('rejects close-length substring queries (anchored fuzzy)', () => {
    // Second-round smoke bug: "python" (6) was substring-matching "ipython"
    // (7) via ignoreLocation: true and "analysis" (8) was matching
    // "mdanalysis" (10) the same way. Both pass the length-coverage gate
    // but must be rejected because the match doesn't start at position 0.
    const aliases = ['ipython', 'mdanalysis', 'cython', 'biopython'];
    expect(fuzzyMatch('python', aliases).some((h) => h.alias === 'ipython')).toBe(false);
    expect(fuzzyMatch('python', aliases).some((h) => h.alias === 'biopython')).toBe(false);
    expect(fuzzyMatch('analysis', aliases).some((h) => h.alias === 'mdanalysis')).toBe(false);
  });

  it('still accepts prefix-anchored typos', () => {
    // "matplotlb" → "matplotlib" aligns at position 0, distance 0 — should hit.
    const hits = fuzzyMatch('matplotlb', ALIASES);
    expect(hits.some((h) => h.alias === 'matplotlib')).toBe(true);
  });

  it('still matches near-same-length typos (coverage gate does not break legit fuzzy)', () => {
    // "matplotlb" (9) vs "matplotlib" (10) — ratio 0.9 ≥ 0.75, should still hit.
    const hits = fuzzyMatch('matplotlb', ALIASES);
    expect(hits.some((h) => h.alias === 'matplotlib')).toBe(true);
  });

  it('returns results sorted by score (best first)', () => {
    const hits = fuzzyMatch('numpy', ALIASES);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i]!.score).toBeGreaterThanOrEqual(hits[i - 1]!.score);
    }
  });
});
