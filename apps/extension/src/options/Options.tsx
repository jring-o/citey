// ---------------------------------------------------------------------------
// Options page — DB info, Settings, About
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { Toggle, RadioGroup } from '@citey/ui';
import {
  getSettings,
  setUseCiteAsFallback,
  setClipboardFormat,
  type ClipboardFormat,
} from './storage.js';

// ---------------------------------------------------------------------------
// DB metadata shape (subset of db.json)
// ---------------------------------------------------------------------------

interface DbMeta {
  dbVersion: string;
  packageCount: number;
  builtAt: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Options() {
  // -- Settings state -------------------------------------------------------
  const [useFallback, setUseFallback] = useState(true);
  const [format, setFormat] = useState<ClipboardFormat>('bibtex');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // -- DB metadata state ----------------------------------------------------
  const [dbMeta, setDbMeta] = useState<DbMeta | null>(null);

  // -- Extension version ----------------------------------------------------
  const extVersion = chrome.runtime.getManifest().version;

  // -- Load settings on mount -----------------------------------------------
  useEffect(() => {
    getSettings().then((s) => {
      setUseFallback(s.useCiteAsFallback);
      setFormat(s.clipboardFormat);
      setSettingsLoaded(true);
    });
  }, []);

  // -- Load db.json on mount ------------------------------------------------
  useEffect(() => {
    fetch(chrome.runtime.getURL('db.json'))
      .then((r) => r.json())
      .then((data: DbMeta) => {
        setDbMeta({
          dbVersion: data.dbVersion,
          packageCount: data.packageCount,
          builtAt: data.builtAt,
        });
      })
      .catch((err: unknown) => {
        console.error('citey: failed to load db.json metadata', err);
      });
  }, []);

  // -- Handlers -------------------------------------------------------------
  const handleToggleFallback = useCallback(() => {
    setUseFallback((prev) => {
      const next = !prev;
      setUseCiteAsFallback(next);
      return next;
    });
  }, []);

  const handleFormatChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value as ClipboardFormat;
    setFormat(v);
    setClipboardFormat(v);
  }, []);

  // -- Format builtAt for display -------------------------------------------
  const builtDate = dbMeta
    ? dbMeta.builtAt.slice(0, 10) // "YYYY-MM-DD"
    : '';

  return (
    <div className="citey-options">
      <h1 className="citey-options__title">Citey Options</h1>

      {/* ── Section 1: DB Info ──────────────────────────────────── */}
      <section className="citey-options__section">
        <h2 className="citey-options__section-title">Database</h2>
        <p className="citey-options__version">Citey v{extVersion}</p>
        {dbMeta ? (
          <>
            <p className="citey-options__db-info">
              Database v{dbMeta.dbVersion} ({dbMeta.packageCount} packages, built {builtDate})
            </p>
            <a
              className="citey-options__link"
              href="https://citey.scios.tech/packages"
              target="_blank"
              rel="noopener noreferrer"
            >
              Browse all packages
            </a>
          </>
        ) : (
          <p className="citey-options__loading">Loading database info&hellip;</p>
        )}
      </section>

      {/* ── Section 2: Settings ─────────────────────────────────── */}
      <section className="citey-options__section">
        <h2 className="citey-options__section-title">Settings</h2>

        {settingsLoaded ? (
          <>
            {/* Fallback toggle */}
            <div className="citey-options__field">
              <div className="citey-options__field-row">
                <Toggle
                  id="useCiteAsFallback"
                  checked={useFallback}
                  onChange={handleToggleFallback}
                />
                <label htmlFor="useCiteAsFallback" className="citey-options__field-label">
                  Use online fallback (CiteAs)
                </label>
              </div>
              <p className="citey-options__field-help">
                When you highlight a package we don&apos;t know, Citey can ask{' '}
                <a href="https://citeas.org" target="_blank" rel="noopener noreferrer">
                  CiteAs
                </a>
                . Your selection is sent to CiteAs only on a miss. Toggle off to keep all queries
                local.
              </p>
            </div>

            {/* Clipboard format radio */}
            <div className="citey-options__field">
              <label className="citey-options__field-label" id="clipboardFormat-label">
                Default clipboard format
              </label>
              <div style={{ marginTop: 'var(--citey-space-2)' }}>
                <RadioGroup
                  id="clipboardFormat"
                  name="clipboardFormat"
                  options={[
                    { value: 'bibtex', label: 'BibTeX' },
                    { value: 'plain', label: 'Plain text' },
                  ]}
                  value={format}
                  onChange={handleFormatChange}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="citey-options__loading">Loading settings&hellip;</p>
        )}
      </section>

      {/* ── Section 3: About ────────────────────────────────────── */}
      <section className="citey-options__section">
        <h2 className="citey-options__section-title">About</h2>
        <p className="citey-options__about">
          Citey is a free, open-source Chrome extension that helps researchers and developers cite
          the software they use. It works by matching highlighted text against a curated database of
          software packages and their preferred citations. All local matches happen entirely on your
          device with zero network traffic. When the online fallback is enabled and a local match is
          not found, your query is sent to{' '}
          <a href="https://citeas.org" target="_blank" rel="noopener noreferrer">
            CiteAs
          </a>
          . No personal data is collected or transmitted. Source code is available on{' '}
          <a href="https://github.com/jring-o/citey" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          . For questions, contact <a href="mailto:citey@scios.tech">citey@scios.tech</a>.
        </p>
      </section>
    </div>
  );
}
