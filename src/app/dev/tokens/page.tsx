'use client';

import { useEffect, useState } from 'react';
import { usePreferences } from '@/stores/preferences';
import {
  ACCENTS,
  DENSITIES,
  TEXTURES,
  THEMES,
  TYPE_EMPHASIS,
  accentValue,
} from '@/lib/theme/preferences';
import { contrastRatio, resolveToken } from '@/lib/theme/contrast';
import styles from './tokens.module.css';

/**
 * The design-system reference surface.
 *
 * Phase 0's gate is that the ported token layer renders identically to the
 * prototype across both themes, all four accents and all three densities. This
 * page puts every token on one screen so that comparison is a look rather than
 * an archaeology exercise, and it keeps earning its place as the thing to check
 * when a token changes.
 *
 * It also asserts the FR-NFR-A11Y-05 contrast fix live, against whatever theme
 * is currently applied — a regression here is visible immediately.
 */

const COLOUR_TOKENS = [
  '--bg',
  '--surface',
  '--surface-2',
  '--surface-3',
  '--accent',
  '--accent-soft',
  '--teal',
  '--sienna',
  '--forest',
  '--amber',
  '--purple',
  '--text',
  '--text-2',
  '--text-3',
  '--border',
  '--border-2',
  '--success',
  '--warning',
  '--error',
] as const;

const RADII = ['--r-sm', '--r-md', '--r-lg', '--r-xl'] as const;
const SHADOWS = ['--shadow-card', '--shadow-lift', '--shadow-glow'] as const;

/** The ramp the prototype actually uses, by frequency. */
const TYPE_SCALE = [10, 11, 12, 13, 14, 16, 18, 20, 24, 30] as const;

const GRID_TOKENS = ['--grid-cols', '--grid-gap', '--pad'] as const;

const SURFACES = ['--bg', '--surface', '--surface-2', '--surface-3'] as const;
const FOREGROUNDS = ['--text', '--text-2', '--text-3', '--accent'] as const;

export default function TokensPage() {
  const { preferences, hydrate, set } = usePreferences();
  const [resolved, setResolved] = useState<Record<string, string>>({});

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Read computed values after every preference change, since the accent and
  // both derived alphas are written as inline properties on <html>.
  //
  // Everything that reads a computed value goes through this state rather than
  // calling resolveToken() during render: getComputedStyle has no server-side
  // equivalent, so rendering its result directly is a hydration mismatch.
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const token of [...COLOUR_TOKENS, ...RADII, ...SHADOWS, ...GRID_TOKENS]) {
      next[token] = resolveToken(token);
    }
    setResolved(next);
  }, [preferences]);

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Wandrly · design system</p>
            <h1 className={styles.title}>Tokens</h1>
            <p className={styles.lede}>
              Ported from <code>WANDRLY 2/styles.css</code>. Every value is the prototype&rsquo;s
              except <code>--text-3</code>, which failed WCAG AA in both themes, and{' '}
              <code>--accent-soft</code>/<code>--selection</code>, which the prototype recomputed at
              runtime from the live accent.
            </p>
          </div>

          <div className={styles.switches}>
            <Segmented
              label="Theme"
              options={THEMES}
              value={preferences.theme}
              onChange={(v) => set('theme', v)}
            />
            <Segmented
              label="Density"
              options={DENSITIES}
              value={preferences.density}
              onChange={(v) => set('density', v)}
            />
            <Segmented
              label="Texture"
              options={TEXTURES}
              value={preferences.texture}
              onChange={(v) => set('texture', v)}
            />
            <Segmented
              label="Type"
              options={TYPE_EMPHASIS}
              value={preferences.typeEmphasis}
              onChange={(v) => set('typeEmphasis', v)}
            />
            <div className={styles.switch}>
              <span className={styles.switchLabel}>Accent</span>
              <div className={styles.swatchRow}>
                {ACCENTS.map((accent) => {
                  const value = accentValue(accent.id, preferences.theme);
                  return (
                    <button
                      key={accent.id}
                      type="button"
                      className={styles.accentDot}
                      style={{ background: value }}
                      aria-pressed={preferences.accent === accent.id}
                      aria-label={accent.label}
                      title={`${accent.label} · ${value}`}
                      onClick={() => set('accent', accent.id)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        <Section title="Colour" note={`${COLOUR_TOKENS.length} tokens`}>
          <div className={styles.grid}>
            {COLOUR_TOKENS.map((token) => (
              <div key={token} className={styles.swatch}>
                <div
                  className={styles.swatchChip}
                  style={{ background: `var(${token})` }}
                  aria-hidden
                />
                <div className={styles.swatchMeta}>
                  <div className={styles.swatchName}>{token}</div>
                  <div className={styles.swatchValue}>{resolved[token] ?? '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Contrast"
          note="FR-NFR-A11Y-05 · WCAG AA needs 4.5:1 for body text, 3:1 for large"
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Foreground</th>
                {SURFACES.map((surface) => (
                  <th key={surface} scope="col">
                    {surface}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FOREGROUNDS.map((foreground) => (
                <tr key={foreground}>
                  <th scope="row" style={{ color: `var(${foreground})` }}>
                    {foreground}
                  </th>
                  {SURFACES.map((surface) => {
                    const ratio = contrastRatio(resolved[foreground], resolved[surface]);
                    return (
                      <td key={surface} className={styles.ratio}>
                        {ratio === null ? (
                          '—'
                        ) : (
                          <span className={ratio >= 4.5 ? styles.pass : styles.fail}>
                            {ratio.toFixed(2)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Radii">
          <div className={styles.grid}>
            {RADII.map((token) => (
              <div key={token} className={styles.demoTile}>
                <div className={styles.radiusBox} style={{ borderRadius: `var(${token})` }} />
                <span className={styles.tileLabel}>
                  {token} · {resolved[token] ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Shadows">
          <div className={styles.grid}>
            {SHADOWS.map((token) => (
              <div key={token} className={styles.demoTile}>
                <div className={styles.shadowBox} style={{ boxShadow: `var(${token})` }} />
                <span className={styles.tileLabel}>{token}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Motion" note="two easings, used everywhere">
          <div className={styles.grid}>
            {(
              [
                ['--ease-enter', 'movement and reveal'],
                ['--ease-spring', 'pops, toggles, overshoot'],
              ] as const
            ).map(([token, use]) => (
              <div key={token} className={styles.demoTile}>
                <div className={styles.easeTrack} style={{ containerType: 'inline-size' }}>
                  <div
                    className={`${styles.easeBall} ${styles.easeBallMoving}`}
                    style={{ animationTimingFunction: `var(${token})` }}
                  />
                </div>
                <span className={styles.tileLabel}>
                  {token} · {use}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Type" note="14px base · 1.5 line-height · Instrument Sans (D-08)">
          <div>
            {TYPE_SCALE.map((size) => (
              <div key={size} className={styles.typeRow}>
                <span className={styles.typeSize}>{size}px</span>
                <span className={styles.typeSample} style={{ fontSize: size }}>
                  Cherry blossoms &middot; machiya stays
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Density"
          note={
            resolved['--grid-cols']
              ? `${preferences.density} · ${resolved['--grid-cols']} columns, ${resolved['--grid-gap']} gap`
              : preferences.density
          }
        >
          <div className={styles.densityGrid}>
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className={styles.densityCard} />
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {note ? <span className={styles.sectionNote}>{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.switch}>
      <span className={styles.switchLabel} id={`switch-${label}`}>
        {label}
      </span>
      <div className={styles.segmented} role="group" aria-labelledby={`switch-${label}`}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.segment}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
