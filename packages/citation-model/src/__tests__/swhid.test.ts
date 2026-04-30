import { describe, it, expect } from 'vitest';
import { isValidSwhid, SWHID_RE } from '../swhid.js';

describe('SWHID_RE / isValidSwhid', () => {
  it('accepts core SWHIDs of all five object types', () => {
    const hex = 'a'.repeat(40);
    for (const t of ['cnt', 'dir', 'rev', 'rel', 'snp']) {
      expect(isValidSwhid(`swh:1:${t}:${hex}`)).toBe(true);
    }
  });

  it('accepts a qualified SWHID with origin and visit', () => {
    const id =
      'swh:1:rev:0c5b4aa07071490eaf261775ce96ccdd13a6e2d5' +
      ';origin=https://github.com/foo/bar' +
      ';visit=swh:1:snp:cff8740f4273c6ded893433dc6d868404d5eeb0a';
    expect(isValidSwhid(id)).toBe(true);
  });

  it('rejects wrong namespace version', () => {
    expect(isValidSwhid('swh:2:snp:' + 'a'.repeat(40))).toBe(false);
  });

  it('rejects unknown object type', () => {
    expect(isValidSwhid('swh:1:xxx:' + 'a'.repeat(40))).toBe(false);
  });

  it('rejects short hash', () => {
    expect(isValidSwhid('swh:1:snp:abc')).toBe(false);
  });

  it('rejects uppercase hex', () => {
    expect(isValidSwhid('swh:1:snp:' + 'A'.repeat(40))).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidSwhid('')).toBe(false);
  });

  it('exports a regex object', () => {
    expect(SWHID_RE).toBeInstanceOf(RegExp);
  });
});
