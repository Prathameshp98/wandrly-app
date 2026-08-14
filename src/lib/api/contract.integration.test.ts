import { beforeAll, describe, expect, it } from 'vitest';
import type { Canvas, Dashboard, Folders, Members, Trip, TripMap, Variant } from '@/types/domain';

/**
 * Contract test — runs against a real backend, skipped when there isn't one.
 *
 * The generated types say what the contract *claims*. This checks what it
 * *does*, which is the gap that produces the failure mode §6.7 warns about:
 * nothing errors, and data is simply missing or shaped differently than the
 * component expects.
 *
 * Enable by pointing it at a running API with a token:
 *
 *   WANDRLY_TEST_API=http://localhost:8000 \
 *   WANDRLY_TEST_TOKEN=$(cd ../../backend/wandrly-backend && npm run -s token:dev | awk '/^token:/{print $2}') \
 *   npx vitest run src/lib/api/contract.integration.test.ts
 */

const API = process.env.WANDRLY_TEST_API;
const TOKEN = process.env.WANDRLY_TEST_TOKEN;

const describeIfLive = API && TOKEN ? describe : describe.skip;

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!response.ok) {
    throw new Error(`GET ${path} -> ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

/** Every id in the API is a UUID v7 string — time-ordered, safe as a React key. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

describeIfLive('live contract', () => {
  let dashboard: Dashboard;
  /** The first dashboard trip, resolved once so each test can assume it exists. */
  let trip: NonNullable<Dashboard['items']>[number];
  let tripId: string;

  beforeAll(async () => {
    dashboard = await get<Dashboard>('/v1/trips/dashboard');
    const first = dashboard.items?.[0];
    if (!first) throw new Error('The seeded database has no trips — run db:seed first.');
    trip = first;
    tripId = first.id;
  });

  it('GET /v1/trips/dashboard matches the Dashboard type', () => {
    expect(Array.isArray(dashboard.items)).toBe(true);
    expect(dashboard.stats).toBeDefined();
    expect(typeof dashboard.stats.tripCount).toBe('number');

    expect(trip.id).toMatch(UUID);
    expect(typeof trip.title).toBe('string');
    expect(typeof trip.version).toBe('number');
  });

  it('returns server-computed values the client must never recompute', () => {
    // FR-DASH-07 and §6.6. The prototype faked all of these and they drifted.
    for (const field of [
      'dayCount',
      'blockCount',
      'variantCount',
      'memberCount',
      'readinessPct',
      'bookableBlockCount',
      'confirmedBlockCount',
    ] as const) {
      expect(typeof trip[field], field).toBe('number');
    }
    expect(trip.readinessPct).toBeGreaterThanOrEqual(0);
    expect(trip.readinessPct).toBeLessThanOrEqual(100);
  });

  it('sends date-only fields as YYYY-MM-DD, never localised', () => {
    if (trip.startDate) expect(trip.startDate).toMatch(DATE_ONLY);
    if (trip.endDate) expect(trip.endDate).toMatch(DATE_ONLY);
  });

  it('GET /v1/trips/{tripId} returns the callers role, which is what UI hides against', () => {
    // PRD §8: permissions are enforced server-side; the client only hides.
    return get<Trip>(`/v1/trips/${tripId}`).then((trip) => {
      expect(['OWNER', 'EDITOR', 'CONTRIBUTOR', 'VIEWER']).toContain(trip.role);
      expect(typeof trip.version).toBe('number');
    });
  });

  it('GET /v1/trips/{tripId}/canvas returns the whole tree in one request', async () => {
    // §6.4: this is one cache entry, fetched once per variant and mutated
    // locally. If it did not arrive complete, that design would not hold.
    const canvas = await get<Canvas>(`/v1/trips/${tripId}/canvas`);

    expect(canvas.variant).toBeDefined();
    expect(Array.isArray(canvas.days)).toBe(true);

    const day = canvas.days[0];
    if (!day) return;

    expect(day.id).toMatch(UUID);
    expect(day.date).toMatch(DATE_ONLY);
    expect(typeof day.version).toBe('number');
    expect(Array.isArray(day.blocks)).toBe(true);

    const block = day.blocks[0];
    if (!block) return;

    expect(block.id).toMatch(UUID);
    expect(typeof block.version).toBe('number');
    expect(typeof block.sortOrder).toBe('number');
    expect(block.sections).toBeDefined();
  });

  it('uses only the 11 block types the PRD defines', async () => {
    const canvas = await get<Canvas>(`/v1/trips/${tripId}/canvas`);
    const known = new Set([
      'ACTIVITY',
      'ACCOMMODATION',
      'TRANSPORT',
      'RESTAURANT',
      'TICKET',
      'PHOTO',
      'VIDEO',
      'LINK',
      'MAP_PIN',
      'NOTE',
      'BUDGET',
    ]);

    for (const day of canvas.days) {
      for (const block of day.blocks) {
        expect(known, `unexpected block type ${block.type}`).toContain(block.type);
      }
    }
  });

  it('marks exactly one variant as main', async () => {
    const variants = await get<{ items: Variant[] }>(`/v1/trips/${tripId}/variants`);
    expect(variants.items.filter((v) => v.isMain)).toHaveLength(1);
    // FR-VAR: max 8 variants per trip.
    expect(variants.items.length).toBeLessThanOrEqual(8);
  });

  it('returns complete lists for the endpoints that are not paginated', async () => {
    // §6.7: only expenses are cursor-paginated. Building "load more" for these
    // would be building something that cannot work.
    const [folders, members] = await Promise.all([
      get<Folders>('/v1/folders'),
      get<Members>(`/v1/trips/${tripId}/members`),
    ]);

    expect(Array.isArray(folders.items)).toBe(true);
    expect(Array.isArray(members.items)).toBe(true);
    expect(folders).not.toHaveProperty('nextCursor');
    expect(members).not.toHaveProperty('nextCursor');
  });

  it('supplies map centre and bounds so the client never guesses zoom', async () => {
    // FR-PANEL-05a.
    const map = await get<TripMap>(`/v1/trips/${tripId}/map`);
    expect(Array.isArray(map.pins)).toBe(true);
    if (map.pins.length > 0) {
      expect(map.center).toBeDefined();
      expect(map.bounds).toBeDefined();
    }
  });

  it('never sends money as a JSON number', async () => {
    // API_CONTRACT §3.2 and FR-SPLIT-16. A number here would already have lost
    // precision before the client could do anything about it.
    const canvas = await get<Canvas>(`/v1/trips/${tripId}/canvas`);
    const raw = JSON.stringify(canvas);

    const numericMinor = raw.match(/"[a-zA-Z]*[Mm]inor"\s*:\s*-?\d/g);
    expect(numericMinor, `found numeric minor-unit values: ${numericMinor?.join(', ')}`).toBeNull();
  });
});
