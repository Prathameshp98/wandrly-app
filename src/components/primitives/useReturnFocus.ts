'use client';

import { useEffect, useRef } from 'react';

/**
 * Returns focus to whatever was focused before an overlay opened.
 *
 * Radix restores focus to its own `Dialog.Trigger`, but our overlays are opened
 * from ordinary buttons holding React state — there is no Trigger for it to
 * return to, so focus lands on `<body>` and a keyboard user is dropped back at
 * the top of the page.
 *
 * FR-NFR-A11Y-07 requires focus restoration on close, so the element is captured
 * on open and refocused on close.
 */
export function useReturnFocus(open: boolean) {
  const previous = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previous.current = document.activeElement as HTMLElement | null;
      return;
    }

    const target = previous.current;
    previous.current = null;
    if (!target?.isConnected) return;

    // After the close animation, so focus does not land on an element Radix is
    // still in the middle of making inert.
    const frame = requestAnimationFrame(() => target.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open]);
}
