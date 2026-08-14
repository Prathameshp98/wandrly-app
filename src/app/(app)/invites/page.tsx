'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/api/keys';
import { Button, Chip, I } from '@/components/primitives';
import type { Invites } from '@/types/domain';
import styles from '@/components/dashboard/dashboard.module.css';
import local from './invites.module.css';

/**
 * FR-COLLAB-10, as far as the API allows.
 *
 * The list is read-only, and that is a contract limitation rather than a
 * shortcut. `POST /v1/invites/accept` and `/decline` both take a `token`, and
 * `GET /v1/invites` cannot return one — the server stores only `sha256(token)`,
 * so the plaintext exists nowhere after the email is sent. That is a good
 * security property and it means acceptance genuinely has to happen through
 * the emailed link, which lands on `/invite/[token]`.
 *
 * So there is no Accept button here. A button that cannot work is worse than
 * an explanation of where to find the one that does.
 */
export default function InvitesPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: keys.notifications,
    queryFn: () => api<Invites>('/v1/invites'),
  });

  const invites = data?.items ?? [];
  const pending = invites.filter((invite) => invite.status === 'PENDING');

  return (
    <div className={styles.page}>
      <header className={styles.greet}>
        <div>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden>
              ◆
            </span>
            Pending invites
          </p>
          <h1 className={styles.greetTitle}>Step aboard.</h1>
        </div>
      </header>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className={`${styles.skeleton} ${styles.skeletonCard}`} />
          ))}
        </div>
      ) : isError ? (
        <div>
          <p className={styles.greetTag}>{(error as Error)?.message}</p>
          <p style={{ marginTop: 16 }}>
            <Button variant="primary" onClick={() => void refetch()}>
              Try again
            </Button>
          </p>
        </div>
      ) : pending.length === 0 ? (
        <div className={styles.emptyState}>
          <I.Inbox size={26} />
          <h2 className={styles.emptyTitle}>All clear</h2>
          <p className={styles.emptyBody}>
            No invitations waiting. When someone invites you to a journey, it shows up here and in
            your inbox.
          </p>
        </div>
      ) : (
        <ul className={local.list}>
          {pending.map((invite) => (
            <li key={invite.id} className={local.card}>
              <div className={local.body}>
                <p className={local.meta}>
                  Invited by {invite.inviterName} · {invite.role.toLowerCase()}
                </p>
                <h2 className={local.title}>{invite.tripTitle}</h2>
                {invite.personalNote ? <p className={local.note}>“{invite.personalNote}”</p> : null}
                <p className={local.expiry}>
                  Expires{' '}
                  {new Date(invite.expiresAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className={local.side}>
                <Chip tone="planning" dot plain>
                  {invite.status}
                </Chip>
                <p className={local.hint}>
                  Open the link in your email to join. The invitation link is the only way in — we
                  never store a copy of it.
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
