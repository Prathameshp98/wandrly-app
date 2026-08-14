import Link from 'next/link';
import { CompassMark } from '@/components/primitives/CompassMark';
import styles from './auth.module.css';

/** The shell every auth screen sits in — mark, heading, body, footer link. */
export function AuthCard({
  eyebrow,
  title,
  lede,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className={styles.shell}>
      <div className={styles.card}>
        <Link href="/" className={styles.mark} aria-label="Wandrly home">
          <CompassMark size={26} />
          <span className={styles.wordmark}>Wandrly</span>
        </Link>

        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        {lede ? <p className={styles.lede}>{lede}</p> : null}

        {children}

        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </main>
  );
}

export function Alert({
  kind,
  children,
}: {
  kind: 'error' | 'success';
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${styles.alert} ${kind === 'error' ? styles.alertError : styles.alertSuccess}`}
      // Errors interrupt; a success confirmation can wait for a pause.
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}
