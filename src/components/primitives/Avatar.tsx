import styles from './Avatar.module.css';

/** The four tones from PRD §12, each a 135° gradient. */
export const AVATAR_TONES = ['gold', 'teal', 'sienna', 'forest'] as const;
export type AvatarTone = (typeof AVATAR_TONES)[number];

const GRADIENTS: Record<AvatarTone, string> = {
  gold: 'linear-gradient(135deg, #F0A05A, #D0703F)',
  teal: 'linear-gradient(135deg, #66C6B5, #2F8A78)',
  sienna: 'linear-gradient(135deg, #E5654A, #B04A32)',
  forest: 'linear-gradient(135deg, #67B18F, #37785F)',
};

/**
 * Up to two initials from a name.
 *
 * Filtering empty segments matters: the seed data has names with double spaces
 * and trailing whitespace, and `"Arjun  Mehta".split(/\s+/)` would otherwise
 * yield an empty string whose `[0]` is undefined.
 */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export interface AvatarProps {
  name: string;
  tone?: AvatarTone;
  size?: 'sm' | 'md' | 'lg';
  /** Presence ring — FR-COLLAB, driven by last_active_at. */
  live?: boolean;
  className?: string;
}

export function Avatar({ name, tone = 'gold', size = 'sm', live = false, className }: AvatarProps) {
  const classes = [styles.avatar, size !== 'md' && styles[size], live && styles.live, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classes}
      style={{ background: GRADIENTS[tone] ?? GRADIENTS.gold }}
      // The initials alone are meaningless to a screen reader, so the whole
      // avatar is one labelled image rather than two letters of text.
      role="img"
      aria-label={live ? `${name} (online)` : name}
      title={name}
    >
      <span aria-hidden>{initialsOf(name)}</span>
    </span>
  );
}

export interface AvatarStackProps {
  people: Array<{ name: string; tone?: AvatarTone; live?: boolean }>;
  /** PRD §12 shows three plus an overflow count. */
  max?: number;
  className?: string;
}

export function AvatarStack({ people, max = 3, className }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div
      className={[styles.stack, className].filter(Boolean).join(' ')}
      role="group"
      aria-label={`${people.length} ${people.length === 1 ? 'person' : 'people'}`}
    >
      {shown.map((person) => (
        <Avatar
          key={person.name}
          name={person.name}
          tone={person.tone ?? 'gold'}
          live={person.live ?? false}
        />
      ))}
      {overflow > 0 ? (
        <span className={styles.more} aria-label={`and ${overflow} more`}>
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
