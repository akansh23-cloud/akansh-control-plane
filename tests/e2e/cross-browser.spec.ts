import { expect, test, type Page } from '@playwright/test';

async function installOpeningProbe(page: Page) {
  await page.addInitScript(() => {
    const state = window as Window & { __lockworksOpeningSeen?: boolean };
    state.__lockworksOpeningSeen = false;
    const mark = () => {
      if (document.documentElement.dataset.opening === 'commissioning') {
        state.__lockworksOpeningSeen = true;
      }
    };
    new MutationObserver(mark).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-opening'],
    });
    queueMicrotask(mark);
  });
}

test.describe('Cross-browser Lockworks contract', () => {
  test('chrome, Index and depth controls remain stable', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const indexButton = page.locator('button[aria-controls="key-plate"]');
    const lowerBar = indexButton.locator('..');

    for (let i = 0; i < 3; i += 1) {
      await indexButton.click();
      await expect(page.locator('#key-plate')).toBeVisible();
      await indexButton.click();
      await expect(page.locator('#key-plate')).toBeHidden();
    }

    await lowerBar.getByRole('button', { name: /^Recruiter\b/i }).click();
    await expect(html).toHaveAttribute('data-depth', 'recruiter');
    await lowerBar.getByRole('button', { name: /^Engineer\b/i }).click();
    await expect(html).toHaveAttribute('data-depth', 'engineer');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('Flight release and Refit mechanism work outside desktop Chromium', async ({ page }) => {
    await page.goto('/');
    const flight = page.locator('#flight');
    await flight.scrollIntoViewIfNeeded();
    await flight.getByRole('button', { name: 'Run a release' }).click();
    await expect(flight.getByText('Promoted', { exact: true })).toBeVisible({ timeout: 15_000 });

    const refit = page.locator('#refit');
    await refit.scrollIntoViewIfNeeded();
    await refit.getByRole('button', { name: 'After' }).click();
    await expect(refit.getByRole('slider', { name: /Modernisation seam/i })).toHaveAttribute('aria-valuenow', '100');
    await expect(refit.getByText(/All five layers replaced/i)).toBeVisible();
  });

  test('forced commissioning opening is registered, replayable and skippable', async ({ page }) => {
    await installOpeningProbe(page);
    await page.goto('/?intro=1', { waitUntil: 'domcontentloaded' });
    await expect.poll(() =>
      page.evaluate(() =>
        Boolean((window as Window & { __lockworksOpeningSeen?: boolean }).__lockworksOpeningSeen),
      ),
    ).toBe(true);

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-opening', 'ready', { timeout: 8_000 });
    const opening = page.getByRole('dialog', { name: 'Commissioning the Lockworks' });
    await page.getByRole('button', { name: 'Replay opening' }).click();
    await expect(opening).toBeVisible();
    await page.getByRole('button', { name: 'Skip opening' }).click();
    await expect(opening).toBeHidden();
    await expect(page.locator('#headwater')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
