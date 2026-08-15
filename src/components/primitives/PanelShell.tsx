'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useReturnFocus } from './useReturnFocus';
import { I } from './Icon';
import { Button } from './Button';
import styles from './Overlay.module.css';

export interface PanelShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Mono sub-line — counts, coordinates, the variant name. */
  sub?: string;
  /** Decorative mark before the title — a block-type glyph, a trip cover. */
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

/**
 * The right-hand drawer: Trip Peek, the block picker, block detail, and the
 * four canvas panels.
 *
 * Same Radix dialog as ModalShell, so it inherits the focus trap and Escape
 * handling. The difference is only presentation — it slides from the right and
 * splits into a fixed head, a scrolling body and a fixed foot, because these
 * hold lists that are longer than the viewport.
 */
export function PanelShell({
  open,
  onClose,
  title,
  sub,
  icon,
  children,
  footer,
  wide = false,
}: PanelShellProps) {
  useReturnFocus(open);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.backdrop} />
        <Dialog.Content
          className={[styles.panel, wide && styles.panelWide].filter(Boolean).join(' ')}
          // See ModalShell: an explicit `undefined` overwrites Radix's own
          // attribute rather than deferring to it.
          {...(sub ? {} : { 'aria-describedby': undefined })}
        >
          <header className={styles.panelHead}>
            {icon}
            <div className={styles.panelHeadText}>
              <Dialog.Title className={styles.panelTitle}>{title}</Dialog.Title>
              {sub ? (
                <Dialog.Description className={styles.panelSub}>{sub}</Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <Button variant="quiet" size="sm" iconOnly aria-label="Close">
                <I.XBrand size={14} />
              </Button>
            </Dialog.Close>
          </header>

          <div className={styles.panelBody}>{children}</div>

          {footer ? <div className={styles.panelFoot}>{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
