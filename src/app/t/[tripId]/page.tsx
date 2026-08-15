'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, I } from '@/components/primitives';
import { DayRow } from '@/components/canvas/DayRow';
import { StatusPanel } from '@/components/dashboard/StatusPanel';
import { coverBackground, tripEyebrow } from '@/components/dashboard/trip-presentation';
import { useTrip } from '@/lib/api/hooks/useTrips';
import {
  useAddDay,
  useCanvas,
  useDeleteDay,
  useDuplicateDay,
  useUpdateDay,
  useVariants,
} from '@/lib/api/hooks/useCanvas';
import { toast } from '@/stores/toasts';
import type { Block } from '@/types/domain';
import styles from '@/components/canvas/canvas.module.css';

const TOOLS = [
  { id: 'days', label: 'Days', icon: I.List },
  { id: 'overview', label: 'Overview', icon: I.Grid },
  { id: 'map', label: 'Map', icon: I.Map },
  { id: 'packing', label: 'Packing', icon: I.Suitcase },
  { id: 'notes', label: 'Notes', icon: I.Pencil },
] as const;

/**
 * The canvas (FR-DAY-*, FR-BLK-*).
 *
 * The whole day/block tree arrives in one request and is mutated in place —
 * §6.4 is explicit that it must not be decomposed into per-block queries.
 *
 * FR-NAV-05 wants a refresh to restore the same trip *and the same variant*,
 * which is why the active variant lives in the URL rather than in state.
 */
