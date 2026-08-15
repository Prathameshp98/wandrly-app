import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateChangeModal } from './DateChangeModal';

/**
 * FR-TRIP-14. The options are derived from the numbers the server sends, so
 * the wording has to follow the actual change — and an option that cannot
 * apply must never appear.
 */
describe('DateChangeModal', () => {
  const open = (detail: { currentDayCount: number; requestedDayCount: number }) => {
    const onConfirm = vi.fn();
    render(<DateChangeModal open detail={detail} onClose={vi.fn()} onConfirm={onConfirm} />);
    return onConfirm;
  };

  it('offers TRUNCATE when the trip shrinks, and names how many days go', () => {
    open({ currentDayCount: 7, requestedDayCount: 4 });
    expect(screen.getByRole('radio', { name: /Drop the last 3 days/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Add .* empty day/ })).not.toBeInTheDocument();
  });

  it('offers EXTEND when the trip grows, and never TRUNCATE', () => {
    open({ currentDayCount: 3, requestedDayCount: 6 });
    expect(screen.getByRole('radio', { name: /Add 3 empty days/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Drop the last/ })).not.toBeInTheDocument();
  });

  it('gets the singular right', () => {
    // Asserted on the label text, not the accessible name: the name runs the
    // label and its explanatory body together, so "day" is never at the end.
    open({ currentDayCount: 5, requestedDayCount: 4 });
    expect(screen.getByText('Drop the last 1 day')).toBeInTheDocument();
  });

  it('gets the plural right', () => {
    open({ currentDayCount: 7, requestedDayCount: 4 });
    expect(screen.getByText('Drop the last 3 days')).toBeInTheDocument();
  });

  it('always offers SHIFT and KEEP_DAYS, whichever way the change goes', () => {
    open({ currentDayCount: 7, requestedDayCount: 4 });
    expect(screen.getByRole('radio', { name: /Move the days with the dates/ })).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Leave the days exactly as they are/ }),
    ).toBeInTheDocument();
  });

  it('states both counts, so the consequence is legible before choosing', () => {
    open({ currentDayCount: 7, requestedDayCount: 4 });
    expect(screen.getByRole('alertdialog')).toHaveTextContent('has 7 days');
    expect(screen.getByRole('alertdialog')).toHaveTextContent('cover 4');
  });

  it('is an alertdialog — it is a decision, not an announcement', () => {
    open({ currentDayCount: 7, requestedDayCount: 4 });
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('defaults to SHIFT, the only option that loses nothing', () => {
    const onConfirm = open({ currentDayCount: 7, requestedDayCount: 4 });
    expect(screen.getByRole('radio', { name: /Move the days/ })).toBeChecked();
    screen.getByRole('button', { name: 'Apply' }).click();
    expect(onConfirm).toHaveBeenCalledWith('SHIFT');
  });

  it('confirms with the chosen strategy', async () => {
    const user = userEvent.setup();
    const onConfirm = open({ currentDayCount: 7, requestedDayCount: 4 });

    await user.click(screen.getByRole('radio', { name: /Drop the last 3 days/ }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onConfirm).toHaveBeenCalledWith('TRUNCATE');
  });

  it('lets the user back out without applying anything', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <DateChangeModal
        open
        detail={{ currentDayCount: 7, requestedDayCount: 4 }}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('survives a detail payload the server did not fill in', () => {
    // `details` is typed as unknown in the envelope; a missing count must not
    // render "NaN days".
    render(<DateChangeModal open detail={{}} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('alertdialog')).not.toHaveTextContent('NaN');
  });
});
