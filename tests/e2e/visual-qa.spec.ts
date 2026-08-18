import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const targets = new Set(['laptop-1440', 'laptop-1366', 'mobile-390-chromium']);

test('capture Flight, Refit, Index and global V8 composition', async ({ page }, testInfo) => {
  test.skip(!targets.has(testInfo.project.name));
  const dir = 'test-results/visual-qa';
  await mkdir(dir, { recursive: true });
  const prefix = `${dir}/${testInfo.project.name}`;

  await page.goto('/');
  await page.screenshot({ path: `${prefix}-headwater.png`, fullPage: false });

  const flight = page.locator('#flight');
  await flight.scrollIntoViewIfNeeded();
  await flight.getByRole('button', { name: 'Run a release' }).click();
  await expect(flight.getByText('Promoted', { exact: true })).toBeVisible({ timeout: 15_000 });
  const flightFrame = page.locator('#flight [data-phase]:has(> :nth-child(4) > ol)').first();
  await flightFrame.screenshot({ path: `${prefix}-flight-complete.png` });

  const refit = page.locator('#refit');
  await refit.scrollIntoViewIfNeeded();
  await refit.getByRole('button', { name: 'After' }).click();
  await expect(refit.getByText(/All five layers replaced/i)).toBeVisible();
  const refitField = page.locator('#refit div:has(> [role="slider"][aria-label^="Modernisation seam"])').first();
  await refitField.screenshot({ path: `${prefix}-refit-after.png` });

  const indexButton = page.locator('button[aria-controls="key-plate"]');
  await indexButton.click();
  await expect(page.locator('#key-plate')).toBeVisible();
  await page.locator('#key-plate').screenshot({ path: `${prefix}-index.png` });
  await indexButton.click();

  await page.screenshot({ path: `${prefix}-global.png`, fullPage: false });
});
