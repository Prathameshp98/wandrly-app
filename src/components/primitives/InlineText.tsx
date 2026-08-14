'use client';

import { useEffect, useId, useRef, useState } from 'react';
import styles from './InlineText.module.css';

export interface InlineTextProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  /** Accessible name for the editor. Required — this replaces a labelled input. */
  label: string;
  maxLength?: number;
  disabled?: boolean;
}

/**
 * Click-to-edit text, the canvas's primary editing affordance.
 *
 * Commit and revert semantics come straight from the prototype and are what
 * FR-SEC-02 and FR-DAY-08 specify: blur commits, Enter commits on a single
 * line, Escape reverts. Enter inside a multiline field inserts a newline, so
 * only blur commits there.
 *
 * Two changes from the prototype, both required rather than preferred:
 *
 *   - The readout is a `<button>`, not a `<div onClick>`. FR-NFR-A11Y-03 needs
 *     a focusable control with a name, and this is the single most-used
 *     interactive element on the canvas.
 *   - The commit only fires when the value actually changed, so a stray click
 *     into and out of a field does not spend a mutation and a version bump.
 */
export function InlineText({
  value,
  onChange,
  placeholder,
  multiline = false,
  className,
  label,
  maxLength,
  disabled = false,
}: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const fieldId = useId();

  // Tracks whether Escape already reverted, so the blur that follows does not
  // then commit the draft it just discarded.
  const revertedRef = useRef(false);

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  function commit() {
    setEditing(false);
    if (revertedRef.current) {
      revertedRef.current = false;
      return;
    }
    if (draft !== value) onChange?.(draft);
  }

  function revert() {
    revertedRef.current = true;
    setDraft(value ?? '');
    setEditing(false);
  }

  if (editing && !disabled) {
    const commonProps = {
      id: fieldId,
      autoFocus: true,
      className: [styles.edit, className].filter(Boolean).join(' '),
      value: draft,
      placeholder,
      maxLength,
      'aria-label': label,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(event.target.value),
      onBlur: commit,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !multiline) {
          event.preventDefault();
          commit();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          // Stop the canvas and any open drawer from also acting on Escape —
          // reverting a field should not close the panel around it.
          event.stopPropagation();
          revert();
        }
      },
    };

    return multiline ? (
      <textarea rows={3} {...commonProps} />
    ) : (
      <input type="text" {...commonProps} />
    );
  }

  return (
    <button
      type="button"
      className={[styles.readout, className].filter(Boolean).join(' ')}
      // FR-BLK-05: expanding a block must not be triggered by editing its text.
      // Handled here rather than by stopPropagation scattered through children.
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) setEditing(true);
      }}
      disabled={disabled}
      aria-label={value ? `${label}: ${value}` : label}
    >
      {value || <span className={styles.placeholder}>{placeholder}</span>}
    </button>
  );
}
