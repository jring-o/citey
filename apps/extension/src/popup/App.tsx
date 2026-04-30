// ---------------------------------------------------------------------------
// §5.1 — Popup App: wires state machine to chrome messaging side effects
// ---------------------------------------------------------------------------

import { useReducer, useEffect, useRef, useCallback } from 'react';
import { Spinner, CitationCard, Banner, Button } from '@citey/ui';
import {
  reducer,
  INITIAL_STATE,
  isRestrictedUrl,
  isEmptyOrOversizedSelection,
  type PopupState,
} from './state-machine.js';
import type { PackageHit } from '@citey/citation-model';
import { newRequestId } from '../shared/messages.js';
import type { MatchResultMessage } from '../shared/messages.js';
import { Header } from './Header.js';
import { Footer } from './Footer.js';
import { ActionBar } from './ActionBar.js';
import { DidWeMiss } from './DidWeMiss.js';

const TIMEOUT_MS = 4500;

/** Substrings in chrome.scripting errors that indicate a page we can't inject into. */
const RESTRICTED_INJECT_ERRORS = [
  'Cannot access', // e.g., "Cannot access a chrome:// URL"
  'Cannot access contents', // older Chrome wording
  'Extension manifest must request permission',
  'The extensions gallery cannot be scripted',
];

/** Key the background service worker writes when the user clicks the
 *  "Cite with Citey" context menu (the path used for Chrome's PDF viewer). */
const PENDING_QUERY_KEY = 'pendingQuery';

