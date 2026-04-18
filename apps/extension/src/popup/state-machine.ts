// ---------------------------------------------------------------------------
// §5.1.1 — Popup state machine (10 states, pure reducer)
// ---------------------------------------------------------------------------

import type { MatchResult, PackageHit } from '@citey/citation-model';

// ---------------------------------------------------------------------------
// State types
// ---------------------------------------------------------------------------

export type PopupStateName =
  | 'loading'
  | 'hits_high'
  | 'hits_mixed'
  | 'hits_low'
  | 'empty_selection'
  | 'oversized_selection'
  | 'restricted_page'
  | 'fallback_in_flight'
  | 'citeas_hit'
  | 'total_miss'
  | 'error';

export const ALL_STATES: readonly PopupStateName[] = [
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
] as const;

export type PopupState =
  | { name: 'loading'; query: string }
  | { name: 'hits_high'; query: string; hits: PackageHit[] }
  | { name: 'hits_mixed'; query: string; high: PackageHit[]; low: PackageHit[] }
  | { name: 'hits_low'; query: string; hits: PackageHit[] }
  | { name: 'empty_selection' }
  | { name: 'oversized_selection'; length: number }
  | { name: 'restricted_page' }
  | { name: 'fallback_in_flight'; query: string }
  | { name: 'citeas_hit'; query: string; hits: PackageHit[] }
  | { name: 'total_miss'; query: string }
  | { name: 'error'; query: string; message: string };

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type PopupEvent =
  | { type: 'SELECTION_RECEIVED'; text: string }
  | { type: 'MATCH_RECEIVED'; result: MatchResult; query: string }
  | { type: 'TIMEOUT' }
  | { type: 'ERROR'; message: string }
  | { type: 'RETRY' }
  | { type: 'FALLBACK_STARTED'; query: string }
  | { type: 'FALLBACK_CANCELLED' }
  | { type: 'RESTRICTED_DETECTED' };

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const INITIAL_STATE: PopupState = { name: 'loading', query: '' };

// ---------------------------------------------------------------------------
// Restricted-page URL detection (§5.1.6)
// ---------------------------------------------------------------------------

const RESTRICTED_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'view-source:',
];

const WEBSTORE_PATTERN = /^https:\/\/chrome\.google\.com\/webstore\//;

export function isRestrictedUrl(url: string): boolean {
  for (const prefix of RESTRICTED_PREFIXES) {
    if (url.startsWith(prefix)) return true;
  }
  return WEBSTORE_PATTERN.test(url);
}

// ---------------------------------------------------------------------------
// Selection validation
// ---------------------------------------------------------------------------

/**
 * Hard cap on selection size, enforced before we send the text to the
 * background matcher. We need *some* upper bound — the matcher tokenizes,
 * fuzzy-scores, and runs through the alias index, all of which scale with
 * input length, and chrome.runtime.sendMessage has its own message-size
 * limits. 200k characters is comfortably larger than a full-paper Ctrl+A
 * (which typically lands in the 30k–80k range).
 */
export const MAX_SELECTION_LENGTH = 200_000;

export function isEmptySelection(text: string): boolean {
  return text.trim().length === 0;
}

export function isOversizedSelection(text: string): boolean {
  return text.trim().length > MAX_SELECTION_LENGTH;
}

/** Kept for callers that just want a yes/no on "we can't process this". */
export function isEmptyOrOversizedSelection(text: string): boolean {
  return isEmptySelection(text) || isOversizedSelection(text);
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/** Extract the query string from any state (returns '' if state has no query). */
function queryFromState(state: PopupState): string {
  return 'query' in state ? state.query : '';
}

export function reducer(state: PopupState, event: PopupEvent): PopupState {
  switch (event.type) {
    case 'SELECTION_RECEIVED': {
      const trimmed = event.text.trim();
      if (trimmed.length === 0) {
        return { name: 'empty_selection' };
      }
      if (trimmed.length > MAX_SELECTION_LENGTH) {
        return { name: 'oversized_selection', length: trimmed.length };
      }
      return { name: 'loading', query: trimmed };
    }

    case 'MATCH_RECEIVED': {
      const { result, query } = event;

      switch (result.kind) {
        case 'hits': {
          const hasHigh = result.high.length > 0;
          const hasLow = result.low.length > 0;

          if (hasHigh && hasLow) {
            return { name: 'hits_mixed', query, high: result.high, low: result.low };
          }
          if (hasHigh) {
            return { name: 'hits_high', query, hits: result.high };
          }
          if (hasLow) {
            return { name: 'hits_low', query, hits: result.low };
          }
          // No hits at all — treat as miss triggering fallback
          return { name: 'fallback_in_flight', query };
        }

        case 'fallback': {
          if (result.hits.length > 0) {
            return { name: 'citeas_hit', query, hits: result.hits };
          }
          return { name: 'total_miss', query };
        }

        case 'miss': {
          if (result.reason === 'no-local') {
            return { name: 'fallback_in_flight', query };
          }
          return { name: 'total_miss', query };
        }

        default:
          return state;
      }
    }

    case 'RESTRICTED_DETECTED':
      return { name: 'restricted_page' };

    case 'FALLBACK_STARTED':
      return { name: 'fallback_in_flight', query: event.query };

    case 'FALLBACK_CANCELLED':
      return { name: 'total_miss', query: queryFromState(state) };

    case 'TIMEOUT':
      return { name: 'error', query: queryFromState(state), message: 'Request timed out. Try again.' };

    case 'ERROR':
      return { name: 'error', query: queryFromState(state), message: event.message };

    case 'RETRY':
      return INITIAL_STATE;

    default:
      return state;
  }
}
