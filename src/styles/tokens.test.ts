import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AA_NORMAL, contrastRatio, flatten, parseColor } from '@/lib/theme/contrast';
import { BLOCK_META, BLOCK_TYPES } from '@/components/canvas/block-meta';
import { ACCENTS, accentAlphas } from '@/lib/theme/preferences';

/**
 * These read the real stylesheet rather than a copy of its values, so drift
 * between tokens.css and what we believe is in it fails here.
 *
 * FR-NFR-A11Y-05 is the reason: the prototype's `--text-3` failed WCAG AA
 * against every surface in both themes, and it carries coordinates, footers and
 * metadata throughout the app. Nothing stops that regressing except a test that
 * looks at the file.
 */

// Comments are stripped first: a `/* … */` sitting above a declaration would
// otherwise be glued to it by the split below, and the declaration silently
// skipped — which reads as "token missing" rather than "parser wrong".
const css = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match?.[1]) throw new Error(`No such block in tokens.css: ${selector}`);
  return match[1];
}

function tokensIn(selector: string): Record<string, string> {
  const declarations: Record<string, string> = {};
  for (const line of block(selector).split(';')) {
    const [name, ...rest] = line.split(':');
    const key = name?.trim();
    if (key?.startsWith('--')) declarations[key] = rest.join(':').trim();
  }
  return declarations;
}

/**
 * Follow `var(--x)` aliases so a token defined by reference — `--accent-text`
 * is `var(--accent)` in dark — resolves to a colour the contrast maths can
 * read, the same way the browser resolves it.
 */
function resolveVars(tokens: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [name, declared] of Object.entries(tokens)) {
    let value = declared;
    // Bounded, because a token cycle should fail the test rather than hang it.
    for (let depth = 0; depth < 5; depth++) {
      const alias = value.match(/^var\(\s*(--[\w-]+)\s*\)$/)?.[1];
      if (!alias) break;
      value = tokens[alias] ?? value;
    }
    resolved[name] = value;
  }
  return resolved;
}

const DARK = resolveVars(tokensIn(':root'));
const LIGHT = resolveVars({ ...tokensIn(':root'), ...tokensIn(":root[data-theme='light']") });

const SURFACES = ['--bg', '--surface', '--surface-2', '--surface-3'] as const;

