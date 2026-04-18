export type ConfidenceKind = 'high' | 'low' | 'citeas';

export interface ConfidenceChipProps {
  kind: ConfidenceKind;
}

const chipConfig: Record<
  ConfidenceKind,
  { label: string; bgVar: string; textVar: string }
> = {
  high: {
    label: 'High',
    bgVar: 'var(--citey-color-confidence-high-bg)',
    textVar: 'var(--citey-color-confidence-high-text)',
  },
  low: {
    label: 'Low \u2014 verify',
    bgVar: 'var(--citey-color-confidence-low-bg)',
    textVar: 'var(--citey-color-confidence-low-text)',
  },
  citeas: {
    label: 'From CiteAs',
    bgVar: 'var(--citey-color-confidence-citeas-bg)',
    textVar: 'var(--citey-color-confidence-citeas-text)',
  },
};

export function ConfidenceChip({ kind }: ConfidenceChipProps) {
  const config = chipConfig[kind];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 'var(--citey-space-1) var(--citey-space-2)',
        borderRadius: 'var(--citey-radius-full)',
        fontSize: 'var(--citey-font-size-xs)',
        fontWeight: 'var(--citey-font-weight-medium)' as unknown as number,
        lineHeight: 'var(--citey-line-height-tight)',
        backgroundColor: config.bgVar,
        color: config.textVar,
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
}
