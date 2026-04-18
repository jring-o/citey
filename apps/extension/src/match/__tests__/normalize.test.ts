import { describe, it, expect } from 'vitest';
import { normalize, tokenize } from '../normalize';

// ---------------------------------------------------------------------------
// normalize()
// ---------------------------------------------------------------------------

describe('normalize', () => {
  it('lowercases input', () => {
    expect(normalize('NumPy')).toBe('numpy');
  });

  it('NFKC-normalizes unicode', () => {
    // fi ligature → "fi"
    expect(normalize('\uFB01le')).toBe('file');
  });

  it('collapses punctuation to a single space', () => {
    expect(normalize('numpy, pandas!')).toBe('numpy pandas');
  });

  it('preserves ._+- characters', () => {
    expect(normalize('scikit-learn')).toBe('scikit-learn');
    expect(normalize('snap.py')).toBe('snap.py');
    expect(normalize('g++')).toBe('g++');
    expect(normalize('my_lib')).toBe('my_lib');
  });

  it('trims leading/trailing spaces', () => {
    expect(normalize('  numpy  ')).toBe('numpy');
  });

  it('handles exit criterion #6: normalize("  Numpy,  scikit-learn! ")', () => {
    expect(normalize('  Numpy,  scikit-learn! ')).toBe('numpy scikit-learn');
  });

  it('collapses mixed whitespace to single space', () => {
    expect(normalize('a   b\t\nc')).toBe('a b c');
  });

  it('handles empty string', () => {
    expect(normalize('')).toBe('');
  });

  it('handles pure punctuation', () => {
    expect(normalize('!!??')).toBe('');
  });

  it.each([
    ['  Numpy,  scikit-learn! ', 'numpy scikit-learn'],
    ['TensorFlow', 'tensorflow'],
    ['PyTorch  1.0', 'pytorch 1.0'],
    ['R (cran)', 'r cran'],
    ['data.table', 'data.table'],
  ])('parametrized: normalize(%j) === %j', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// tokenize()
// ---------------------------------------------------------------------------

describe('tokenize', () => {
  it('splits on whitespace and drops short tokens', () => {
    expect(tokenize('I used numpy')).toEqual(['used', 'numpy']);
  });

  it('deduplicates preserving order', () => {
    expect(tokenize('numpy numpy pandas numpy')).toEqual(['numpy', 'pandas']);
  });

  it('drops tokens shorter than 2 chars', () => {
    // "a" and "I" are 1 char after normalization
    expect(tokenize('a I numpy')).toEqual(['numpy']);
  });

  it('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('returns empty array when all tokens are too short', () => {
    expect(tokenize('a I x')).toEqual([]);
  });

  it('normalizes before tokenizing', () => {
    expect(tokenize('  NumPy, Pandas!  ')).toEqual(['numpy', 'pandas']);
  });
});
