import { test, expect, type Page } from '@playwright/test';

/**
 * Dashboard behaviour that only exists at real viewport and real CSS — the
 * things jsdom cannot see, because CSS Modules are stubbed there.
 */

async function firstCard(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const card = page.locator('article').first();
  await expect(card).toBeVisible();
  return card;
}

test.describe('trip card', () => {
  test('the hover actions replace the meta line rather than covering it', async ({ page }) => {
    // The action row is absolutely positioned onto the meta line, and its
    // buttons are translucent — layered, the dates read straight through them.
    const card = await firstCard(page);
    const meta = card
      .locator('p')
      .filter({ hasText: /blocks|variant|Ready/ })
      .first();
    // The row carries the reveal, not the individual controls.
    const actions = card.locator('[data-card-actions]');

    await expect(meta).toHaveCSS('opacity', '1');
    await expect(actions).toHaveCSS('opacity', '0');

    await card.hover();
    await expect(actions).toHaveCSS('opacity', '1');
    await expect(meta).toHaveCSS('opacity', '0');

    // And back, so the card is readable again once the pointer leaves.
    await page.mouse.move(0, 0);
    await expect(meta).toHaveCSS('opacity', '1');
  });

  test('keyboard focus into the actions clears the meta line too', async ({ page }) => {
    // Revealing the actions on focus but leaving the meta underneath would put
    // a keyboard user in exactly the state the hover fix removes.
    const card = await firstCard(page);
    const meta = card
      .locator('p')
      .filter({ hasText: /blocks|variant|Ready/ })
      .first();

    await card.getByRole('link', { name: /open canvas/i }).focus();
    await expect(meta).toHaveCSS('opacity', '0');
  });
});
