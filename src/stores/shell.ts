'use client';

import { create } from 'zustand';

/** The overlays the app shell owns. Drawers and modals are never routes. */
export type ShellModal =
  'new-trip' | 'new-folder' | 'settings' | 'notifications' | 'activity' | null;

interface ShellState {
  /** Sidebar filter text. Matches title, destination and subtitle. */
  search: string;
  setSearch: (value: string) => void;

  openModal: ShellModal;
  setOpenModal: (modal: ShellModal) => void;

  /**
   * The folder id or `'archive'` currently under a drag, so the sidebar can
   * highlight it. Held here because the draggable and the drop target sit in
   * different subtrees.
   */
  dropTarget: string | null;
  setDropTarget: (target: string | null) => void;
}

/**
 * Shell UI state.
 *
 * FR-NAV-04 is why modals live here rather than in the URL: they must not
 * create history entries, so Escape and backdrop-click close them without
 * touching the back button. The one exception in the whole app is the expenses
 * ledger, which PRD §5.1 makes deep-linkable — and that is a route.
 */
export const useShellStore = create<ShellState>((set) => ({
  search: '',
  setSearch: (search) => set({ search }),

  openModal: null,
  setOpenModal: (openModal) => set({ openModal }),

  dropTarget: null,
  setDropTarget: (dropTarget) => set({ dropTarget }),
}));
