'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useReturnFocus } from './useReturnFocus';
import { I } from './Icon';
import { Button } from './Button';
import styles from './Overlay.module.css';

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  lede?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  /** Set for a confirm dialog, so assistive tech announces it as a decision. */
  alert?: boolean;
}

/**
 * The modal chrome every dialog in the app sits in.
 *
 * Radix handles what is genuinely hard and easy to get subtly wrong — focus
 * trapping, focus restoration on close, `aria-modal`, inert background, Escape
 * and outside-click. FRONTEND_TECHNICAL_DESIGN §2 takes Radix for exactly this
 * handful of interactions and styles it with our own tokens.
 *
 * FR-NAV-04: modals are not routes and must not create history entries. Using
 * Radix state rather than a URL segment is what keeps that true.
 */
export function ModalShell({
  open,
  onClose,
  title,
  lede,
  children,
  footer,
  wide = false,
  alert = false,
}: ModalShellProps) {
  useReturnFocus(open);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.backdrop} />
        <Dialog.Content
          className={[styles.modal, wide && styles.wide].filter(Boolean).join(' ')}
          // Spread conditionally: passing `role={undefined}` does not fall back
          // to Radix's own `role="dialog"`, it overwrites it with nothing, and
          // the dialog stops being a dialog to assistive tech. Same for
          // aria-describedby, where `undefined` is Radix's documented way to
          // opt out of the description entirely.
          {...(alert ? { role: 'alertdialog' as const } : {})}
          {...(lede ? {} : { 'aria-describedby': undefined })}
        >
          <Dialog.Title className={styles.title}>{title}</Dialog.Title>
          {lede ? <Dialog.Description className={styles.lede}>{lede}</Dialog.Description> : null}

          <Dialog.Close asChild>
            <Button variant="quiet" size="sm" iconOnly className={styles.close} aria-label="Close">
              <I.XBrand size={14} />
            </Button>
          </Dialog.Close>

          <div className={styles.body}>{children}</div>

          {footer ? <div className={styles.actions}>{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
