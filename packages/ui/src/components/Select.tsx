import type { SelectHTMLAttributes } from 'react';

export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Must match the htmlFor on the wrapping Field. */
  id: string;
  /** Validation error text (used for aria-describedby). */
  error?: string | undefined;
}

const selectStyle: React.CSSProperties = {
  fontFamily: 'var(--citey-font-family)',
  fontSize: 'var(--citey-font-size-md)',
  lineHeight: 'var(--citey-line-height-normal)',
  color: 'var(--citey-color-text)',
  backgroundColor: 'var(--citey-color-bg)',
  border: '1px solid var(--citey-color-border)',
  borderRadius: 'var(--citey-radius-md)',
  padding: 'var(--citey-space-2) var(--citey-space-3)',
  width: '100%',
  boxSizing: 'border-box',
  cursor: 'pointer',
};

export function Select({ id, error, style, children, ...rest }: SelectProps) {
  return (
    <select
      id={id}
      aria-describedby={error != null ? `${id}-error` : undefined}
      aria-invalid={error != null ? true : undefined}
      style={{
        ...selectStyle,
        ...(error != null
          ? { borderColor: 'var(--citey-color-error)' }
          : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </select>
  );
}
