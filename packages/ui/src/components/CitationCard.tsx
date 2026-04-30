import type { Author, Package } from '@citey/citation-model';
import type { ReactNode } from 'react';
import { ConfidenceChip } from './ConfidenceChip.js';
import type { ConfidenceKind } from './ConfidenceChip.js';
import { CopyIcon } from './CopyButton.js';
import { IconButton } from './IconButton.js';

export interface CitationCardProps {
  pkg: Package;
  confidence: ConfidenceKind;
  onCopy?: () => void;
  /** Override the copy button content for testing or custom icons. */
  copyIcon?: ReactNode;
  /**
   * Sub-module / alias names that triggered this citation via `citeAs`.
   * When present, rendered as a small "matched via" subtitle so the
   * researcher can see why this parent citation appeared.
   */
  matchedVia?: readonly string[] | undefined;
  /**
   * Software Heritage Persistent IDentifier to display alongside the DOI.
   * May be a core (`swh:1:snp:<hex>`) or qualified
   * (`swh:1:rev:<hex>;origin=...;visit=...`) SWHID. When provided, renders
   * a chip linking to the SWH archive page for verification. Sourced from
   * either the live SWH lookup or the as-of-admission `pkg.swhid`.
   */
  swhid?: string | undefined;
}

function formatAuthorByline(authors: readonly Author[]): string {
  if (authors.length === 0) return '';

  const names = authors.slice(0, 3).map((a) => `${a.given} ${a.family}`);
  const byline = names.join(', ');
  return authors.length > 3 ? `${byline} et al.` : byline;
}

const cardStyle: React.CSSProperties = {
  fontFamily: 'var(--citey-font-family)',
  backgroundColor: 'var(--citey-color-surface)',
  border: '1px solid var(--citey-color-border-subtle)',
  borderRadius: 'var(--citey-radius-lg)',
  padding: 'var(--citey-space-4)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--citey-space-2)',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'var(--citey-font-size-xl)',
  fontWeight: 'var(--citey-font-weight-bold)' as unknown as number,
  lineHeight: 'var(--citey-line-height-tight)',
  color: 'var(--citey-color-text)',
  margin: 0,
};

const descriptionStyle: React.CSSProperties = {
  fontSize: 'var(--citey-font-size-md)',
  lineHeight: 'var(--citey-line-height-normal)',
  color: 'var(--citey-color-text-secondary)',
  margin: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const authorStyle: React.CSSProperties = {
  fontSize: 'var(--citey-font-size-sm)',
  color: 'var(--citey-color-text-muted)',
  margin: 0,
};

const matchedViaStyle: React.CSSProperties = {
  fontSize: 'var(--citey-font-size-xs)',
  color: 'var(--citey-color-text-muted)',
  fontStyle: 'italic',
  margin: 0,
};

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--citey-space-2)',
  flexWrap: 'wrap',
};

const doiBadgeStyle: React.CSSProperties = {
  fontSize: 'var(--citey-font-size-xs)',
  color: 'var(--citey-color-primary)',
  textDecoration: 'none',
  border: '1px solid var(--citey-color-primary)',
  borderRadius: 'var(--citey-radius-full)',
  padding: '2px var(--citey-space-2)',
  whiteSpace: 'nowrap',
};

/** Short display label for a SWHID — "swh:1:rev:1589193…". */
function shortSwhid(swhid: string): string {
  // Strip qualifiers (anything after the first `;`) to keep the chip compact.
  const core = swhid.split(';')[0] ?? swhid;
  const parts = core.split(':');
  if (parts.length < 4) return core;
  const hash = parts[3] ?? '';
  return `${parts.slice(0, 3).join(':')}:${hash.slice(0, 7)}…`;
}

export function CitationCard({
  pkg,
  confidence,
  onCopy,
  copyIcon,
  matchedVia,
  swhid,
}: CitationCardProps) {
  const byline = formatAuthorByline(pkg.citation?.authors ?? []);
  const doi = pkg.citation?.doi ?? pkg.dois?.[0];
  // Live SWHID > as-of-admission stored on the package.
  const effectiveSwhid = swhid ?? pkg.swhid;

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>{pkg.canonicalName}</h3>

      {matchedVia && matchedVia.length > 0 && (
        <p style={matchedViaStyle}>Matched via: {matchedVia.join(', ')}</p>
      )}

      <p style={descriptionStyle}>{pkg.description}</p>

      {byline && <p style={authorStyle}>{byline}</p>}

      <div style={metaRowStyle}>
        <ConfidenceChip kind={confidence} />

        {doi != null && (
          <a
            href={`https://doi.org/${doi}`}
            target="_blank"
            rel="noopener noreferrer"
            style={doiBadgeStyle}
          >
            DOI: {doi}
          </a>
        )}

        {effectiveSwhid != null && (
          <a
            href={`https://archive.softwareheritage.org/${encodeURIComponent(effectiveSwhid)}`}
            target="_blank"
            rel="noopener noreferrer"
            title={effectiveSwhid}
            style={doiBadgeStyle}
          >
            {shortSwhid(effectiveSwhid)}
          </a>
        )}

        {onCopy != null && (
          <IconButton
            aria-label="Copy this citation"
            onClick={onCopy}
            style={{ marginLeft: 'auto' }}
          >
            {copyIcon ?? CopyIcon}
          </IconButton>
        )}
      </div>
    </div>
  );
}
