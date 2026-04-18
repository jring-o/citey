import { describe, it, expect } from 'vitest';
import { FUZZY_BLOCKLIST } from '../index.js';

describe('FUZZY_BLOCKLIST', () => {
  it('contains "data"', () => {
    expect(FUZZY_BLOCKLIST.has('data')).toBe(true);
  });

  it('contains "lumpy"', () => {
    expect(FUZZY_BLOCKLIST.has('lumpy')).toBe(true);
  });

  it('contains "mumps"', () => {
    expect(FUZZY_BLOCKLIST.has('mumps')).toBe(true);
  });

  it('contains "the"', () => {
    expect(FUZZY_BLOCKLIST.has('the')).toBe(true);
  });

  it('contains "math"', () => {
    expect(FUZZY_BLOCKLIST.has('math')).toBe(true);
  });

  it('contains "np" (from spec list)', () => {
    expect(FUZZY_BLOCKLIST.has('np')).toBe(true);
  });

  it('contains "dump"', () => {
    expect(FUZZY_BLOCKLIST.has('dump')).toBe(true);
  });

  it('contains "lump"', () => {
    expect(FUZZY_BLOCKLIST.has('lump')).toBe(true);
  });

  it('has size >= 90', () => {
    expect(FUZZY_BLOCKLIST.size).toBeGreaterThanOrEqual(90);
  });

  it('does not contain an arbitrary word not in the spec list', () => {
    expect(FUZZY_BLOCKLIST.has('xylophone')).toBe(false);
  });
});
