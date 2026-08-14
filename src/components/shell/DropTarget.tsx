'use client';

import { useDroppable } from '@dnd-kit/core';

/**
 * Makes a sidebar row a drop target without changing what it is.
 *
 * The folder rows and the Archive item are links first — they navigate, and
 * that must keep working. This wraps rather than replaces them, so the drop
 * behaviour is additive and the keyboard path (the card menu) is untouched.
 */
export function DropTarget({
  id,
  children,
}: {
  id: string;
  children: (props: {
    ref: (element: HTMLElement | null) => void;
    isOver: boolean;
  }) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <>{children({ ref: setNodeRef, isOver })}</>;
}
