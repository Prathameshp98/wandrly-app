/**
 * WCAG 2.2 contrast maths.
 *
 * FR-NFR-A11Y-05 requires 4.5:1 for body text and 3:1 for large text and focus
 * indicators, in *both* themes. The prototype's `--text-3` failed everywhere it
 * was used, so this exists to keep that from silently happening again — it
 * backs both the token gallery's live readout and the token contrast tests.
 */

export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;

export interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Accepts `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(...)` and `rgba(...)`. */
export function parseColor(input: string | undefined | null): Rgb | null {
  if (!input) return null;
  const value = input.trim();

  const hex = value.match(/^#([0-9a-f]{3,8})$/i)?.[1];
  if (hex) {
    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b, a] = hex.split('').map((c) => Number.parseInt(c + c, 16));
      return { r: r!, g: g!, b: b!, a: a === undefined ? 1 : a / 255 };
    }
    if (hex.length === 6 || hex.length === 8) {
      const int = Number.parseInt(hex.slice(0, 6), 16);
      const alpha = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255, a: alpha };
    }
    return null;
  }

  const fn = value.match(/^rgba?\(([^)]+)\)$/i)?.[1];
  if (fn) {
    const parts = fn
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map(Number);
    const [r, g, b, a] = parts;
    if (r === undefined || g === undefined || b === undefined) return null;
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b, a: a === undefined || Number.isNaN(a) ? 1 : a };
  }

  return null;
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Composite a translucent foreground over an opaque background. */
export function flatten(foreground: Rgb, background: Rgb): Rgb {
  if (foreground.a >= 1) return foreground;
  return {
    r: foreground.r * foreground.a + background.r * (1 - foreground.a),
    g: foreground.g * foreground.a + background.g * (1 - foreground.a),
    b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    a: 1,
  };
}

/** Returns null when either colour is unparseable, so callers can render a dash. */
export function contrastRatio(
  foreground: string | undefined | null,
  background: string | undefined | null,
): number | null {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg) return null;

  const composited = flatten(fg, bg);
  const [lighter, darker] = [relativeLuminance(composited), relativeLuminance(bg)].sort(
    (a, b) => b - a,
  );

  return (lighter! + 0.05) / (darker! + 0.05);
}

export function meetsAA(
  foreground: string,
  background: string,
  { large = false }: { large?: boolean } = {},
): boolean {
  const ratio = contrastRatio(foreground, background);
  return ratio !== null && ratio >= (large ? AA_LARGE : AA_NORMAL);
}

/** Read a custom property off <html>. Returns '' outside the browser. */
export function resolveToken(token: string, element?: Element): string {
  if (typeof window === 'undefined') return '';
  const target = element ?? document.documentElement;
  return getComputedStyle(target).getPropertyValue(token).trim();
}
