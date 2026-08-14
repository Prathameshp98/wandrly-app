/**
 * Screenshot a route across the preference matrix.
 *
 * PRD §15.1 makes "works in both themes and all three density settings" part of
 * done, so this exists to make that a look rather than a chore. It drives the
 * real preference store through localStorage — the same path a user takes — so
 * what it captures is what ships.
 *
 *   node scripts/shoot.mjs <url> <out-dir> [--full]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const [url = 'http://localhost:3001/dev/tokens', outDir = 'shots'] = process.argv.slice(2);
const fullPage = process.argv.includes('--full');

const STORAGE_KEY = 'wandrly:preferences';

const MATRIX = [
  { name: 'dark-standard', theme: 'dark', density: 'standard', accent: 'gold' },
  { name: 'light-standard', theme: 'light', density: 'standard', accent: 'gold' },
  { name: 'dark-compact', theme: 'dark', density: 'compact', accent: 'gold' },
  { name: 'dark-expressive', theme: 'dark', density: 'expressive', accent: 'gold' },
  { name: 'dark-teal', theme: 'dark', density: 'standard', accent: 'teal' },
  { name: 'light-periwinkle', theme: 'light', density: 'standard', accent: 'periwinkle' },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

const errors = [];
context.on('weberror', (error) => errors.push(String(error.error())));

for (const variant of MATRIX) {
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`[${variant.name}] ${message.text()}`);
  });

  // Seed the preference before first paint so the blocking script picks it up
  // and we capture the real no-flash path rather than a post-hydration repaint.
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [
      STORAGE_KEY,
      JSON.stringify({
        theme: variant.theme,
        accent: variant.accent,
        texture: 'clean',
        density: variant.density,
        typeEmphasis: 'utility',
        blockLayout: 'rows',
      }),
    ],
  );

  await page.goto(url, { waitUntil: 'networkidle' });

  const applied = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    density: document.documentElement.getAttribute('data-density'),
    accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    text3: getComputedStyle(document.documentElement).getPropertyValue('--text-3').trim(),
    cols: getComputedStyle(document.documentElement).getPropertyValue('--grid-cols').trim(),
  }));

  await page.screenshot({ path: `${outDir}/${variant.name}.png`, fullPage });
  console.log(
    `${variant.name.padEnd(18)} theme=${applied.theme} density=${applied.density} ` +
      `cols=${applied.cols} accent=${applied.accent} --text-3=${applied.text3}`,
  );

  await page.close();
}

await browser.close();

if (errors.length) {
  console.error('\nConsole errors:');
  for (const error of errors) console.error('  ' + error);
  process.exit(1);
}
console.log('\nNo console errors.');
