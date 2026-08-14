'use client';

import Link from 'next/link';
import { I } from '@/components/primitives';
import type { Folder } from '@/types/domain';
import styles from './FolderCard.module.css';

const TONE_COLOR: Record<string, string> = {
  gold: 'var(--accent)',
  teal: 'var(--teal)',
  sienna: 'var(--sienna)',
  forest: 'var(--forest)',
  sand: 'var(--text-2)',
};

/** FR-FOLD-03. Also a drop target for trips (FR-FOLD-05). */
export function FolderCard({ folder, dropping = false }: { folder: Folder; dropping?: boolean }) {
  const count = folder.tripCount ?? 0;

  return (
    <Link
      href={`/f/${folder.id}`}
      className={styles.card}
      data-dropping={dropping || undefined}
      data-drop-id={folder.id}
      style={{ '--folder-tone': TONE_COLOR[folder.tone] ?? 'var(--text-2)' } as React.CSSProperties}
    >
      <span className={styles.tile} aria-hidden>
        {folder.emoji}
      </span>
      <span className={styles.text}>
        <span className={styles.name}>{folder.name}</span>
        <span className={styles.count}>
          {count} {count === 1 ? 'journey' : 'journeys'}
        </span>
      </span>
      <I.Chevron size={15} className={styles.chevron} />
    </Link>
  );
}
