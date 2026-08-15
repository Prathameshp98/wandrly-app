'use client';

import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Chip, I, statusTone } from '@/components/primitives';
import { coverBackground, formatDateRange, tripEyebrow } from './trip-presentation';
import type { DashboardTrip, Folder } from '@/types/domain';
import styles from './TripCard.module.css';

/**
 * The nine actions FR-TRIP-05 specifies, in that order.
 *
 * "Move to folder" is a submenu rather than a tenth item. Every one of these is
 * reachable from the keyboard, which is what FR-NFR-A11Y-02 needs: the drag
 * gestures are a second way to reach the same mutations, never the only way.
 */
export type TripAction =
  'open' | 'peek' | 'pin' | 'duplicate' | 'share' | 'export' | 'archive' | 'delete';

export interface TripCardProps {
  trip: DashboardTrip;
  folders?: Folder[];
  variant?: 'overlay' | 'tall';
  onAction: (action: TripAction, trip: DashboardTrip) => void;
  onMoveToFolder: (folderId: string | null, trip: DashboardTrip) => void;
  dragging?: boolean;
  /** Wiring for dnd-kit; the card works fully without it. */
  dragHandleProps?: Record<string, unknown>;
}

export function TripCard({
  trip,
  folders = [],
  variant = 'overlay',
  onAction,
  onMoveToFolder,
  dragging = false,
  dragHandleProps,
}: TripCardProps) {
  const readiness = trip.readinessPct ?? 0;
  const bookable = trip.bookableBlockCount ?? 0;

  return (
    <article
      className={[styles.card, variant === 'tall' && styles.tall].filter(Boolean).join(' ')}
      data-dragging={dragging || undefined}
      {...dragHandleProps}
    >
      <Link href={`/t/${trip.id}`} className={styles.link} draggable={false}>
        <div className={styles.imgWrap}>
          <div className={styles.img} style={{ background: coverBackground(trip) }} />
          <div className={styles.imgScrim} />
        </div>

        <div className={styles.body}>
          <p className={styles.eyebrow}>{tripEyebrow(trip)}</p>
          <h3 className={styles.title}>{trip.title}</h3>
          <p className={styles.meta}>
            <span>
              {trip.dayCount ?? 0}d · {trip.blockCount ?? 0} blocks
            </span>
            <span className={styles.metaSpacer} />
            <span>
              {trip.variantCount ?? 1} variant{(trip.variantCount ?? 1) === 1 ? '' : 's'}
            </span>
          </p>
        </div>
      </Link>

      <Chip className={styles.statusChip} tone={statusTone(trip.status)} dot>
        {trip.isArchived ? 'ARCHIVED' : trip.status}
      </Chip>

      {/* Layered over the link rather than nested inside it — a button inside
          an anchor is invalid markup and breaks keyboard activation. */}
      <div className={styles.actions} data-card-actions>
        <Link href={`/t/${trip.id}`} className={styles.action} draggable={false}>
          Open canvas
        </Link>
        <button
          type="button"
          className={`${styles.action} ${styles.actionIcon}`}
          onClick={() => onAction('peek', trip)}
          aria-label={`Quick preview of ${trip.title}`}
        >
          <I.Search size={14} />
        </button>
        <button
          type="button"
          className={`${styles.action} ${styles.actionIcon}`}
          onClick={() => onAction('pin', trip)}
          aria-label={trip.isPinned ? `Unpin ${trip.title}` : `Pin ${trip.title}`}
          aria-pressed={trip.isPinned}
        >
          <I.Star size={14} />
        </button>
      </div>

      <TripMenu trip={trip} folders={folders} onAction={onAction} onMoveToFolder={onMoveToFolder} />

      <div className={styles.ready}>
        <div
          className={styles.readyFill}
          style={{ width: `${readiness}%` }}
          role="progressbar"
          aria-valuenow={readiness}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={
            bookable === 0
              ? `${trip.title}: no bookings yet`
              : `${trip.title} is ${readiness}% ready`
          }
        />
      </div>
    </article>
  );
}

function TripMenu({
  trip,
  folders,
  onAction,
  onMoveToFolder,
}: Pick<TripCardProps, 'trip' | 'onAction' | 'onMoveToFolder'> & { folders: Folder[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={styles.menuButton}
          aria-label={`Actions for ${trip.title}`}
        >
          <I.Dots size={15} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.menu} align="end" sideOffset={6}>
          <DropdownMenu.Item className={styles.menuItem} asChild>
            <Link href={`/t/${trip.id}`}>
              <I.Map size={14} /> Open canvas
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item className={styles.menuItem} onSelect={() => onAction('peek', trip)}>
            <I.Search size={14} /> Quick preview
          </DropdownMenu.Item>

          <DropdownMenu.Item className={styles.menuItem} onSelect={() => onAction('pin', trip)}>
            <I.Star size={14} /> {trip.isPinned ? 'Unpin' : 'Pin'}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={styles.menuItem}
            onSelect={() => onAction('duplicate', trip)}
          >
            <I.Grid size={14} /> Duplicate
          </DropdownMenu.Item>

          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className={styles.menuItem}>
              <I.Folder size={14} /> Move to folder…
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent className={styles.menu} sideOffset={4}>
                <DropdownMenu.Item
                  className={styles.menuItem}
                  onSelect={() => onMoveToFolder(null, trip)}
                >
                  No folder
                </DropdownMenu.Item>
                {folders.length > 0 ? <div className={styles.menuSeparator} /> : null}
                {folders.map((folder) => (
                  <DropdownMenu.Item
                    key={folder.id}
                    className={styles.menuItem}
                    onSelect={() => onMoveToFolder(folder.id, trip)}
                  >
                    <span aria-hidden>{folder.emoji}</span> {folder.name}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Item className={styles.menuItem} onSelect={() => onAction('share', trip)}>
            <I.Share size={14} /> Copy share link
          </DropdownMenu.Item>

          <DropdownMenu.Item className={styles.menuItem} onSelect={() => onAction('export', trip)}>
            <I.Send size={14} /> Export PDF
          </DropdownMenu.Item>

          <div className={styles.menuSeparator} />

          <DropdownMenu.Item className={styles.menuItem} onSelect={() => onAction('archive', trip)}>
            <I.Archive size={14} /> {trip.isArchived ? 'Restore from archive' : 'Archive'}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={styles.menuItem}
            data-danger="true"
            onSelect={() => onAction('delete', trip)}
          >
            <I.Trash size={14} /> Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function AddTripCard({
  onClick,
  label = 'Add trip',
  sub,
}: {
  onClick: () => void;
  label?: string;
  sub?: string;
}) {
  return (
    <button type="button" className={styles.add} onClick={onClick}>
      <I.Plus size={20} />
      <span className={styles.addTitle}>{label}</span>
      {sub ? <span className={styles.addSub}>{sub}</span> : null}
    </button>
  );
}

export { formatDateRange };
