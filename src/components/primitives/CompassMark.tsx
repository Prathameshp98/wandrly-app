/**
 * The compass rose — Wandrly's brand mark.
 *
 * Ported vertex for vertex from `WANDRLY 2/components.jsx`. It draws in
 * `var(--accent)`, so it follows the theme and the user's accent choice without
 * any prop threading.
 */
export function CompassMark({
  size = 30,
  opacity = 1,
  title,
}: {
  size?: number;
  opacity?: number;
  /** Give this only when the mark stands alone as a link or button label. */
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      style={{ opacity }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g fill="none" stroke="var(--accent)" strokeWidth="0.8">
        <circle cx="40" cy="40" r="34" />
        <circle cx="40" cy="40" r="26" />
        <circle cx="40" cy="40" r="14" />
        <path d="M40 6 v68 M6 40 h68" strokeOpacity="0.45" />
        <path d="M16 16 L64 64 M64 16 L16 64" strokeOpacity="0.25" />
      </g>
      <g fill="var(--accent)">
        <path d="M40 8 L44 38 L40 40 L36 38 Z" />
        <path d="M40 72 L44 42 L40 40 L36 42 Z" opacity="0.55" />
        <path d="M8 40 L38 36 L40 40 L38 44 Z" opacity="0.55" />
        <path d="M72 40 L42 36 L40 40 L42 44 Z" opacity="0.55" />
      </g>
      <text
        x="40"
        y="13"
        textAnchor="middle"
        fontSize="6"
        fill="var(--accent)"
        fontFamily="var(--f-mono)"
        letterSpacing="0.2em"
      >
        N
      </text>
    </svg>
  );
}
