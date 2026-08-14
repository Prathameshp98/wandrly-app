'use client';

import { useMemo, useState } from 'react';
import { AvatarStack, Button, ButtonLink, I } from '@/components/primitives';
import { TripCard, AddTripCard, type TripAction } from '@/components/dashboard/TripCard';
import { FolderCard } from '@/components/dashboard/FolderCard';
import {
  daysToGoLabel,
  coverBackground,
  greetingFor,
  readinessCaption,
  tripEyebrow,
} from '@/components/dashboard/trip-presentation';
import {
  useArchiveTrip,
  useDashboard,
  useDeleteTrip,
  useDuplicateTrip,
  useFolders,
  useMembers,
  useMoveTripToFolder,
  usePinTrip,
} from '@/lib/api/hooks/useTrips';
import { useShellStore } from '@/stores/shell';
import { toast } from '@/stores/toasts';
import type { DashboardTrip } from '@/types/domain';
import styles from '@/components/dashboard/dashboard.module.css';

/**
 * The Dashboard (FR-DASH-*).
 *
 * PRD §12 fixes the order and it is not negotiable: greeting header, spotlight,
 * pinned strip, trip grid, folder grid, footer. When there is no upcoming trip
 * the spotlight is omitted entirely and the grid moves up.
 *
 * Every number on this screen — readiness, counts, days to go — comes from the
 * server. §6.6 forbids deriving them here; the prototype derived several and
 * they drifted from the canvas.
 */
export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const { data: folders } = useFolders();
  const search = useShellStore((state) => state.search);
  const setOpenModal = useShellStore((state) => state.setOpenModal);

  const pinTrip = usePinTrip();
  const archiveTrip = useArchiveTrip();
  const deleteTrip = useDeleteTrip();
  const duplicateTrip = useDuplicateTrip();
  const moveToFolder = useMoveTripToFolder();

  const [, setPeekTripId] = useState<string | null>(null);

  const trips = useMemo(() => data?.items ?? [], [data]);

  // FR-SRCH-01: title, destination and subtitle, case-insensitive.
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return trips;
    return trips.filter((trip) =>
      [trip.title, trip.destination, trip.subtitle]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query)),
    );
  }, [trips, search]);

  const pinned = filtered.filter((trip) => trip.isPinned);
  const spotlight = trips.find((trip) => trip.id === data?.stats?.nextTripId) ?? null;

  function handleAction(action: TripAction, trip: DashboardTrip) {
    switch (action) {
      case 'peek':
        setPeekTripId(trip.id);
        toast.success('Quick preview lands in the next commit.');
        break;
      case 'pin':
        pinTrip.mutate({ tripId: trip.id, pinned: !trip.isPinned });
        break;
      case 'duplicate':
        duplicateTrip.mutate(
          { tripId: trip.id },
          { onSuccess: (copy) => toast.success(`Duplicated as “${copy.title}”`) },
        );
        break;
      case 'archive':
        archiveTrip.mutate(
          { tripId: trip.id, tripTitle: trip.title },
          {
            // FR-UNDO-01: archiving is undoable, and the toast names the object.
            onSuccess: () =>
              toast.undoable(`Archived “${trip.title}”`, () =>
                moveToFolder.mutate({ tripId: trip.id, folderId: trip.folderId ?? null }),
              ),
          },
        );
        break;
      case 'delete':
        deleteTrip.mutate(
          { tripId: trip.id, tripTitle: trip.title },
          { onSuccess: () => toast.undoable(`Deleted “${trip.title}”`, () => refetch()) },
        );
        break;
      default:
        toast.success('That lands in a later phase.');
    }
  }

  function handleMove(folderId: string | null, trip: DashboardTrip) {
    const folder = folders?.items?.find((candidate) => candidate.id === folderId);
    const previousFolderId = trip.folderId ?? null;

    moveToFolder.mutate(
      { tripId: trip.id, folderId, previousFolderId },
      {
        onSuccess: () =>
          toast.undoable(
            folder
              ? `Moved “${trip.title}” → ${folder.emoji} ${folder.name}`
              : `Unfiled “${trip.title}”`,
            () => moveToFolder.mutate({ tripId: trip.id, folderId: previousFolderId }),
          ),
      },
    );
  }

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <div className={styles.page}>
        <h1 className={styles.greetTitle}>We couldn&rsquo;t load your journeys.</h1>
        <p className={styles.greetTag}>{(error as Error)?.message}</p>
        <p style={{ marginTop: 18 }}>
          <Button variant="primary" onClick={() => void refetch()}>
            Try again
          </Button>
        </p>
      </div>
    );
  }

  const stats = data?.stats;
  const greeting = greetingFor(new Date());
  const daysAway = daysToGoLabel(spotlight?.daysToGo);

  return (
    <div className={styles.page}>
      <header className={styles.greet}>
        <div>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden>
              ◆
            </span>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <h1 className={styles.greetTitle}>{greeting}.</h1>
          {daysAway ? (
            <p className={styles.greetTag}>
              Your next journey is <em>{daysAway}</em> away.
            </p>
          ) : null}
        </div>

        {stats ? (
          <p className={styles.stats}>
            <span>
              <b>{stats.tripCount}</b> journeys
            </span>
            <span className={styles.statDot}>·</span>
            <span>
              <b>{stats.daysPlanned}</b> days planned
            </span>
            <span className={styles.statDot}>·</span>
            <span>
              <b>{stats.crewCount}</b> crew
            </span>
          </p>
        ) : null}
      </header>

      {/* FR-DASH-04: no upcoming trip means no spotlight, and the grid moves up. */}
      {spotlight ? <Spotlight trip={spotlight} /> : null}

      {pinned.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Pinned</h2>
            <span className={styles.sectionHint}>Drag to rearrange · drop on a folder to move</span>
          </div>
          <div className={styles.pinnedRow}>
            {pinned.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                variant="tall"
                folders={folders?.items ?? []}
                onAction={handleAction}
                onMoveToFolder={handleMove}
              />
            ))}
            <AddTripCard onClick={() => setOpenModal('new-trip')} />
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            Recently visited
            <span className={styles.countChip}>{filtered.length}</span>
          </h2>
        </div>

        {filtered.length === 0 ? (
          <EmptyState search={search} onNewTrip={() => setOpenModal('new-trip')} />
        ) : (
          <div className={styles.grid}>
            {filtered.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                folders={folders?.items ?? []}
                onAction={handleAction}
                onMoveToFolder={handleMove}
              />
            ))}
            <AddTripCard onClick={() => setOpenModal('new-trip')} sub="Where to next?" />
          </div>
        )}
      </section>

      {folders?.items?.length ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Folders</h2>
          </div>
          <div className={styles.foldersGrid}>
            {folders.items.map((folder) => (
              <FolderCard key={folder.id} folder={folder} />
            ))}
          </div>
        </section>
      ) : null}

      <footer className={styles.footer}>
        <span>WANDRLY · Folio Edition</span>
        <span>
          {stats?.tripCount ?? 0} journeys · {stats?.daysPlanned ?? 0} days planned
        </span>
      </footer>
    </div>
  );
}

