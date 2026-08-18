import { expect, test, type Page } from '@playwright/test';

const canonical = 'laptop-1366';
const sections = [
  ['headwater', 'Headwater'], ['flight', 'The Flight'], ['refit', 'The Refit'],
  ['basin', 'The Basin'], ['split', 'The Split'], ['gauges', 'Gauge House'],
  ['watch', 'The Watch'], ['vault', 'The Vault'], ['tidewater', 'Tidewater'],
] as const;

async function openIndex(page: Page) {
  const button = page.locator('button[aria-controls="key-plate"]');
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
  await expect(page.locator('#key-plate')).toBeVisible();
  return button;
}

async function cleanRelease(page: Page) {
  const flight = page.locator('#flight');
  await flight.scrollIntoViewIfNeeded();
  await flight.getByRole('button', { name: 'Run a release' }).click();
  await expect(flight.getByText('Promoted', { exact: true })).toBeVisible({ timeout: 15_000 });
}

test.describe('V8 experience regressions', () => {
  test('Index survives repeated open and close without corrupting layout', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== canonical);
    await page.goto('/');
    const button = page.locator('button[aria-controls="key-plate"]');
    for (let i = 0; i < 4; i += 1) {
      await button.click();
      await expect(page.locator('#key-plate')).toBeVisible();
      await expect(page.locator('#key-plate')).not.toHaveJSProperty('scrollLeft', 1);
      await button.click();
      await expect(page.locator('#key-plate')).toBeHidden();
    }
    await expect(page.locator('html')).toHaveAttribute('data-depth', /engineer|recruiter/);
  });

  test('every lower-index section link navigates to the correct plate', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== canonical);
    await page.goto('/');
    for (const [id, name] of sections) {
      await openIndex(page);
      await page.locator('#key-plate nav').getByRole('link', { name: new RegExp(name, 'i') }).first().click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator('#key-plate')).toBeHidden();
      const box = await page.locator(`#${id}`).boundingBox();
      expect(box).not.toBeNull();
      expect((box?.y ?? 9999) < page.viewportSize()!.height).toBeTruthy();
    }
  });

  test('Index never horizontally overflows at 1366, 1024, 430 or 390', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== canonical);
    for (const width of [1366, 1024, 430, 390]) {
      await page.setViewportSize({ width, height: width <= 430 ? 844 : 768 });
      await page.goto('/');
      await openIndex(page);
      const geometry = await page.locator('#key-plate').evaluate((node) => ({
        client: (node as HTMLElement).clientWidth,
        scroll: (node as HTMLElement).scrollWidth,
        page: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      expect(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1);
      expect(geometry.page).toBeLessThanOrEqual(geometry.viewport + 1);
    }
  });

  test('fixed lower bar cannot obscure the final Tidewater control', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== canonical);
    await page.goto('/');
    const control = page.locator('#tidewater a, #tidewater button').last();
    await control.scrollIntoViewIfNeeded();
    const controlBox = await control.boundingBox();
    const barBox = await page.locator('button[aria-controls="key-plate"]').evaluate((node) =>
      node.parentElement?.getBoundingClientRect().toJSON(),
    );
    expect(controlBox).not.toBeNull();
    expect(barBox).toBeTruthy();
    expect(controlBox!.bottom).toBeLessThanOrEqual((barBox as DOMRect).top + 1);
  });

  test('Flight clean release and fault recovery both complete', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== canonical);
    await page.goto('/');
    await cleanRelease(page);
    const flight = page.locator('#flight');
    await flight.getByRole('button', { name: /Critical CVE in the image/i }).click();
    await expect(flight.getByText(/Held at/i)).toBeVisible({ timeout: 12_000 });
    await flight.getByRole('button', { name: 'Apply the fix' }).click();
    await expect(flight.getByText('Promoted', { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('Refit before/after mechanism remains operable', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== canonical);
    await page.goto('/');
    const refit = page.locator('#refit');
    await refit.scrollIntoViewIfNeeded();
    await refit.getByRole('button', { name: 'After' }).click();
    await expect(refit.getByRole('slider', { name: /Modernisation seam/i })).toHaveAttribute('aria-valuenow', '100');
    await expect(refit.getByText(/All five layers replaced/i)).toBeVisible();
    await refit.getByRole('button', { name: 'Before' }).click();
    await expect(refit.getByRole('slider', { name: /Modernisation seam/i })).toHaveAttribute('aria-valuenow', '0');
  });

  test('Living Release survives movement between plates and depth switches', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== canonical);
    await page.goto('/');
    const consoleButton = page.locator('button[aria-controls="living-release-panel"]');
    await consoleButton.click();
    await page.locator('#living-release-panel').getByRole('button', { name: 'Operate the works' }).click();
    await page.locator('#flight').scrollIntoViewIfNeeded();
    await page.locator('#basin').scrollIntoViewIfNeeded();
    await expect(page.locator('html')).toHaveAttribute('data-run-launched', 'true');
    await page.getByRole('button', { name: 'Recruiter' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-depth', 'recruiter');
    await page.getByRole('button', { name: 'Engineer' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-depth', 'engineer');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('Blackwater progresses through real semantic actions', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== canonical);
    await page.goto('/');
    await page.getByRole('button', { name: /Blackwater Drill/i }).click();
    const drill = page.locator('#blackwater-drill-panel');
    await drill.getByRole('button', { name: 'Go to The Flight' }).click();
    const flight = page.locator('#flight');
    await flight.getByRole('button', { name: /Critical CVE in the image/i }).click();
    await expect(flight.getByText(/Held at/i)).toBeVisible({ timeout: 12_000 });
    await flight.getByRole('button', { name: 'Apply the fix' }).click();
    await expect(page.locator('button[aria-controls="blackwater-drill-panel"]')).toContainText('1 / 5');
  });

  test('Tidewater finale is once per valid run and replays for Run B', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== canonical);
    await page.goto('/');

    await page.locator('#tidewater').scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: 'The same artifact made it through.' })).toBeHidden();

    await cleanRelease(page);
    await page.locator('#tidewater').scrollIntoViewIfNeeded();
    const finale = page.getByRole('heading', { name: 'The same artifact made it through.' });
    await expect(finale).toBeVisible({ timeout: 8_000 });
    const runA = await page.locator('html').getAttribute('data-run-id');
    await page.getByRole('button', { name: 'Run another release' }).click();
    await expect(finale).toBeHidden();

    await cleanRelease(page);
    await page.locator('#tidewater').scrollIntoViewIfNeeded();
    await expect(finale).toBeVisible({ timeout: 8_000 });
    const runB = await page.locator('html').getAttribute('data-run-id');
    expect(Number(runB)).toBeGreaterThan(Number(runA));
    await page.getByRole('button', { name: 'Open Tidewater' }).click();
    await expect(finale).toBeHidden();
  });

  test('opening can be skipped, replayed and rendered with reduced motion', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== canonical);
    await page.goto('/?intro=1');
    const opening = page.getByRole('dialog', { name: 'Commissioning the Lockworks' });
    await expect(opening).toBeVisible();
    await page.getByRole('button', { name: 'Skip opening' }).click();
    await expect(opening).toBeHidden();
    await page.getByRole('button', { name: 'Replay opening' }).click();
    await expect(opening).toBeVisible();
    await page.getByRole('button', { name: 'Skip opening' }).click();

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?intro=1');
    await expect(opening).toBeVisible();
    const duration = await opening.evaluate((node) => getComputedStyle(node).animationDuration);
    expect(duration === '0s' || duration === 'auto').toBeTruthy();
  });

  test('anchor jumping while Index is open or closed restores a stable scroll state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== canonical);
    await page.goto('/');
    await openIndex(page);
    await page.locator('#key-plate nav').getByRole('link', { name: /The Basin/i }).first().click();
    await expect(page.locator('#key-plate')).toBeHidden();
    await expect(page).toHaveURL(/#basin$/);
    await page.locator('button[aria-controls="key-plate"]').click();
    await page.locator('button[aria-controls="key-plate"]').click();
    await page.locator('#watch').scrollIntoViewIfNeeded();
    const top = await page.locator('#watch').evaluate((node) => node.getBoundingClientRect().top);
    expect(top).toBeLessThan(page.viewportSize()!.height);
  });
});
