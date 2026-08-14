import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthCard } from '../AuthCard';
import { SignInForm } from '../SignInForm';
import styles from '../auth.module.css';

export const metadata: Metadata = { title: 'Create an account' };

export default function SignUpPage() {
  return (
    <AuthCard
      eyebrow="Begin a journey"
      title="Plan it together."
      lede="The itinerary, the bookings, the costs, and the crew — in one place."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/sign-in" className={styles.link}>
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <SignInForm mode="sign-up" />
      </Suspense>
    </AuthCard>
  );
}
