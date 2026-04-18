import { describe, it, expect } from 'vitest';
import {
  reducer,
  INITIAL_STATE,
  ALL_STATES,
  isRestrictedUrl,
  isEmptyOrOversizedSelection,
  type PopupState,
  type PopupEvent,
} from '../state-machine';
import type { PackageHit, MatchResult } from '@citey/citation-model';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeHit = (id: string, confidence: 'high' | 'low'): PackageHit => ({
  package: {
    id,
    canonicalName: id,
    aliases: [id],
    ecosystem: 'pypi',
    description: `${id} description`,
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
  },
  confidence,
  matchedAliases: [id],
});

const highHit = makeHit('numpy', 'high');
const lowHit = makeHit('numpyish', 'low');

// ---------------------------------------------------------------------------
// State enumeration
// ---------------------------------------------------------------------------

describe('ALL_STATES', () => {
  it('enumerates exactly 11 states', () => {
    expect(ALL_STATES).toHaveLength(11);
  });

  it('contains all expected state names', () => {
    const expected = [
      'loading',
      'hits_high',
      'hits_mixed',
      'hits_low',
      'empty_selection',
      'oversized_selection',
      'restricted_page',
      'fallback_in_flight',
      'citeas_hit',
      'total_miss',
      'error',
    ];
    expect([...ALL_STATES]).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// Reducer: SELECTION_RECEIVED
// ---------------------------------------------------------------------------

describe('reducer — SELECTION_RECEIVED', () => {
  it('transitions to empty_selection when text is empty', () => {
    const result = reducer(INITIAL_STATE, { type: 'SELECTION_RECEIVED', text: '' });
    expect(result.name).toBe('empty_selection');
  });

  it('transitions to empty_selection when text is whitespace only', () => {
    const result = reducer(INITIAL_STATE, { type: 'SELECTION_RECEIVED', text: '   ' });
    expect(result.name).toBe('empty_selection');
  });

  it('transitions to oversized_selection when text exceeds 200,000 chars', () => {
    const longText = 'x'.repeat(200_001);
    const result = reducer(INITIAL_STATE, { type: 'SELECTION_RECEIVED', text: longText });
    expect(result.name).toBe('oversized_selection');
    if (result.name === 'oversized_selection') {
      expect(result.length).toBe(200_001);
    }
  });

  it('stays in loading with query when text is valid', () => {
    const result = reducer(INITIAL_STATE, { type: 'SELECTION_RECEIVED', text: 'numpy' });
    expect(result).toEqual({ name: 'loading', query: 'numpy' });
  });

  it('trims the text before setting query', () => {
    const result = reducer(INITIAL_STATE, { type: 'SELECTION_RECEIVED', text: '  numpy  ' });
    expect(result).toEqual({ name: 'loading', query: 'numpy' });
  });
});

// ---------------------------------------------------------------------------
// Reducer: MATCH_RECEIVED
// ---------------------------------------------------------------------------

describe('reducer — MATCH_RECEIVED', () => {
  const loadingState: PopupState = { name: 'loading', query: 'numpy' };

  it('transitions to hits_high when only high-confidence hits', () => {
    const result: MatchResult = { kind: 'hits', high: [highHit], low: [] };
    const state = reducer(loadingState, { type: 'MATCH_RECEIVED', result, query: 'numpy' });
    expect(state.name).toBe('hits_high');
    if (state.name === 'hits_high') {
      expect(state.hits).toEqual([highHit]);
    }
  });

  it('transitions to hits_mixed when both high and low hits', () => {
    const result: MatchResult = { kind: 'hits', high: [highHit], low: [lowHit] };
    const state = reducer(loadingState, { type: 'MATCH_RECEIVED', result, query: 'numpy' });
    expect(state.name).toBe('hits_mixed');
    if (state.name === 'hits_mixed') {
      expect(state.high).toEqual([highHit]);
      expect(state.low).toEqual([lowHit]);
    }
  });

  it('transitions to hits_low when only low-confidence hits', () => {
    const result: MatchResult = { kind: 'hits', high: [], low: [lowHit] };
    const state = reducer(loadingState, { type: 'MATCH_RECEIVED', result, query: 'numpy' });
    expect(state.name).toBe('hits_low');
    if (state.name === 'hits_low') {
      expect(state.hits).toEqual([lowHit]);
    }
  });

  it('transitions to fallback_in_flight when hits kind but no hits', () => {
    const result: MatchResult = { kind: 'hits', high: [], low: [] };
    const state = reducer(loadingState, { type: 'MATCH_RECEIVED', result, query: 'numpy' });
    expect(state.name).toBe('fallback_in_flight');
  });

  it('transitions to citeas_hit on fallback with hits', () => {
    const result: MatchResult = { kind: 'fallback', source: 'citeas', hits: [highHit] };
    const state = reducer(loadingState, { type: 'MATCH_RECEIVED', result, query: 'numpy' });
    expect(state.name).toBe('citeas_hit');
  });

  it('transitions to total_miss on fallback with no hits', () => {
    const result: MatchResult = { kind: 'fallback', source: 'citeas', hits: [] };
    const state = reducer(loadingState, { type: 'MATCH_RECEIVED', result, query: 'numpy' });
    expect(state.name).toBe('total_miss');
  });

  it('transitions to fallback_in_flight on miss with reason no-local', () => {
    const result: MatchResult = { kind: 'miss', reason: 'no-local' };
    const state = reducer(loadingState, { type: 'MATCH_RECEIVED', result, query: 'numpy' });
    expect(state.name).toBe('fallback_in_flight');
  });

  it('transitions to total_miss on miss with reason fallback-disabled', () => {
    const result: MatchResult = { kind: 'miss', reason: 'fallback-disabled' };
    const state = reducer(loadingState, { type: 'MATCH_RECEIVED', result, query: 'numpy' });
    expect(state.name).toBe('total_miss');
  });

  it('transitions to total_miss on miss with reason fallback-failed', () => {
    const result: MatchResult = { kind: 'miss', reason: 'fallback-failed' };
    const state = reducer(loadingState, { type: 'MATCH_RECEIVED', result, query: 'numpy' });
    expect(state.name).toBe('total_miss');
  });
});

// ---------------------------------------------------------------------------
// Reducer: RESTRICTED_DETECTED
// ---------------------------------------------------------------------------

describe('reducer — RESTRICTED_DETECTED', () => {
  it('transitions to restricted_page', () => {
    const state = reducer(INITIAL_STATE, { type: 'RESTRICTED_DETECTED' });
    expect(state.name).toBe('restricted_page');
  });
});

// ---------------------------------------------------------------------------
// Reducer: TIMEOUT
// ---------------------------------------------------------------------------

describe('reducer — TIMEOUT', () => {
  it('transitions to error from loading', () => {
    const state = reducer(INITIAL_STATE, { type: 'TIMEOUT' });
    expect(state.name).toBe('error');
    if (state.name === 'error') {
      expect(state.message).toContain('timed out');
    }
  });
});

// ---------------------------------------------------------------------------
// Reducer: ERROR
// ---------------------------------------------------------------------------

describe('reducer — ERROR', () => {
  it('transitions to error with provided message', () => {
    const state = reducer(INITIAL_STATE, { type: 'ERROR', message: 'Oops' });
    expect(state.name).toBe('error');
    if (state.name === 'error') {
      expect(state.message).toBe('Oops');
    }
  });
});

// ---------------------------------------------------------------------------
// Reducer: RETRY
// ---------------------------------------------------------------------------

describe('reducer — RETRY', () => {
  it('resets to initial state', () => {
    const errorState: PopupState = { name: 'error', query: 'numpy', message: 'fail' };
    const state = reducer(errorState, { type: 'RETRY' });
    expect(state).toEqual(INITIAL_STATE);
  });
});

// ---------------------------------------------------------------------------
// Reducer: FALLBACK_STARTED / FALLBACK_CANCELLED
// ---------------------------------------------------------------------------

describe('reducer — FALLBACK_STARTED', () => {
  it('transitions to fallback_in_flight', () => {
    const state = reducer(INITIAL_STATE, { type: 'FALLBACK_STARTED', query: 'numpy' });
    expect(state.name).toBe('fallback_in_flight');
    if (state.name === 'fallback_in_flight') {
      expect(state.query).toBe('numpy');
    }
  });
});

describe('reducer — FALLBACK_CANCELLED', () => {
  it('transitions to total_miss preserving query', () => {
    const fallbackState: PopupState = { name: 'fallback_in_flight', query: 'numpy' };
    const state = reducer(fallbackState, { type: 'FALLBACK_CANCELLED' });
    expect(state.name).toBe('total_miss');
    if (state.name === 'total_miss') {
      expect(state.query).toBe('numpy');
    }
  });
});

// ---------------------------------------------------------------------------
// Total coverage: every state can be reached by the reducer
// ---------------------------------------------------------------------------

describe('reducer — total state coverage', () => {
  it('can produce every one of the 11 states', () => {
    const loadingState: PopupState = { name: 'loading', query: 'test' };
    const reachedStates = new Set<string>();

    // 1. loading — initial state
    reachedStates.add(INITIAL_STATE.name);

    // 2. hits_high
    const hitsHighResult: MatchResult = { kind: 'hits', high: [highHit], low: [] };
    reachedStates.add(
      reducer(loadingState, { type: 'MATCH_RECEIVED', result: hitsHighResult, query: 'test' }).name,
    );

    // 3. hits_mixed
    const hitsMixedResult: MatchResult = { kind: 'hits', high: [highHit], low: [lowHit] };
    reachedStates.add(
      reducer(loadingState, { type: 'MATCH_RECEIVED', result: hitsMixedResult, query: 'test' }).name,
    );

    // 4. hits_low
    const hitsLowResult: MatchResult = { kind: 'hits', high: [], low: [lowHit] };
    reachedStates.add(
      reducer(loadingState, { type: 'MATCH_RECEIVED', result: hitsLowResult, query: 'test' }).name,
    );

    // 5. empty_selection
    reachedStates.add(
      reducer(INITIAL_STATE, { type: 'SELECTION_RECEIVED', text: '' }).name,
    );

    // 5b. oversized_selection
    reachedStates.add(
      reducer(INITIAL_STATE, {
        type: 'SELECTION_RECEIVED',
        text: 'x'.repeat(200_001),
      }).name,
    );

    // 6. restricted_page
    reachedStates.add(
      reducer(INITIAL_STATE, { type: 'RESTRICTED_DETECTED' }).name,
    );

    // 7. fallback_in_flight
    reachedStates.add(
      reducer(loadingState, { type: 'FALLBACK_STARTED', query: 'test' }).name,
    );

    // 8. citeas_hit
    const citeasResult: MatchResult = { kind: 'fallback', source: 'citeas', hits: [highHit] };
    reachedStates.add(
      reducer(loadingState, { type: 'MATCH_RECEIVED', result: citeasResult, query: 'test' }).name,
    );

    // 9. total_miss
    const missResult: MatchResult = { kind: 'miss', reason: 'fallback-disabled' };
    reachedStates.add(
      reducer(loadingState, { type: 'MATCH_RECEIVED', result: missResult, query: 'test' }).name,
    );

    // 10. error
    reachedStates.add(
      reducer(INITIAL_STATE, { type: 'ERROR', message: 'boom' }).name,
    );

    expect(reachedStates.size).toBe(11);
    for (const stateName of ALL_STATES) {
      expect(reachedStates.has(stateName)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// isRestrictedUrl
// ---------------------------------------------------------------------------

describe('isRestrictedUrl', () => {
  it('returns true for chrome:// URLs', () => {
    expect(isRestrictedUrl('chrome://settings')).toBe(true);
  });

  it('returns true for chrome-extension:// URLs', () => {
    expect(isRestrictedUrl('chrome-extension://abc/popup.html')).toBe(true);
  });

  it('returns true for edge:// URLs', () => {
    expect(isRestrictedUrl('edge://settings')).toBe(true);
  });

  it('returns true for about: URLs', () => {
    expect(isRestrictedUrl('about:blank')).toBe(true);
  });

  it('returns true for view-source: URLs', () => {
    expect(isRestrictedUrl('view-source:https://example.com')).toBe(true);
  });

  it('returns true for Chrome Web Store URLs', () => {
    expect(isRestrictedUrl('https://chrome.google.com/webstore/detail/abc')).toBe(true);
  });

  it('returns false for regular https URLs', () => {
    expect(isRestrictedUrl('https://example.com')).toBe(false);
  });

  it('returns false for regular http URLs', () => {
    expect(isRestrictedUrl('http://localhost:3000')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isEmptyOrOversizedSelection
// ---------------------------------------------------------------------------

describe('isEmptyOrOversizedSelection', () => {
  it('returns true for empty string', () => {
    expect(isEmptyOrOversizedSelection('')).toBe(true);
  });

  it('returns true for whitespace-only string', () => {
    expect(isEmptyOrOversizedSelection('   \n\t  ')).toBe(true);
  });

  it('returns true for string > 200,000 chars', () => {
    expect(isEmptyOrOversizedSelection('a'.repeat(200_001))).toBe(true);
  });

  it('returns false for valid text', () => {
    expect(isEmptyOrOversizedSelection('numpy')).toBe(false);
  });

  it('returns false for exactly 200,000 chars', () => {
    expect(isEmptyOrOversizedSelection('a'.repeat(200_000))).toBe(false);
  });
});
