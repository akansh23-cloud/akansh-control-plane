import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const canonical = 'laptop-1366';
const matrix = [
  { label: '1920x1080', width: 1920, height: 1080 },
  { label: '1600x900', width: 1600, height: 900 },
  { label: '1440x900', width: 1440, height: 900 },
  { label: '1366x768', width: 1366, height: 768 },
  { label: '1280x800', width: 1280, height: 800 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '430x932', width: 430, height: 932 },
  { label: '390x844', width: 390, height: 844 },
] as const;

const captures = matrix.filter(({ width }) => width === 1440 || width === 1366 || width === 390);

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const geometry = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect.soft(geometry.document, `${label}: document overflow`).toBeLessThanOrEqual(geometry.viewport + 1);
  expect.soft(geometry.body, `${label}: body overflow`).toBeLessThanOrEqual(geometry.viewport + 1);
}

async function captureComposition(page: Page, dir: string, label: string) {
  const prefix = `${dir}/${label}`;
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
  const index = page.locator('#key-plate');
  await expect(index).toBeVisible();
  const indexGeometry = await index.evaluate((node) => ({
    client: (node as HTMLElement).clientWidth,
    scroll: (node as HTMLElement).scrollWidth,
  }));
  expect(indexGeometry.scroll, `${label}: Index overflow`).toBeLessThanOrEqual(indexGeometry.client + 1);
  await index.screenshot({ path: `${prefix}-index.png` });
  await indexButton.click();

  await page.screenshot({ path: `${prefix}-global.png`, fullPage: false });
  await expectNoHorizontalOverflow(page, label);
}

test('required viewport matrix has no page or Index overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== canonical);

  for (const viewport of matrix) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await expectNoHorizontalOverflow(page, viewport.label);

    const indexButton = page.locator('button[aria-controls="key-plate"]');
    await indexButton.click();
    const index = page.locator('#key-plate');
    await expect(index).toBeVisible();
    const geometry = await index.evaluate((node) => ({
      client: (node as HTMLElement).clientWidth,
      scroll: (node as HTMLElement).scrollWidth,
    }));
    expect.soft(geometry.scroll, `${viewport.label}: Index overflow`).toBeLessThanOrEqual(geometry.client + 1);
    await indexButton.click();
  }
});

test('capture mandatory V8 visual QA at 1440, 1366 and 390', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== canonical);
  const dir = 'test-results/visual-qa';
  await mkdir(dir, { recursive: true });

  for (const viewport of captures) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await captureComposition(page, dir, viewport.label);
  }
});
