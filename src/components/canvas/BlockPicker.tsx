'use client';

import { PanelShell } from '@/components/primitives';
import { BLOCK_TYPES, BLOCK_META, type BlockType } from './block-meta';
import { BlockGlyph } from './BlockGlyph';
import styles from './BlockPicker.module.css';
import type { Day } from '@/types/domain';

export interface BlockPickerProps {
  /** The day being added to; `null` closes the picker. */
  day: Day | null;
  onClose: () => void;
  onPick: (type: BlockType, day: Day) => void;
}

/**
 * The slide-in that starts every block (FR-BLK-01).
 *
 * All eleven types, in the contract's own order — the same order the server's
 * `type` enum declares, so the two never drift apart silently.
 *
 * It is a real dialog rather than the prototype's bare `<aside>`: the focus
 * trap, Escape, and the return of focus to the "Add a block" button all come
 * from PanelShell, and a picker you cannot leave by keyboard fails
 * FR-NFR-A11Y-02 as surely as a drag with no keyboard path.
 */
export function BlockPicker({ day, onClose, onPick }: BlockPickerProps) {
  return (
    <PanelShell
      open={day !== null}
      onClose={onClose}
      title="Add a block"
      sub={day ? `Day ${day.dayNumber}${day.title ? ` · ${day.title}` : ''}` : undefined}
    >
      <div className={styles.grid}>
        {BLOCK_TYPES.map((type) => {
          const meta = BLOCK_META[type];
          return (
            <button
              key={type}
              type="button"
              className={styles.card}
              onClick={() => day && onPick(type, day)}
            >
              <BlockGlyph type={type} size={18} className={styles.icon} />
              <span className={styles.label}>{meta.label}</span>
              <span className={styles.desc}>{meta.description}</span>
            </button>
          );
        })}
      </div>
    </PanelShell>
  );
}
