import type { MatchResult } from '@citey/citation-model';
import type { MatchResultMessage } from '../shared/messages';
import { isMatchQuery } from '../shared/messages';
import { loadDb } from '../db/loader';
import { cacheGet, cacheSet } from './cache';
import { lookupCiteAs } from './citeas';
import { useCiteAsFallback, initFallbackFlag } from './fallback-flag';
import { normalize } from '../match/normalize';
import { match } from '../match/engine';
import { enrichHitsWithSwh } from './swh';

// Bound the per-hit SWH lookup so popup latency stays predictable. A warm
// SWH response is ~500 ms; 1500 ms gives one retry headroom before we fall
// back to the locally-constructed citation.
const SWH_TIMEOUT_MS = 1500;

// ---------------------------------------------------------------------------
// Context-menu entry — "Cite with Citey"
//
// This is the only supported path for reading text selections inside
// Chrome's built-in PDF viewer (PDFium). `info.selectionText` is populated
// by Chrome itself for any selection, regardless of whether the container
// is HTML or PDF, so we use it as the universal fallback.
// ---------------------------------------------------------------------------

const CONTEXT_MENU_ID = 'citey-cite-selection';
const PENDING_QUERY_KEY = 'pendingQuery';

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

initFallbackFlag();
initContextMenu();

function initContextMenu(): void {
  // `contextMenus.create` is the idempotent entry point for both fresh
  // installs and service-worker restarts. Wrap in a try/catch and ignore
  // "duplicate id" errors that occur when the worker wakes up.
  const create = () => {
    chrome.contextMenus.create(
      {
        id: CONTEXT_MENU_ID,
        title: 'Cite with Citey',
        contexts: ['selection'],
      },
      () => {
        // Swallow "Cannot create item with duplicate id" — harmless.
        if (chrome.runtime.lastError) {
          /* noop */
        }
      },
    );
  };

  if (chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled.addListener(create);
  }
  // Also attempt on every service-worker boot in case onInstalled already fired.
  create();
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  const text = (info.selectionText ?? '').trim();
  if (!text) return;

  // Cache the selection for the popup to pick up, then open the popup.
  await chrome.storage.session.set({ [PENDING_QUERY_KEY]: text });

  // `chrome.action.openPopup` requires Chrome 127+. Fall back silently —
  // the user can still click the toolbar icon manually if openPopup fails.
  try {
    if (tab?.windowId !== undefined) {
      await chrome.action.openPopup({ windowId: tab.windowId });
    } else {
      await chrome.action.openPopup();
    }
  } catch {
    /* openPopup unsupported or blocked — pendingQuery still waits in
       session storage for the user to click the toolbar icon. */
  }
});

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

    // If we got hits, augment with live SWH data before replying. Missing
    // or slow SWH responses leave hits unchanged, so this never blocks the
    // local-match path beyond SWH_TIMEOUT_MS.
    if (result.kind === 'hits') {
      const [high, low] = await Promise.all([
        enrichHitsWithSwh(result.high, SWH_TIMEOUT_MS),
        enrichHitsWithSwh(result.low, SWH_TIMEOUT_MS),
      ]);
      reply(requestId, { kind: 'hits', high, low }, normalized, sendResponse);
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
