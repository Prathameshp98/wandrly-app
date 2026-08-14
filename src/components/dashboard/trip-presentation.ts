import type { DashboardTrip } from '@/types/domain';

/**
 * Display helpers for a trip. Formatting only — nothing here recomputes a value
 * the server already sends (§6.6).
 */

/**
 * The cover.
 *
 * The API stores two OKLCH hues rather than an image URL, and returns an
 * average tone rather than a blurhash — it generates no derivative sizes at
 * all, so `next/image` owns real imagery when a trip has some (§12). Until a
 * trip has a cover asset this gradient *is* the cover, exactly as the
 * prototype's `FALLBACK` intended.
 */
export function coverBackground(trip: DashboardTrip): string {
  const hue = trip.coverHue ?? 200;
  const hue2 = trip.coverHue2 ?? hue;
  return `linear-gradient(135deg, oklch(0.38 0.12 ${hue}), oklch(0.22 0.06 ${hue2}))`;
}

/**
 * `18 – 24 May 2027`, or a single date, or nothing.
 *
 * The API sends `dateRangeLabel`, and that is preferred when present — the
 * server is authoritative and it already knows the user's locale conventions.
 * This is the fallback for trips with no dates yet.
 */
export function formatDateRange(
  startDate?: string | null,
  endDate?: string | null,
  locale = 'en-IN',
): string {
  if (!startDate) return 'Dates to be decided';

  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 'Dates to be decided';

  if (!endDate) {
    return start.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) return 'Dates to be decided';

  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();

  // "18 – 24 May 2027" rather than repeating the month on both sides.
  if (sameMonth) {
    return `${start.getDate()} – ${end.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endLabel = end.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${startLabel} – ${endLabel}`;
}

/** `Kyoto, Japan · 18 – 24 May 2027` */
export function tripEyebrow(trip: DashboardTrip): string {
  const dates = trip.dateRangeLabel || formatDateRange(trip.startDate, trip.endDate);
  return [trip.destination, dates].filter(Boolean).join(' · ');
}

/**
 * The greeting PRD §12 specifies: morning before 12, afternoon before 17,
 * evening after.
 */
export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * FR-DASH-08. `daysToGo` is server-computed and authoritative; this only turns
 * the number into the sentence the design asks for.
 */
export function daysToGoLabel(daysToGo: number | null | undefined): string | null {
  if (daysToGo === null || daysToGo === undefined) return null;
  if (daysToGo === 0) return 'Today';
  if (daysToGo < 0) return null;
  return `${daysToGo} day${daysToGo === 1 ? '' : 's'}`;
}

/**
 * The readiness caption. Zero bookable blocks reads "No bookings yet" rather
 * than "0 of 0 plans booked", which FR-DASH-07 calls out specifically.
 */
export function readinessCaption(trip: DashboardTrip): string {
  const bookable = trip.bookableBlockCount ?? 0;
  if (bookable === 0) return 'No bookings yet';
  return `${trip.confirmedBlockCount ?? 0} of ${bookable} plans booked`;
}
