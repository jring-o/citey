import { useCallback, useRef, useState } from 'react';
import { IconButton } from './IconButton.js';

export interface CopyButtonProps {
  /** The text to write to the clipboard. */
  text: string;
  /** Optional aria-label override. Defaults to "Copy". */
  label?: string;
}

const FLASH_DURATION_MS = 1500;

export const CopyIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="5" y="5" width="8" height="8" rx="1.5" />
    <path d="M3 11V3.5A1.5 1.5 0 014.5 2H11" />
  </svg>
);

export function CopyButton({ text, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, FLASH_DURATION_MS);
    } catch {
      /* Clipboard write can fail in some contexts; fail silently. */
    }
  }, [text]);

  return (
    <IconButton aria-label={copied ? 'Copied!' : label} onClick={handleClick}>
      {copied ? (
        <span
          style={{
            fontSize: 'var(--citey-font-size-xs)',
            color: 'var(--citey-color-success)',
            fontWeight: 'var(--citey-font-weight-medium)' as unknown as number,
          }}
        >
          Copied!
        </span>
      ) : (
        CopyIcon
      )}
    </IconButton>
  );
}
