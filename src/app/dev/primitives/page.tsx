'use client';

import { useEffect, useState } from 'react';
import {
  Avatar,
  AvatarStack,
  Button,
  Chip,
  CompassMark,
  I,
  ICON_NAMES,
  InlineText,
  Input,
  ModalShell,
  PanelShell,
  Select,
  Textarea,
  ToastViewport,
  statusTone,
} from '@/components/primitives';
import { usePreferences } from '@/stores/preferences';
import { toast } from '@/stores/toasts';
import styles from '../tokens/tokens.module.css';
import local from './primitives.module.css';

/**
 * The primitives, on one screen.
 *
 * Same purpose as /dev/tokens: phase 0's gate is that these match the
 * prototype, and comparing is easier when the whole set is visible at once.
 * Everything here is interactive, so keyboard paths can be checked by using
 * them rather than by reading the code.
 */
export default function PrimitivesPage() {
  const hydrate = usePreferences((state) => state.hydrate);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [title, setTitle] = useState('Kyoto in Spring');
  const [note, setNote] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const crew = [
    { name: 'Arjun Mehta', tone: 'gold' as const, live: true },
    { name: 'Priya Nair', tone: 'teal' as const },
    { name: 'Devon Park', tone: 'sienna' as const },
    { name: 'Mei Tan', tone: 'forest' as const },
    { name: 'Sam Okafor', tone: 'gold' as const },
  ];

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Wandrly · design system</p>
            <h1 className={styles.title}>Primitives</h1>
            <p className={styles.lede}>
              Ported from the prototype with the four CSS override layers resolved. Every control
              here is a real focusable element — tab through it.
            </p>
          </div>
          <CompassMark size={44} />
        </header>

        <Section title="Button" note="5 variants × 3 sizes">
          <div className={local.row}>
            <Button variant="primary">Open canvas</Button>
            <Button variant="ghost">Preview</Button>
            <Button variant="subtle">Duplicate</Button>
            <Button variant="quiet">Cancel</Button>
            <Button variant="danger">Delete</Button>
          </div>
          <div className={local.row}>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="md">
              Medium
            </Button>
            <Button variant="primary" size="lg">
              Large
            </Button>
          </div>
          <div className={local.row}>
            <Button variant="primary" loading>
              Exporting
            </Button>
            <Button variant="ghost" disabled>
              Disabled
            </Button>
            <Button variant="ghost" iconOnly aria-label="More">
              <I.Dots />
            </Button>
            <Button variant="primary">
              <I.Plus size={14} />
              New journey
            </Button>
          </div>
        </Section>

        <Section title="Chip" note="status never rides on colour alone">
          <div className={local.row}>
            {['DRAFT', 'PLANNING', 'CONFIRMED', 'COMPLETED', 'ARCHIVED'].map((status) => (
              <Chip key={status} tone={statusTone(status)} dot>
                {status}
              </Chip>
            ))}
          </div>
          <div className={local.row}>
            <Chip plain tone="accent">
              ¥86,400
            </Chip>
            <Chip plain>3 photos</Chip>
            <Chip plain>booking</Chip>
            <Chip tone="confirmed" dot>
              ✓ Booked
            </Chip>
          </div>
        </Section>

        <Section title="Avatar" note="four tones · presence ring · overflow count">
          <div className={local.row}>
            <Avatar name="Arjun Mehta" tone="gold" />
            <Avatar name="Priya Nair" tone="teal" />
            <Avatar name="Devon Park" tone="sienna" />
            <Avatar name="Mei Tan" tone="forest" live />
            <Avatar name="Arjun Mehta" tone="gold" size="md" />
            <Avatar name="Arjun Mehta" tone="gold" size="lg" />
          </div>
          <div className={local.row}>
            <AvatarStack people={crew} />
            <span className={local.caption}>hover to fan</span>
          </div>
        </Section>

        <Section title="InlineText" note="blur or Enter commits · Escape reverts">
          <div className={local.stack}>
            <div className={local.editRow}>
              <span className={local.editLabel}>Title</span>
              <InlineText value={title} onChange={setTitle} label="Trip title" maxLength={80} />
            </div>
            <div className={local.editRow}>
              <span className={local.editLabel}>Note</span>
              <InlineText
                value={note}
                onChange={setNote}
                placeholder="Add a note"
                label="Day note"
                multiline
              />
            </div>
          </div>
        </Section>

        <Section title="Fields">
          <div className={local.formGrid}>
            <Input label="Destination" placeholder="Kyoto, Japan" />
            <Input label="Subtitle" optional hint="Up to 120 characters" />
            <Input label="Title" error="This one is required" defaultValue="" />
            <Select label="Folder" defaultValue="japan">
              <option value="">No folder</option>
              <option value="japan">🗾 Japan 2026</option>
              <option value="europe">🌅 Europe Summer &rsquo;25</option>
            </Select>
            <Textarea label="Notes" placeholder="Anything worth remembering" rows={3} />
          </div>
        </Section>

        <Section title="Overlays" note="focus trapped · Escape closes · focus restored">
          <div className={local.row}>
            <Button variant="ghost" onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
            <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
              Open confirm
            </Button>
            <Button variant="ghost" onClick={() => setPanelOpen(true)}>
              Open drawer
            </Button>
          </div>
        </Section>

        <Section title="Toast" note="3.5s standard · 10s with undo · errors persist">
          <div className={local.row}>
            <Button variant="ghost" onClick={() => toast.success('Saved “Kyoto in Spring”')}>
              Success
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                toast.undoable('Moved “Kyoto in Spring” → 🗾 Japan 2026', () =>
                  toast.success('Move undone'),
                )
              }
            >
              Undoable
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                toast.error('Could not save that change.', () => toast.success('Retried'))
              }
            >
              Error
            </Button>
          </div>
        </Section>

        <Section title="Icons" note={`${ICON_NAMES.length} · 1.6px stroke · currentColor`}>
          <div className={local.iconGrid}>
            {ICON_NAMES.map((name) => {
              const Glyph = I[name];
              return (
                <div key={name} className={local.iconTile}>
                  <Glyph size={20} />
                  <span className={local.iconName}>{name}</span>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Begin a journey"
        lede="Where to next?"
        footer={
          <>
            <Button variant="quiet" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Create
            </Button>
          </>
        }
      >
        <div className={local.stack}>
          <Input label="Destination" placeholder="Kyoto, Japan" />
          <Input label="Start date" type="date" />
        </div>
      </ModalShell>

      <ModalShell
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete “Kyoto in Spring”?"
        lede="You can undo this for 10 seconds."
        alert
        footer={
          <>
            <Button variant="quiet" onClick={() => setConfirmOpen(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmOpen(false);
                toast.undoable('Deleted “Kyoto in Spring”', () => toast.success('Restored'));
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className={local.caption}>
          The trip, its days and its blocks are removed. Expenses linked to it survive and unlink.
        </p>
      </ModalShell>

      <PanelShell
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Overview"
        sub="7 days · 41 blocks · 3 variants"
        footer={
          <Button variant="primary" block onClick={() => setPanelOpen(false)}>
            Open canvas
          </Button>
        }
      >
        <div className={local.stack}>
          <AvatarStack people={crew} />
          <p className={local.caption}>
            A drawer holds lists longer than the viewport, so its head and foot stay put while the
            body scrolls.
          </p>
        </div>
      </PanelShell>

      <ToastViewport />
    </main>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {note ? <span className={styles.sectionNote}>{note}</span> : null}
      </div>
      <div className={local.stack}>{children}</div>
    </section>
  );
}
