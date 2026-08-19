import { expect, test } from '@playwright/test';

test.describe('V7 living release', () => {
  test('starts one persistent run from the operator console', async ({ page }) => {
    await page.goto('/');

    const consoleButton = page.locator('button[aria-controls="living-release-panel"]');
    await expect(consoleButton).toBeVisible();
    await expect(consoleButton).toContainText(/LIVING RELEASE/i);

    await consoleButton.click();
    const panel = page.locator('#living-release-panel');
    await expect(panel).toBeVisible();
    await panel.getByRole('button', { name: 'Operate the works' }).click();

    await expect(page.locator('html')).toHaveAttribute('data-run-launched', 'true');
    await expect(consoleButton).toContainText(/LIVE RUN/i);
    /* V10 renamed the visitor-facing artifact: the capsule is the object and
       the build code is metadata under it. */
    await expect(consoleButton).toContainText(/build/i);
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

  test('opens Tidewater only after a real release clears The Flight', async ({ page }) => {
    await page.goto('/');
    const flight = page.locator('#flight');
    await flight.scrollIntoViewIfNeeded();
    await flight.getByRole('button', { name: 'Run a release' }).click();
    await expect(flight.getByText('Promoted', { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.locator('#tidewater').evaluate((element) =>
      element.scrollIntoView({ block: 'center', behavior: 'auto' }),
    );

    const finale = page.getByRole('heading', { name: 'The same artifact made it through.' });
    await expect(finale).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/Release accepted/i).first()).toBeVisible();
    await expect(page.getByText(/Clean release path/i)).toBeVisible();
    await expect(page.getByText(/No drift introduced/i)).toBeVisible();

    await page.getByRole('button', { name: 'Open Tidewater' }).click();
    await expect(finale).toBeHidden();
    await expect(page.locator('#tidewater')).toBeVisible();
  });

  test('Blackwater Drill advances only after a real recovery', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'laptop-1366', 'One canonical drill path is enough; the responsive matrix covers the chrome elsewhere.');

    await page.goto('/');
    /* V9 folded the drill into the single run drawer: one operator chrome,
       one panel, no fourth floating layer. */
    await page.locator('button[aria-controls="living-release-panel"]').click();
    const panel = page.locator('#living-release-panel');
    await expect(panel.getByRole('heading', { name: /Blackwater Drill/i })).toBeVisible();
    await panel.getByRole('button', { name: 'Go to The Flight' }).first().click();

    const flight = page.locator('#flight');
    await flight.getByRole('button', { name: /Critical CVE in the image/i }).click();
    await expect(flight.getByText(/Held at/i)).toBeVisible({ timeout: 12_000 });
    await flight.getByRole('button', { name: 'Apply the fix' }).click();
    await expect(flight.getByText('Promoted', { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.locator('button[aria-controls="living-release-panel"]').click();
    const recovered = panel
      .getByRole('listitem')
      .filter({ hasText: 'Let a gate refuse, then recover it' });
    await expect(recovered).toHaveAttribute('data-done', '');
    await expect(panel).toContainText(/[23] \/ 6/);
  });
});
