'use client';

import { I } from '@/components/primitives';
import { metaFor } from './block-meta';
import { GLYPHS } from './BlockGlyph';
import type { Block } from '@/types/domain';
import styles from './BlockPreview.module.css';

/**
 * The 84×84 preview on a collapsed block card (FR-BLK-03).
 *
 * Each type gets its own treatment rather than a generic thumbnail — that
 * variety is most of what makes the canvas readable at a glance, and the
 * prototype's `.prev-*` rules are the design for it.
 *
 * The resolution order matters and is the prototype's: a type-specific
 * treatment wins, then a real photo, then a map, then the type glyph. So an
 * ACTIVITY with a photo shows the photo, and one without shows its icon.
 */
export function BlockPreview({ block }: { block: Block }) {
  const sections = (block.sections ?? {}) as {
    photos?: string[];
    map?: { lat: number; lng: number; name?: string };
    link?: { host?: string; url?: string };
    cost?: { amountMinor?: string; currency?: string };
    booking?: Array<{ key: string; value: string }>;
  };

  const meta = metaFor(block.type);
  const photos = sections.photos ?? [];

  switch (block.type) {
    case 'TRANSPORT':
      return <TransportPreview title={block.title} meta={block.meta} />;

    case 'TICKET':
      return <TicketPreview booking={sections.booking} timeLabel={block.timeLabel} />;

    case 'PHOTO':
      return photos.length >= 3 ? <PhotoGrid count={photos.length} /> : <Glyph type={block.type} />;

    case 'VIDEO':
      return <VideoPreview />;

    case 'LINK':
      return <LinkPreview host={sections.link?.host ?? hostOf(sections.link?.url)} />;

    case 'MAP_PIN':
      return <MapPreview />;

    case 'BUDGET':
      return <BudgetPreview cost={sections.cost} />;

    case 'NOTE':
      return <NotePreview />;

    default:
      // ACTIVITY, ACCOMMODATION, RESTAURANT: photo, else map, else glyph.
      if (photos.length >= 3) return <PhotoGrid count={photos.length} />;
      if (sections.map) return <MapPreview />;
      return <Glyph type={block.type} colour={meta.colour} tint={meta.tint} />;
  }
}

function hostOf(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url.split('/')[0];
  }
}

/** `BOM → KIX`, read out of the title the way the prototype does. */
function TransportPreview({ title, meta }: { title: string; meta?: string | null }) {
  const [from, to] = title.split('→').map((part) => part.trim());
  // Three letters of the place, not its initials: "Mumbai → Kansai" reads as
  // MUM → KAN, the way an airport board does. Taking first letters per word
  // gave "M → K", which carries no information at all.
  const code = (value?: string) =>
    value
      ? value
          .replace(/[^\p{L}\p{N}]/gu, '')
          .slice(0, 3)
          .toUpperCase()
      : '';

  const carrier = meta?.split('·')[0]?.trim();

  return (
    <div className={`${styles.preview} ${styles.transport}`} aria-hidden>
      <div className={styles.route}>
        <span>{code(from) || '···'}</span>
        <I.ArrowR size={12} />
        <span>{code(to) || '···'}</span>
      </div>
      {carrier ? <span className={styles.routeMeta}>{carrier}</span> : null}
    </div>
  );
}

/** A perforated stub — the admit count comes from the booking rows. */
function TicketPreview({
  booking,
  timeLabel,
}: {
  booking?: Array<{ key: string; value: string }>;
  timeLabel?: string | null;
}) {
  const tickets = booking?.find((row) => /ticket|admit|seats?/i.test(row.key))?.value;
  const count = tickets?.match(/\d+/)?.[0];
  const time = timeLabel?.match(/\d{1,2}:\d{2}/)?.[0];

  return (
    <div className={`${styles.preview} ${styles.ticket}`} aria-hidden>
      <div className={styles.ticketStub}>
        <span className={styles.ticketAdmit}>ADMIT</span>
        {count ? <span className={styles.ticketCount}>×{count}</span> : null}
      </div>
      <div className={styles.ticketTear} />
      <div className={styles.ticketTime}>{time ?? '—'}</div>
    </div>
  );
}

/**
 * A 2×2 grid whose third tile spans both columns.
 *
 * The tiles are placeholders, not images: photos are media ids and resolving
 * them needs `GET /v1/media/{id}/content` per asset, which is phase 2's upload
 * work. The count is real.
 */
function PhotoGrid({ count }: { count: number }) {
  return (
    <div className={`${styles.preview} ${styles.photos}`} aria-hidden>
      <span />
      <span />
      <span className={styles.photoWide}>{count > 3 ? `+${count - 2}` : null}</span>
    </div>
  );
}

/**
 * VIDEO has no rendered design anywhere — FRONTEND_TECHNICAL_DESIGN §1.2 lists
 * it as one of three surfaces with none, and the prototype's seed exercises
 * only ten of the eleven types. This follows the PHOTO treatment's purple with
 * a play glyph, which is the smallest defensible thing until it is designed.
 */
function VideoPreview() {
  return (
    <div className={`${styles.preview} ${styles.video}`} aria-hidden>
      <span className={styles.play} />
    </div>
  );
}

function LinkPreview({ host }: { host?: string }) {
  return (
    <div className={`${styles.preview} ${styles.link}`} aria-hidden>
      <span className={styles.linkDisc}>↗</span>
      {host ? <span className={styles.linkHost}>{host}</span> : null}
    </div>
  );
}

/** Contour lines and a pin — the cartographic motif, drawn not fetched. */
function MapPreview() {
  return (
    <div className={`${styles.preview} ${styles.map}`} aria-hidden>
      <svg viewBox="0 0 84 84" className={styles.contours} focusable="false">
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M-6 58 Q 20 44 42 52 T 92 46" />
          <path d="M-6 68 Q 22 54 42 62 T 92 56" />
          <path d="M-6 48 Q 18 34 42 42 T 92 36" />
          <path d="M-6 78 Q 24 64 42 72 T 92 66" />
        </g>
      </svg>
      <I.Pin size={20} className={styles.mapPin} />
    </div>
  );
}

function BudgetPreview({ cost }: { cost?: { amountMinor?: string; currency?: string } }) {
  // Formatted by the cost section itself; the preview only needs the currency
  // and a sense of scale, never arithmetic on the amount.
  const symbol = cost?.currency === 'JPY' ? '¥' : cost?.currency === 'INR' ? '₹' : '¤';

  return (
    <div className={`${styles.preview} ${styles.budget}`} aria-hidden>
      <span className={styles.budgetSymbol}>{symbol}</span>
    </div>
  );
}

function NotePreview() {
  return (
    <div className={`${styles.preview} ${styles.note}`} aria-hidden>
      <span className={styles.noteRules} />
      <span className={styles.notePencil}>✎</span>
    </div>
  );
}

function Glyph({ type, colour, tint }: { type: string; colour?: string; tint?: string }) {
  const meta = metaFor(type);
  const Icon = GLYPHS[type] ?? I.Sparkle;

  return (
    <div
      className={`${styles.preview} ${styles.glyph}`}
      style={{ background: tint ?? meta.tint, color: colour ?? meta.colour }}
      aria-hidden
    >
      <Icon size={24} />
    </div>
  );
}