describe.each([
  ['dark', DARK],
  ['light', LIGHT],
])('%s theme', (themeName, theme) => {
  it.each(['--text', '--text-2', '--text-3', '--accent-text'])(
    `%s meets WCAG AA against every surface`,
    (foreground) => {
      for (const surface of SURFACES) {
        const ratio = contrastRatio(theme[foreground], theme[surface]);
        expect(ratio, `${foreground} on ${surface} in ${themeName}`).not.toBeNull();
        expect(
          ratio!,
          `${foreground} (${theme[foreground]}) on ${surface} (${theme[surface]}) in ${themeName} theme`,
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    },
  );

  it('defines every surface and text tier', () => {
    for (const token of [...SURFACES, '--text', '--text-2', '--text-3', '--border', '--border-2']) {
      expect(theme[token], `${token} missing from ${themeName}`).toBeTruthy();
    }
  });
});

/**
 * The canvas sets a block's type chip in that type's own hue, on that type's own
 * tinted ground. Both halves are tokens, the tint is translucent, and the ground
 * underneath changes with the surface — so the ratio is not visible in either
 * file on its own. It is checked here because the browser suite only sees the
 * types the seed happens to contain, and VIDEO is not one of them.
 */
describe.each([
  ['dark', DARK],
  ['light', LIGHT],
])('%s theme block-type chips', (themeName, theme) => {
  /** `var(--x)` → its value; anything else is already a colour. */
  const value = (input: string) =>
    input.startsWith('var(') ? (theme[input.slice(4, -1)] ?? input) : input;

  it.each([...BLOCK_TYPES])('%s reads as text on its own tint, over every surface', (type) => {
    const meta = BLOCK_META[type];
    const ink = value(meta.text);
    const tint = parseColor(value(meta.tint));
    expect(parseColor(ink), `${type} text unresolved: ${meta.text}`).not.toBeNull();
    expect(tint, `${type} tint unresolved: ${meta.tint}`).not.toBeNull();

    for (const surface of SURFACES) {
      // The tint is translucent, so the chip's real colour depends on what is
      // behind it — flatten first, then measure against that.
      const chip = flatten(tint!, parseColor(theme[surface])!);
      const ratio = contrastRatio(ink, `rgb(${chip.r} ${chip.g} ${chip.b})`);
      expect(
        ratio!,
        `${type}: ${meta.text} on ${meta.tint} over ${surface} in ${themeName}`,
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });
});

describe('the two documented deviations from the prototype', () => {
  it('replaces the failing --text-3, and only that text tier', () => {
    // The prototype's values, which must not reappear.
    expect(DARK['--text-3']).not.toBe('#5e6570');
    expect(LIGHT['--text-3']).not.toBe('#969da8');

    // Everything else in the text ramp is untouched.
    expect(DARK['--text']).toBe('#f2f3f5');
    expect(DARK['--text-2']).toBe('#9aa0aa');
    expect(LIGHT['--text']).toBe('#15171c');
    expect(LIGHT['--text-2']).toBe('#5c6470');
  });

  it('derives --accent-soft and --selection from the live accent', () => {
    // styles.css hardcoded rgba(201,168,76,·) — a gold from an earlier accent —
    // and app.jsx overwrote it at runtime. These are what actually rendered.
    const dark = accentAlphas(ACCENTS[0].dark);
    expect(DARK['--accent-soft']).toBe(dark.soft);
    expect(DARK['--selection']).toBe(dark.selection);
    expect(DARK['--accent-soft']).not.toContain('201, 168, 76');

    const light = accentAlphas(ACCENTS[0].light);
    expect(LIGHT['--accent-soft']).toBe('rgba(208, 112, 63, 0.12)');
    expect(light.soft).toBe('rgba(208, 112, 63, 0.14)');
  });
});

describe('values ported verbatim', () => {
  it('keeps the dark palette exactly', () => {
    expect(DARK['--bg']).toBe('#0a0b0e');
    expect(DARK['--surface']).toBe('#12141a');
    expect(DARK['--surface-2']).toBe('#191c23');
    expect(DARK['--surface-3']).toBe('#20242c');
    expect(DARK['--accent']).toBe('#f0a05a');
    expect(DARK['--border']).toBe('#23262e');
    expect(DARK['--border-2']).toBe('#323642');
  });

  it('keeps the aged-paper palette exactly', () => {
    expect(LIGHT['--bg']).toBe('#f2f3f6');
    expect(LIGHT['--surface']).toBe('#ffffff');
    expect(LIGHT['--accent']).toBe('#d0703f');
  });

  it('keeps the radii, easings and semantic colours', () => {
    expect(DARK['--r-sm']).toBe('6px');
    expect(DARK['--r-md']).toBe('12px');
    expect(DARK['--r-lg']).toBe('16px');
    expect(DARK['--r-xl']).toBe('24px');
    expect(DARK['--ease-enter']).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    expect(DARK['--ease-spring']).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');
    expect(DARK['--success']).toBe('#5fbe8b');
    expect(DARK['--warning']).toBe('#e4b15e');
    expect(DARK['--error']).toBe('#e25d4c');
  });

  it('keeps the density presets FR-DASH-11 specifies', () => {
    expect(tokensIn(":root[data-density='compact']")).toMatchObject({
      '--grid-cols': '4',
      '--grid-gap': '16px',
      '--pad': '32px',
    });
    expect(tokensIn(":root[data-density='standard']")).toMatchObject({
      '--grid-cols': '3',
      '--grid-gap': '20px',
      '--pad': '40px',
    });
    expect(tokensIn(":root[data-density='expressive']")).toMatchObject({
      '--grid-cols': '2',
      '--grid-gap': '28px',
      '--pad': '56px',
    });
  });

  it('zeroes both ambient layers for the shipped `clean` texture', () => {
    expect(tokensIn(":root[data-tex='clean']")).toMatchObject({
      '--noise-opacity': '0',
      '--topo-opacity': '0',
    });
  });
});
