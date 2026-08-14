'use client';

import { useState } from 'react';
import { Button, ModalShell } from '@/components/primitives';
import styles from './modals.module.css';

/** The four strategies the contract accepts. */
export type DateChangeStrategy = 'SHIFT' | 'TRUNCATE' | 'EXTEND' | 'KEEP_DAYS';

export interface DateChangeDetail {
  currentDayCount?: number;
  requestedDayCount?: number;
}

/**
 * FR-TRIP-14 — the resolution prompt.
 *
 * Changing a trip's dates when it already has days is ambiguous, and the server
 * refuses to guess: it answers `409 CONFLICT_DATE_CHANGE` with the current and
 * requested day counts and waits to be told. This is that decision, and it is a
 * required screen rather than a nicety — silently dropping days that hold
 * blocks would be exactly the "no edit is ever silently lost" failure
 * FR-NFR-REL-03 forbids.
 *
 * Which options make sense depends on the direction of the change, so the
 * shrinking and growing cases offer different words for the same four values.
 */
export function DateChangeModal({
  open,
  onClose,
  onConfirm,
  detail,
  pending = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (strategy: DateChangeStrategy) => void;
  detail: DateChangeDetail;
  pending?: boolean;
}) {
  const current = detail.currentDayCount ?? 0;
  const requested = detail.requestedDayCount ?? 0;
  const shrinking = requested < current;
  const lost = Math.max(0, current - requested);
  const gained = Math.max(0, requested - current);

  const [strategy, setStrategy] = useState<DateChangeStrategy>('SHIFT');

  const options: Array<{ value: DateChangeStrategy; label: string; body: string }> = [
    {
      value: 'SHIFT',
      label: 'Move the days with the dates',
      body: `Day 1 becomes the new start date and every day follows it. Nothing is lost${
        shrinking ? `, but the trip still ends ${lost} day${lost === 1 ? '' : 's'} short.` : '.'
      }`,
    },
    shrinking
      ? {
          value: 'TRUNCATE',
          label: `Drop the last ${lost} day${lost === 1 ? '' : 's'}`,
          body: 'Days beyond the new end date are removed, along with the blocks on them.',
        }
      : {
          value: 'EXTEND',
          label: `Add ${gained} empty day${gained === 1 ? '' : 's'}`,
          body: 'The existing days stay where they are and the new dates are added empty.',
        },
    {
      value: 'KEEP_DAYS',
      label: 'Leave the days exactly as they are',
      body: 'Only the trip dates change. The days keep their own dates, which may now sit outside the range.',
    },
  ];

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      alert
      title="These dates change the number of days"
      lede={
        shrinking
          ? `This trip has ${current} days and the new dates cover ${requested}. Choose what happens to the rest.`
          : `This trip has ${current} days and the new dates cover ${requested}. Choose how the extra days are handled.`
      }
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={pending} onClick={() => onConfirm(strategy)}>
            Apply
          </Button>
        </>
      }
    >
      <fieldset className={styles.fieldset}>
        <legend className={styles.srOnly}>What should happen to the existing days?</legend>
        <div className={styles.choices}>
          {options.map((option) => (
            <label
              key={option.value}
              className={styles.choice}
              data-selected={strategy === option.value}
            >
              <input
                type="radio"
                name="date-change-strategy"
                value={option.value}
                checked={strategy === option.value}
                onChange={() => setStrategy(option.value)}
              />
              <span>
                <span className={styles.choiceLabel}>{option.label}</span>
                <span className={styles.choiceBody}>{option.body}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </ModalShell>
  );
}
