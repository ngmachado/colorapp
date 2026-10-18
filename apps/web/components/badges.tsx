import type { ReactNode } from 'react';

export type StatusKind =
  | 'source-verified'
  | 'display-approximation'
  | 'exploratory-render'
  | 'measured-sample'
  | 'unreviewed'
  | 'restricted'
  | 'adaptation';

const LABEL: Record<StatusKind, string> = {
  'source-verified': 'Source-verified',
  'display-approximation': 'Display approximation',
  'exploratory-render': 'Exploratory render',
  'measured-sample': 'Measured sample',
  unreviewed: 'Unreviewed',
  restricted: 'Restricted: bibliographic only',
  adaptation: 'Adaptation',
};

const TONE: Record<StatusKind, string> = {
  'source-verified': 'bg-[var(--accent-soft)] text-[var(--fg)]',
  'measured-sample': 'bg-[var(--accent-soft)] text-[var(--fg)]',
  'display-approximation': 'bg-[var(--warn-soft)] text-[var(--warn)]',
  'exploratory-render': 'bg-[var(--warn-soft)] text-[var(--warn)]',
  unreviewed: 'bg-[var(--warn-soft)] text-[var(--warn)]',
  restricted: 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]',
  adaptation: 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]',
};

/** Status badges carry a text label and a shape, never colour alone. */
export function StatusBadge({ kind, children }: { kind: StatusKind; children?: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide ${TONE[kind]}`}
      data-status={kind}
    >
      <span aria-hidden="true">
        {kind === 'source-verified' || kind === 'measured-sample'
          ? '●'
          : kind === 'restricted' || kind === 'adaptation'
            ? '◇'
            : '▲'}
      </span>
      {children ?? LABEL[kind]}
    </span>
  );
}

/** Maps a knowledge record's review and rights status to a badge. */
export function statusKind(
  reviewState: string,
  rightsStatus: string,
  approximation?: string,
): StatusKind {
  if (rightsStatus === 'verified-restricted') return 'restricted';
  if (rightsStatus === 'user-adaptation') return 'adaptation';
  if (approximation === 'measured') return 'measured-sample';
  if (
    approximation === 'modern-approximation' ||
    approximation === 'unknown' ||
    rightsStatus === 'approximate'
  )
    return 'display-approximation';
  if (reviewState === 'published' || reviewState === 'specialist-reviewed')
    return 'source-verified';
  return 'unreviewed';
}
