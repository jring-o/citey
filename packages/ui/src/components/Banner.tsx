import type { ReactNode } from 'react';

export interface BannerProps {
  children: ReactNode;
}

const bannerStyle: React.CSSProperties = {
  fontFamily: 'var(--citey-font-family)',
  fontSize: 'var(--citey-font-size-md)',
  lineHeight: 'var(--citey-line-height-normal)',
  color: 'var(--citey-color-banner-text)',
  backgroundColor: 'var(--citey-color-banner-bg)',
  borderLeft: '3px solid var(--citey-color-banner-border)',
  borderRadius: 'var(--citey-radius-md)',
  padding: 'var(--citey-space-3) var(--citey-space-4)',
};

export function Banner({ children }: BannerProps) {
  return (
    <div role="status" style={bannerStyle}>
      {children}
    </div>
  );
}
