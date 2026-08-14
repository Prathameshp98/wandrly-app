'use client';

import { create } from 'zustand';

/**
 * FR-UNDO-01 sets the durations, and they are not interchangeable: 3.5s for a
 * confirmation, 10s when something was deleted. Ten seconds is how long it
 * takes to notice a mistake and reach for the undo.
 */
export const TOAST_DURATION = {
  standard: 3_500,
  destructive: 10_000,
} as const;

export interface Toast {
  id: string;
  message: string;
  kind: 'success' | 'error';
  /** Renders the Undo pill. Running it dismisses the toast. */
  onUndo?: () => void;
  /** ms, or null to persist until dismissed. */
  duration: number | null;
}

export interface ToastInput {
  message: string;
  kind?: Toast['kind'];
  onUndo?: () => void;
  duration?: number | null;
}

interface ToastState {
  toasts: Toast[];
  show: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

let counter = 0;
/** Not crypto.randomUUID: this runs during render paths in tests too. */
const nextId = () => `toast-${++counter}`;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],

  show: ({ message, kind = 'success', onUndo, duration }) => {
    const id = nextId();
    const resolved =
      duration !== undefined
        ? duration
        : // A failed write must not vanish on its own — FR-NFR-REL-03 wants it
          // persistent and retryable. Everything else follows FR-UNDO-01.
          kind === 'error'
          ? null
          : onUndo
            ? TOAST_DURATION.destructive
            : TOAST_DURATION.standard;

    set((state) => ({
      toasts: [...state.toasts, { id, message, kind, onUndo, duration: resolved }],
    }));
    return id;
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ toasts: [] }),
}));

/** Convenience wrappers, so call sites read as intent rather than configuration. */
export const toast = {
  success: (message: string) => useToasts.getState().show({ message }),
  /** Destructive action with a 10s undo window. */
  undoable: (message: string, onUndo: () => void) =>
    useToasts.getState().show({ message, onUndo, duration: TOAST_DURATION.destructive }),
  /** Persistent until dismissed; `onUndo` doubles as Retry. */
  error: (message: string, onRetry?: () => void) =>
    useToasts.getState().show({ message, kind: 'error', onUndo: onRetry, duration: null }),
};
