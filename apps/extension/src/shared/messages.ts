import type { MatchResult } from '@citey/citation-model';

// ---------------------------------------------------------------------------
// Message union (discriminated on `type`)
// ---------------------------------------------------------------------------

export type GetSelectionMessage = {
  type: 'GET_SELECTION';
  requestId: string;
};

export type SelectionResultMessage = {
  type: 'SELECTION_RESULT';
  requestId: string;
  text: string;
};

export type MatchQueryMessage = {
  type: 'MATCH_QUERY';
  requestId: string;
  text: string;
};

export type MatchResultMessage = {
  type: 'MATCH_RESULT';
  requestId: string;
  result: MatchResult;
};

export type CiteasLookupMessage = {
  type: 'CITEAS_LOOKUP';
  requestId: string;
  query: string;
};

export type Message =
  | GetSelectionMessage
  | SelectionResultMessage
  | MatchQueryMessage
  | MatchResultMessage
  | CiteasLookupMessage;

// ---------------------------------------------------------------------------
// All known type literals (used for runtime validation)
// ---------------------------------------------------------------------------

const MESSAGE_TYPES = new Set<string>([
  'GET_SELECTION',
  'SELECTION_RESULT',
  'MATCH_QUERY',
  'MATCH_RESULT',
  'CITEAS_LOOKUP',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a new v4 UUID for message correlation. */
export function newRequestId(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/**
 * Runtime check: is `m` a valid Message object?
 * Returns true iff `m` is a non-null object with a known `type` string and
 * a `requestId` string.
 */
export function isMessage(m: unknown): m is Message {
  if (typeof m !== 'object' || m === null) return false;
  const obj = m as Record<string, unknown>;
  return (
    typeof obj['type'] === 'string' &&
    MESSAGE_TYPES.has(obj['type']) &&
    typeof obj['requestId'] === 'string'
  );
}

export function isGetSelection(m: unknown): m is GetSelectionMessage {
  return isMessage(m) && m.type === 'GET_SELECTION';
}

export function isSelectionResult(m: unknown): m is SelectionResultMessage {
  return isMessage(m) && m.type === 'SELECTION_RESULT' && typeof m.text === 'string';
}

export function isMatchQuery(m: unknown): m is MatchQueryMessage {
  return isMessage(m) && m.type === 'MATCH_QUERY' && typeof m.text === 'string';
}

export function isMatchResult(m: unknown): m is MatchResultMessage {
  return (
    isMessage(m) &&
    m.type === 'MATCH_RESULT' &&
    typeof m.result === 'object' &&
    m.result !== null
  );
}

export function isCiteasLookup(m: unknown): m is CiteasLookupMessage {
  return isMessage(m) && m.type === 'CITEAS_LOOKUP' && typeof m.query === 'string';
}
