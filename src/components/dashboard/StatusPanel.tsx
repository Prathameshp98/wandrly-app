'use client';

import { Button, I } from '@/components/primitives';
import { userMessage } from '@/lib/api/errors';
import styles from './StatusPanel.module.css';

/**
 * The centred panel for "nothing here" and "that didn't load".
 *
 * Two rules it exists to hold:
 *
 * 1. **Never render `error.message` directly.** Internal messages carry request
 *    paths, host names and stack detail — `Could not reach the server
 *    (/v1/trips/dashboard)` tells the user nothing they can act on and leaks
 *    the API's shape into the UI. `userMessage()` is the only thing that turns
 *    a thrown value into something a person should read.
 * 2. **Centre it, and fill the column.** An error left-aligned at the top of an
 *    otherwise empty page reads like content that failed to finish rather than
 *    a state with a way out of it.
 *
 * Every "we couldn't load this" in the app routes through here, so the copy,
 * the placement and the retry affordance stay identical wherever it appears.
 */
export function StatusPanel({
  tone = 'empty',
  /**
   * `page` when this state replaces the whole view — it fills the column and
   * drops its border. `inline` when the section around it still has structure.
   * Errors default to `page`, since a failed load leaves nothing else on screen.
   */
  variant,
  title,
  body,
  error,
  action,
}: {
  variant?: 'page' | 'inline';
  tone?: 'empty' | 'error';
  title: string;
  /** Static copy. When `error` is given, its friendly message is used instead. */
  body?: string;
  error?: unknown;
  action?: { label: string; onClick: () => void };
}) {
  const message = error ? userMessage(error) : body;
  const resolvedVariant = variant ?? (tone === 'error' ? 'page' : 'inline');

  return (
    <div
      className={styles.panel}
      data-tone={tone}
      data-variant={resolvedVariant}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <span className={styles.icon} aria-hidden>
        {tone === 'error' ? <I.XBrand size={22} /> : <I.Compass size={24} />}
      </span>
      <h2 className={styles.title}>{title}</h2>
      {message ? <p className={styles.body}>{message}</p> : null}
      {action ? (
        <Button variant={tone === 'error' ? 'primary' : 'ghost'} onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
