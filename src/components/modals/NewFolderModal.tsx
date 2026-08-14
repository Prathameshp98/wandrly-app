'use client';

import { useEffect, useState } from 'react';
import { Button, Input, ModalShell } from '@/components/primitives';
import {
  FOLDER_EMOJI,
  FOLDER_TONES,
  useCreateFolder,
  type FolderTone,
} from '@/lib/api/hooks/useFolders';
import { fieldErrors } from '@/lib/api/errors';
import { toast } from '@/stores/toasts';
import styles from './modals.module.css';

const TONE_COLOR: Record<FolderTone, string> = {
  gold: 'var(--accent)',
  teal: 'var(--teal)',
  sienna: 'var(--sienna)',
  forest: 'var(--forest)',
  sand: 'var(--text-2)',
};

/** FR-FOLD-01: a name, one of twelve emoji, and one of five tones. */
export function NewFolderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createFolder = useCreateFolder();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string>(FOLDER_EMOJI[0]);
  const [tone, setTone] = useState<FolderTone>('gold');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setName('');
    setEmoji(FOLDER_EMOJI[0]);
    setTone('gold');
    setErrors({});
  }, [open]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    try {
      const folder = await createFolder.mutateAsync({ name: name.trim(), emoji, tone });
      toast.success(`Created ${folder.emoji} ${folder.name}`);
      onClose();
    } catch (error) {
      const fields = fieldErrors(error);
      if (Object.keys(fields).length > 0) setErrors(fields);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="New folder"
      lede="Group journeys that belong together."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-folder-form"
            variant="primary"
            loading={createFolder.isPending}
            disabled={!name.trim()}
          >
            Create folder
          </Button>
        </>
      }
    >
      <form id="new-folder-form" className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input
          label="Name"
          placeholder="Japan 2027"
          value={name}
          maxLength={40}
          showCounter
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
          required
          autoFocus
        />

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Emoji</legend>
          <div className={styles.emojiGrid}>
            {FOLDER_EMOJI.map((option) => (
              <button
                key={option}
                type="button"
                className={styles.emojiOption}
                aria-pressed={emoji === option}
                aria-label={`Emoji ${option}`}
                onClick={() => setEmoji(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Tone</legend>
          <div className={styles.toneRow}>
            {FOLDER_TONES.map((option) => (
              <button
                key={option}
                type="button"
                className={styles.toneOption}
                style={{ background: TONE_COLOR[option] }}
                aria-pressed={tone === option}
                // The colour alone is not the label — FR-NFR-A11Y-06.
                aria-label={option}
                title={option}
                onClick={() => setTone(option)}
              />
            ))}
          </div>
        </fieldset>
      </form>
    </ModalShell>
  );
}
