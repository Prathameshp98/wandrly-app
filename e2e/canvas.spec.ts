import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * The block lifecycle against the real API (PRD §15.2 flow 3).
 *
 * These run against a live backend rather than mocks on purpose: the things
 * that break here are the things a mock cannot model — the `version` a PATCH
 * demands, the shape of a validation envelope, whether a soft-deleted block
 * really comes back on restore.
 *
 * The Kyoto trip is a seeded fixture (`PRD §15.3`), so its id is stable.
 */
const TRIP = '00000000-0000-7000-8000-00000000c001';

/**
 * Everything this file creates carries this prefix, and `afterEach` sweeps it.
 *
 * Doing the sweep over the API rather than through the UI matters: when a test
 * fails half-way it never reaches its own cleanup, and the leftovers made the
 * *next* run fail on a strict-mode violation instead of on the real defect.
 */
const MARK = 'e2e block';

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
const TOKEN = process.env.NEXT_PUBLIC_DEV_ACCESS_TOKEN ?? '';

async function sweepTestBlocks() {
  const headers = { Authorization: `Bearer ${TOKEN}` };
  const canvas = await fetch(`${API}/v1/trips/${TRIP}/canvas`, { headers }).then((r) => r.json());

  const strays = (canvas.days ?? []).flatMap(
    (day: { blocks: Array<{ id: string; title: string; type: string }> }) =>
      day.blocks.filter(
        (block) => block.title?.startsWith(MARK) || (block.type === 'TICKET' && block.title === ''),
      ),
  );

  for (const stray of strays) {
    await fetch(`${API}/v1/trips/${TRIP}/blocks/${stray.id}`, { method: 'DELETE', headers });
  }
  return strays.length;
}

/**
 * Scan `selector`, or the whole page.
 *
 * The dialog scans are scoped deliberately. A modal dims the page behind it,
 * and axe composites that backdrop into the background colour of everything
 * underneath — so an unscoped scan reports contrast failures against content
 * that is inert, covered, and dimmed on purpose. The page behind is covered by
 * `accessibility.spec.ts` and by the expanded-card test below.
 */
function scan(page: Page, selector?: string) {
  const builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
  ]);
  return selector ? builder.include(selector) : builder;
}

/**
 * Rule ids plus the elements that failed — a bare count is useless in CI.
 *
 * Waits for every running animation first. Cards fade in over 260ms and the
 * drawer slides over 320ms; axe reads the *computed* colour, so scanning
 * mid-fade composites a half-transparent foreground and reports a contrast
 * failure that does not exist once the element settles.
 */
const violationsOf = async (page: Page, selector?: string) => {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        // Finite ones only. A looping animation — the live dot on the variant
        // pill — never resolves `finished`, so awaiting it hangs until the
        // test times out rather than settling.
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );

  return (await scan(page, selector).analyze()).violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.target.join(' ')),
  }));
};

test.beforeAll(sweepTestBlocks);
test.afterEach(sweepTestBlocks);

async function setTheme(page: Page, theme: 'dark' | 'light') {
  await page.addInitScript(
    (value) => window.localStorage.setItem('wandrly:preferences', value),
    JSON.stringify({
      theme,
      accent: 'gold',
      texture: 'clean',
      density: 'standard',
      typeEmphasis: 'utility',
      blockLayout: 'rows',
    }),
  );
}

async function openCanvas(page: Page) {
  await page.goto(`/t/${TRIP}`);
  await expect(page.getByRole('heading', { name: 'Kyoto in Spring' })).toBeVisible();
}

/**
 * Open a block's drawer.
 *
 * A card toggles on click, and a block created from the picker is *already*
 * expanded — clicking it blind collapses it instead. Honour the state.
 */
async function openDrawer(page: Page, name: RegExp) {
  const card = page.getByRole('button', { name });
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click();
  await page
    .locator('article', { has: card })
    .getByRole('button', { name: /open in drawer/i })
    .click();
}

/** The picker, opened from the first day's "Add a block". */
async function openPicker(page: Page) {
  await page
    .getByRole('button', { name: /add a block/i })
    .first()
    .click();
  return page.getByRole('dialog', { name: 'Add a block' });
}

// One seeded trip, mutated by every test here — in parallel they delete each
// other's blocks through the shared sweep. Serial is not a workaround; it is
// what sharing a fixture actually costs.
test.describe.configure({ mode: 'serial' });

