// ---------------------------------------------------------------------------
// §5.1.3 — BibTeX filename generator
// ---------------------------------------------------------------------------

/**
 * Generate a timestamped `.bib` filename.
 *
 * Format: `citey-YYYYMMDD-HHMMSS.bib`
 *
 * Uses UTC to ensure deterministic output regardless of local timezone.
 */
export function bibFilename(now = new Date()): string {
  const y = now.getUTCFullYear().toString();
  const m = pad2(now.getUTCMonth() + 1);
  const d = pad2(now.getUTCDate());
  const hh = pad2(now.getUTCHours());
  const mm = pad2(now.getUTCMinutes());
  const ss = pad2(now.getUTCSeconds());

  return `citey-${y}${m}${d}-${hh}${mm}${ss}.bib`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}
