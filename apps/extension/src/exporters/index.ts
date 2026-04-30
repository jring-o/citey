// ---------------------------------------------------------------------------
// Exporters — barrel export
// ---------------------------------------------------------------------------

export { escapeLatex, LATEX_SPECIALS, DIACRITICS } from './escape.js';
export { bibKeyFor, dedupeKeys } from './bibkey.js';
export { toBibTeX, type BibTeXMeta, type SwhExtras } from './bibtex.js';
export { toZoteroHtml, openZoteroHtml, type ZoteroMeta } from './zotero-html.js';
export { toPlainText, formatAuthors } from './plain-text.js';
export { copyToClipboard } from './clipboard.js';
export { bibFilename } from './filename.js';
