import type { InputHTMLAttributes } from 'react';

export interface ToggleProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Must match the htmlFor on the wrapping Field. */
  id: string;
  /** Validation error text (used for aria-describedby). */
  error?: string | undefined;
}

const toggleStyle: React.CSSProperties = {
  width: '20px',
  height: '20px',
  cursor: 'pointer',
  accentColor: 'var(--citey-color-primary)',
};

export function Toggle({ id, error, style, ...rest }: ToggleProps) {
  return (
    <input
      id={id}
      type="checkbox"
      role="switch"
      aria-describedby={error != null ? `${id}-error` : undefined}
      aria-invalid={error != null ? true : undefined}
      style={{ ...toggleStyle, ...style }}
      {...rest}
    />
  );
}
