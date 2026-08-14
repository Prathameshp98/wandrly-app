'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/browser';
import { isSupabaseConfigured } from '@/lib/env';
import { AuthCard, Alert } from '../AuthCard';
import styles from '../auth.module.css';

/**
 * Where the reset link lands, via the auth callback. By this point the code has
 * already been exchanged for a session, so setting the new password is a plain
 * authenticated update.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirmation.length > 0 && password !== confirmation;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (password !== confirmation) {
      setError('Those two passwords do not match.');
      return;
    }

    setError(null);
    setPending(true);

    try {
      const { error: updateError } = await getBrowserClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      router.push('/');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
      setPending(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <AuthCard eyebrow="Password reset" title="Unavailable.">
        <div className={styles.notice}>Supabase is not configured.</div>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="Password reset" title="Choose a new password." lede="Then you're back in.">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {error ? <Alert kind="error">{error}</Alert> : null}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            New password
          </label>
          <input
            id="password"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirmation">
            Confirm password
          </label>
          <input
            id="confirmation"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={mismatch}
            aria-describedby={mismatch ? 'confirmation-error' : undefined}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={pending}
          />
          {mismatch ? (
            <span id="confirmation-error" className={styles.fieldError}>
              Those two passwords do not match.
            </span>
          ) : null}
        </div>

        <button type="submit" className={styles.primary} disabled={pending || mismatch}>
          {pending ? 'Saving…' : 'Save and continue'}
        </button>
      </form>
    </AuthCard>
  );
}
