import { describe, it, expect, beforeEach } from 'vitest';
import { cacheGet, cacheSet, _cacheSize, _cacheClear } from '../cache';
import type { MatchResult } from '@citey/citation-model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMiss(reason: 'no-local'): MatchResult {
  return { kind: 'miss', reason };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cache', () => {
  beforeEach(() => {
    _cacheClear();
  });

  it('returns undefined for a cache miss', () => {
    expect(cacheGet('nonexistent')).toBeUndefined();
  });

  it('stores and retrieves a value', () => {
    const result = makeMiss('no-local');
    cacheSet('numpy', result);
    expect(cacheGet('numpy')).toBe(result);
  });

  it('overwrites an existing key', () => {
    const first = makeMiss('no-local');
    const second: MatchResult = { kind: 'miss', reason: 'fallback-failed' };
    cacheSet('numpy', first);
    cacheSet('numpy', second);
    expect(cacheGet('numpy')).toBe(second);
    expect(_cacheSize()).toBe(1);
  });

  it('evicts the oldest entry when exceeding 256 (exit criterion #3)', () => {
    // Fill cache with 256 entries: key-0 .. key-255
    for (let i = 0; i < 256; i++) {
      cacheSet(`key-${i}`, makeMiss('no-local'));
    }
    expect(_cacheSize()).toBe(256);

    // Insert 257th key
    cacheSet('key-256', makeMiss('no-local'));

    // Size should still be 256 (one evicted)
    expect(_cacheSize()).toBe(256);

    // key-0 (oldest) should have been evicted
    expect(cacheGet('key-0')).toBeUndefined();

    // key-1 should still exist
    expect(cacheGet('key-1')).toBeDefined();

    // key-256 should exist
    expect(cacheGet('key-256')).toBeDefined();
  });

  it('inserting 257 distinct keys reduces Map.size by 1', () => {
    for (let i = 0; i < 257; i++) {
      cacheSet(`k-${i}`, makeMiss('no-local'));
    }
    // 257 - 1 eviction = 256
    expect(_cacheSize()).toBe(256);
  });
});
