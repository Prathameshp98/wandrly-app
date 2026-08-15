import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TripCard } from './TripCard';
import type { DashboardTrip, Folder } from '@/types/domain';

const trip = (patch: Partial<DashboardTrip> = {}) =>
  ({
    id: 'trip-1',
    title: 'Kyoto in Spring',
    subtitle: 'Cherry blossoms',
    destination: 'Kyoto, Japan',
    dateRangeLabel: '18 May – 24',
    status: 'CONFIRMED',
    dayCount: 7,
    blockCount: 41,
    variantCount: 3,
    readinessPct: 60,
    bookableBlockCount: 20,
    confirmedBlockCount: 12,
    isPinned: false,
    isArchived: false,
    folderId: 'folder-1',
    coverHue: 320,
    coverHue2: 20,
    ...patch,
  }) as unknown as DashboardTrip;

const folders = [
  { id: 'folder-1', name: 'Japan 2027', emoji: '🗾' },
  { id: 'folder-2', name: 'Wishlist', emoji: '🌙' },
] as unknown as Folder[];

function setup(patch: Partial<DashboardTrip> = {}) {
  const onAction = vi.fn();
  const onMoveToFolder = vi.fn();
  render(
    <TripCard
      trip={trip(patch)}
      folders={folders}
      onAction={onAction}
      onMoveToFolder={onMoveToFolder}
    />,
  );
  return { onAction, onMoveToFolder };
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Actions for/ }));
  return screen.getByRole('menu');
}

describe('TripCard', () => {
  it('renders server-computed figures rather than deriving them', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Kyoto in Spring' })).toBeInTheDocument();
    expect(screen.getByText('7d · 41 blocks')).toBeInTheDocument();
    expect(screen.getByText('3 variants')).toBeInTheDocument();
  });

  it('gets the variant singular right', () => {
    setup({ variantCount: 1 });
    expect(screen.getByText('1 variant')).toBeInTheDocument();
  });

  it('exposes readiness as a progressbar with the real value', () => {
    setup();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '60');
    expect(bar).toHaveAccessibleName('Kyoto in Spring is 60% ready');
  });

  it('says "no bookings yet" rather than 0% when nothing is bookable', () => {
    // FR-DASH-07: the two states look identical as a number and read very
    // differently as a sentence.
    setup({ bookableBlockCount: 0, readinessPct: 0 });
    expect(screen.getByRole('progressbar')).toHaveAccessibleName(
      'Kyoto in Spring: no bookings yet',
    );
  });

  it('shows ARCHIVED in place of the status once archived', () => {
    setup({ isArchived: true, status: 'CONFIRMED' });
    expect(screen.getByText('ARCHIVED')).toBeInTheDocument();
    expect(screen.queryByText('CONFIRMED')).not.toBeInTheDocument();
  });

  it('links the whole card to the canvas', () => {
    setup();
    const links = screen.getAllByRole('link', { name: /Kyoto in Spring/ });
    expect(links[0]).toHaveAttribute('href', '/t/trip-1');
  });

  it('opts the card link out of native dragging, which would steal the gesture', () => {
    // Native link dragging fires before dnd-kit's pointer sensor; without this
    // the card cannot be dragged at all.
    setup();
    const link = screen.getAllByRole('link', { name: /Kyoto in Spring/ })[0]!;
    expect(link).toHaveAttribute('draggable', 'false');
  });

  describe('the menu (FR-TRIP-05)', () => {
    it('opens from the keyboard alone', async () => {
      const user = userEvent.setup();
      setup();
      // Focused directly rather than tabbed to: the number of tab stops before
      // the trigger is a layout detail, and asserting on it would make this
      // test fail whenever a control is added to the card.
      screen.getByRole('button', { name: /Actions for/ }).focus();
      await user.keyboard('{Enter}');
      expect(await screen.findByRole('menu')).toBeInTheDocument();
    });

    it('carries every action the requirement lists', async () => {
      const user = userEvent.setup();
      setup();
      const menu = await openMenu(user);

      for (const label of [
        'Open canvas',
        'Quick preview',
        'Pin',
        'Duplicate',
        'Move to folder…',
        'Copy share link',
        'Export PDF',
        'Archive',
        'Delete',
      ]) {
        expect(within(menu).getByText(label), label).toBeInTheDocument();
      }
    });

    it('flips Pin and Archive to their inverse when already in that state', async () => {
      const user = userEvent.setup();
      setup({ isPinned: true, isArchived: true });
      const menu = await openMenu(user);

      expect(within(menu).getByText('Unpin')).toBeInTheDocument();
      expect(within(menu).getByText('Restore from archive')).toBeInTheDocument();
    });

    it('reports the action it was asked for', async () => {
      const user = userEvent.setup();
      const { onAction } = setup();
      await openMenu(user);

      await user.click(screen.getByText('Duplicate'));
      expect(onAction).toHaveBeenCalledWith('duplicate', expect.objectContaining({ id: 'trip-1' }));
    });

    it('offers every folder plus an unfile option, which is the keyboard path for a drag', async () => {
      // FR-NFR-A11Y-02: dropping on a folder must have a non-drag equivalent.
      const user = userEvent.setup();
      const { onMoveToFolder } = setup();
      await openMenu(user);

      // Driven entirely by keyboard, because that is the thing being asserted:
      // if a folder is only reachable by pointer, the drag has no equivalent.
      await user.hover(screen.getByText('Move to folder…'));
      await user.keyboard('{ArrowRight}');

      expect(await screen.findByRole('menuitem', { name: 'No folder' })).toBeInTheDocument();
      expect(await screen.findByRole('menuitem', { name: /Japan 2027/ })).toBeInTheDocument();
      expect(await screen.findByRole('menuitem', { name: /Wishlist/ })).toBeInTheDocument();

      // No folder → Japan 2027 → Wishlist, then commit.
      await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      expect(onMoveToFolder).toHaveBeenCalledWith(
        'folder-2',
        expect.objectContaining({ id: 'trip-1' }),
      );
    });
  });

  it('labels the pin toggle with its current state', () => {
    setup({ isPinned: true });
    const pin = screen.getByRole('button', { name: 'Unpin Kyoto in Spring' });
    expect(pin).toHaveAttribute('aria-pressed', 'true');
  });
});
