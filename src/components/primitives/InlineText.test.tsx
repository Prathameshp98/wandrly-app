import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineText } from './InlineText';

/**
 * The canvas's primary editing affordance, so its commit semantics are
 * load-bearing: FR-SEC-02 and FR-DAY-08 specify blur commits, Enter commits on
 * a single line, Escape reverts.
 */
describe('InlineText', () => {
  it('renders as a real button, not a div with a click handler', async () => {
    // FR-NFR-A11Y-03. This is the most-used interactive element on the canvas;
    // if it is not focusable, the canvas is not keyboard-operable.
    render(<InlineText value="Kyoto in Spring" label="Trip title" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('opens the editor on click and focuses it', async () => {
    const user = userEvent.setup();
    render(<InlineText value="Kyoto" label="Trip title" />);

    await user.click(screen.getByRole('button'));

    const field = screen.getByRole('textbox');
    expect(field).toHaveFocus();
    expect(field).toHaveValue('Kyoto');
  });

  it('opens from the keyboard alone', async () => {
    const user = userEvent.setup();
    render(<InlineText value="Kyoto" label="Trip title" />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('commits on Enter for a single-line field', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<InlineText value="Kyoto" onChange={onChange} label="Trip title" />);

    await user.click(screen.getByRole('button'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Osaka{Enter}');

    expect(onChange).toHaveBeenCalledWith('Osaka');
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('commits on blur', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<InlineText value="Kyoto" onChange={onChange} label="Trip title" />);

    await user.click(screen.getByRole('button'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Osaka');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith('Osaka');
  });

  it('reverts on Escape and does not then commit on the blur that follows', async () => {
    // The bug this guards: Escape restores the draft, the field closes, and the
    // resulting blur commits the value that was just discarded.
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<InlineText value="Kyoto" onChange={onChange} label="Trip title" />);

    await user.click(screen.getByRole('button'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Osaka{Escape}');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveTextContent('Kyoto');
  });

  it('does not fire onChange when the value is unchanged', async () => {
    // A stray click in and out should not spend a mutation and a version bump.
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<InlineText value="Kyoto" onChange={onChange} label="Trip title" />);

    await user.click(screen.getByRole('button'));
    await user.tab();

    expect(onChange).not.toHaveBeenCalled();
  });

  it('lets Enter insert a newline in a multiline field', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<InlineText value="" onChange={onChange} multiline label="Notes" />);

    await user.click(screen.getByRole('button'));
    await user.type(screen.getByRole('textbox'), 'one{Enter}two');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('one\ntwo');

    await user.tab();
    expect(onChange).toHaveBeenCalledWith('one\ntwo');
  });

  it('shows the placeholder when empty', () => {
    render(<InlineText value="" placeholder="Add a note" label="Day note" />);
    expect(screen.getByRole('button')).toHaveTextContent('Add a note');
  });

  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(<InlineText value="Kyoto" label="Trip title" disabled />);

    await user.click(screen.getByRole('button'));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('follows the value when the server reconciles it', async () => {
    // The optimistic update lands first and the server's value arrives after;
    // the readout has to follow rather than keep showing the local guess.
    const { rerender } = render(<InlineText value="Kyoto" label="Trip title" />);
    rerender(<InlineText value="Kyoto, Japan" label="Trip title" />);

    expect(screen.getByRole('button')).toHaveTextContent('Kyoto, Japan');
  });

  it('stops the click from reaching an enclosing block', async () => {
    // FR-BLK-05: editing a block's text must not also toggle its expansion.
    const onParentClick = vi.fn();
    const user = userEvent.setup();

    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={onParentClick}>
        <InlineText value="Kyoto" label="Trip title" />
      </div>,
    );

    await user.click(screen.getByRole('button'));
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
