'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useArchiveTrip, useMoveTripToFolder, useReorderTrips } from '@/lib/api/hooks/useTrips';
import { useFolders } from '@/lib/api/hooks/useTrips';
import { toast } from '@/stores/toasts';
import styles from './DragProvider.module.css';

/**
 * Drag-and-drop across the whole shell.
 *
 * The context has to live here because the draggables (trip cards) are in the
 * page while two of the three drop targets (sidebar folders, the Archive nav
 * item) are in the sidebar. One `DndContext` spanning both is the only way
 * they can see each other.
 *
 * FR-NFR-A11Y-02 requires a non-drag path for every one of these, and there
 * already is one: the card menu's "Move to folder…", "Pin" and "Archive" were
 * built first and call the same mutations. The `KeyboardSensor` here is a third
 * way in rather than the only one — dnd-kit's keyboard drag is genuinely
 * awkward, and it should not be the sole route to an action.
 *
 * Drop target ids are namespaced: `folder:<id>` and `archive`. A bare trip id
 * means a reorder.
 */

/**
 * Pointer first, geometry second.
 *
 * `closestCenter` alone compares the *dragged card's* centre against every
 * droppable, and a 368px card beside 28px sidebar rows resolves to whichever
 * row happens to be nearest that centre — dropping on "Work Trips" landed the
 * trip in "Wishlist". Asking what is under the pointer fixes the sidebar, and
 * falling back to `closestCenter` keeps grid reordering feeling right, since
 * there the card genuinely is the thing being positioned.
 */
const collisionDetection: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : closestCenter(args);
};

interface SortableRegistration {
  ids: string[];
  onReorder: (ids: string[]) => void;
}

interface DragContextValue {
  /** A page registers the list it wants reorderable. */
  registerSortable: (registration: SortableRegistration | null) => void;
  activeTripId: string | null;
}

const DragCtx = createContext<DragContextValue | null>(null);

export function useDragContext(): DragContextValue {
  const value = useContext(DragCtx);
  if (!value) throw new Error('useDragContext must be used inside DragProvider');
  return value;
}

export function DragProvider({ children }: { children: React.ReactNode }) {
  const { data: folders } = useFolders();
  const moveToFolder = useMoveTripToFolder();
  const archiveTrip = useArchiveTrip();
  const reorderTrips = useReorderTrips();

  const sortableRef = useRef<SortableRegistration | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  const registerSortable = useCallback((registration: SortableRegistration | null) => {
    sortableRef.current = registration;
  }, []);

  const sensors = useSensors(
    // A small distance so a click on the card still navigates rather than
    // starting a drag the user did not mean.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveTripId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTripId(null);

    if (!over) return;

    const tripId = String(active.id);
    const target = String(over.id);
    const title = (active.data.current?.title as string) ?? 'that journey';

    if (target === 'archive') {
      archiveTrip.mutate(
        { tripId, tripTitle: title },
        {
          onSuccess: () =>
            toast.undoable(`Archived “${title}”`, () =>
              moveToFolder.mutate({ tripId, folderId: active.data.current?.folderId ?? null }),
            ),
        },
      );
      return;
    }

    if (target.startsWith('folder:')) {
      const folderId = target.slice('folder:'.length);
      const previousFolderId = (active.data.current?.folderId as string | null) ?? null;
      if (folderId === previousFolderId) return;

      const folder = folders?.items?.find((candidate) => candidate.id === folderId);
      moveToFolder.mutate(
        { tripId, folderId, previousFolderId },
        {
          onSuccess: () =>
            toast.undoable(
              folder ? `Moved “${title}” → ${folder.emoji} ${folder.name}` : `Moved “${title}”`,
              () => moveToFolder.mutate({ tripId, folderId: previousFolderId }),
            ),
        },
      );
      return;
    }

    // Anything else is a reorder within the registered list.
    const registration = sortableRef.current;
    if (!registration || tripId === target) return;

    const from = registration.ids.indexOf(tripId);
    const to = registration.ids.indexOf(target);
    if (from === -1 || to === -1) return;

    const next = arrayMove(registration.ids, from, to);
    registration.onReorder(next);
    reorderTrips.mutate({ orderedTripIds: next });
  }

  const value = useMemo(
    () => ({ registerSortable, activeTripId }),
    [registerSortable, activeTripId],
  );

  return (
    <DragCtx.Provider value={value}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTripId(null)}
      >
        {children}

        {/* A minimal ghost. The card itself keeps its place at reduced opacity,
            which is how the prototype reads during a drag. */}
        <DragOverlay dropAnimation={null}>
          {activeTripId ? <div className={styles.ghost} /> : null}
        </DragOverlay>
      </DndContext>
    </DragCtx.Provider>
  );
}
