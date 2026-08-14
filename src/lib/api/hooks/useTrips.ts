'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, idempotencyKey } from '../client';
import { ApiError, userMessage } from '../errors';
import { keys } from '../keys';
import { toast } from '@/stores/toasts';
import type {
  CreateTripBody,
  Dashboard,
  DashboardTrip,
  Folders,
  Members,
  Trip,
  TripList,
  TripView,
  UpdateTripBody,
} from '@/types/domain';

/**
 * Server state for trips and folders.
 *
 * Two rules from FRONTEND_TECHNICAL_DESIGN run through all of it:
 *
 * §6.4 — every mutation is optimistic with rollback. `onMutate` snapshots the
 * cache and patches it, `onError` puts the snapshot back, `onSettled`
 * invalidates so the server's answer wins. FR-NFR-PERF-03 gives us 100ms per
 * interaction, which is less than a round-trip to Frankfurt.
 *
 * §6.6 — `readinessPct`, `daysToGo` and every count are server-computed and
 * authoritative. Optimistic patches touch only what the user just changed
 * (a title, a folder, a pin) and leave derived fields alone rather than
 * guessing at them. The prototype guessed, and the numbers drifted.
 */

/* ── Reads ────────────────────────────────────────────────────────────────── */

export function useDashboard() {
  return useQuery({
    queryKey: keys.dashboard(),
    queryFn: () => api<Dashboard>('/v1/trips/dashboard'),
  });
}

export function useTripList(view: TripView, folderId?: string) {
  return useQuery({
    queryKey: keys.tripList(view, folderId),
    queryFn: () => api<TripList>('/v1/trips', { searchParams: { view, folderId } }),
  });
}

export function useTrip(tripId: string, enabled = true) {
  return useQuery({
    queryKey: keys.trip(tripId),
    queryFn: () => api<Trip>(`/v1/trips/${tripId}`),
    enabled: enabled && Boolean(tripId),
  });
}

export function useFolders() {
  return useQuery({
    queryKey: keys.folders,
    queryFn: () => api<Folders>('/v1/folders'),
  });
}

/* ── Cache helpers ────────────────────────────────────────────────────────── */

/**
 * Apply a change to every cached list a trip might appear in.
 *
 * A trip shows up in the dashboard and in any number of `tripList` views, and
 * an optimistic update that patched only the one on screen would leave the
 * others stale until their next fetch — visible as a card reverting when you
 * navigate back to it.
 */
function patchTripEverywhere(
  queryClient: QueryClient,
  tripId: string,
  patch: (trip: DashboardTrip) => DashboardTrip | null,
) {
  const apply = <T extends { items?: DashboardTrip[] }>(data: T | undefined): T | undefined => {
    if (!data?.items) return data;
    const items: DashboardTrip[] = [];
    for (const trip of data.items) {
      if (trip.id !== tripId) {
        items.push(trip);
        continue;
      }
      // null removes it from this list — archive, delete, move out of a folder.
      const next = patch(trip);
      if (next) items.push(next);
    }
    return { ...data, items };
  };

  queryClient.setQueryData<Dashboard>(keys.dashboard(), apply);
  queryClient.setQueriesData<TripList>({ queryKey: [...keys.trips, 'list'] }, apply);
}

/** Snapshot every trips query so a failed mutation can be put back exactly. */
function snapshotTrips(queryClient: QueryClient) {
  return queryClient.getQueriesData({ queryKey: keys.trips });
}

function restoreTrips(queryClient: QueryClient, snapshot: ReturnType<typeof snapshotTrips>) {
  for (const [key, data] of snapshot) queryClient.setQueryData(key, data);
}

/**
 * Shared mutation wiring: cancel in-flight reads, snapshot, roll back on
 * failure, and always resync afterwards.
 *
 * FR-NFR-REL-03 is the reason `onError` both restores and surfaces: an edit
 * must never disappear quietly. A stale conflict gets its own message, since
 * FR-COLLAB-07 wants the user to know somebody else got there first.
 */
function useOptimisticTripMutation<TInput, TResult>(options: {
  mutationFn: (input: TInput) => Promise<TResult>;
  optimistic?: (queryClient: QueryClient, input: TInput) => void;
  onDone?: (result: TResult, input: TInput) => void;
  errorPrefix?: string;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: options.mutationFn,

    onMutate: async (input: TInput) => {
      await queryClient.cancelQueries({ queryKey: keys.trips });
      const snapshot = snapshotTrips(queryClient);
      options.optimistic?.(queryClient, input);
      return { snapshot };
    },

    onError: (error, _input, context) => {
      if (context?.snapshot) restoreTrips(queryClient, context.snapshot);

      const message =
        error instanceof ApiError && error.isConflict
          ? 'Someone else changed this while you were working. Reloaded their version.'
          : `${options.errorPrefix ?? 'That did not save'} — ${userMessage(error)}`;

      toast.error(message);
    },

    onSuccess: (result, input) => options.onDone?.(result, input),

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: keys.trips });
      void queryClient.invalidateQueries({ queryKey: keys.folders });
    },
  });
}

/* ── Trip mutations ───────────────────────────────────────────────────────── */

export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    // One key per user intent, not per attempt: a retried create must not
    // become two trips (API_CONTRACT §3.5).
    mutationFn: (input: CreateTripBody) =>
      api<Trip>('/v1/trips', { method: 'POST', body: input, idempotencyKey: idempotencyKey() }),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.trips });
      void queryClient.invalidateQueries({ queryKey: keys.folders });
    },

    onError: (error) => toast.error(`Could not create that journey — ${userMessage(error)}`),
  });
}

