import type { Block } from '@/types/domain';

/**
 * The eleven block types, their labels, and the colour pairing each one carries
 * on the canvas (PRD §12, ported from the prototype's `BLOCK_META` and the CSS
 * `.block[data-type]` rules).
 *
 * Each type carries **two** colours, because the canvas uses its hue for two
 * different things. `colour` is graphical — a 24px glyph on a tinted disc, at
 * WCAG's 3:1 non-text threshold — and stays the raw palette token. `text` is
 * the same hue shifted far enough to clear 4.5:1 against that type's own tinted
 * chip, for the type label and the route codes, which are text (FR-NFR-A11Y-05).
 * Using `colour` for either was a real failure: sienna measured 3.84:1 in dark
 * and 2.33:1 on paper.
 */
export const BLOCK_TYPES = [
  'ACTIVITY',
  'ACCOMMODATION',
  'TRANSPORT',
  'RESTAURANT',
  'TICKET',
  'PHOTO',
  'VIDEO',
  'LINK',
  'MAP_PIN',
  'NOTE',
  'BUDGET',
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export interface BlockTypeMeta {
  label: string;
  description: string;
  /** Graphical use only — glyphs and rules, at the 3:1 non-text threshold. */
  colour: string;
  /** The same hue, safe for text at 4.5:1 on this type's tinted chip. */
  text: string;
  tint: string;
}

export const BLOCK_META: Record<BlockType, BlockTypeMeta> = {
  ACTIVITY: {
    label: 'Activity',
    description: 'Anything you do on the ground',
    colour: 'var(--teal)',
    text: 'var(--tone-teal-text)',
    tint: 'rgba(102, 198, 181, 0.15)',
  },
  ACCOMMODATION: {
    label: 'Stay',
    description: 'Hotels, ryokan, rentals',
    colour: 'var(--accent)',
    text: 'var(--accent-text)',
    tint: 'var(--accent-soft)',
  },
  TRANSPORT: {
    label: 'Transport',
    description: 'Flights, trains, transfers',
    colour: 'var(--sienna)',
    text: 'var(--tone-sienna-text)',
    tint: 'rgba(229, 101, 74, 0.14)',
  },
  RESTAURANT: {
    label: 'Restaurant',
    description: 'Meals worth planning around',
    colour: 'var(--amber)',
    text: 'var(--tone-amber-text)',
    tint: 'rgba(228, 177, 94, 0.15)',
  },
  TICKET: {
    label: 'Ticket',
    description: 'Anything with an admission',
    colour: 'var(--forest)',
    text: 'var(--tone-forest-text)',
    tint: 'rgba(95, 190, 139, 0.15)',
  },
  PHOTO: {
    label: 'Photo',
    description: 'Reference shots and inspiration',
    colour: 'var(--purple)',
    text: 'var(--tone-purple-text)',
    tint: 'rgba(155, 138, 251, 0.15)',
  },
  VIDEO: {
    label: 'Video',
    description: 'A clip worth keeping to hand',
    colour: 'var(--purple)',
    text: 'var(--tone-purple-text)',
    tint: 'rgba(155, 138, 251, 0.15)',
  },
  LINK: {
    label: 'Link',
    description: 'A page to come back to',
    colour: 'var(--teal)',
    text: 'var(--tone-teal-text)',
    tint: 'rgba(102, 198, 181, 0.15)',
  },
  MAP_PIN: {
    label: 'Map pin',
    description: 'A place, without a plan yet',
    colour: 'var(--sienna)',
    text: 'var(--tone-sienna-text)',
    tint: 'rgba(229, 101, 74, 0.14)',
  },
  NOTE: {
    label: 'Note',
    description: 'Anything that does not fit elsewhere',
    colour: 'var(--text-2)',
    text: 'var(--text-2)',
    tint: 'var(--border)',
  },
  BUDGET: {
    label: 'Budget item',
    description: 'Money set aside',
    colour: 'var(--accent)',
    text: 'var(--accent-text)',
    tint: 'var(--accent-soft)',
  },
};

/** The four types whose confirmation drives readiness (PRD §6.2). */
export const BOOKABLE_TYPES = new Set<string>([
  'ACCOMMODATION',
  'TRANSPORT',
  'RESTAURANT',
  'TICKET',
]);

export function isBookable(type: string): boolean {
  return BOOKABLE_TYPES.has(type);
}

export function metaFor(type: string): BlockTypeMeta {
  return BLOCK_META[type as BlockType] ?? BLOCK_META.NOTE;
}

/**
 * The start time for the spine.
 *
 * `timeLabel` is free-form on purpose — the seed alone holds `02:45 → 13:20`,
 * `Check-in 16:00`, `19:30` and `20:35 → 02:15+1`. The first clock time in the
 * string is the one the spine wants; failing that, the text before a `·`
 * separator; failing that, the em-dash placeholder the design uses for a block
 * with no time at all.
 */
export function startTimeOf(block: Pick<Block, 'timeLabel'>): string {
  const label = block.timeLabel ?? '';
  const clock = label.match(/\d{1,2}:\d{2}/);
  if (clock) return clock[0];

  const beforeSeparator = label.split('·')[0]?.trim();
  if (beforeSeparator) return beforeSeparator.slice(0, 12);

  return '—:—';
}

/**
 * True when a time label describes an arrival on a later day — `20:35 →
 * 02:15+1`. Anything computing a duration from the two clock times has to know,
 * or an overnight flight comes out as minus six hours.
 */
export function crossesMidnight(block: Pick<Block, 'timeLabel'>): boolean {
  return /\+\d\s*$/.test(block.timeLabel ?? '');
}

/** The capability chips on a collapsed card (FR-BLK-03). */
export function capabilitiesOf(block: Block): string[] {
  const sections = (block.sections ?? {}) as Record<string, unknown>;
  const chips: string[] = [];

  if (sections.map) chips.push('map');
  const photos = sections.photos as string[] | undefined;
  if (photos?.length) chips.push(`${photos.length} photo${photos.length === 1 ? '' : 's'}`);
  if (sections.link) chips.push('link');
  const booking = sections.booking as unknown[] | undefined;
  if (booking?.length) chips.push('booking');

  return chips;
}
