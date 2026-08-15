'use client';

import { Chip, I, InlineText, statusTone } from '@/components/primitives';
import { BlockCard } from './BlockCard';
import { startTimeOf } from './block-meta';
import type { Block, Day } from '@/types/domain';
import styles from './canvas.module.css';

/**
 * One day, with its time spine.
 *
 * The spine is the canvas's structural idea: a dot per block, filled when the
 * booking is confirmed and hollow when it is not, with the block's start time
 * beside it. `startTimeOf` does the parsing, because `timeLabel` is free-form
 * and holds everything from `19:30` to `20:35 → 02:15+1`.
 *
 * Weather is omitted entirely. `day.weather` is always null — there is no
 * endpoint behind it — and FR-DAY-07 is explicit that a missing forecast means
 * hiding the element rather than inventing one.
 */
export function DayRow({
  day,
  expandedBlockId,
  onToggleBlock,
  onOpenDetail,
  onAddBlock,
  onRenameDay,
  onEditNote,
  onDuplicateDay,
  onDeleteDay,
  renderSections,
}: {
  day: Day;
  expandedBlockId: string | null;
  onToggleBlock: (blockId: string) => void;
  onOpenDetail: (block: Block) => void;
  onAddBlock: (day: Day) => void;
  onRenameDay: (day: Day, title: string) => void;
  onEditNote: (day: Day, note: string) => void;
  onDuplicateDay: (day: Day) => void;
  onDeleteDay: (day: Day) => void;
  renderSections?: (block: Block) => React.ReactNode;
}) {
  const dayLabel = day.date
    ? new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '';

  return (
    <section className={styles.day} aria-labelledby={`day-${day.id}-title`}>
      <header className={styles.dayHeader}>
        <span className={styles.dayNum}>Day {String(day.dayNumber).padStart(2, '0')}</span>

        <div className={styles.dayMeta}>
          {dayLabel ? <p className={styles.dayDate}>{dayLabel}</p> : null}

          <h2 id={`day-${day.id}-title`} className={styles.dayTitle}>
            <InlineText
              value={day.title ?? ''}
              onChange={(value) => onRenameDay(day, value)}
              placeholder="Name this day"
              label={`Title for day ${day.dayNumber}`}
              maxLength={60}
            />
          </h2>

          <p className={styles.dayNote}>
            <InlineText
              value={day.note ?? ''}
              onChange={(value) => onEditNote(day, value)}
              placeholder="Add a note"
              label={`Note for day ${day.dayNumber}`}
              maxLength={200}
            />
          </p>
        </div>

        <Chip tone={statusTone(day.status)} dot plain>
          {day.status}
        </Chip>

        <div className={styles.dayTools}>
          <button
            type="button"
            className={styles.dayTool}
            onClick={() => onDuplicateDay(day)}
            aria-label={`Duplicate day ${day.dayNumber}`}
          >
            <I.Grid size={14} />
          </button>
          <button
            type="button"
            className={`${styles.dayTool} ${styles.dayToolDanger}`}
            onClick={() => onDeleteDay(day)}
            aria-label={`Delete day ${day.dayNumber}`}
          >
            <I.Trash size={14} />
          </button>
        </div>
      </header>

      <div className={styles.blocks}>
        {day.blocks.length === 0 ? (
          <p className={styles.emptyDay}>Nothing planned yet.</p>
        ) : (
          day.blocks.map((block) => (
            <Spine key={block.id} block={block}>
              <BlockCard
                block={block}
                expanded={expandedBlockId === block.id}
                onToggle={onToggleBlock}
                onOpenDetail={onOpenDetail}
              >
                {renderSections?.(block)}
              </BlockCard>
            </Spine>
          ))
        )}

        {/* The trailing dot is dashed — it marks where the next block lands. */}
        <div className={styles.spine} aria-hidden>
          <span className={styles.spineDot} data-ghost="true" />
        </div>
        <button type="button" className={styles.addBlock} onClick={() => onAddBlock(day)}>
          <I.Plus size={14} /> Add a block
        </button>
      </div>
    </section>
  );
}

/** The spine cell and its block are two grid children, not nested. */
function Spine({ block, children }: { block: Block; children: React.ReactNode }) {
  return (
    <>
      <div className={styles.spine} aria-hidden>
        <span className={styles.spineDot} data-confirmed={String(Boolean(block.isConfirmed))} />
        {startTimeOf(block)}
      </div>
      {children}
    </>
  );
}
