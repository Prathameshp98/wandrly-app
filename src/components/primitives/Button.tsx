import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import Link from 'next/link';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'ghost' | 'subtle' | 'quiet' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square hit area for a control whose only content is an icon. */
  iconOnly?: boolean;
  /** Full width — modal footers and the auth forms. */
  block?: boolean;
  /** Disables the button and shows a spinner alongside the label. */
  loading?: boolean;
}

/**
 * A real `<button>`, always.
 *
 * The prototype builds several of these as `<div onClick>`, which FR-NFR-A11Y-03
 * rules out — retrofitting focus and keyboard handling later costs far more than
 * starting here. `type` defaults to `button` because the HTML default is
 * `submit`, and an unlabelled button inside a form submitting it by accident is
 * one of the easier bugs to ship.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'ghost',
    size = 'md',
    iconOnly = false,
    block = false,
    loading = false,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = [
    styles.base,
    styles[variant],
    styles[size],
    iconOnly && styles.iconOnly,
    block && styles.block,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      // Tells assistive tech the control is working rather than broken, which
      // `disabled` alone does not.
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : null}
      {children}
    </button>
  );
});

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  block?: boolean;
}

/**
 * A link that looks like a button.
 *
 * Deliberately not an `asChild` prop on Button: something that navigates should
 * be an `<a>`, so it gets the browser's own affordances — middle-click, open in
 * a new tab, the status bar URL — and announces as a link rather than a button.
 * Making one element pretend to be the other is how those get lost.
 */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  {
    href,
    variant = 'ghost',
    size = 'md',
    iconOnly = false,
    block = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const classes = [
    styles.base,
    styles[variant],
    styles[size],
    iconOnly && styles.iconOnly,
    block && styles.block,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link ref={ref} href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
});
