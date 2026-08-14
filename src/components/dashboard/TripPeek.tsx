'use client';

import {
  AvatarStack,
  ButtonLink,
  Button,
  Chip,
  PanelShell,
  statusTone,
} from '@/components/primitives';
import { useState } from 'react';
import { useMembers, useTrip } from '@/lib/api/hooks/useTrips';
import { TripSettingsModal } from '@/components/modals/TripSettingsModal';
import { coverBackground, readinessCaption, tripEyebrow } from './trip-presentation';
import styles from './TripPeek.module.css';

/**
 * FR-TRIP-15 — the quick preview drawer, "Peek" in the product's own voice.
 *
 * Every figure shown is one the server computed. The prototype's Peek
 * synthesised its day list from a fixed array of Kyoto titles regardless of
 * which trip you opened, which is the specific fake PRD §10.5 calls out; this
 * shows the real day and block counts or says it has none.
 */
export function TripPeek({ tripId, onClose }: { tripId: string | null; onClose: () => void }) {
  const open = Boolean(tripId);
  const { data: trip, isLoading } = useTrip(tripId ?? '', open);
  const { data: members } = useMembers(open && tripId ? tripId : undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <PanelShell
        open={open}
        onClose={onClose}
        title={trip?.title ?? 'Loading…'}
        sub={trip ? tripEyebrow(trip) : undefined}
        footer={
          trip ? (
            <div className={styles.footer}>
              <ButtonLink href={`/t/${trip.id}`} variant="primary" block>
                Open canvas
              </ButtonLink>
            </div>
          ) : undefined
        }
      >
        {isLoading || !trip ? (
          <div className={styles.skeletonStack}>
            <div className={styles.skeletonCover} />
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
          </div>
        ) : (
          <div className={styles.stack}>
            <div className={styles.cover} style={{ background: coverBackground(trip) }}>
              <Chip className={styles.coverChip} tone={statusTone(trip.status)} dot>
                {trip.isArchived ? 'ARCHIVED' : trip.status}
              </Chip>
            </div>

            {trip.subtitle ? <p className={styles.subtitle}>{trip.subtitle}</p> : null}

            <dl className={styles.stats}>
              <Stat label="Days" value={trip.dayCount ?? 0} />
              <Stat label="Blocks" value={trip.blockCount ?? 0} />
              <Stat label="Variants" value={trip.variantCount ?? 1} />
            </dl>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Readiness</h3>
              <div className={styles.readinessRow}>
                <span className={styles.readinessPct}>{trip.readinessPct ?? 0}%</span>
                <span className={styles.readinessCaption}>{readinessCaption(trip)}</span>
              </div>
              <div
                className={styles.track}
                role="progressbar"
                aria-valuenow={trip.readinessPct ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${trip.title} readiness`}
              >
                <div className={styles.fill} style={{ width: `${trip.readinessPct ?? 0}%` }} />
              </div>
            </section>

            {members?.items?.length ? (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Crew</h3>
                <AvatarStack
                  people={members.items.map((member) => ({
                    name: member.displayName,
                    tone: member.avatarTone as never,
                  }))}
                  max={5}
                />
                <ul className={styles.crewList}>
                  {members.items.map((member) => (
                    <li key={member.userId ?? member.displayName}>
                      <span>{member.displayName}</span>
                      <span className={styles.role}>{member.role.toLowerCase()}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/*
             * The prototype's Peek shows a coordinate line. `GET /v1/trips/{id}`
             * does not return latitude or longitude — the columns exist and are
             * populated, they are simply not in the response — so the element is
             * omitted rather than filled with a plausible-looking number. Same
             * rule as FR-DAY-07's weather: hide it, never fabricate it.
             */}

            <div className={styles.actions}>
              {/* FR-TRIP-06 needs an entry point, and the canvas top bar that
                owns it in the prototype does not exist yet. It moves there in
                phase 2; until then this is where the date-change prompt is
                reachable from. */}
              <Button variant="ghost" onClick={() => setSettingsOpen(true)}>
                Edit details
              </Button>
              <Button variant="quiet" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </PanelShell>

      <TripSettingsModal
        trip={trip ?? null}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={styles.statValue}>{value}</dd>
    </div>
  );
}
