/**
 * Verifies the sign-in screen against the real Supabase project.
 *
 * Deliberately does NOT create an account or send an email: sign-up needs a
 * confirmation click we cannot perform, and a magic link would put mail in a
 * real inbox. Rejecting a bad password is enough to prove the client is talking
 * to the project — the error text comes back from Supabase, not from us.
 *
 *   node scripts/verify-auth.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3001';

const browser = await chromium.launch();
const page = await browser.newPage();
const failures = [];

function check(label, condition, detail = '') {
  console.log(`${condition ? '  ok  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failures.push(label);
}

await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });

console.log('sign-in renders');
check('email field present', await page.getByLabel('Email').isVisible());
check('password field present', await page.getByLabel('Password').isVisible());
check('magic link offered', await page.getByRole('button', { name: /link instead/i }).isVisible());
check(
  'no Google button (provider disabled on the project)',
  (await page.getByRole('button', { name: /Google/i }).count()) === 0,
);
check(
  'no Apple button (provider disabled on the project)',
  (await page.getByRole('button', { name: /Apple/i }).count()) === 0,
);
check(
  'the "or" divider is hidden when no providers are enabled',
  (await page.getByText('or', { exact: true }).count()) === 0,
);

console.log('\nreaches Supabase');
await page.getByLabel('Email').fill('nobody@wandrly.invalid');
await page.getByLabel('Password').fill('definitely-not-the-password');
await page.getByRole('button', { name: 'Sign in' }).click();

// Scoped to our own error styling rather than role="alert": Next's dev overlay
// also carries that role, and a two-match locator resolves to nothing in strict
// mode — which reads as "no error" when the error is right there on screen.
const alert = page.locator('[class*="alertError"]').first();
await alert.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
const message = (await alert.textContent().catch(() => null))?.trim() ?? '';

check('a real error came back', message.length > 0, message);
check(
  'the error is Supabase rejecting the credentials, not a client crash',
  /invalid|credential|password|email/i.test(message),
);
check('stayed on sign-in', new URL(page.url()).pathname === '/sign-in');

await browser.close();

console.log(failures.length ? `\n${failures.length} check(s) failed.` : '\nAll checks passed.');
process.exit(failures.length ? 1 : 0);
