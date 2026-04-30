// ---------------------------------------------------------------------------
// §5.1.3 — Action bar: Open HTML (Zotero), Export .bib, Copy to clipboard
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';
import type { PackageHit } from '@citey/citation-model';
import { Button } from '@citey/ui';
import {
  toBibTeX,
  openZoteroHtml,
  toPlainText,
  copyToClipboard,
  bibFilename,
  type SwhExtras,
} from '../exporters/index.js';

export interface ActionBarProps {
  hits: PackageHit[];
}

/**
 * Resolve the set of hits to export.
 *
 * Per spec: high-confidence hits are exported; low-confidence hits are included
 * only when there are no high-confidence hits.
 */
function hitsForExport(hits: PackageHit[]): PackageHit[] {
  const high = hits.filter((h) => h.confidence === 'high');
  return high.length > 0 ? high : hits;
}

/** Extract live SWH data from hits keyed by package id for the exporter. */
function swhMapForExport(hits: PackageHit[]): Map<string, SwhExtras> {
  const map = new Map<string, SwhExtras>();
  for (const h of hits) {
    if (h.swh !== undefined) map.set(h.package.id, h.swh);
  }
  return map;
}

function getMeta() {
  return {
    extensionVersion:
      typeof chrome !== 'undefined'
        ? (chrome?.runtime?.getManifest?.()?.version ?? '0.1.0')
        : '0.1.0',
    dbVersion: '1',
  };
}

export function ActionBar({ hits }: ActionBarProps) {
  const [copyLabel, setCopyLabel] = useState<string>('Copy');
  const [copyError, setCopyError] = useState<string | null>(null);

  const exportHits = hitsForExport(hits);
  const packages = exportHits.map((h) => h.package);
  const swhMap = swhMapForExport(exportHits);

  const handleZotero = useCallback(() => {
    openZoteroHtml(packages, getMeta());
  }, [packages]);

  const handleBib = useCallback(() => {
    const bib = toBibTeX(packages, getMeta(), swhMap);
    const blob = new Blob([bib], { type: 'application/x-bibtex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = bibFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, [packages, swhMap]);

  const handleCopy = useCallback(async () => {
    setCopyError(null);

    // Determine clipboard format from user preferences
    let format: string = 'bibtex';
    try {
      const stored = await chrome.storage.sync.get('clipboardFormat');
      if (stored['clipboardFormat'] === 'plain') {
        format = 'plain';
      }
    } catch {
      // Default to bibtex if storage unavailable
    }

    const text = format === 'plain' ? toPlainText(packages) : toBibTeX(packages, getMeta(), swhMap);

    const result = await copyToClipboard(text);

    if (result.ok) {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy'), 1500);
    } else {
      setCopyError(result.reason);
    }
  }, [packages, swhMap]);

  return (
    <div className="citey-action-bar" role="toolbar" aria-label="Citation actions">
      <Button variant="secondary" onClick={handleZotero}>
        Open HTML (Zotero)
      </Button>
      <Button variant="secondary" onClick={handleBib}>
        Export .bib
      </Button>
      <Button variant="secondary" onClick={handleCopy}>
        {copyLabel}
      </Button>
      {copyError != null && (
        <span className="citey-action-bar__error" role="alert">
          {copyError}
        </span>
      )}
    </div>
  );
}
