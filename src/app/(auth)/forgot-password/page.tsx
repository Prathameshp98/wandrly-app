'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase/browser';
import { isSupabaseConfigured } from '@/lib/env';
import { AuthCard, Alert } from '../AuthCard';
import styles from '../auth.module.css';

/**
 * FR-AUTH-05. Supabase owns the 60-minute single-use link; the frontend only
 * asks for it and confirms that it went.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const { error: resetError } = await getBrowserClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Password reset"
      title="Let's get you back in."
      lede="We'll email you a link to set a new password."
      footer={
        <Link href="/sign-in" className={styles.link}>
          Back to sign in
        </Link>
      }
    >
      {!isSupabaseConfigured ? (
        <div className={styles.notice}>
          Supabase is not configured, so password reset is unavailable.
        </div>
      ) : sent ? (
        <div className={styles.form}>
          <Alert kind="success">
            If an account exists for {email}, a reset link is on its way. The link works once and
            expires in an hour.
          </Alert>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error ? <Alert kind="error">{error}</Alert> : null}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
            />
          </div>

          <button type="submit" className={styles.primary} disabled={pending}>
            {pending ? 'Sending…' : 'Send the link'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
