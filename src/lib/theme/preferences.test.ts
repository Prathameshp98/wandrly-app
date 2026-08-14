import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCENTS,
  DEFAULT_PREFERENCES,
  STORAGE_KEY,
  accentAlphas,
  accentValue,
  applyPreferences,
  normalisePreferences,
  readStoredPreferences,
  writeStoredPreferences,
} from './preferences';

describe('defaults', () => {
  it('are the prototype TWEAK_DEFAULTS — the design as rendered', () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      theme: 'dark',
      accent: 'gold',
      texture: 'clean',
      density: 'standard',
      typeEmphasis: 'utility',
      blockLayout: 'rows',
    });
  });

  it('offers the four accents PRD §12 specifies', () => {
    expect(ACCENTS.map((a) => a.dark)).toEqual(['#F0A05A', '#E5654A', '#66C6B5', '#8FA9FF']);
  });
});

describe('accentValue', () => {
  it('resolves per theme', () => {
    expect(accentValue('gold', 'dark')).toBe('#F0A05A');
    // PRD §12.1: "Light theme shifts default to #D0703F".
    expect(accentValue('gold', 'light')).toBe('#D0703F');
  });

  it('gives every accent a light value, since the inline property outranks the theme block', () => {
    for (const accent of ACCENTS) {
      expect(accentValue(accent.id, 'light')).toBe(accent.light);
      expect(accentValue(accent.id, 'light')).not.toBe(accent.dark);
    }
  });

  it('falls back to the default accent for an unknown id', () => {
    expect(accentValue('nope' as never, 'dark')).toBe('#F0A05A');
  });
});

describe('accentAlphas', () => {
  it('derives soft and selection from the accent, not from a stale constant', () => {
    // The prototype's stylesheet hardcoded rgba(201,168,76,·) — an older gold —
    // and patched it at runtime. These are the values it actually rendered.
    expect(accentAlphas('#F0A05A')).toEqual({
      soft: 'rgba(240, 160, 90, 0.14)',
      selection: 'rgba(240, 160, 90, 0.15)',
    });
  });

  it('tracks every offered accent', () => {
    expect(accentAlphas(accentValue('teal', 'dark')).soft).toBe('rgba(102, 198, 181, 0.14)');
    expect(accentAlphas(accentValue('periwinkle', 'dark')).soft).toBe('rgba(143, 169, 255, 0.14)');
  });
});

describe('normalisePreferences', () => {
  it('accepts a complete valid shape unchanged', () => {
    const input = {
      theme: 'light',
      accent: 'teal',
      texture: 'carto',
      density: 'compact',
      typeEmphasis: 'editorial',
      blockLayout: 'cards',
    };
    expect(normalisePreferences(input)).toEqual(input);
  });

  it('falls back per-field rather than discarding the whole object', () => {
    const result = normalisePreferences({ theme: 'light', density: 'nonsense' });
    expect(result.theme).toBe('light');
    expect(result.density).toBe('standard');
  });

  it('survives junk', () => {
    for (const junk of [null, undefined, 'string', 42, [], { theme: 99 }]) {
      expect(normalisePreferences(junk)).toEqual(DEFAULT_PREFERENCES);
    }
  });
});

describe('applyPreferences', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('html');
  });

  it('writes the attribute names the ported CSS selectors expect', () => {
    applyPreferences(
      {
        theme: 'light',
        accent: 'sienna',
        texture: 'ticket',
        density: 'expressive',
        typeEmphasis: 'editorial',
        blockLayout: 'cards',
      },
      root,
    );

    expect(root.getAttribute('data-theme')).toBe('light');
    expect(root.getAttribute('data-tex')).toBe('ticket');
    expect(root.getAttribute('data-density')).toBe('expressive');
    expect(root.getAttribute('data-type')).toBe('editorial');
    expect(root.getAttribute('data-layout')).toBe('cards');
  });

  it('sets the accent and both derived alphas together', () => {
    applyPreferences({ ...DEFAULT_PREFERENCES, accent: 'teal' }, root);

    expect(root.style.getPropertyValue('--accent')).toBe('#66C6B5');
    expect(root.style.getPropertyValue('--accent-soft')).toBe('rgba(102, 198, 181, 0.14)');
    expect(root.style.getPropertyValue('--selection')).toBe('rgba(102, 198, 181, 0.15)');
  });

  it('writes the light accent in the light theme, not the dark one', () => {
    // Regression: the inline --accent outranks :root[data-theme='light'], so a
    // theme-blind accent silently dragged the dark gold onto the paper palette.
    applyPreferences({ ...DEFAULT_PREFERENCES, theme: 'light', accent: 'gold' }, root);

    expect(root.style.getPropertyValue('--accent')).toBe('#D0703F');
    expect(root.style.getPropertyValue('--accent-soft')).toBe('rgba(208, 112, 63, 0.14)');
  });

  it('sets color-scheme so native controls match the theme', () => {
    applyPreferences({ ...DEFAULT_PREFERENCES, theme: 'light' }, root);
    expect(root.style.colorScheme).toBe('light');
  });
});

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips', () => {
    const preferences = {
      ...DEFAULT_PREFERENCES,
      theme: 'light' as const,
      accent: 'teal' as const,
    };
    writeStoredPreferences(preferences);
    expect(readStoredPreferences()).toEqual(preferences);
  });

  it('returns defaults when nothing is stored', () => {
    expect(readStoredPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('returns defaults rather than throwing on corrupt JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(readStoredPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('does not throw when storage is unavailable', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: storage disabled');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(readStoredPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(() => writeStoredPreferences(DEFAULT_PREFERENCES)).not.toThrow();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});
