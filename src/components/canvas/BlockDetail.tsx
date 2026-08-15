'use client';

import { useEffect, useState } from 'react';
import { Button, I, Input, PanelShell, Textarea } from '@/components/primitives';
import { BlockGlyph } from './BlockGlyph';
import { isBookable, metaFor } from './block-meta';
import styles from './BlockDetail.module.css';
import type { Block } from '@/types/domain';

/** Contract limits (`src/contracts/canvas.ts`), enforced here so a too-long
 *  field is caught at the keystroke rather than as a 422 after Save. */
export const FIELD_LIMITS = {
  title: 120,
  timeLabel: 40,
  meta: 120,
  notes: 5000,
} as const;

export type BlockDraft = Pick<Block, 'title' | 'timeLabel' | 'meta' | 'notes' | 'isConfirmed'>;

export interface BlockDetailProps {
  block: Block | null;
  onClose: () => void;
  onSave: (block: Block, patch: Partial<BlockDraft>) => void;
  onDelete: (block: Block) => void;
  saving?: boolean;
}

function draftOf(block: Block): BlockDraft {
  return {
    title: block.title ?? '',
    timeLabel: block.timeLabel ?? '',
    meta: block.meta ?? '',
    notes: block.notes ?? '',
    isConfirmed: block.isConfirmed ?? false,
  };
}

/**
 * Only what actually changed. `PATCH` takes a partial, and sending every field
 * back would overwrite a collaborator's edit to a field this user never
 * touched — the lost-update the `version` check exists to prevent, reintroduced
 * one level up.
 */
export function changedFields(before: BlockDraft, after: BlockDraft): Partial<BlockDraft> {
  const patch: Partial<BlockDraft> = {};
  for (const key of Object.keys(after) as Array<keyof BlockDraft>) {
    if (after[key] !== before[key]) Object.assign(patch, { [key]: after[key] });
  }
  return patch;
}

/**
 * The block detail drawer (FR-BLK-06).
 *
 * Edits are held in a draft and committed on Save, unlike the rest of the
 * canvas, which writes on blur. That is the design's choice and the right one
 * here: the drawer carries a delete button, and a field that saves as you type
 * beside a button that destroys the block invites the wrong muscle memory.
 */
export function BlockDetail({
  block,
  onClose,
  onSave,
  onDelete,
  saving = false,
}: BlockDetailProps) {
  const [draft, setDraft] = useState<BlockDraft | null>(block ? draftOf(block) : null);
  const [original, setOriginal] = useState<BlockDraft | null>(draft);

  // Re-seed when a different block opens. Keyed on id, not on the object: the
  // canvas refetches after every mutation, so a new object identity for the
  // same block would otherwise discard whatever is being typed.
  useEffect(() => {
    if (!block) return;
    const next = draftOf(block);
    setDraft(next);
    setOriginal(next);
  }, [block?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!block || !draft || !original) return null;

  const meta = metaFor(block.type);
  const patch = changedFields(original, draft);
  const dirty = Object.keys(patch).length > 0;
  const set = <K extends keyof BlockDraft>(key: K, value: BlockDraft[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  return (
    <PanelShell
      open
      onClose={onClose}
      // The *saved* title, not the draft. This is the dialog's accessible
      // name, and one that tracked the field would be re-announced on every
      // keystroke. It reads correctly too: the header names the block you
      // opened, and the Title field below is where you rename it.
      title={block.title || 'Untitled block'}
      sub={meta.label}
      icon={<BlockGlyph type={block.type} size={18} />}
      footer={
        <div className={styles.foot}>
          <Button
            variant="primary"
            disabled={!dirty || saving}
            loading={saving}
            onClick={() => onSave(block, patch)}
          >
            {dirty ? 'Save changes' : 'Saved'}
          </Button>
          <Button
            variant="danger"
            iconOnly
            aria-label={`Delete ${block.title || 'this block'}`}
            onClick={() => {
              onDelete(block);
              onClose();
            }}
          >
            <I.Trash size={15} />
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        <Input
          label="Title"
          value={draft.title ?? ''}
          maxLength={FIELD_LIMITS.title}
          onChange={(event) => set('title', event.target.value)}
        />

        <Input
          label="Time"
          value={draft.timeLabel ?? ''}
          maxLength={FIELD_LIMITS.timeLabel}
          placeholder="09:30 → 11:00"
          hint="Free text — a single time, a range, or a note like “Check-in 16:00”."
          onChange={(event) => set('timeLabel', event.target.value)}
        />

        <Input
          label="Details"
          value={draft.meta ?? ''}
          maxLength={FIELD_LIMITS.meta}
          placeholder="Carrier, address, reference…"
          onChange={(event) => set('meta', event.target.value)}
        />

        <Textarea
          label="Notes"
          value={draft.notes ?? ''}
          maxLength={FIELD_LIMITS.notes}
          rows={4}
          showCounter
          onChange={(event) => set('notes', event.target.value)}
        />

        {/* Only the four bookable types have anything to confirm (PRD §6.2).
          Offering it on a NOTE would put it into the readiness maths. */}
        {isBookable(block.type) ? (
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Booking status</legend>
            <div className={styles.toggle} role="radiogroup" aria-label="Booking status">
              {[
                { value: true, label: 'Booked' },
                { value: false, label: 'Open' },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  role="radio"
                  aria-checked={draft.isConfirmed === option.value}
                  className={styles.toggleOption}
                  onClick={() => set('isConfirmed', option.value)}
                >
                  {option.value ? <I.Check size={13} /> : null}
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}
      </div>
    </PanelShell>
  );
}
