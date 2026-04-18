// ---------------------------------------------------------------------------
// §7.3 — Clipboard writer with fallback
// ---------------------------------------------------------------------------

/**
 * Copy text to the clipboard using `navigator.clipboard.writeText`.
 * Falls back to `document.execCommand("copy")` with a temporary textarea
 * if the modern API fails. Returns a result object indicating success or
 * failure with a reason string.
 */
export async function copyToClipboard(
  text: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const fail = { ok: false as const, reason: "Couldn't copy. Use Export .bib instead." };

  // Try modern Clipboard API first
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true };
  } catch {
    // Fall through to legacy path
  }

  // Legacy fallback: hidden textarea + execCommand("copy")
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);

    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (ok) {
      return { ok: true };
    }
    return fail;
  } catch {
    return fail;
  }
}
