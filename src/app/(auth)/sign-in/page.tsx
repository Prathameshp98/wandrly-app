import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthCard } from '../AuthCard';
import { SignInForm } from '../SignInForm';
import styles from '../auth.module.css';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Where to next?"
      lede="Sign in to pick up your journeys."
      footer={
        <>
          New here?{' '}
          <Link href="/sign-up" className={styles.link}>
            Create an account
          </Link>
        </>
      }
    >
      {/* useSearchParams needs a suspense boundary to keep the page static. */}
      <Suspense fallback={null}>
        <SignInForm mode="sign-in" />
      </Suspense>
    </AuthCard>
  );
}
