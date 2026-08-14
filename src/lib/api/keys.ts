import type { ExpenseFilters, TripView } from '@/types/domain';

/**
 * Query keys, hierarchical so invalidation is surgical
 * (FRONTEND_TECHNICAL_DESIGN §6.3).
 *
 * The hierarchy matters: `keys.trip(id)` is a prefix of `keys.canvas(id, v)`,
 * so invalidating a trip invalidates its canvas, variants and members without
 * naming each one. That is what makes the realtime event router in §7 a handful
 * of lines rather than a lookup table.
 */
export const keys = {
  trips: ['trips'] as const,
  dashboard: () => [...keys.trips, 'dashboard'] as const,
  tripList: (view: TripView, folderId?: string) =>
    [...keys.trips, 'list', view, folderId ?? null] as const,
  trip: (id: string) => [...keys.trips, id] as const,

  canvas: (tripId: string, variantId?: string) =>
    [...keys.trip(tripId), 'canvas', variantId ?? null] as const,
  variants: (tripId: string) => [...keys.trip(tripId), 'variants'] as const,
  members: (tripId: string) => [...keys.trip(tripId), 'members'] as const,
  invites: (tripId: string) => [...keys.trip(tripId), 'invites'] as const,
  comments: (tripId: string) => [...keys.trip(tripId), 'comments'] as const,
  suggestions: (tripId: string) => [...keys.trip(tripId), 'suggestions'] as const,
  activity: (tripId: string) => [...keys.trip(tripId), 'activity'] as const,
  share: (tripId: string) => [...keys.trip(tripId), 'share'] as const,
  map: (tripId: string) => [...keys.trip(tripId), 'map'] as const,
  packing: (tripId: string) => [...keys.trip(tripId), 'packing'] as const,
  notes: (tripId: string) => [...keys.trip(tripId), 'notes'] as const,

  // Ledger (phase 7 — no design yet, but the keys belong with their siblings).
  participants: (tripId: string) => [...keys.trip(tripId), 'participants'] as const,
  expenses: (tripId: string, filters?: ExpenseFilters) =>
    [...keys.trip(tripId), 'expenses', filters ?? null] as const,
  balances: (tripId: string) => [...keys.trip(tripId), 'balances'] as const,
  settleUp: (tripId: string, simplify: boolean) =>
    [...keys.trip(tripId), 'settle-up', simplify] as const,
  settlements: (tripId: string) => [...keys.trip(tripId), 'settlements'] as const,

  folders: ['folders'] as const,
  notifications: ['notifications'] as const,
  myBalances: ['me', 'balances'] as const,
  search: (query: string) => ['search', query] as const,
  places: (query: string) => ['places', query] as const,
  media: ['media'] as const,
  mediaUsage: () => [...keys.media, 'usage'] as const,
  mediaSearch: (query: string, page: number) => [...keys.media, 'search', query, page] as const,
} as const;
