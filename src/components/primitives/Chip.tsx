import styles from './Chip.module.css';

/** Trip status tones, plus `accent` for the cost and capability chips. */
export type ChipTone =
  'planning' | 'confirmed' | 'draft' | 'completed' | 'archived' | 'accent' | 'neutral';

export interface ChipProps {
  children: React.ReactNode;
  tone?: ChipTone;
  /** The 6px leading dot. */
  dot?: boolean;
  /** Drops the scrim and blur, for a chip on a surface rather than a photo. */
  plain?: boolean;
  className?: string;
  title?: string;
}

export function Chip({
  children,
  tone = 'neutral',
  dot = false,
  plain = false,
  className,
  title,
}: ChipProps) {
  const classes = [
    styles.chip,
    tone !== 'neutral' && styles[tone],
    plain && styles.plain,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} title={title}>
      {dot ? <span className={styles.dot} aria-hidden /> : null}
      {children}
    </span>
  );
}

/**
 * Maps a trip status to its chip tone.
 *
 * `ARCHIVED` is not a status — it is a separate `isArchived` flag (PRD §6.2) —
 * so callers pass the string explicitly when rendering an archived card.
 */
export function statusTone(status: string): ChipTone {
  switch (status) {
    case 'PLANNING':
      return 'planning';
    case 'CONFIRMED':
      return 'confirmed';
    case 'DRAFT':
      return 'draft';
    case 'COMPLETED':
      return 'completed';
    case 'ARCHIVED':
      return 'archived';
    default:
      return 'neutral';
  }
}
