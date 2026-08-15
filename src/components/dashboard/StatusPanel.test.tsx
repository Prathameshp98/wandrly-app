import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusPanel } from './StatusPanel';
import { ApiError, NetworkError } from '@/lib/api/errors';

/**
 * The rule this component exists to hold: nothing internal reaches the screen.
 *
 * The dashboard shipped once rendering `error.message` directly, which put
 * `Could not reach the server (/v1/trips/dashboard)` in front of the user —
 * a request path they cannot act on and that leaks the API's shape. Every
 * "we couldn't load this" goes through here now, so these assertions cover
 * all of them at once.
 */
describe('StatusPanel', () => {
  it('never shows the request path from a NetworkError', () => {
    render(
      <StatusPanel
        tone="error"
        title="We couldn’t load your journeys."
        error={new NetworkError('Could not reach the server (/v1/trips/dashboard)')}
      />,
    );

    const panel = screen.getByRole('alert');
    expect(panel).not.toHaveTextContent('/v1/trips/dashboard');
    expect(panel).not.toHaveTextContent('/v1/');
    expect(panel).toHaveTextContent('We could not reach the server');
  });

  it('shows the server message when it is written for a person', () => {
    // API_CONTRACT: `message` is user-safe and in the product's voice.
    render(
      <StatusPanel
        tone="error"
        title="Nope"
        error={new ApiError('NOT_FOUND', 404, 'Trip was not found')}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Trip was not found');
  });

  it('substitutes friendly copy for the generic production 5xx string', () => {
    render(
      <StatusPanel
        tone="error"
        title="Nope"
        error={new ApiError('INTERNAL', 500, 'Internal Server Error')}
      />,
    );
    const panel = screen.getByRole('alert');
    expect(panel).not.toHaveTextContent('Internal Server Error');
    expect(panel).toHaveTextContent('Something went wrong on our end.');
  });

  it('does not leak a thrown non-Error either', () => {
    render(<StatusPanel tone="error" title="Nope" error={{ stack: 'at Object.<anonymous>' }} />);
    const panel = screen.getByRole('alert');
    expect(panel).not.toHaveTextContent('anonymous');
    expect(panel).toHaveTextContent('Something went wrong.');
  });

  it('announces an error, so it is not silent for a screen reader', () => {
    render(<StatusPanel tone="error" title="We couldn’t load your journeys." />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not announce an empty state — nothing has gone wrong', () => {
    render(<StatusPanel title="No journeys here yet" body="Begin one." />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('fills the page for an error and stays inline for an empty state', () => {
    // A failed load leaves nothing else on screen, so it takes the column.
    const { rerender, container } = render(<StatusPanel tone="error" title="Failed" />);
    expect(container.firstChild).toHaveAttribute('data-variant', 'page');

    rerender(<StatusPanel title="Empty" />);
    expect(container.firstChild).toHaveAttribute('data-variant', 'inline');
  });

  it('offers the retry and runs it', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<StatusPanel tone="error" title="Failed" action={{ label: 'Try again', onClick }} />);

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('prefers the error message over static body copy when both are given', () => {
    render(
      <StatusPanel
        tone="error"
        title="Failed"
        body="static copy"
        error={new ApiError('FORBIDDEN', 403, 'You do not have permission')}
      />,
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('static copy');
  });
});
