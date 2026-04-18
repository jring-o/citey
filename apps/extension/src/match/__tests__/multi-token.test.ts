import { describe, it, expect } from 'vitest';
import { multiTokenWindows } from '../multi-token';

describe('multiTokenWindows', () => {
  it('returns empty array for fewer than 2 tokens', () => {
    expect(multiTokenWindows([])).toEqual([]);
    expect(multiTokenWindows(['numpy'])).toEqual([]);
  });

  it('generates 2-token windows', () => {
    const windows = multiTokenWindows(['scikit', 'learn']);
    expect(windows).toHaveLength(1);
    expect(windows[0]).toEqual({
      joined: 'scikit learn',
      canonical: 'scikit-learn',
      indices: [0, 1],
    });
  });

  it('generates 3-token windows', () => {
    const windows = multiTokenWindows(['a', 'b', 'c']);
    const threeToken = windows.filter((w) => w.indices.length === 3);
    expect(threeToken).toHaveLength(1);
    expect(threeToken[0]).toEqual({
      joined: 'a b c',
      canonical: 'a-b-c',
      indices: [0, 1, 2],
    });
  });

  it('generates correct windows for 4 tokens', () => {
    const windows = multiTokenWindows(['used', 'numpy', 'and', 'pandas']);
    // 2-token: (0,1), (1,2), (2,3) = 3
    // 3-token: (0,1,2), (1,2,3) = 2
    expect(windows).toHaveLength(5);
  });

  it('canonical form collapses separators to hyphen', () => {
    const windows = multiTokenWindows(['scikit', 'learn']);
    expect(windows[0]!.canonical).toBe('scikit-learn');
  });

  it('canonical form collapses dots and underscores', () => {
    // Tokens like "snap" and "py" would produce "snap-py" canonical
    const windows = multiTokenWindows(['snap', 'py']);
    expect(windows[0]!.canonical).toBe('snap-py');
  });
});
