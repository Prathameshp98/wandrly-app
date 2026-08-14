'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/browser';
import { isSupabaseConfigured } from '@/lib/env';
import { Alert } from './AuthCard';
import { GoogleIcon, AppleIcon } from './OAuthIcons';
import styles from './auth.module.css';

type Mode = 'sign-in' | 'sign-up';

/**
 * Sign in and sign up, which differ by two strings and one Supabase call.
 *
 * All four methods FR-AUTH-01..03 asks for: email and password, magic link,
 * Google, and Apple. Auth runs entirely against Supabase from the client — the
 * backend has no auth endpoints at all and only verifies the resulting JWT
 * (TECHNICAL_DESIGN §20).
 */
export function SignInForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<null | 'password' | 'magic' | 'google' | 'apple'>(null);
  const [error, setError] = useState<string | null>(searchParams.get('error'));
  const [notice, setNotice] = useState<string | null>(null);

  // Where the middleware wanted them to land. Already validated same-origin
  // there and again in the callback route.
  const next = searchParams.get('next') ?? '/';

  const isSignUp = mode === 'sign-up';
  const busy = pending !== null;

  function redirectTo(path: string): string {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(path)}`;
  }

  async function handlePassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending('password');

    try {
      const supabase = getBrowserClient();

      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo(next) },
        });
        if (signUpError) throw signUpError;

        // With email confirmation on, there is no session yet and the user has
        // to go and click the link — saying so beats a silent no-op.
        if (!data.session) {
          setNotice(`Check ${email} for a link to confirm your account.`);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }

      router.push(next);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setPending(null);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError('Enter your email first, and we will send you a link.');
      return;
    }
    setError(null);
    setNotice(null);
    setPending('magic');

    try {
      const { error: magicError } = await getBrowserClient().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo(next) },
      });
      if (magicError) throw magicError;
      setNotice(`Check ${email} for your sign-in link.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setPending(null);
    }
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setError(null);
    setPending(provider);

    try {
      const { error: oauthError } = await getBrowserClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectTo(next) },
      });
      if (oauthError) throw oauthError;
      // On success the browser navigates away, so nothing follows.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
      setPending(null);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className={styles.notice}>
        Supabase is not configured, so sign-in is unavailable. Set{' '}
        <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{' '}
        <code>.env.local</code> — or set <code>NEXT_PUBLIC_DEV_ACCESS_TOKEN</code> to work against a
        local backend without Supabase.
      </div>
    );
  }

  return (
    <>
      <form className={styles.form} onSubmit={handlePassword} noValidate>
        {error ? <Alert kind="error">{error}</Alert> : null}
        {notice ? <Alert kind="success">{notice}</Alert> : null}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className={styles.input}
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className={styles.input}
            type="password"
            name="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            minLength={8}
            placeholder={isSignUp ? 'At least 8 characters' : '••••••••'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
          />
          {!isSignUp ? (
            <Link href="/forgot-password" className={styles.subtleLink}>
              Forgot your password?
            </Link>
          ) : null}
        </div>

        <button type="submit" className={styles.primary} disabled={busy}>
          {pending === 'password'
            ? isSignUp
              ? 'Creating your account…'
              : 'Signing you in…'
            : isSignUp
              ? 'Begin a Journey'
              : 'Sign in'}
        </button>

        <button
          type="button"
          className={styles.oauthButton}
          onClick={handleMagicLink}
          disabled={busy}
        >
          {pending === 'magic' ? 'Sending your link…' : 'Email me a link instead'}
        </button>
      </form>

      <div className={styles.divider}>or</div>

      <div className={styles.oauth}>
        <button
          type="button"
          className={styles.oauthButton}
          onClick={() => handleOAuth('google')}
          disabled={busy}
        >
          <GoogleIcon />
          {pending === 'google' ? 'Redirecting…' : 'Continue with Google'}
        </button>
        <button
          type="button"
          className={styles.oauthButton}
          onClick={() => handleOAuth('apple')}
          disabled={busy}
        >
          <AppleIcon />
          {pending === 'apple' ? 'Redirecting…' : 'Continue with Apple'}
        </button>
      </div>
    </>
  );
}
