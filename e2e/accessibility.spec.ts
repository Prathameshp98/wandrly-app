import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * FR-NFR-A11Y-01: WCAG 2.2 AA across every authenticated and public view, in
 * *both* themes. The prototype's `--text-3` failed contrast in both and nobody
 * noticed, which is the argument for running this in CI rather than by hand.
 */

const STORAGE_KEY = 'wandrly:preferences';

const ROUTES = [
  { path: '/sign-in', name: 'sign in' },
  { path: '/sign-up', name: 'sign up' },
  { path: '/forgot-password', name: 'forgot password' },
  { path: '/dev/tokens', name: 'tokens' },
  { path: '/dev/primitives', name: 'primitives' },
  // The canvas seeds a known trip id, so this is stable across re-seeds.
  { path: '/t/00000000-0000-7000-8000-00000000c001', name: 'canvas' },
] as const;

const THEMES = ['dark', 'light'] as const;

async function setTheme(page: Page, theme: (typeof THEMES)[number]) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [
      STORAGE_KEY,
      JSON.stringify({
        theme,
        accent: 'gold',
        texture: 'clean',
        density: 'standard',
        typeEmphasis: 'utility',
        blockLayout: 'rows',
      }),
    ],
  );
}

function scan(page: Page) {
  return new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
  ]);
}

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    for (const route of ROUTES) {
      test(`${route.name} has no accessibility violations`, async ({ page }) => {
        await setTheme(page, theme);
        await page.goto(route.path);
        await page.waitForLoadState('networkidle');

        const results = await scan(page).analyze();

        // Name the rule and the element, or a CI failure is a bare count.
        expect(
          results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target.join(' ')),
          })),
        ).toEqual([]);
      });
    }
  });
}

test.describe('overlays', () => {
  // Dialogs are the classic gap: they pass when closed and fail when open,
  // because the trap, the labelling and the background inertness only exist then.
  for (const overlay of [
    { button: 'Open modal', name: 'modal' },
    { button: 'Open confirm', name: 'confirm dialog' },
    { button: 'Open drawer', name: 'drawer' },
  ]) {
    test(`${overlay.name} has no accessibility violations when open`, async ({ page }) => {
      await page.goto('/dev/primitives');
      await page.getByRole('button', { name: overlay.button }).click();
      await expect(page.getByRole('dialog').or(page.getByRole('alertdialog'))).toBeVisible();

      const results = await scan(page).analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    });
  }

  test('Escape closes an overlay and returns focus to what opened it', async ({ page }) => {
    await page.goto('/dev/primitives');

    const trigger = page.getByRole('button', { name: 'Open modal' });
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
