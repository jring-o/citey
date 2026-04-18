import type { ReactNode } from 'react';

export interface FieldProps {
  /** The id of the input this label is for. */
  htmlFor: string;
  /** The visible label text. */
  label: string;
  /** Optional error message. Renders below the children. */
  error?: string | undefined;
  children: ReactNode;
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--citey-space-1)',
  fontFamily: 'var(--citey-font-family)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--citey-font-size-sm)',
  fontWeight: 'var(--citey-font-weight-medium)' as unknown as number,
  color: 'var(--citey-color-text)',
};

const errorStyle: React.CSSProperties = {
  fontSize: 'var(--citey-font-size-xs)',
  color: 'var(--citey-color-error)',
  margin: 0,
};

/**
 * Wraps a form input with a `<label>` linked via `htmlFor` and optional
 * error text surfaced through `aria-describedby`.
 *
 * Consumers should pass `aria-describedby={error ? `${htmlFor}-error` : undefined}`
 * to the input child so that screen readers announce the error.
 */
export function Field({ htmlFor, label, error, children }: FieldProps) {
  const errorId = `${htmlFor}-error`;

  return (
    <div style={fieldStyle}>
      <label htmlFor={htmlFor} style={labelStyle}>
        {label}
      </label>
      {children}
      {error != null && (
        <p id={errorId} role="alert" style={errorStyle}>
          {error}
        </p>
      )}
    </div>
  );
}