export function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // --------------------------------------------------
  // On mount: detect restricted page or send GET_SELECTION
  // --------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    // Start wall-clock timer
    timeoutRef.current = setTimeout(() => {
      if (!cancelled) dispatch({ type: 'TIMEOUT' });
    }, TIMEOUT_MS);

    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = tab?.url ?? '';

        if (isRestrictedUrl(url)) {
          clearTimer();
          if (!cancelled) dispatch({ type: 'RESTRICTED_DETECTED' });
          return;
        }

        // 1. Check the context-menu pending-query cache first. The
        //    background script writes this when the user picks "Cite with
        //    Citey" from a right-click — the only supported path for
        //    Chrome's built-in PDF viewer.
        let text = '';
        try {
          const stored = await chrome.storage.session.get(PENDING_QUERY_KEY);
          const pending = stored[PENDING_QUERY_KEY];
          if (typeof pending === 'string' && pending !== '') {
            text = pending;
            // Consume the cached query so a subsequent toolbar click goes
            // through the normal selection-reading path.
            await chrome.storage.session.remove(PENDING_QUERY_KEY);
          }
        } catch {
          /* session storage unsupported in test environments — fall through */
        }

        // 2. No cached query → read selection from every frame of the
        //    active tab. allFrames:true is required for selections inside
        //    HTML iframes (e.g. PDF.js renderings on Overleaf, arXiv HTML).
        if (!text) {
          const tabId = tab?.id;
          if (tabId === undefined) return;
          const results = await chrome.scripting.executeScript({
            target: { tabId, allFrames: true },
            func: () => window.getSelection()?.toString().trim() ?? '',
          });
          if (cancelled) return;
          text = results.find((r) => typeof r.result === 'string' && r.result !== '')?.result ?? '';
        }

        if (cancelled) return;
        dispatch({ type: 'SELECTION_RECEIVED', text });

        // If empty/oversized, done (reducer transitions to empty_selection)
        if (isEmptyOrOversizedSelection(text)) {
          clearTimer();
          return;
        }

        const trimmed = text.trim();

        // Send MATCH_QUERY to background
        const matchRequestId = newRequestId();
        const matchResponse = (await chrome.runtime.sendMessage({
          type: 'MATCH_QUERY',
          requestId: matchRequestId,
          text: trimmed,
        })) as MatchResultMessage;

        if (cancelled) return;
        clearTimer();

        if (matchResponse?.result != null) {
          dispatch({
            type: 'MATCH_RECEIVED',
            result: matchResponse.result,
            query: trimmed,
          });
        }
      } catch (err: unknown) {
        if (cancelled) return;
        clearTimer();

        const message = err instanceof Error ? err.message : String(err);

        // chrome.scripting refused to inject (chrome://, web store, etc.)
        if (RESTRICTED_INJECT_ERRORS.some((s) => message.includes(s))) {
          dispatch({ type: 'RESTRICTED_DETECTED' });
          return;
        }

        dispatch({
          type: 'ERROR',
          message: 'Something went wrong. Try again, or contribute the missing package.',
        });
      }
    })();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [clearTimer]);

  const handleRetry = useCallback(() => {
    dispatch({ type: 'RETRY' });
  }, []);

  const handleCancelFallback = useCallback(() => {
    dispatch({ type: 'FALLBACK_CANCELLED' });
  }, []);

  return (
    <div className="citey-popup">
      <Header />
      <main className="citey-body" aria-live="polite">
        {renderBody(state, handleRetry, handleCancelFallback)}
      </main>
      <Footer stateName={state.name} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hit-count summary
// ---------------------------------------------------------------------------

function pluralize(n: number, singular: string, plural?: string): string {
  return n === 1 ? singular : (plural ?? `${singular}s`);
}

function HitsSummary({ high, low, citeas }: { high: number; low: number; citeas: number }) {
  const parts: string[] = [];
  if (high > 0) parts.push(`${high} high-confidence ${pluralize(high, 'match', 'matches')}`);
  if (low > 0) parts.push(`${low} possible ${pluralize(low, 'match', 'matches')}`);
  if (citeas > 0) parts.push(`${citeas} ${pluralize(citeas, 'match', 'matches')} via CiteAs`);

  if (parts.length === 0) return null;

  // Join with " and " for two parts, comma + " and " for three.
  let text: string;
  if (parts.length === 1) text = `Found ${parts[0]}.`;
  else if (parts.length === 2) text = `Found ${parts[0]} and ${parts[1]}.`;
  else text = `Found ${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}.`;

  return <p className="citey-hits-summary">{text}</p>;
}

// ---------------------------------------------------------------------------
// Shared hit-list renderer (used by hits_high, hits_low, citeas_hit)
// ---------------------------------------------------------------------------

function renderHitList(
  hits: PackageHit[],
  confidence: 'high' | 'low' | 'citeas',
  banner?: React.ReactNode,
) {
  const summary = (
    <HitsSummary
      high={confidence === 'high' ? hits.length : 0}
      low={confidence === 'low' ? hits.length : 0}
      citeas={confidence === 'citeas' ? hits.length : 0}
    />
  );
  return (
    <div className="citey-state citey-state--hits">
      <ActionBar hits={hits} />
      {summary}
      {banner}
      <div className="citey-results">
        {hits.map((hit) => (
          <CitationCard
            key={hit.package.id}
            pkg={hit.package}
            confidence={confidence}
            matchedVia={hit.matchedVia}
            swhid={hit.swh?.swhid}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Body renderer (one branch per state)
// ---------------------------------------------------------------------------

function renderBody(state: PopupState, onRetry: () => void, onCancelFallback: () => void) {
  switch (state.name) {
    // State 1: Loading
    case 'loading':
      return (
        <div className="citey-state citey-state--loading">
          <Spinner label="Looking for software" />
          <p>Looking for software&hellip;</p>
        </div>
      );

    // State 2: Hits — high confidence
    case 'hits_high':
      return renderHitList(state.hits, 'high');

    // State 3: Hits — mixed
    case 'hits_mixed':
      return (
        <div className="citey-state citey-state--hits">
          <ActionBar hits={[...state.high, ...state.low]} />
          <HitsSummary high={state.high.length} low={state.low.length} citeas={0} />
          <div className="citey-results">
            {state.high.map((hit) => (
              <CitationCard
                key={hit.package.id}
                pkg={hit.package}
                confidence="high"
                matchedVia={hit.matchedVia}
                swhid={hit.swh?.swhid}
              />
            ))}
            <div className="citey-divider" role="separator">
              Possible matches &mdash; please verify
            </div>
            {state.low.map((hit) => (
              <CitationCard
                key={hit.package.id}
                pkg={hit.package}
                confidence="low"
                matchedVia={hit.matchedVia}
                swhid={hit.swh?.swhid}
              />
            ))}
          </div>
        </div>
      );

    // State 4: Hits — low confidence only
    case 'hits_low':
      return renderHitList(
        state.hits,
        'low',
        <Banner>Low confidence &mdash; please verify</Banner>,
      );

    // State 5: Empty selection
    case 'empty_selection':
      return (
        <div className="citey-state citey-state--empty">
          <p>Highlight some text on the page first, then click Citey.</p>
        </div>
      );

    // State 5b: Oversized selection
    case 'oversized_selection':
      return (
        <div className="citey-state citey-state--empty">
          <p>
            That selection is too large ({state.length.toLocaleString()} characters). Highlight just
            the software name &mdash; or a short sentence containing it &mdash; and try again.
          </p>
        </div>
      );

    // State 6: Restricted page
    case 'restricted_page':
      return (
        <div className="citey-state citey-state--restricted">
          <p>Citey can&apos;t read selections on this page (Chrome restricts access).</p>
          <a
            href="https://citey.scios.tech/help/restricted-pages"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more
          </a>
        </div>
      );

    // State 7: No hits, fallback in flight
    case 'fallback_in_flight':
      return (
        <div className="citey-state citey-state--fallback">
          <p className="citey-fallback-status">
            Asking CiteAs&hellip;
            <button
              className="citey-fallback-cancel"
              onClick={onCancelFallback}
              aria-label="Cancel CiteAs lookup"
            >
              &times;
            </button>
          </p>
        </div>
      );

    // State 8: No hits, CiteAs hit
    case 'citeas_hit':
      return renderHitList(state.hits, 'citeas');

    // State 9: No hits, total miss
    case 'total_miss':
      return (
        <div className="citey-state citey-state--miss">
          <DidWeMiss full />
        </div>
      );

    // State 10: Error
    case 'error':
      return (
        <div className="citey-state citey-state--error" role="alert">
          <p>Something went wrong. Try again, or contribute the missing package.</p>
          <Button variant="primary" onClick={onRetry}>
            Retry
          </Button>
          <DidWeMiss />
        </div>
      );

    default:
      return null;
  }
}
