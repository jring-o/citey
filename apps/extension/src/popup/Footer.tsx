// ---------------------------------------------------------------------------
// §5.1.2 — Conditional footer with "Did we miss?" link
// ---------------------------------------------------------------------------

import type { PopupStateName } from './state-machine.js';
import { DidWeMiss } from './DidWeMiss.js';

/** States where the footer (Did-we-miss link) is hidden. */
const HIDDEN_FOOTER_STATES: ReadonlySet<PopupStateName> = new Set([
  'empty_selection',
  'oversized_selection',
  'restricted_page',
]);

export interface FooterProps {
  stateName: PopupStateName;
}

export function Footer({ stateName }: FooterProps) {
  if (HIDDEN_FOOTER_STATES.has(stateName)) {
    return null;
  }

  return (
    <footer className="citey-footer">
      <DidWeMiss />
    </footer>
  );
}
