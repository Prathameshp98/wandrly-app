'use client';

import { useEffect } from 'react';
import { I } from './Icon';
import { useToasts, type Toast as ToastModel } from '@/stores/toasts';
import styles from './Toast.module.css';

function ToastItem({ toast }: { toast: ToastModel }) {
  const dismiss = useToasts((state) => state.dismiss);

  useEffect(() => {
    if (toast.duration === null) return;
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  const isError = toast.kind === 'error';

  return (
    <div className={[styles.toast, isError && styles.error].filter(Boolean).join(' ')}>
      {isError ? (
        <I.Help size={14} className={styles.icon} />
      ) : (
        <I.Check size={14} className={styles.icon} />
      )}
      <span className={styles.message}>{toast.message}</span>
      {toast.onUndo ? (
        <button
          type="button"
          className={styles.undo}
          onClick={() => {
            toast.onUndo?.();
            dismiss(toast.id);
          }}
        >
          {isError ? 'Retry' : 'Undo'}
        </button>
      ) : null}
    </div>
  );
}

/**
 * The toast viewport. Mounted once, near the root.
 *
 * `role="status"` with `aria-live="polite"` announces each toast without
 * interrupting — which is right even for errors here, because the failed action
 * has already been rolled back visually and the toast is the explanation rather
 * than the emergency. `assertive` would talk over whatever the user is doing.
 */
export function ToastViewport() {
  const toasts = useToasts((state) => state.toasts);

  return (
    <div className={styles.viewport} role="status" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