export default function CanvasPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const variantId = searchParams.get('variant') ?? undefined;

  const { data: trip } = useTrip(tripId);
  const { data: canvas, isLoading, isError, error, refetch } = useCanvas(tripId, variantId);
  const { data: variants } = useVariants(tripId);

  const [activeTool, setActiveTool] = useState<string>('days');
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  const scope = { tripId, variantId: variantId ?? canvas?.variant?.id };
  const addDay = useAddDay(scope);
  const updateDay = useUpdateDay(scope);
  const deleteDay = useDeleteDay(scope);
  const duplicateDay = useDuplicateDay(scope);

  if (isError) {
    return (
      <div className={styles.shell}>
        <TopBar tripId={tripId} title={trip?.title} />
        <div className={styles.tools} />
        <div className={styles.main}>
          <div className={styles.inner}>
            <StatusPanel
              tone="error"
              title="We couldn’t load this canvas."
              error={error}
              action={{ label: 'Try again', onClick: () => void refetch() }}
            />
          </div>
        </div>
      </div>
    );
  }

  const days = canvas?.days ?? [];
  const blockCount = days.reduce((total, day) => total + day.blocks.length, 0);
  const confirmed = days.reduce(
    (total, day) => total + day.blocks.filter((block) => block.isConfirmed).length,
    0,
  );

  return (
    <div className={styles.shell}>
      <TopBar
        tripId={tripId}
        title={trip?.title}
        variantName={canvas?.variant?.name}
        variantCount={variants?.items?.length}
      />

      <nav className={styles.tools} aria-label="Canvas views">
        {TOOLS.map(({ id, label, icon: Icon }, index) => (
          <span key={id} style={{ display: 'contents' }}>
            {index === 1 ? <span className={styles.toolSeparator} aria-hidden /> : null}
            <button
              type="button"
              className={styles.tool}
              aria-pressed={activeTool === id}
              aria-label={label}
              title={label}
              onClick={() => {
                // Selecting the active tool returns to Days, as the prototype
                // does — the panels are toggles, not a nav stack.
                setActiveTool((current) => (current === id ? 'days' : id));
                if (id !== 'days') toast.success(`${label} arrives in phase 5.`);
              }}
            >
              <Icon size={17} />
            </button>
          </span>
        ))}
      </nav>

      <div className={styles.main}>
        <div className={styles.inner}>
          {isLoading ? (
            <>
              <div className={styles.skeletonHero} />
              <div className={styles.skeletonDay} />
              <div className={styles.skeletonDay} />
            </>
          ) : (
            <>
              {trip ? (
                <header className={styles.hero}>
                  <div className={styles.heroImg} style={{ background: coverBackground(trip) }} />
                  <div className={styles.heroScrim} />
                  <div className={styles.heroBody}>
                    <div>
                      <p className={styles.heroEyebrow}>◉ {tripEyebrow(trip)}</p>
                      <h1 className={styles.heroTitle}>{trip.title}</h1>
                    </div>
                    <div className={styles.heroStats}>
                      <Stat value={days.length} label="Days" />
                      <Stat value={blockCount} label="Blocks" />
                      <Stat value={confirmed} label="Confirmed" />
                      <Stat value={trip.memberCount ?? 1} label="Crew" />
                    </div>
                  </div>
                </header>
              ) : null}

              {days.length === 0 ? (
                <StatusPanel
                  title="No days yet"
                  body="Add a day and start dropping blocks onto it."
                  action={{ label: 'Add the first day', onClick: () => addDay.mutate({}) }}
                />
              ) : (
                days.map((day) => (
                  <DayRow
                    key={day.id}
                    day={day}
                    expandedBlockId={expandedBlockId}
                    onToggleBlock={(blockId) =>
                      setExpandedBlockId((current) => (current === blockId ? null : blockId))
                    }
                    onOpenDetail={(block: Block) =>
                      toast.success(`“${block.title}” — drawer next.`)
                    }
                    onAddBlock={() => toast.success('The block picker lands next.')}
                    onRenameDay={(target, title) =>
                      updateDay.mutate({ dayId: target.id, version: target.version, title })
                    }
                    onEditNote={(target, note) =>
                      updateDay.mutate({ dayId: target.id, version: target.version, note })
                    }
                    onDuplicateDay={(target) =>
                      duplicateDay.mutate(
                        { dayId: target.id },
                        { onSuccess: () => toast.success(`Duplicated day ${target.dayNumber}`) },
                      )
                    }
                    onDeleteDay={(target) =>
                      deleteDay.mutate(
                        { dayId: target.id },
                        {
                          onSuccess: () =>
                            toast.undoable(`Deleted day ${target.dayNumber}`, () => void refetch()),
                        },
                      )
                    }
                  />
                ))
              )}

              {days.length > 0 ? (
                <button
                  type="button"
                  className={styles.addDay}
                  onClick={() =>
                    addDay.mutate({}, { onSuccess: () => toast.success('Added a day') })
                  }
                >
                  <I.Plus size={15} /> Add a day
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );

  function TopBar({
    tripId: id,
    title,
    variantName,
    variantCount,
  }: {
    tripId: string;
    title?: string;
    variantName?: string;
    variantCount?: number;
  }) {
    return (
      <header className={styles.top}>
        <div className={styles.topLeft}>
          <Link href="/" className={styles.back} aria-label="Back to your journeys">
            <I.ArrowR size={16} />
          </Link>
          <p className={styles.breadcrumb}>
            <b>{title ?? 'Loading…'}</b>
          </p>
        </div>

        <div className={styles.topCentre}>
          {variantName ? (
            <button
              type="button"
              className={styles.variantPill}
              onClick={() => toast.success('Variant switching lands in phase 3.')}
            >
              <span className={styles.variantDot} aria-hidden />
              {variantName}
              {variantCount && variantCount > 1 ? (
                <span className={styles.variantCount}>{variantCount}</span>
              ) : null}
              <I.ChevronD size={13} />
            </button>
          ) : null}
        </div>

        <div className={styles.topRight}>
          <Button variant="quiet" size="sm" onClick={() => router.push(`/t/${id}`)}>
            Share
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => toast.success('Export lands in phase 6.')}
          >
            Export
          </Button>
        </div>
      </header>
    );
  }
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.heroStat}>
      <div className={styles.heroStatValue}>{value}</div>
      <div className={styles.heroStatLabel}>{label}</div>
    </div>
  );
}
