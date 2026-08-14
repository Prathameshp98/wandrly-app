import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
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