function Spotlight({ trip }: { trip: DashboardTrip }) {
  const readiness = trip.readinessPct ?? 0;
  const daysAway = trip.daysToGo;
  // Real names, not a count turned into placeholders.
  const { data: members } = useMembers(trip.id);

  return (
    <section className={styles.spotlight} aria-labelledby="spotlight-title">
      <div className={styles.spotlightImg} style={{ background: coverBackground(trip) }}>
        <div className={styles.spotlightScrim} />
      </div>

      <div className={styles.spotlightContent}>
        <div>
          <p className={styles.spotlightEyebrow}>Next up · {tripEyebrow(trip)}</p>
          <h2 id="spotlight-title" className={styles.spotlightTitle}>
            {trip.title}
          </h2>

          <div className={styles.readiness}>
            <div className={styles.readinessTop}>
              <span className={styles.readinessPct}>{readiness}% ready</span>
              <span className={styles.readinessCount}>{readinessCaption(trip)}</span>
            </div>
            <div
              className={styles.readinessTrack}
              role="progressbar"
              aria-valuenow={readiness}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${trip.title} readiness`}
            >
              <div className={styles.readinessFill} style={{ width: `${readiness}%` }} />
            </div>
          </div>

          <div className={styles.spotlightFoot}>
            {members?.items?.length ? (
              <AvatarStack
                people={members.items.map((member) => ({
                  name: member.displayName,
                  tone: member.avatarTone as never,
                }))}
                max={4}
              />
            ) : null}
            <ButtonLink href={`/t/${trip.id}`} variant="ghost">
              Preview
            </ButtonLink>
            <ButtonLink href={`/t/${trip.id}`} variant="primary">
              Open canvas <I.ArrowR size={14} />
            </ButtonLink>
          </div>
        </div>

        {daysAway !== null && daysAway !== undefined && daysAway >= 0 ? (
          <div className={styles.spotlightCount}>
            <div className={styles.countNum}>{daysAway}</div>
            <div className={styles.countLabel}>{daysAway === 1 ? 'day to go' : 'days to go'}</div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EmptyState({ search, onNewTrip }: { search: string; onNewTrip: () => void }) {
  // FR-DASH-13 gives each empty state its own words.
  if (search) {
    return (
      <div className={styles.sectionHint}>
        <p>No matches for “{search}”.</p>
      </div>
    );
  }
  return (
    <div className={styles.grid}>
      <AddTripCard onClick={onNewTrip} label="Begin a Journey" sub="No journeys here yet" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading your journeys">
      <div className={`${styles.skeleton} ${styles.skeletonSpotlight}`} />
      <div className={styles.grid}>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={`${styles.skeleton} ${styles.skeletonCard}`} />
        ))}
      </div>
    </div>
  );
}
