'use client';

import { useCallback } from 'react';
import {
  useArchiveTrip,
  useDeleteTrip,
  useDuplicateTrip,
  useFolders,
  useMoveTripToFolder,
  usePinTrip,
  useRestoreTrip,
  useUnarchiveTrip,
} from '@/lib/api/hooks/useTrips';
import { toast } from '@/stores/toasts';
import type { DashboardTrip } from '@/types/domain';
import type { TripAction } from './TripCard';

/**
 * The card menu's behaviour, in one place.
 *
 * The dashboard and the three filtered views all render the same card with the
 * same nine actions. Duplicating this per view is how they drift — one grows an
 * undo the others lack.
 *
 * Every destructive action gets a 10s undo (FR-UNDO-01) and every toast names
 * the object, per PRD §13: `Moved "Kyoto in Spring" → 🗾 Japan 2027`.
 */
export function useTripActions({
  onPeek,
  refetch,
}: {
  onPeek?: (trip: DashboardTrip) => void;
  refetch?: () => unknown;
} = {}) {
  const { data: folders } = useFolders();

  const pinTrip = usePinTrip();
  const archiveTrip = useArchiveTrip();
  const unarchiveTrip = useUnarchiveTrip();
  const deleteTrip = useDeleteTrip();
  const restoreTrip = useRestoreTrip();
  const duplicateTrip = useDuplicateTrip();
  const moveToFolder = useMoveTripToFolder();

  const handleMove = useCallback(
    (folderId: string | null, trip: DashboardTrip) => {
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
    },
    [folders, moveToFolder],
  );

  const handleAction = useCallback(
    (action: TripAction, trip: DashboardTrip) => {
      switch (action) {
        case 'peek':
          onPeek?.(trip);
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
          // The same menu item restores when the trip is already archived,
          // which is what FR-TRIP-08 asks for from the archive view.
          if (trip.isArchived) {
            unarchiveTrip.mutate(
              { tripId: trip.id },
              { onSuccess: () => toast.success(`Restored “${trip.title}”`) },
            );
          } else {
            archiveTrip.mutate(
              { tripId: trip.id, tripTitle: trip.title },
              {
                onSuccess: () =>
                  toast.undoable(`Archived “${trip.title}”`, () =>
                    unarchiveTrip.mutate({ tripId: trip.id }),
                  ),
              },
            );
          }
          break;

        case 'delete':
          deleteTrip.mutate(
            { tripId: trip.id, tripTitle: trip.title },
            {
              // Soft-deleted for 30 days, so undo is a real restore rather
              // than a refetch and a hope.
              onSuccess: () =>
                toast.undoable(`Deleted “${trip.title}”`, () =>
                  restoreTrip.mutate({ tripId: trip.id }, { onSuccess: () => refetch?.() }),
                ),
            },
          );
          break;

        case 'share':
        case 'export':
          // Both land in phase 6. Saying so beats a button that does nothing.
          toast.success('Sharing and export arrive in a later phase.');
          break;

        default:
          break;
      }
    },
    [onPeek, pinTrip, duplicateTrip, archiveTrip, unarchiveTrip, deleteTrip, restoreTrip, refetch],
  );

  return { handleAction, handleMove };
}
