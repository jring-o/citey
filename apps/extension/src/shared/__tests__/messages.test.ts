import { describe, it, expect } from 'vitest';
import {
  newRequestId,
  isMessage,
  isGetSelection,
  isSelectionResult,
  isMatchQuery,
  isMatchResult,
  isCiteasLookup,
} from '../messages';

// ---------------------------------------------------------------------------
// UUID v4 format regex (exit criterion #5)
// ---------------------------------------------------------------------------

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// newRequestId
// ---------------------------------------------------------------------------

describe('newRequestId', () => {
  it('returns a valid v4 UUID', () => {
    const id = newRequestId();
    expect(id).toMatch(UUID_V4_RE);
  });

  it('returns unique ids on successive calls', () => {
    const a = newRequestId();
    const b = newRequestId();
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// isMessage (general guard)
// ---------------------------------------------------------------------------

describe('isMessage', () => {
  it('accepts a valid GET_SELECTION message', () => {
    expect(isMessage({ type: 'GET_SELECTION', requestId: '123' })).toBe(true);
  });

  it('accepts a valid SELECTION_RESULT message', () => {
    expect(
      isMessage({ type: 'SELECTION_RESULT', requestId: '123', text: 'hi' }),
    ).toBe(true);
  });

  it('accepts a valid MATCH_QUERY message', () => {
    expect(
      isMessage({ type: 'MATCH_QUERY', requestId: '123', text: 'numpy' }),
    ).toBe(true);
  });

  it('accepts a valid MATCH_RESULT message', () => {
    expect(
      isMessage({
        type: 'MATCH_RESULT',
        requestId: '123',
        result: { kind: 'miss', reason: 'no-local' },
      }),
    ).toBe(true);
  });

  it('accepts a valid CITEAS_LOOKUP message', () => {
    expect(
      isMessage({ type: 'CITEAS_LOOKUP', requestId: '123', query: 'numpy' }),
    ).toBe(true);
  });

  it('rejects null', () => {
    expect(isMessage(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isMessage(undefined)).toBe(false);
  });

  it('rejects a number', () => {
    expect(isMessage(42)).toBe(false);
  });

  it('rejects an object with unknown type', () => {
    expect(isMessage({ type: 'UNKNOWN', requestId: '123' })).toBe(false);
  });

  it('rejects an object missing requestId', () => {
    expect(isMessage({ type: 'GET_SELECTION' })).toBe(false);
  });

  it('rejects an object with non-string requestId', () => {
    expect(isMessage({ type: 'GET_SELECTION', requestId: 123 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Per-type guards
// ---------------------------------------------------------------------------

describe('isGetSelection', () => {
  it('returns true for GET_SELECTION', () => {
    expect(isGetSelection({ type: 'GET_SELECTION', requestId: 'abc' })).toBe(
      true,
    );
  });

  it('returns false for SELECTION_RESULT', () => {
    expect(
      isGetSelection({
        type: 'SELECTION_RESULT',
        requestId: 'abc',
        text: 'hi',
      }),
    ).toBe(false);
  });

  it('returns false for non-message', () => {
    expect(isGetSelection({ foo: 'bar' })).toBe(false);
  });
});

describe('isSelectionResult', () => {
  it('returns true for valid SELECTION_RESULT', () => {
    expect(
      isSelectionResult({
        type: 'SELECTION_RESULT',
        requestId: 'abc',
        text: 'hello',
      }),
    ).toBe(true);
  });

  it('returns false when text is missing', () => {
    expect(
      isSelectionResult({ type: 'SELECTION_RESULT', requestId: 'abc' }),
    ).toBe(false);
  });

  it('returns false for wrong type', () => {
    expect(
      isSelectionResult({ type: 'GET_SELECTION', requestId: 'abc' }),
    ).toBe(false);
  });
});

describe('isMatchQuery', () => {
  it('returns true for valid MATCH_QUERY', () => {
    expect(
      isMatchQuery({ type: 'MATCH_QUERY', requestId: 'abc', text: 'numpy' }),
    ).toBe(true);
  });

  it('returns false when text is missing', () => {
    expect(isMatchQuery({ type: 'MATCH_QUERY', requestId: 'abc' })).toBe(
      false,
    );
  });
});

describe('isMatchResult', () => {
  it('returns true for valid MATCH_RESULT', () => {
    expect(
      isMatchResult({
        type: 'MATCH_RESULT',
        requestId: 'abc',
        result: { kind: 'miss', reason: 'no-local' },
      }),
    ).toBe(true);
  });

  it('returns false when result is missing', () => {
    expect(isMatchResult({ type: 'MATCH_RESULT', requestId: 'abc' })).toBe(
      false,
    );
  });

  it('returns false when result is null', () => {
    expect(
      isMatchResult({ type: 'MATCH_RESULT', requestId: 'abc', result: null }),
    ).toBe(false);
  });
});

describe('isCiteasLookup', () => {
  it('returns true for valid CITEAS_LOOKUP', () => {
    expect(
      isCiteasLookup({
        type: 'CITEAS_LOOKUP',
        requestId: 'abc',
        query: 'numpy',
      }),
    ).toBe(true);
  });

  it('returns false when query is missing', () => {
    expect(isCiteasLookup({ type: 'CITEAS_LOOKUP', requestId: 'abc' })).toBe(
      false,
    );
  });
});
