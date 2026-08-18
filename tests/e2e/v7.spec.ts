import { expect, test } from '@playwright/test';

test.describe('V7 living release', () => {
  test('starts one persistent run from the operator console', async ({ page }) => {
    await page.goto('/');

    const consoleButton = page.locator('button[aria-controls="living-release-panel"]');
    await expect(consoleButton).toBeVisible();
    await expect(consoleButton).toContainText(/V7 · LIVING RELEASE/i);

    await consoleButton.click();
    const panel = page.locator('#living-release-panel');
    await expect(panel).toBeVisible();
    await panel.getByRole('button', { name: 'Operate the works' }).click();

    await expect(page.locator('html')).toHaveAttribute('data-run-launched', 'true');
    await expect(consoleButton).toContainText(/LIVE RUN/i);
    await expect(consoleButton).toContainText(/AM-/i);
  });

  test('carries a refused release into the global run and clears it through recovery', async ({ page }) => {
    await page.goto('/');
    const flight = page.locator('#flight');
    await flight.scrollIntoViewIfNeeded();

    await flight.getByRole('button', { name: /Critical CVE in the image/i }).click();
    await expect(flight.getByText(/Held at/i)).toBeVisible({ timeout: 12_000 });

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-run-launched', 'true');
    await expect(html).toHaveAttribute('data-run-phase', 'held');
    await expect(page.locator('button[aria-controls="living-release-panel"]')).toContainText(/Gate holding/i);

    await flight.getByRole('button', { name: 'Apply the fix' }).click();
    await expect(flight.getByText('Promoted', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(html).toHaveAttribute('data-run-phase', 'healthy');
  });

  test('lets upstream fallback seed Gauge House without inventing telemetry', async ({ page }) => {
    await page.goto('/');

    const split = page.locator('#split');
    await split.scrollIntoViewIfNeeded();
    await split.getByRole('button', { name: 'Take one out of service' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-run-service-down', 'true');

    const gauges = page.locator('#gauges');
    await gauges.scrollIntoViewIfNeeded();
    await expect(gauges.getByText(/Earlier operator actions seeded this simulation/i)).toBeVisible();

    const load = gauges.getByRole('slider', { name: /Load against the resource limit/i });
    await expect.poll(async () => Number(await load.getAttribute('aria-valuenow'))).toBeGreaterThan(34);
    await expect(gauges.getByText(/not production telemetry/i)).toBeVisible();
  });

  test('opens Tidewater with a production finale and factual run receipt', async ({ page }) => {
    await page.goto('/');

    const consoleButton = page.locator('button[aria-controls="living-release-panel"]');
    await consoleButton.click();
    await page.locator('#living-release-panel').getByRole('button', { name: 'Operate the works' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-run-launched', 'true');

    await page.locator('#tidewater').evaluate((element) =>
      element.scrollIntoView({ block: 'center', behavior: 'auto' }),
    );

    const finale = page.getByRole('heading', { name: 'The same artifact made it through.' });
    await expect(finale).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/TIDEWATER · RELEASE ACCEPTED/i)).toBeVisible();
    await expect(page.getByText(/Clean release path/i)).toBeVisible();
    await expect(page.getByText(/No drift introduced/i)).toBeVisible();

    await page.getByRole('button', { name: 'Open Tidewater' }).click();
    await expect(finale).toBeHidden();
    await expect(page.locator('#tidewater')).toBeVisible();
  });

  test('Blackwater Drill advances only after a real recovery', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1920', 'One canonical drill path is enough; the global layout matrix covers the launcher elsewhere.');

    await page.goto('/');
    await page.getByRole('button', { name: /Blackwater Drill/i }).click();

    const drill = page.locator('[aria-label="Blackwater operator challenge"]');
    await expect(drill.getByText('Contain a refused release', { exact: true })).toBeVisible();
    await drill.getByRole('button', { name: 'Go to The Flight' }).click();

    const flight = page.locator('#flight');
    await flight.getByRole('button', { name: /Critical CVE in the image/i }).click();
    await expect(flight.getByText(/Held at/i)).toBeVisible({ timeout: 12_000 });
    await flight.getByRole('button', { name: 'Apply the fix' }).click();

    await expect(drill.getByText('Restore declared state', { exact: true })).toBeVisible();
    await expect(drill.getByText(/1 \/ 5/)).toBeVisible();
  });
});
