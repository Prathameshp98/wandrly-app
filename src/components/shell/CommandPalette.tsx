'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { I } from '@/components/primitives';
import { useDashboard, useFolders } from '@/lib/api/hooks/useTrips';
import { useShellStore } from '@/stores/shell';
import styles from './CommandPalette.module.css';

interface Result {
  id: string;
  kind: 'Trips' | 'Folders' | 'Actions';
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

/**
 * FR-SRCH-02..04 — the command palette.
 *
 * Grouped, capped at 5 trips and 4 folders as PRD §5.1 specifies, with
 * arrow keys moving a single selection across the whole flattened list and
 * Enter activating it. Hover sets the selection too, so pointer and keyboard
 * never disagree about what Enter would do.
 *
 * FR-SRCH-05 also wants block titles, notes and people in here. Those come
 * from `GET /v1/search`, which is a limit-only endpoint — it lands with the
 * canvas in phase 2, since matching a block is only useful once there is a
 * canvas to deep-link into.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { data: dashboard } = useDashboard();
  const { data: folders } = useFolders();
  const setOpenModal = useShellStore((state) => state.setOpenModal);

  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const needle = query.trim().toLowerCase();
    const matches = (value: string | null | undefined) =>
      !needle ||
      String(value ?? '')
        .toLowerCase()
        .includes(needle);

    const trips = (dashboard?.items ?? [])
      .filter((trip) => matches(trip.title) || matches(trip.destination) || matches(trip.subtitle))
      .slice(0, 5)
      .map<Result>((trip) => ({
        id: `trip-${trip.id}`,
        kind: 'Trips',
        label: trip.title,
        hint: trip.destination,
        icon: <I.Map size={15} />,
        run: () => router.push(`/t/${trip.id}`),
      }));

    const folderResults = (folders?.items ?? [])
      .filter((folder) => matches(folder.name))
      .slice(0, 4)
      .map<Result>((folder) => ({
        id: `folder-${folder.id}`,
        kind: 'Folders',
        label: folder.name,
        hint: `${folder.tripCount ?? 0} journeys`,
        icon: <span aria-hidden>{folder.emoji}</span>,
        run: () => router.push(`/f/${folder.id}`),
      }));

    const actions = (
      [
        {
          id: 'action-new-trip',
          kind: 'Actions',
          label: 'New journey',
          icon: <I.Plus size={15} />,
          run: () => setOpenModal('new-trip'),
        },
        {
          id: 'action-new-folder',
          kind: 'Actions',
          label: 'New folder',
          icon: <I.Folder size={15} />,
          run: () => setOpenModal('new-folder'),
        },
        {
          id: 'action-archive',
          kind: 'Actions',
          label: 'Open archive',
          icon: <I.Archive size={15} />,
          run: () => router.push('/archive'),
        },
      ] as Result[]
    ).filter((action) => matches(action.label));

    return [...trips, ...folderResults, ...actions];
  }, [query, dashboard, folders, router, setOpenModal]);

  // Clamp rather than reset: typing narrows the list, and a selection past the
  // end would leave Enter doing nothing.
  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(0, results.length - 1)));
  }, [results.length]);

  function activate(result: Result | undefined) {
    if (!result) return;
    result.run();
    onClose();
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIndex((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      activate(results[index]);
    }
  }

  // Keep the active row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  let cursor = -1;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.backdrop} />
        <Dialog.Content className={styles.palette} aria-describedby={undefined}>
          <Dialog.Title className={styles.srOnly}>Search and commands</Dialog.Title>

          <div className={styles.inputRow}>
            <I.Search />
            <input
              autoFocus
              type="text"
              value={query}
              placeholder="Search journeys, folders, actions…"
              aria-label="Search journeys, folders and actions"
              // The listbox pattern: the input keeps focus and owns the
              // selection, so a screen reader hears the active option change.
              role="combobox"
              aria-expanded
              aria-controls="palette-results"
              aria-activedescendant={results[index]?.id}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <span className={styles.esc}>esc</span>
          </div>

          <div className={styles.results} id="palette-results" role="listbox" ref={listRef}>
            {results.length === 0 ? (
              <p className={styles.empty}>No matches for “{query}”.</p>
            ) : (
              (['Trips', 'Folders', 'Actions'] as const).map((kind) => {
                const group = results.filter((result) => result.kind === kind);
                if (group.length === 0) return null;

                return (
                  <div key={kind}>
                    <p className={styles.kind}>{kind}</p>
                    {group.map((result) => {
                      cursor += 1;
                      const position = cursor;
                      return (
                        // The input owns the keyboard in a combobox: options
                        // are never individually focusable, and selection is
                        // announced through aria-activedescendant. Arrow keys
                        // and Enter are handled on the input, which is the
                        // pattern this rule cannot see.
                        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                        <div
                          key={result.id}
                          id={result.id}
                          role="option"
                          aria-selected={position === index}
                          data-active={position === index}
                          className={styles.row}
                          onMouseEnter={() => setIndex(position)}
                          onClick={() => activate(result)}
                        >
                          <span className={styles.rowIcon}>{result.icon}</span>
                          <span className={styles.rowLabel}>{result.label}</span>
                          {result.hint ? (
                            <span className={styles.rowHint}>{result.hint}</span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
