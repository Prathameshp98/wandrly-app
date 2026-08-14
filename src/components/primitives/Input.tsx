'use client';

import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface FieldChrome {
  label: string;
  /** Adds "optional" beside the label rather than marking everything else required. */
  optional?: boolean;
  hint?: string;
  /** A server or client validation message. Sets aria-invalid and wires describedby. */
  error?: string;
  /** Shows "n / max" beneath. Pass alongside maxLength. */
  showCounter?: boolean;
  className?: string;
}

/** Wires label, hint, error and counter to one control, with ids that match. */
function useFieldIds(error?: string, hint?: string) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return { id, errorId, hintId, describedBy: describedBy || undefined };
}

function Chrome({
  label,
  optional,
  hint,
  error,
  id,
  hintId,
  errorId,
  counter,
  className,
  children,
}: FieldChrome & {
  id: string;
  hintId: string;
  errorId: string;
  counter?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {optional ? <span className={styles.optional}>optional</span> : null}
      </label>
      {children}
      {counter}
      {hint && !error ? (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        // role="alert" so a validation failure is announced when it appears,
        // not only when the field is next focused.
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function Counter({ value, maxLength }: { value: unknown; maxLength?: number }) {
  if (!maxLength) return null;
  const length = typeof value === 'string' ? value.length : 0;
  return (
    <span
      className={[styles.counter, length > maxLength && styles.counterOver]
        .filter(Boolean)
        .join(' ')}
    >
      {length} / {maxLength}
    </span>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldChrome;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, optional, hint, error, showCounter, className, ...rest },
  ref,
) {
  const { id, errorId, hintId, describedBy } = useFieldIds(error, hint);

  return (
    <Chrome
      label={label}
      optional={optional}
      hint={hint}
      error={error}
      id={id}
      hintId={hintId}
      errorId={errorId}
      className={className}
      counter={showCounter ? <Counter value={rest.value} maxLength={rest.maxLength} /> : null}
    >
      <input
        ref={ref}
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
    </Chrome>
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldChrome;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, optional, hint, error, showCounter, className, ...rest },
  ref,
) {
  const { id, errorId, hintId, describedBy } = useFieldIds(error, hint);

  return (
    <Chrome
      label={label}
      optional={optional}
      hint={hint}
      error={error}
      id={id}
      hintId={hintId}
      errorId={errorId}
      className={className}
      counter={showCounter ? <Counter value={rest.value} maxLength={rest.maxLength} /> : null}
    >
      <textarea
        ref={ref}
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
    </Chrome>
  );
});

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & FieldChrome;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, optional, hint, error, className, children, ...rest },
  ref,
) {
  const { id, errorId, hintId, describedBy } = useFieldIds(error, hint);

  return (
    <Chrome
      label={label}
      optional={optional}
      hint={hint}
      error={error}
      id={id}
      hintId={hintId}
      errorId={errorId}
      className={className}
    >
      <select
        ref={ref}
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {children}
      </select>
    </Chrome>
  );
});
