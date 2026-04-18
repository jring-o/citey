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
import type { MatchResultMessage, SelectionResultMessage } from '../shared/messages.js';
import { Header } from './Header.js';
import { Footer } from './Footer.js';
import { ActionBar } from './ActionBar.js';
import { DidWeMiss } from './DidWeMiss.js';

const TIMEOUT_MS = 4500;

/** Connection-error message Chrome gives when content script is unreachable. */
const CONNECTION_ERROR = 'Could not establish connection. Receiving end does not exist.';

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

        // Send GET_SELECTION to the active tab's content script
        const requestId = newRequestId();
        const response = (await chrome.tabs.sendMessage(tab!.id!, {
          type: 'GET_SELECTION',
          requestId,
        })) as SelectionResultMessage;

        if (cancelled) return;

        const text = response?.text ?? '';
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

        // Content script unreachable → restricted page
        if (message.includes(CONNECTION_ERROR)) {
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

  const query = 'query' in state ? state.query : '';

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
// Shared hit-list renderer (used by hits_high, hits_low, citeas_hit)
// ---------------------------------------------------------------------------

function renderHitList(
  hits: PackageHit[],
  confidence: 'high' | 'low' | 'citeas',
  banner?: React.ReactNode,
) {
  return (
    <div className="citey-state citey-state--hits">
      <ActionBar hits={hits} />
      {banner}
      <div className="citey-results">
        {hits.map((hit) => (
          <CitationCard
            key={hit.package.id}
            pkg={hit.package}
            confidence={confidence}
            matchedVia={hit.matchedVia}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Body renderer (one branch per state)
// ---------------------------------------------------------------------------

function renderBody(
  state: PopupState,
  onRetry: () => void,
  onCancelFallback: () => void,
) {
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
          <div className="citey-results">
            {state.high.map((hit) => (
              <CitationCard
                key={hit.package.id}
                pkg={hit.package}
                confidence="high"
                matchedVia={hit.matchedVia}
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

    // State 6: Restricted page
    case 'restricted_page':
      return (
        <div className="citey-state citey-state--restricted">
          <p>
            Citey can&apos;t read selections on this page (Chrome restricts access).
          </p>
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
          <p>
            Something went wrong. Try again, or contribute the missing package.
          </p>
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
