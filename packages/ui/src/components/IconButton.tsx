import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  children: ReactNode;
}

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: 'var(--citey-radius-md)',
  cursor: 'pointer',
  padding: 'var(--citey-space-1)',
  minWidth: '24px',
  minHeight: '24px',
  color: 'var(--citey-color-text-secondary)',
  transition: 'background-color 0.15s ease',
};

export function IconButton({
  children,
  style,
  ...rest
}: IconButtonProps) {
  return (
    <button style={{ ...baseStyle, ...style }} {...rest}>
      {children}
    </button>
  );
}
