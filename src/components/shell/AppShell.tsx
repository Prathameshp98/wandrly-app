'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { ToastViewport } from '@/components/primitives';
import { NewTripModal } from '@/components/modals/NewTripModal';
import { NewFolderModal } from '@/components/modals/NewFolderModal';
import { CommandPalette } from './CommandPalette';
import { DragProvider } from './DragProvider';
import { useShellStore } from '@/stores/shell';
import styles from './Sidebar.module.css';

/**
 * The authenticated shell — sidebar, overlays, and the state they share.
 *
 * The canvas deliberately does not live inside this. `(app)` and `t/[tripId]`
 * are siblings rather than parent and child, because the canvas is a
 * full-screen takeover that must not inherit this chrome (§4).
 *
 * Search text and the open-modal flags are genuinely global and genuinely
 * ephemeral, which is exactly what §2 reserves Zustand for. Everything with a
 * server answer stays in Query.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { search, setSearch, openModal, setOpenModal } = useShellStore();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K from anywhere, including inside the canvas (FR-SRCH-02).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const closeModal = useCallback(() => setOpenModal(null), [setOpenModal]);

  return (
    <DragProvider>
      <div className={styles.shell}>
        <Sidebar
          search={search}
          onSearch={setSearch}
          onNewTrip={() => setOpenModal('new-trip')}
          onNewFolder={() => setOpenModal('new-folder')}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenSettings={() => setOpenModal('settings')}
          onOpenNotifications={() => setOpenModal('notifications')}
        />

        <main className={styles.main}>{children}</main>

        <NewTripModal
          open={openModal === 'new-trip'}
          onClose={closeModal}
          // FR-TRIP-02: creating a trip drops you straight into its canvas.
          onCreated={(tripId) => {
            closeModal();
            router.push(`/t/${tripId}`);
          }}
        />
        <NewFolderModal open={openModal === 'new-folder'} onClose={closeModal} />

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

        <ToastViewport />
      </div>
    </DragProvider>
  );
}
