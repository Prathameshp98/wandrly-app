'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { ApiError, userMessage } from '../errors';
import { keys } from '../keys';
import { toast } from '@/stores/toasts';
import type { Block, Canvas, Day, Variant } from '@/types/domain';

/**
 * The canvas — one cache entry, mutated locally.
 *
 * §6.4 is emphatic and it shapes this whole file: `GET /canvas` returns the
 * entire day/block tree in one request. Fetch it once per variant and patch the
 * cached tree; do not decompose it into per-block queries and do not refetch
 * after every keystroke. FR-NFR-PERF-02 gives 2.5s to interactive for a 14-day,
 * 80-block trip, and FR-NFR-PERF-03 gives 100ms per interaction — neither
 * survives a round trip in the path.
 *
 * Every write carries the `version` it last read. A stale one comes back as
 * `409 CONFLICT_STALE`, which FR-COLLAB-07 says must be shown rather than
 * retried: retrying is precisely the lost update the version exists to prevent.
 */

export function useCanvas(tripId: string, variantId?: string) {
  return useQuery({
    queryKey: keys.canvas(tripId, variantId),
    queryFn: () =>
      api<Canvas>(`/v1/trips/${tripId}/canvas`, {
        searchParams: variantId ? { variantId } : undefined,
      }),
    enabled: Boolean(tripId),
  });
}

export function useVariants(tripId: string) {
  return useQuery({
    queryKey: keys.variants(tripId),
    queryFn: () => api<{ items: Variant[] }>(`/v1/trips/${tripId}/variants`),
    enabled: Boolean(tripId),
  });
}

/* ── Local tree edits ─────────────────────────────────────────────────────── */

/** Replace one block in the cached tree, leaving everything else identical. */
export function patchBlockInTree(canvas: Canvas, blockId: string, patch: Partial<Block>): Canvas {
  return {
    ...canvas,
    days: canvas.days.map((day) => ({
      ...day,
      blocks: day.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
    })),
  };
}

export function removeBlockFromTree(canvas: Canvas, blockId: string): Canvas {
  return {
    ...canvas,
    days: canvas.days.map((day) => ({
      ...day,
      blocks: day.blocks.filter((block) => block.id !== blockId),
    })),
  };
}

export function patchDayInTree(canvas: Canvas, dayId: string, patch: Partial<Day>): Canvas {
  return {
    ...canvas,
    days: canvas.days.map((day) => (day.id === dayId ? { ...day, ...patch } : day)),
  };
}

/**
 * Move a block between days, or within one.
 *
 * `toIndex` is the position in the destination *after* removal, which is what
 * the server expects — computing it before removal is off by one whenever a
 * block moves down within its own day.
 */
export function moveBlockInTree(
  canvas: Canvas,
  blockId: string,
  toDayId: string,
  toIndex?: number,
): Canvas {
  let moving: Block | undefined;

  const withoutIt = canvas.days.map((day) => {
    const found = day.blocks.find((block) => block.id === blockId);
    if (found) moving = found;
    return { ...day, blocks: day.blocks.filter((block) => block.id !== blockId) };
  });

  if (!moving) return canvas;
  const block = moving;

  return {
    ...canvas,
    days: withoutIt.map((day) => {
      if (day.id !== toDayId) return day;
      const blocks = [...day.blocks];
      blocks.splice(toIndex ?? blocks.length, 0, block);
      return { ...day, blocks };
    }),
  };
}

/* ── Mutations ────────────────────────────────────────────────────────────── */

interface CanvasScope {
  tripId: string;
  variantId?: string;
}

/**
 * Shared optimistic wiring against the single canvas entry.
 *
 * `onSettled` deliberately invalidates the *trip* rather than only the canvas:
 * `blockCount`, `readinessPct` and `dayCount` are server-computed and live on
 * the trip, so a block change moves numbers the dashboard is showing.
 */
function useCanvasMutation<TInput, TResult>({
  tripId,
  variantId,
  mutationFn,
  optimistic,
  errorPrefix,
}: CanvasScope & {
  mutationFn: (input: TInput) => Promise<TResult>;
  optimistic?: (canvas: Canvas, input: TInput) => Canvas;
  errorPrefix: string;
}) {
  const queryClient = useQueryClient();
  const key = keys.canvas(tripId, variantId);

  return useMutation({
    mutationFn,

    onMutate: async (input: TInput) => {
      if (!optimistic) return {};
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Canvas>(key);
      if (previous) queryClient.setQueryData<Canvas>(key, optimistic(previous, input));
      return { previous };
    },

    onError: (error, _input, context) => {
      if (context && 'previous' in context && context.previous) {
        queryClient.setQueryData(key, context.previous);
      }

      // FR-COLLAB-07: a conflict is somebody else's edit arriving first, not a
      // failure — say so plainly rather than as an error.
      if (error instanceof ApiError && error.isConflict) {
        toast.error('Someone else changed this while you were working. Reloaded their version.');
        void queryClient.invalidateQueries({ queryKey: key });
        return;
      }
      toast.error(`${errorPrefix} — ${userMessage(error)}`);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: keys.trip(tripId) });
      void queryClient.invalidateQueries({ queryKey: keys.dashboard() });
    },
  });
}

export type CreateBlockInput = {
  dayId: string;
  type: string;
  title?: string;
  timeLabel?: string;
  meta?: string;
  notes?: string;
};

export function useCreateBlock({ tripId, variantId }: CanvasScope) {
  return useCanvasMutation<CreateBlockInput, Block>({
    tripId,
    variantId,
    mutationFn: ({ dayId, ...body }) =>
      api<Block>(`/v1/trips/${tripId}/days/${dayId}/blocks`, { method: 'POST', body }),
    errorPrefix: 'Could not add that block',
  });
}

