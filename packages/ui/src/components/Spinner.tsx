export interface SpinnerProps {
  /** Accessible label for the spinner. Defaults to "Loading". */
  label?: string;
  /** Size in pixels. Defaults to 20. */
  size?: number;
}

const keyframesId = 'citey-spin';

const keyframesCSS = `
@keyframes ${keyframesId} {
  to { transform: rotate(360deg); }
}
`;

export function Spinner({ label = 'Loading', size = 20 }: SpinnerProps) {
  const dotSize = Math.max(6, Math.round(size * 0.4));

  return (
    <span role="status" aria-label={label}>
      <style>{keyframesCSS}</style>
      {/*
        Under prefers-reduced-motion the spinner is replaced by a static dot.
        We use a CSS media query in a <style> block to hide/show the
        appropriate element.
      */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [data-citey-spinner-ring] { display: none !important; }
          [data-citey-spinner-dot]  { display: inline-block !important; }
        }
        @media (prefers-reduced-motion: no-preference) {
          [data-citey-spinner-dot]  { display: none !important; }
        }
      `}</style>
      <span
        data-citey-spinner-ring
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: `${size}px`,
          height: `${size}px`,
          border: '2px solid var(--citey-color-border)',
          borderTopColor: 'var(--citey-color-primary)',
          borderRadius: '50%',
          animation: `${keyframesId} 0.8s linear infinite`,
        }}
      />
      <span
        data-citey-spinner-dot
        aria-hidden="true"
        style={{
          display: 'none',
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          borderRadius: '50%',
          backgroundColor: 'var(--citey-color-primary)',
        }}
      />
    </span>
  );
}
