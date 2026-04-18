import type { MatchResult } from '@citey/citation-model';
import type { MatchResultMessage } from '../shared/messages';
import { isMatchQuery } from '../shared/messages';
import { loadDb } from '../db/loader';
import { cacheGet, cacheSet } from './cache';
import { lookupCiteAs } from './citeas';
import { useCiteAsFallback, initFallbackFlag } from './fallback-flag';
import { normalize } from '../match/normalize';
import { match } from '../match/engine';

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

initFallbackFlag();

// ---------------------------------------------------------------------------
// Shared miss result (immutable — safe to reuse)
// ---------------------------------------------------------------------------

const MISS_FALLBACK_FAILED: MatchResult = { kind: 'miss', reason: 'fallback-failed' };

// ---------------------------------------------------------------------------
// Helper: cache + respond in one call
// ---------------------------------------------------------------------------

function reply(
  requestId: string,
  result: MatchResult,
  normalized: string,
  sendResponse: (response: MatchResultMessage) => void,
): void {
  cacheSet(normalized, result);
  sendResponse({ type: 'MATCH_RESULT', requestId, result });
}

// ---------------------------------------------------------------------------
// Message router
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MatchResultMessage) => void,
  ): boolean | undefined => {
    if (!isMatchQuery(message)) {
      console.warn('citey: unknown message in background', message);
      return;
    }

    const { requestId, text } = message;

    // Normalize query for cache key
    const normalized = normalize(text);

    // Check cache first
    const cached = cacheGet(normalized);
    if (cached) {
      sendResponse({ type: 'MATCH_RESULT', requestId, result: cached });
      return;
    }

    // Async path — return true to keep the message channel open
    handleMatchQuery(text, normalized, requestId, sendResponse);
    return true;
  },
);

// ---------------------------------------------------------------------------
// Async match handler
// ---------------------------------------------------------------------------

async function handleMatchQuery(
  rawQuery: string,
  normalized: string,
  requestId: string,
  sendResponse: (response: MatchResultMessage) => void,
): Promise<void> {
  try {
    const db = await loadDb();

    if (!db) {
      reply(requestId, MISS_FALLBACK_FAILED, normalized, sendResponse);
      return;
    }

    // Run the full match engine (S13)
    const result = match({
      query: rawQuery,
      byId: db.byId,
      aliasIndex: db.aliasIndex,
    });

    // If we got hits, reply immediately
    if (result.kind === 'hits') {
      reply(requestId, result, normalized, sendResponse);
      return;
    }

    // Local miss — try CiteAs fallback if enabled
    if (!useCiteAsFallback) {
      reply(requestId, { kind: 'miss', reason: 'fallback-disabled' }, normalized, sendResponse);
      return;
    }

    // CiteAs with 3 s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const hit = await lookupCiteAs(normalized, controller.signal);
    clearTimeout(timeout);

    if (hit) {
      reply(
        requestId,
        { kind: 'fallback', source: 'citeas', hits: [hit] },
        normalized,
        sendResponse,
      );
      return;
    }

    // CiteAs miss
    reply(requestId, MISS_FALLBACK_FAILED, normalized, sendResponse);
  } catch (err) {
    console.error('citey: unexpected error in background handler', err);
    sendResponse({ type: 'MATCH_RESULT', requestId, result: MISS_FALLBACK_FAILED });
  }
}

export {};
