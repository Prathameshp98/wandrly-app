import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Avatar, AvatarStack, initialsOf } from './Avatar';
import { Button } from './Button';
import { Chip, statusTone } from './Chip';
import { Input, Select, Textarea } from './Input';
import { ModalShell } from './ModalShell';
import { PanelShell } from './PanelShell';
import { I, ICON_NAMES } from './Icon';

describe('Button', () => {
  it('defaults to type=button, so it cannot submit a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('still submits when asked to', () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('is operable by keyboard', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Save</Button>);

    await user.tab();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('disables itself while loading and says so', () => {
    render(<Button loading>Saving</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('does not fire while loading', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>,
    );

    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Avatar', () => {
  it('takes up to two initials', () => {
    expect(initialsOf('Arjun Mehta')).toBe('AM');
    expect(initialsOf('Priya')).toBe('P');
    expect(initialsOf('Ana Sofia Reyes Cruz')).toBe('AS');
  });

  it('survives the messy whitespace in the seed data', () => {
    // "Arjun  Mehta".split(/\s+/) yields an empty segment whose [0] is
    // undefined, which would render "undefined" without the filter.
    expect(initialsOf('  Arjun   Mehta  ')).toBe('AM');
    expect(initialsOf('')).toBe('');
    expect(initialsOf('   ')).toBe('');
  });

  it('is one labelled image, not two loose letters', () => {
    render(<Avatar name="Arjun Mehta" />);
    expect(screen.getByRole('img', { name: 'Arjun Mehta' })).toBeInTheDocument();
  });

  it('announces presence rather than showing it in colour alone', () => {
    render(<Avatar name="Priya Nair" live />);
    expect(screen.getByRole('img', { name: 'Priya Nair (online)' })).toBeInTheDocument();
  });
});

describe('AvatarStack', () => {
  const crew = [
    { name: 'Arjun Mehta' },
    { name: 'Priya Nair' },
    { name: 'Devon Park' },
    { name: 'Mei Tan' },
    { name: 'Sam Okafor' },
  ];

  it('shows three and counts the rest', () => {
    render(<AvatarStack people={crew} />);
    const group = screen.getByRole('group', { name: '5 people' });
    expect(within(group).getAllByRole('img')).toHaveLength(3);
    expect(within(group).getByText('+2')).toBeInTheDocument();
  });

  it('omits the overflow pill when everyone fits', () => {
    render(<AvatarStack people={crew.slice(0, 2)} />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('gets the singular right', () => {
    render(<AvatarStack people={[{ name: 'Arjun Mehta' }]} />);
    expect(screen.getByRole('group', { name: '1 person' })).toBeInTheDocument();
  });
});

describe('Chip', () => {
  it('maps every trip status to a tone', () => {
    expect(statusTone('PLANNING')).toBe('planning');
    expect(statusTone('CONFIRMED')).toBe('confirmed');
    expect(statusTone('DRAFT')).toBe('draft');
    expect(statusTone('COMPLETED')).toBe('completed');
    expect(statusTone('ARCHIVED')).toBe('archived');
    expect(statusTone('SOMETHING_NEW')).toBe('neutral');
  });

  it('always carries its own text, never colour alone', () => {
    // FR-NFR-A11Y-06: status is never communicated by colour by itself.
    render(
      <Chip tone="confirmed" dot>
        Confirmed
      </Chip>,
    );
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });
});

describe('Input', () => {
  it('associates the label with the control', () => {
    render(<Input label="Destination" />);
    expect(screen.getByLabelText('Destination')).toBeInTheDocument();
  });

  it('announces an error and marks the field invalid', () => {
    render(<Input label="Destination" error="Required" />);

    const field = screen.getByLabelText('Destination');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
    expect(field).toHaveAccessibleDescription('Required');
  });

  it('describes the field with its hint', () => {
    render(<Input label="Title" hint="Up to 80 characters" />);
    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Up to 80 characters');
  });

  it('hides the hint once there is an error, so only one message is read', () => {
    render(<Input label="Title" hint="Up to 80 characters" error="Too long" />);
    expect(screen.queryByText('Up to 80 characters')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Too long');
  });

  it('counts characters against the limit', () => {
    render(<Input label="Title" value="Kyoto" maxLength={80} showCounter readOnly />);
    expect(screen.getByText('5 / 80')).toBeInTheDocument();
  });

  it('labels a textarea and a select the same way', () => {
    render(
      <>
        <Textarea label="Notes" />
        <Select label="Folder">
          <option value="a">Japan 2026</option>
        </Select>
      </>,
    );

    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    expect(screen.getByLabelText('Folder')).toBeInTheDocument();
  });
});

describe('ModalShell', () => {
  it('renders nothing when closed', () => {
    render(
      <ModalShell open={false} onClose={vi.fn()} title="New journey">
        body
      </ModalShell>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a labelled dialog', () => {
    render(
      <ModalShell open onClose={vi.fn()} title="New journey" lede="Where to next?">
        body
      </ModalShell>,
    );

    const dialog = screen.getByRole('dialog', { name: 'New journey' });
    expect(dialog).toHaveAccessibleDescription('Where to next?');
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ModalShell open onClose={onClose} title="New journey">
        body
      </ModalShell>,
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes from the close button', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ModalShell open onClose={onClose} title="New journey">
        body
      </ModalShell>,
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('announces a confirm dialog as a decision', () => {
    render(
      <ModalShell open onClose={vi.fn()} title="Delete this journey?" alert>
        body
      </ModalShell>,
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});

describe('PanelShell', () => {
  it('is a labelled dialog that closes on Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <PanelShell open onClose={onClose} title="Overview" sub="7 days · 41 blocks">
        body
      </PanelShell>,
    );

    expect(screen.getByRole('dialog', { name: 'Overview' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Icon set', () => {
  it('carries all 32 icons from the prototype', () => {
    expect(ICON_NAMES).toHaveLength(32);
  });

  it('is decorative by default and hidden from assistive tech', () => {
    const { container } = render(<I.Check />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('stroke-width', '1.6');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('becomes a labelled image when given a title', () => {
    render(<I.Check title="Confirmed" />);
    expect(screen.getByRole('img', { name: 'Confirmed' })).toBeInTheDocument();
  });
});
