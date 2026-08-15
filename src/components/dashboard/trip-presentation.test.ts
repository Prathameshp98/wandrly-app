import { describe, expect, it } from 'vitest';
import {
  coverBackground,
  daysToGoLabel,
  formatDateRange,
  greetingFor,
  readinessCaption,
  tripEyebrow,
} from './trip-presentation';
import type { DashboardTrip } from '@/types/domain';

/** A trip with only the fields under test; the rest never reaches these. */
const trip = (patch: Partial<DashboardTrip> = {}) =>
  ({
    id: 't1',
    title: 'Kyoto in Spring',
    destination: 'Kyoto, Japan',
    startDate: '2027-05-18',
    endDate: '2027-05-24',
    dateRangeLabel: '',
    bookableBlockCount: 20,
    confirmedBlockCount: 12,
    coverHue: 320,
    coverHue2: 20,
    ...patch,
  }) as unknown as DashboardTrip;

describe('formatDateRange', () => {
  it('collapses a same-month range rather than repeating the month', () => {
    expect(formatDateRange('2027-05-18', '2027-05-24', 'en-GB')).toBe('18 – 24 May 2027');
  });

  it('names both months when the range crosses one', () => {
    expect(formatDateRange('2027-05-29', '2027-06-02', 'en-GB')).toBe('29 May – 2 Jun 2027');
  });

  it('shows both years when the range crosses one', () => {
    const label = formatDateRange('2027-12-28', '2028-01-03', 'en-GB');
    expect(label).toContain('2027');
    expect(label).toContain('2028');
  });

  it('handles a single date', () => {
    expect(formatDateRange('2027-05-18', null, 'en-GB')).toBe('18 May 2027');
  });

  it('says so when there are no dates, rather than rendering Invalid Date', () => {
    expect(formatDateRange(null, null)).toBe('Dates to be decided');
    expect(formatDateRange(undefined, undefined)).toBe('Dates to be decided');
    expect(formatDateRange('not-a-date', '2027-05-24')).toBe('Dates to be decided');
    expect(formatDateRange('2027-05-18', 'not-a-date')).toBe('Dates to be decided');
  });

  it('does not shift the day across a timezone boundary', () => {
    // Parsed as local midnight, not UTC: `new Date('2027-05-18')` is UTC and
    // renders as the 17th anywhere west of Greenwich.
    expect(formatDateRange('2027-05-18', '2027-05-18', 'en-GB')).toContain('18');
  });
});

describe('tripEyebrow', () => {
  it('prefers the server label, which already knows the locale conventions', () => {
    expect(tripEyebrow(trip({ dateRangeLabel: '18 May – 24' }))).toBe('Kyoto, Japan · 18 May – 24');
  });

  it('falls back to formatting when the server sends none', () => {
    expect(tripEyebrow(trip({ dateRangeLabel: '' }))).toContain('Kyoto, Japan · ');
  });

  it('omits an empty destination rather than leaving a dangling separator', () => {
    expect(tripEyebrow(trip({ destination: '', dateRangeLabel: '18 May' }))).toBe('18 May');
  });
});

describe('greetingFor', () => {
  it.each([
    [0, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [16, 'Good afternoon'],
    [17, 'Good evening'],
    [23, 'Good evening'],
  ])('at %i:00 says "%s"', (hour, expected) => {
    const date = new Date(2027, 4, 18, hour, 0, 0);
    expect(greetingFor(date)).toBe(expected);
  });
});

describe('daysToGoLabel', () => {
  it('counts down', () => {
    expect(daysToGoLabel(276)).toBe('276 days');
    expect(daysToGoLabel(1)).toBe('1 day');
  });

  it('says Today rather than "0 days"', () => {
    expect(daysToGoLabel(0)).toBe('Today');
  });

  it('returns nothing for a past or absent trip, so the caller omits the line', () => {
    // FR-DASH-08: past trips show nothing at all, not a negative count.
    expect(daysToGoLabel(-3)).toBeNull();
    expect(daysToGoLabel(null)).toBeNull();
    expect(daysToGoLabel(undefined)).toBeNull();
  });
});

describe('readinessCaption', () => {
  it('reads "No bookings yet" when nothing is bookable', () => {
    // FR-DASH-07 calls this out specifically — "0 of 0 plans booked" is the
    // wrong sentence for a trip that has nothing to book.
    expect(readinessCaption(trip({ bookableBlockCount: 0, confirmedBlockCount: 0 }))).toBe(
      'No bookings yet',
    );
  });

  it('counts confirmed against bookable, not against every block', () => {
    expect(readinessCaption(trip({ bookableBlockCount: 20, confirmedBlockCount: 12 }))).toBe(
      '12 of 20 plans booked',
    );
  });
});

describe('coverBackground', () => {
  it('builds the gradient from the two hues the API stores', () => {
    expect(coverBackground(trip())).toBe(
      'linear-gradient(135deg, oklch(0.38 0.12 320), oklch(0.22 0.06 20))',
    );
  });

  it('falls back to one hue when only one is set', () => {
    expect(coverBackground(trip({ coverHue: 200, coverHue2: undefined }))).toContain('200), oklch');
  });
});