test.describe('block lifecycle', () => {
  test('create, edit, and delete a block, then undo the delete', async ({ page }) => {
    await openCanvas(page);

    // ── Create ──────────────────────────────────────────────────────
    const picker = await openPicker(page);
    await expect(picker).toBeVisible();
    await picker.getByRole('button', { name: /^Note/ }).click();

    // A new block opens straight into the drawer, so the next action is naming it.
    const drawer = page.getByRole('dialog', { name: /untitled block/i });
    await expect(drawer).toBeVisible();

    // ── Edit ────────────────────────────────────────────────────────
    // The drawer keeps its name while the title field changes — see BlockDetail.
    // Save stays disabled until something actually changes — the drawer sends
    // a partial patch, and an empty one is a wasted round-trip.
    const save = drawer.getByRole('button', { name: /save changes|saved/i });
    await expect(save).toBeDisabled();

    await drawer.getByLabel('Title').fill(`${MARK} — first draft`);
    await expect(save).toBeEnabled();
    await expect(drawer).toHaveAccessibleName(/untitled block/i);

    await drawer.getByLabel('Time').fill('07:15');
    await drawer.getByLabel('Notes').fill('Written by the canvas e2e test.');
    await save.click();

    await expect(drawer).toBeHidden();
    const card = page.getByRole('button', { name: new RegExp(`${MARK} — first draft`) });
    await expect(card).toBeVisible();
    await expect(card).toContainText('07:15');

    // ── Reopen: the drawer reads the *saved* block, not a stale snapshot ──
    await openDrawer(page, new RegExp(`${MARK} — first draft`));
    const reopened = page.getByRole('dialog', { name: new RegExp(`${MARK} — first draft`) });
    await expect(reopened.getByLabel('Notes')).toHaveValue('Written by the canvas e2e test.');
    await expect(reopened.getByRole('button', { name: /^saved$/i })).toBeDisabled();

    // ── Delete, then undo ───────────────────────────────────────────
    await reopened.getByRole('button', { name: /^delete/i }).click();
    await expect(card).toBeHidden();

    // FR-UNDO-01: blocks are soft-deleted, so undo restores the same row
    // rather than creating a lookalike.
    await page.getByRole('button', { name: /^undo$/i }).click();
    await expect(card).toBeVisible();
  });

  test('the picker offers all eleven types and closes on Escape', async ({ page }) => {
    await openCanvas(page);
    const picker = await openPicker(page);

    // The contract's enum is eleven long; a picker that quietly drops one is a
    // block type nobody can ever create.
    await expect(picker.getByRole('button')).toHaveCount(11 + 1); // + the close button

    for (const label of [
      'Activity',
      'Stay',
      'Transport',
      'Restaurant',
      'Ticket',
      'Photo',
      'Video',
      'Link',
      'Map pin',
      'Note',
      'Budget item',
    ]) {
      await expect(picker.getByRole('button', { name: new RegExp(`^${label}`) })).toBeVisible();
    }

    await page.keyboard.press('Escape');
    await expect(picker).toBeHidden();
  });

  test('a block reachable by mouse is reachable by keyboard', async ({ page }) => {
    // FR-NFR-A11Y-02. The picker is a dialog, so focus must land inside it and
    // Escape must return focus to the control that opened it.
    await openCanvas(page);

    const trigger = page.getByRole('button', { name: /add a block/i }).first();
    await trigger.focus();
    await page.keyboard.press('Enter');

    const picker = page.getByRole('dialog', { name: 'Add a block' });
    await expect(picker).toBeVisible();
    await expect(picker).toContainText('Day 1');

    await page.keyboard.press('Escape');
    await expect(picker).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  // A dialog that passes closed can still fail open: the trap, the labelling
  // and the background inertness only exist while it is on screen.
  for (const theme of ['dark', 'light'] as const) {
    test(`${theme}: the picker and the drawer are clean with axe`, async ({ page }) => {
      await setTheme(page, theme);
      await openCanvas(page);

      const picker = await openPicker(page);
      await expect(picker).toBeVisible();
      expect(await violationsOf(page, '[role="dialog"]')).toEqual([]);

      // Every type reaches the same drawer, but only TICKET and its three
      // siblings render the booking toggle — scan one of those.
      await picker.getByRole('button', { name: /^Ticket/ }).click();
      await expect(page.getByRole('dialog', { name: /untitled block/i })).toBeVisible();
      expect(await violationsOf(page, '[role="dialog"]')).toEqual([]);
    });

    test(`${theme}: an expanded block card is clean`, async ({ page }) => {
      // The page-level suite only ever sees collapsed cards, so the expanded
      // body — its sections and its action row — goes unscanned without this.
      await setTheme(page, theme);
      await openCanvas(page);

      await page.locator('article[data-block] button[aria-expanded="false"]').first().click();
      await expect(page.getByRole('button', { name: /open in drawer/i })).toBeVisible();

      expect(await violationsOf(page)).toEqual([]);
    });
  }
});