/** Raised when the server needs to know what to do with existing days. */
export class DateChangeRequired extends Error {
  override readonly name = 'DateChangeRequired';
  constructor(readonly detail: ApiError) {
    super(detail.message);
  }
}

export function useUpdateTrip() {
  return useOptimisticTripMutation<{ tripId: string } & UpdateTripBody, Trip>({
    mutationFn: async ({ tripId, ...body }) => {
      try {
        return await api<Trip>(`/v1/trips/${tripId}`, { method: 'PATCH', body });
      } catch (error) {
        // FR-TRIP-14: changing dates on a trip that already has days needs an
        // explicit strategy. Surfaced as its own type so the caller can open
        // the resolution prompt instead of showing a generic failure.
        if (error instanceof ApiError && error.code === 'CONFLICT_DATE_CHANGE') {
          throw new DateChangeRequired(error);
        }
        throw error;
      }
    },
    optimistic: (queryClient, { tripId, ...body }) => {
      patchTripEverywhere(queryClient, tripId, (trip) => ({
        ...trip,
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.subtitle !== undefined ? { subtitle: body.subtitle } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      }));
    },
    errorPrefix: 'That change did not save',
  });
}

export function usePinTrip() {
  return useOptimisticTripMutation<{ tripId: string; pinned: boolean }, void>({
    mutationFn: ({ tripId, pinned }) =>
      api<void>(`/v1/trips/${tripId}/pin`, { method: 'POST', body: { pinned } }),
    optimistic: (queryClient, { tripId, pinned }) => {
      patchTripEverywhere(queryClient, tripId, (trip) => ({ ...trip, isPinned: pinned }));
    },
    errorPrefix: 'Could not pin that',
  });
}

export function useMoveTripToFolder() {
  return useOptimisticTripMutation<
    {
      tripId: string;
      folderId: string | null;
      tripTitle?: string;
      previousFolderId?: string | null;
    },
    void
  >({
    mutationFn: ({ tripId, folderId }) =>
      api<void>(`/v1/trips/${tripId}/folder`, { method: 'PATCH', body: { folderId } }),
    optimistic: (queryClient, { tripId, folderId }) => {
      patchTripEverywhere(queryClient, tripId, (trip) => ({ ...trip, folderId }));
    },
    errorPrefix: 'Could not move that journey',
  });
}

export function useArchiveTrip() {
  return useOptimisticTripMutation<{ tripId: string; tripTitle?: string }, void>({
    mutationFn: ({ tripId }) => api<void>(`/v1/trips/${tripId}/archive`, { method: 'POST' }),
    // Removed from every non-archive list the moment it is archived.
    optimistic: (queryClient, { tripId }) => patchTripEverywhere(queryClient, tripId, () => null),
    errorPrefix: 'Could not archive that',
  });
}

export function useUnarchiveTrip() {
  return useOptimisticTripMutation<{ tripId: string }, void>({
    mutationFn: ({ tripId }) => api<void>(`/v1/trips/${tripId}/unarchive`, { method: 'POST' }),
    errorPrefix: 'Could not restore that',
  });
}

export function useDeleteTrip() {
  return useOptimisticTripMutation<{ tripId: string; tripTitle?: string }, void>({
    mutationFn: ({ tripId }) => api<void>(`/v1/trips/${tripId}`, { method: 'DELETE' }),
    optimistic: (queryClient, { tripId }) => patchTripEverywhere(queryClient, tripId, () => null),
    errorPrefix: 'Could not delete that',
  });
}

export function useRestoreTrip() {
  return useOptimisticTripMutation<{ tripId: string }, void>({
    mutationFn: ({ tripId }) => api<void>(`/v1/trips/${tripId}/restore`, { method: 'POST' }),
    errorPrefix: 'Could not restore that',
  });
}

export function useDuplicateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tripId }: { tripId: string }) =>
      api<Trip>(`/v1/trips/${tripId}/duplicate`, {
        method: 'POST',
        idempotencyKey: idempotencyKey(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.trips });
      void queryClient.invalidateQueries({ queryKey: keys.folders });
    },
    onError: (error) => toast.error(`Could not duplicate that — ${userMessage(error)}`),
  });
}

/** Per-user ordering, so this never reorders anyone else's board. */
export function useReorderTrips() {
  return useOptimisticTripMutation<{ orderedTripIds: string[] }, void>({
    mutationFn: ({ orderedTripIds }) =>
      api<void>('/v1/trips/reorder', { method: 'POST', body: { orderedTripIds } }),
    optimistic: (queryClient, { orderedTripIds }) => {
      const order = new Map(orderedTripIds.map((id, index) => [id, index]));
      const sort = <T extends { items?: DashboardTrip[] }>(data: T | undefined): T | undefined => {
        if (!data?.items) return data;
        const items = [...data.items].sort(
          (a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity),
        );
        return { ...data, items };
      };
      queryClient.setQueryData<Dashboard>(keys.dashboard(), sort);
      queryClient.setQueriesData<TripList>({ queryKey: [...keys.trips, 'list'] }, sort);
    },
    errorPrefix: 'Could not reorder',
  });
}

/**
 * Crew for one trip.
 *
 * The dashboard payload carries `memberCount` but no names, and an avatar
 * stack needs real people — rendering "Crew 1…4" would be fabricating content,
 * which is the habit §6.6 exists to break. Fetched only for the spotlight,
 * where the stack actually appears.
 */
export function useMembers(tripId: string | undefined) {
  return useQuery({
    queryKey: keys.members(tripId ?? ''),
    queryFn: () => api<Members>(`/v1/trips/${tripId}/members`),
    enabled: Boolean(tripId),
  });
}
