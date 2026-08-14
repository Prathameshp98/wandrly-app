'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CompassMark, I } from '@/components/primitives';
import { Avatar } from '@/components/primitives';
import { useFolders } from '@/lib/api/hooks/useTrips';
import type { Folder } from '@/types/domain';
import styles from './Sidebar.module.css';

/**
 * The floating left rail.
 *
 * Every nav row and folder row is a real `<Link>` or `<button>`. The prototype
 * builds all of them as `<div onClick>`, which FR-NFR-A11Y-03 rules out — and
 * since these are the app's primary navigation, they are the worst place to
 * have unreachable controls.
 *
 * Folder counts come from the server. The prototype recomputed them in the
 * client and they drifted (§6.6).
 */

const NAV = [
  { href: '/', label: 'Dashboard', icon: I.Map },
  { href: '/shared', label: 'Shared with me', icon: I.Users },
  { href: '/invites', label: 'Invites', icon: I.Inbox },
  { href: '/archive', label: 'Archived', icon: I.Archive },
] as const;

const TONE_COLOR: Record<string, string> = {
  gold: 'var(--accent)',
  teal: 'var(--teal)',
  sienna: 'var(--sienna)',
  forest: 'var(--forest)',
  sand: 'var(--text-2)',
};

export interface SidebarProps {
  search: string;
  onSearch: (value: string) => void;
  onNewTrip: () => void;
  onNewFolder: () => void;
  onOpenPalette: () => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  /** The drop target currently under a drag, if any. */
  dropTarget?: string | null;
  user?: { name: string; plan: string };
  counts?: { shared?: number; invites?: number };
}

export function Sidebar({
  search,
  onSearch,
  onNewTrip,
  onNewFolder,
  onOpenPalette,
  onOpenSettings,
  onOpenNotifications,
  dropTarget = null,
  user,
  counts,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: folders } = useFolders();

  const countFor = (href: string) =>
    href === '/shared' ? counts?.shared : href === '/invites' ? counts?.invites : undefined;

  return (
    <aside className={styles.sidebar} aria-label="Primary">
      <div className={styles.head}>
        <span className={styles.markTile}>
          <CompassMark size={20} />
        </span>
        <span className={styles.wordmark}>Wandrly</span>
      </div>

      <button type="button" className={styles.cta} onClick={onNewTrip}>
        <I.Plus size={15} />
        New journey
      </button>

      <div className={styles.search}>
        <I.Search />
        <input
          type="search"
          placeholder="Search…"
          aria-label="Search your journeys"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
        {search ? (
          <button
            type="button"
            className={styles.kbd}
            onClick={() => onSearch('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        ) : (
          <button
            type="button"
            className={styles.kbd}
            onClick={onOpenPalette}
            aria-label="Open the command palette"
          >
            ⌘K
          </button>
        )}
      </div>

      <div className={styles.scroll}>
        <nav className={styles.nav} aria-label="Views">
          {NAV.map(({ href, label, icon: Icon }) => {
            const count = countFor(href);
            return (
              <Link
                key={href}
                href={href}
                className={styles.navItem}
                aria-current={pathname === href ? 'page' : undefined}
                // The archive is a drop target as well as a destination
                // (FR-TRIP-08). dnd-kit wires the actual drop; this only
                // reflects the state.
                data-dropping={href === '/archive' && dropTarget === 'archive' ? 'true' : undefined}
                data-drop-id={href === '/archive' ? 'archive' : undefined}
              >
                <Icon />
                <span className={styles.navLabel}>{label}</span>
                {count ? <span className={styles.count}>{count}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sectionLabel}>
          <span>Folders</span>
          <button
            type="button"
            className={styles.addFolder}
            onClick={onNewFolder}
            aria-label="New folder"
          >
            <I.Plus size={12} />
          </button>
        </div>

        {folders?.items?.length ? (
          folders.items.map((folder: Folder) => (
            <Link
              key={folder.id}
              href={`/f/${folder.id}`}
              className={styles.folder}
              aria-current={pathname === `/f/${folder.id}` ? 'page' : undefined}
              data-dropping={dropTarget === folder.id ? 'true' : undefined}
              data-drop-id={folder.id}
            >
              <span className={styles.folderEmoji} aria-hidden>
                {folder.emoji}
              </span>
              <span className={styles.navLabel}>{folder.name}</span>
              {folder.isPinned ? (
                <span
                  className={styles.folderDot}
                  style={{ background: TONE_COLOR[folder.tone] ?? 'var(--text-2)' }}
                  aria-hidden
                />
              ) : null}
              <span className={styles.folderCount}>{folder.tripCount ?? 0}</span>
            </Link>
          ))
        ) : (
          <p className={styles.empty}>No folders yet.</p>
        )}
      </div>

      <div className={styles.foot}>
        <div className={styles.user}>
          <Avatar name={user?.name ?? 'You'} tone="sienna" live />
          <span className={styles.userInfo}>
            <b>{user?.name ?? 'You'}</b>
            <span>{user?.plan ?? 'Free plan'}</span>
          </span>
          <button
            type="button"
            className={styles.footIcon}
            onClick={onOpenSettings}
            aria-label="Settings"
          >
            <I.Settings size={15} />
          </button>
          <button
            type="button"
            className={styles.footIcon}
            onClick={onOpenNotifications}
            aria-label="Notifications"
          >
            <I.Bell size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