export type UpdateBlockInput = {
  blockId: string;
  version: number;
} & Partial<Pick<Block, 'title' | 'timeLabel' | 'meta' | 'notes' | 'isConfirmed' | 'sections'>>;

export function useUpdateBlock({ tripId, variantId }: CanvasScope) {
  return useCanvasMutation<UpdateBlockInput, Block>({
    tripId,
    variantId,
    mutationFn: ({ blockId, ...body }) =>
      api<Block>(`/v1/trips/${tripId}/blocks/${blockId}`, { method: 'PATCH', body }),
    optimistic: (canvas, { blockId, version: _version, ...patch }) =>
      patchBlockInTree(canvas, blockId, patch as Partial<Block>),
    errorPrefix: 'That edit did not save',
  });
}

export function useDeleteBlock({ tripId, variantId }: CanvasScope) {
  return useCanvasMutation<{ blockId: string }, void>({
    tripId,
    variantId,
    mutationFn: ({ blockId }) =>
      api<void>(`/v1/trips/${tripId}/blocks/${blockId}`, { method: 'DELETE' }),
    optimistic: (canvas, { blockId }) => removeBlockFromTree(canvas, blockId),
    errorPrefix: 'Could not delete that block',
  });
}

/** Blocks are soft-deleted, so undo is a real restore rather than a refetch. */
export function useRestoreBlock({ tripId, variantId }: CanvasScope) {
  return useCanvasMutation<{ blockId: string }, void>({
    tripId,
    variantId,
    mutationFn: ({ blockId }) =>
      api<void>(`/v1/trips/${tripId}/blocks/${blockId}/restore`, { method: 'POST' }),
    errorPrefix: 'Could not restore that block',
  });
}

export function useMoveBlock({ tripId, variantId }: CanvasScope) {
  return useCanvasMutation<{ blockId: string; toDayId: string; toIndex?: number }, void>({
    tripId,
    variantId,
    mutationFn: ({ blockId, toDayId, toIndex }) =>
      api<void>(`/v1/trips/${tripId}/blocks/${blockId}/move`, {
        method: 'POST',
        body: { toDayId, ...(toIndex === undefined ? {} : { toIndex }) },
      }),
    optimistic: (canvas, { blockId, toDayId, toIndex }) =>
      moveBlockInTree(canvas, blockId, toDayId, toIndex),
    errorPrefix: 'Could not move that block',
  });
}

export function useReorderBlocks({ tripId, variantId }: CanvasScope) {
  return useCanvasMutation<{ dayId: string; orderedBlockIds: string[] }, void>({
    tripId,
    variantId,
    mutationFn: ({ dayId, orderedBlockIds }) =>
      api<void>(`/v1/trips/${tripId}/days/${dayId}/blocks/reorder`, {
        method: 'POST',
        body: { orderedBlockIds },
      }),
    optimistic: (canvas, { dayId, orderedBlockIds }) => ({
      ...canvas,
      days: canvas.days.map((day) => {
        if (day.id !== dayId) return day;
        const position = new Map(orderedBlockIds.map((id, index) => [id, index]));
        return {
          ...day,
          blocks: [...day.blocks].sort(
            (a, b) => (position.get(a.id) ?? Infinity) - (position.get(b.id) ?? Infinity),
          ),
        };
      }),
    }),
    errorPrefix: 'Could not reorder',
  });
}

/* ── Days ─────────────────────────────────────────────────────────────────── */

export function useAddDay({ tripId, variantId }: CanvasScope) {
  return useCanvasMutation<{ title?: string; note?: string; date?: string }, Day>({
    tripId,
    variantId,
    mutationFn: (body) =>
      api<Day>(`/v1/trips/${tripId}/variants/${variantId}/days`, { method: 'POST', body }),
    errorPrefix: 'Could not add a day',
  });
}

export function useUpdateDay({ tripId, variantId }: CanvasScope) {
  return useCanvasMutation<
    { dayId: string; version: number } & Partial<Pick<Day, 'title' | 'note' | 'status'>>,
    Day
  >({
    tripId,
    variantId,
    mutationFn: ({ dayId, ...body }) =>
      api<Day>(`/v1/trips/${tripId}/days/${dayId}`, { method: 'PATCH', body }),
    optimistic: (canvas, { dayId, version: _version, ...patch }) =>
      patchDayInTree(canvas, dayId, patch as Partial<Day>),
    errorPrefix: 'That edit did not save',
  });
}

export function useDeleteDay({ tripId, variantId }: CanvasScope) {
  return useCanvasMutation<{ dayId: string }, void>({
    tripId,
    variantId,
    mutationFn: ({ dayId }) => api<void>(`/v1/trips/${tripId}/days/${dayId}`, { method: 'DELETE' }),
    // Removed locally; the server renumbers the rest, which arrives on settle.
    optimistic: (canvas, { dayId }) => ({
      ...canvas,
      days: canvas.days.filter((day) => day.id !== dayId),
    }),
    errorPrefix: 'Could not delete that day',
  });
}

/** FR-DAY-05: the copy lands immediately after its source, not at the end. */
export function useDuplicateDay({ tripId, variantId }: CanvasScope) {
  return useCanvasMutation<{ dayId: string }, Day>({
    tripId,
    variantId,
    mutationFn: ({ dayId }) =>
      api<Day>(`/v1/trips/${tripId}/days/${dayId}/duplicate`, { method: 'POST' }),
    errorPrefix: 'Could not duplicate that day',
  });
}

/** Exposed for the canvas store, which needs to read the tree outside a hook. */
export function readCanvas(
  queryClient: QueryClient,
  tripId: string,
  variantId?: string,
): Canvas | undefined {
  return queryClient.getQueryData<Canvas>(keys.canvas(tripId, variantId));
}
