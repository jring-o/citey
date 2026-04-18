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
} from '../exporters/index.js';

export interface ActionBarProps {
  hits: PackageHit[];
}

/**
 * Resolve the set of packages to export.
 *
 * Per spec: high-confidence hits are exported; low-confidence hits are included
 * only when there are no high-confidence hits.
 */
function packagesForExport(hits: PackageHit[]) {
  const high = hits.filter((h) => h.confidence === 'high');
  const source = high.length > 0 ? high : hits;
  return source.map((h) => h.package);
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

  const packages = packagesForExport(hits);

  const handleZotero = useCallback(() => {
    openZoteroHtml(packages, getMeta());
  }, [packages]);

  const handleBib = useCallback(() => {
    const bib = toBibTeX(packages, getMeta());
    const blob = new Blob([bib], { type: 'application/x-bibtex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = bibFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, [packages]);

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

    const text = format === 'plain'
      ? toPlainText(packages)
      : toBibTeX(packages, getMeta());

    const result = await copyToClipboard(text);

    if (result.ok) {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy'), 1500);
    } else {
      setCopyError(result.reason);
    }
  }, [packages]);

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
