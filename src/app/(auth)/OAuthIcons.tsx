/**
 * Provider marks for the OAuth buttons.
 *
 * These are the only icons in the app not drawn in the prototype's house style
 * (single stroke, 1.6px, currentColor). Google's and Apple's brand guidelines
 * both require their marks be reproduced as issued, so they keep their own
 * colours and fills.
 */

export function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function AppleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M14.02 9.53c-.02-2.03 1.66-3 1.73-3.05-.94-1.38-2.4-1.57-2.93-1.59-1.25-.13-2.44.73-3.07.73-.63 0-1.61-.71-2.65-.69-1.36.02-2.62.79-3.32 2.01-1.41 2.46-.36 6.1 1.02 8.09.67.98 1.47 2.07 2.52 2.03 1.01-.04 1.4-.65 2.62-.65 1.22 0 1.57.65 2.64.63 1.09-.02 1.78-.99 2.45-1.97.77-1.13 1.09-2.23 1.11-2.29-.02-.01-2.13-.82-2.15-3.25Zm-2.02-5.97c.55-.68.93-1.6.83-2.53-.8.03-1.79.54-2.36 1.2-.51.59-.96 1.54-.84 2.44.9.07 1.81-.45 2.37-1.11Z"
      />
    </svg>
  );
}
