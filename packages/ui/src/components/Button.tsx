import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--citey-color-primary)',
    color: 'var(--citey-color-primary-text)',
    border: 'none',
  },
  secondary: {
    backgroundColor: 'var(--citey-color-secondary)',
    color: 'var(--citey-color-secondary-text)',
    border: '1px solid var(--citey-color-border)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--citey-color-text)',
    border: 'none',
  },
};

const baseStyle: React.CSSProperties = {
  fontFamily: 'var(--citey-font-family)',
  fontSize: 'var(--citey-font-size-md)',
  fontWeight: 'var(--citey-font-weight-medium)' as unknown as number,
  lineHeight: 'var(--citey-line-height-normal)',
  padding: 'var(--citey-space-2) var(--citey-space-4)',
  borderRadius: 'var(--citey-radius-md)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--citey-space-2)',
  minHeight: '36px',
  minWidth: '24px',
  transition: 'background-color 0.15s ease',
};

export function Button({
  variant = 'primary',
  children,
  style,
  ...rest
}: ButtonProps) {
  return (
    <button
      style={{ ...baseStyle, ...variantStyles[variant], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
