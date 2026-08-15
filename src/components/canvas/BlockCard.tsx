'use client';

import { useRef } from 'react';
import { Chip, I } from '@/components/primitives';
import { BlockPreview } from './BlockPreview';
import { capabilitiesOf, isBookable, metaFor } from './block-meta';
import type { Block } from '@/types/domain';
import styles from './BlockCard.module.css';

/**
 * A block, collapsed or expanded.
 *
 * FR-BLK-05 is the load-bearing rule: a click on an interactive descendant —
 * an input, a link, a section control, an action button — must not toggle
 * expansion. It is handled **once here** with an explicit target check rather
 * than by `stopPropagation` scattered through every child, which is what the
 * requirement calls for and what keeps new sections from having to remember.
 */

/** Anything inside these is an interaction of its own, not a toggle. */
const INTERACTIVE = 'a, button, input, textarea, select, [role="button"], [data-no-toggle]';

export interface BlockCardProps {
  block: Block;
  expanded: boolean;
  onToggle: (blockId: string) => void;
  onOpenDetail: (block: Block) => void;
  children?: React.ReactNode;
  dragging?: boolean;
}

export function BlockCard({
  block,
  expanded,
  onToggle,
  onOpenDetail,
  children,
  dragging = false,
}: BlockCardProps) {
  const meta = metaFor(block.type);
  const capabilities = capabilitiesOf(block);
  const bookable = isBookable(block.type);
  const summaryRef = useRef<HTMLButtonElement>(null);

  function handleClick(event: React.MouseEvent) {
    // FR-BLK-05. The expanded body sits outside this button, so its controls
    // never reach here — this guards the case that *is* inside the summary: a
    // control nested within it, where the nearest interactive ancestor is
    // something other than the summary itself.
    const target = event.target instanceof Element ? event.target : null;
    const nearestInteractive = target?.closest(INTERACTIVE);

    if (nearestInteractive && nearestInteractive !== summaryRef.current) return;

    onToggle(block.id);
  }

  return (
    <article
      className={styles.block}
      data-block
      data-type={block.type}
      data-expanded={expanded || undefined}
      data-dragging={dragging || undefined}
    >
      <button
        ref={summaryRef}
        type="button"
        className={styles.summary}
        aria-expanded={expanded}
        onClick={handleClick}
      >
        <BlockPreview block={block} />

        <span className={styles.main}>
          <span className={styles.head}>
            <span className={styles.typeChip} style={{ background: meta.tint, color: meta.text }}>
              {meta.label}
            </span>
            {block.timeLabel ? <span className={styles.time}>{block.timeLabel}</span> : null}
          </span>

          <span className={styles.title}>{block.title}</span>
          {block.meta ? <span className={styles.sub}>{block.meta}</span> : null}

          <span className={styles.metaRow}>
            <span className={styles.chips}>
              {capabilities.map((capability) => (
                <span key={capability} className={styles.capability}>
                  {capability}
                </span>
              ))}
            </span>

            {/* Only the four bookable types carry a booked/open badge — the
                others have nothing to confirm, and a badge would imply they do. */}
            {bookable ? (
              <Chip tone={block.isConfirmed ? 'confirmed' : 'planning'} dot plain>
                {block.isConfirmed ? 'Booked' : 'Open'}
              </Chip>
            ) : null}
          </span>
        </span>

        <span className={styles.arrow} aria-hidden>
          <I.ChevronD size={14} />
        </span>
      </button>

      {expanded ? (
        <div className={styles.body}>
          {children}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.action}
              onClick={() => onOpenDetail(block)}
              data-no-toggle
            >
              <I.Pencil size={13} /> Open in drawer
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
