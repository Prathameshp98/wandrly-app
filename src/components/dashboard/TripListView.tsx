'use client';

import { useMemo } from 'react';
import { TripCard, AddTripCard, type TripAction } from './TripCard';
import { useTripActions } from './useTripActions';
import { useFolders, useTripList } from '@/lib/api/hooks/useTrips';
import { useShellStore } from '@/stores/shell';
import type { DashboardTrip, TripView } from '@/types/domain';
import { StatusPanel } from '@/components/dashboard/StatusPanel';
import styles from './dashboard.module.css';

export interface TripListViewProps {
  view: TripView;
  folderId?: string;
  eyebrow: string;
  title: string;
  /** Shown when the view has no trips at all. */
  empty: { title: string; body: string; cta?: string };
  /** Archive and folder views offer different actions from the dashboard. */
  onPeek?: (trip: DashboardTrip) => void;
  /** A dismissable filter pill, for the folder view. */
  filter?: { label: string; onClear: () => void };
}

/**
 * The shared body of every non-dashboard trip view — Shared with me, Archived,
 * and a folder.
 *
 * PRD §5.1 describes these as the dashboard layout, filtered. They differ only
 * in heading, empty-state copy, and which query feeds them, so they are one
 * component rather than four near-copies that drift apart.
 */
export function TripListView({
  view,
  folderId,
  eyebrow,
  title,
  empty,
  onPeek,
  filter,
}: TripListViewProps) {
  const { data, isLoading, isError, error, refetch } = useTripList(view, folderId);
  const { data: folders } = useFolders();
  const search = useShellStore((state) => state.search);
  const setOpenModal = useShellStore((state) => state.setOpenModal);

  const { handleAction, handleMove } = useTripActions({ onPeek, refetch });

  const trips = useMemo(() => data?.items ?? [], [data]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return trips;
    return trips.filter((trip) =>
      [trip.title, trip.destination, trip.subtitle]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query)),
    );
  }, [trips, search]);

  return (
    <div className={styles.page}>
      <header className={styles.greet}>
        <div>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden>
              ◆
            </span>
            {eyebrow}
            {filter ? (
              <span className={styles.filterPill}>
                {filter.label}
                <button type="button" onClick={filter.onClear} aria-label="Clear this filter">
                  ✕
                </button>
              </span>
            ) : null}
          </p>
          <h1 className={styles.greetTitle}>{title}</h1>
        </div>
      </header>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className={`${styles.skeleton} ${styles.skeletonCard}`} />
          ))}
        </div>
      ) : isError ? (
        <StatusPanel
          tone="error"
          title="We couldn’t load these journeys."
          error={error}
          action={{ label: 'Try again', onClick: () => void refetch() }}
        />
      ) : filtered.length === 0 ? (
        <StatusPanel
          title={search ? `No matches for “${search}”` : empty.title}
          body={search ? 'Try a different search.' : empty.body}
          action={
            !search && empty.cta
              ? { label: empty.cta, onClick: () => setOpenModal('new-trip') }
              : undefined
          }
        />
      ) : (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              {filtered.length} {filtered.length === 1 ? 'journey' : 'journeys'}
            </h2>
          </div>
          <div className={styles.grid}>
            {filtered.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                folders={folders?.items ?? []}
                onAction={handleAction as (action: TripAction, trip: DashboardTrip) => void}
                onMoveToFolder={handleMove}
              />
            ))}
            {/* No "add" affordance in the archive — you cannot create into it. */}
            {view !== 'archive' ? (
              <AddTripCard onClick={() => setOpenModal('new-trip')} sub="Where to next?" />
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
