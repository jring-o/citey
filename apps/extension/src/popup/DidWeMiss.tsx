// ---------------------------------------------------------------------------
// §5.1.7 — "Did we miss?" link / state
// ---------------------------------------------------------------------------

const CONTRIBUTE_URL = 'https://citey.scios.tech';

export interface DidWeMissProps {
  /** When true, renders the full two-line state with CTA. */
  full?: boolean;
}

export function DidWeMiss({ full = false }: DidWeMissProps) {
  if (full) {
    return (
      <div className="citey-did-we-miss citey-did-we-miss--full">
        <p className="citey-did-we-miss__text">
          We couldn't find a citation for this software.
        </p>
        <p className="citey-did-we-miss__text">
          Know the right citation? Help the community by adding it.
        </p>
        <a
          href={CONTRIBUTE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="citey-did-we-miss__cta"
        >
          Help us add it &rarr;
        </a>
      </div>
    );
  }

  return (
    <div className="citey-did-we-miss">
      <a
        href={CONTRIBUTE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="citey-did-we-miss__link"
      >
        Did we miss something?
      </a>
    </div>
  );
}
