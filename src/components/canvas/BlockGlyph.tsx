'use client';

import { I } from '@/components/primitives';
import { metaFor } from './block-meta';
import styles from './BlockGlyph.module.css';

/**
 * A block type as a tinted disc with its icon — the one visual shorthand for
 * "what kind of block is this", used at three sizes by the card preview, the
 * picker and the detail head.
 *
 * It lives on its own rather than inside BlockPreview because all three need
 * the *same* icon for a type; three copies of this map is exactly how a type
 * ends up wearing two different icons in two places.
 */
export function BlockGlyph({
  type,
  size = 18,
  box,
  className,
}: {
  type: string;
  /** Icon size. The disc scales with it unless `box` overrides. */
  size?: number;
  box?: number;
  className?: string;
}) {
  const meta = metaFor(type);
  const Icon = GLYPHS[type] ?? I.Sparkle;
  const side = box ?? Math.round(size * 1.8);

  return (
    <span
      className={[styles.glyph, className].filter(Boolean).join(' ')}
      style={{ background: meta.tint, color: meta.colour, width: side, height: side }}
      aria-hidden
    >
      <Icon size={size} />
    </span>
  );
}

export const GLYPHS: Record<string, (props: { size?: number }) => React.ReactElement> = {
  ACTIVITY: I.Mountain,
  ACCOMMODATION: I.Suitcase,
  RESTAURANT: I.Star,
  TRANSPORT: I.ArrowR,
  TICKET: I.Check,
  PHOTO: I.Grid,
  VIDEO: I.Grid,
  LINK: I.Globe,
  MAP_PIN: I.Pin,
  NOTE: I.Pencil,
  BUDGET: I.Sparkle,
};
