/**
 * Appearance preferences (FR-SET-03).
 *
 * There is no backend route for these — `user_preferences` exists in the schema
 * but is not exposed (API_CONTRACT §9) — so they are device-local in
 * localStorage. Moving them server-side later means changing the two functions
 * at the bottom of this file and nothing else.
 *
 * Defaults are the prototype's own `TWEAK_DEFAULTS`, which is the design as
 * rendered and as captured in every screenshot.
 */

export const THEMES = ['dark', 'light'] as const;
export const TEXTURES = ['clean', 'carto', 'paper', 'ticket'] as const;
export const DENSITIES = ['compact', 'standard', 'expressive'] as const;
export const TYPE_EMPHASIS = ['utility', 'editorial'] as const;
export const BLOCK_LAYOUTS = ['rows', 'cards'] as const;

export type Theme = (typeof THEMES)[number];
export type Texture = (typeof TEXTURES)[number];
export type Density = (typeof DENSITIES)[number];
export type TypeEmphasis = (typeof TYPE_EMPHASIS)[number];
export type BlockLayout = (typeof BLOCK_LAYOUTS)[number];

/**
 * The four accents PRD §12 offers, each with its per-theme value.
 *
 * The accent is written as an inline custom property on <html>, which outranks
 * the `:root[data-theme='light']` block — so an accent that did not vary by
 * theme would drag the dark palette into the light one. PRD §12.1 is explicit
 * that "light theme shifts default to #D0703F", and the same reasoning applies
 * to the other three: each needs a value that holds up on paper.
 *
 * The light values for sienna and teal are the ones PRD §12 already specifies
 * for those palette colours in light mode. Periwinkle is darkened to match,
 * since the dark-mode value is far too pale on white.
 */
export const ACCENTS = [
  { id: 'gold', label: 'Gold', dark: '#F0A05A', light: '#D0703F' },
  { id: 'sienna', label: 'Sienna', dark: '#E5654A', light: '#C24E33' },
  { id: 'teal', label: 'Teal', dark: '#66C6B5', light: '#2F8A78' },
  { id: 'periwinkle', label: 'Periwinkle', dark: '#8FA9FF', light: '#5A6FC9' },
] as const;

export type AccentId = (typeof ACCENTS)[number]['id'];

export interface Preferences {
  theme: Theme;
  accent: AccentId;
  texture: Texture;
  density: Density;
  typeEmphasis: TypeEmphasis;
  blockLayout: BlockLayout;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  accent: 'gold',
  texture: 'clean',
  density: 'standard',
  // D-08 settled as all-sans. The switch survives because PRD FR-SET-03 lists
  // typography emphasis as a user preference; `editorial` is not wired to a
  // different family yet, so it currently only changes sizing and tracking.
  typeEmphasis: 'utility',
  blockLayout: 'rows',
};

export const STORAGE_KEY = 'wandrly:preferences';

export function accentValue(id: AccentId, theme: Theme = 'dark'): string {
  const accent = ACCENTS.find((candidate) => candidate.id === id) ?? ACCENTS[0];
  return theme === 'light' ? accent.light : accent.dark;
}

/**
 * The accent at 14% and 15% alpha, which the prototype derived at runtime and
 * this recomputes on every accent change.
 */
export function accentAlphas(hex: string): { soft: string; selection: string } {
  const int = Number.parseInt(hex.replace('#', ''), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return {
    soft: `rgba(${r}, ${g}, ${b}, 0.14)`,
    selection: `rgba(${r}, ${g}, ${b}, 0.15)`,
  };
}

function isOneOf<T extends readonly string[]>(options: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

/** Tolerant of partial or stale stored shapes — an unknown field falls back. */
export function normalisePreferences(input: unknown): Preferences {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;

  return {
    theme: isOneOf(THEMES, raw.theme) ? raw.theme : DEFAULT_PREFERENCES.theme,
    accent: ACCENTS.some((a) => a.id === raw.accent)
      ? (raw.accent as AccentId)
      : DEFAULT_PREFERENCES.accent,
    texture: isOneOf(TEXTURES, raw.texture) ? raw.texture : DEFAULT_PREFERENCES.texture,
    density: isOneOf(DENSITIES, raw.density) ? raw.density : DEFAULT_PREFERENCES.density,
    typeEmphasis: isOneOf(TYPE_EMPHASIS, raw.typeEmphasis)
      ? raw.typeEmphasis
      : DEFAULT_PREFERENCES.typeEmphasis,
    blockLayout: isOneOf(BLOCK_LAYOUTS, raw.blockLayout)
      ? raw.blockLayout
      : DEFAULT_PREFERENCES.blockLayout,
  };
}

/**
 * Write preferences onto <html>. The same attribute names the prototype uses,
 * so the ported CSS selectors work unchanged.
 */
export function applyPreferences(preferences: Preferences, root: HTMLElement): void {
  const accent = accentValue(preferences.accent, preferences.theme);
  const { soft, selection } = accentAlphas(accent);

  root.setAttribute('data-theme', preferences.theme);
  root.setAttribute('data-tex', preferences.texture);
  root.setAttribute('data-density', preferences.density);
  root.setAttribute('data-type', preferences.typeEmphasis);
  root.setAttribute('data-layout', preferences.blockLayout);

  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-soft', soft);
  root.style.setProperty('--selection', selection);

  // Lets the browser render form controls and scrollbars in the right palette.
  root.style.colorScheme = preferences.theme;
}

export function readStoredPreferences(): Preferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? normalisePreferences(JSON.parse(stored)) : DEFAULT_PREFERENCES;
  } catch {
    // Private mode, disabled storage, or corrupt JSON — the defaults are the
    // shipped design, so falling back to them is always safe.
    return DEFAULT_PREFERENCES;
  }
}

export function writeStoredPreferences(preferences: Preferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage being unavailable must never break changing a theme.
  }
}
