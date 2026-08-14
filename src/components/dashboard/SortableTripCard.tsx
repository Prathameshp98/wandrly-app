'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TripCard, type TripCardProps } from './TripCard';

/**
 * A trip card that can be dragged.
 *
 * The listeners go on the card as a whole rather than on a dedicated handle,
 * which is what the prototype does. The pointer sensor's 6px activation
 * distance is what keeps a plain click on the card navigating instead of
 * starting a drag.
 */
export function SortableTripCard(props: TripCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.trip.id,
    // Read back in the provider's onDragEnd, so an undo can put the trip back
    // in the folder it came from.
    data: { title: props.trip.title, folderId: props.trip.folderId ?? null },
  });

  return (
    <div
      ref={setNodeRef}
      // touch-action none is required for the pointer sensor on touch: without
      // it the browser scrolls instead of starting the drag.
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: 'none' }}
      {...attributes}
      {...listeners}
    >
      <TripCard {...props} dragging={isDragging} />
    </div>
  );
}
