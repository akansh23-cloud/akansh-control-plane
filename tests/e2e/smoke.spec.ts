import { test, expect } from '@playwright/test';

test.describe('control plane', () => {
  test('home page renders identity and forbidden certification claims are absent', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('AKANSH');
    await expect(page.locator('body')).not.toContainText('AWS Certified Solutions Architect');
    await expect(page.locator('body')).not.toContainText('Solutions Architect – Associate');
  });

  test('resume link resolves to a real PDF and is not a placeholder', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.getByRole('link', { name: /view resume/i }).first().getAttribute('href');
    expect(href).toBeTruthy();
    const response = await request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
    const body = await response.body();
    expect(body.length).toBeGreaterThan(8_000);
    expect(body.subarray(0, 4).toString()).toBe('%PDF');
    const text = body.toString('latin1');
    expect(text).not.toContain('RESUME PLACEHOLDER');
    expect(text).not.toContain('Solutions Architect');
    expect(text).not.toContain('CKAD');
  });

  test('resume route renders', async ({ page }) => {
    await page.goto('/resume');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Akansh Mowar');
    await expect(page.getByText('AWS Cloud Practitioner')).toBeVisible();
  });

  test('recruiter mode switches the information experience', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'recruiter', exact: true }).first().click();
    await expect(page.getByText('Microservices supported')).toBeVisible();
    await expect(page.getByRole('button', { name: /view technical architecture/i }).first()).toBeVisible();
  });

  test('engineer mode restores immersive sections', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'recruiter', exact: true }).first().click();
    await page.getByRole('button', { name: 'engineer', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: /ship an artifact/i })).toBeVisible();
  });

  test('release simulation completes', async ({ page }) => {
    await page.goto('/#release');
    await page.getByRole('button', { name: 'Run a release', exact: true }).click();
    await expect(page.getByText('Release simulation complete. Production healthy.', { exact: true })).toBeVisible({ timeout: 20_000 });
  });

  test('command palette opens and answers whoami', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    const input = page.getByLabel('Command input');
    await expect(input).toBeVisible();
    await input.fill('whoami');
    await input.press('Enter');
    await expect(page.getByText('DevOps / Platform / Cloud Engineer').first()).toBeVisible();
  });

  test('contact links are present', async ({ page }) => {
    await page.goto('/#contact');
    await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
    await expect(page.locator('a[href*="github.com"]').first()).toBeVisible();
  });
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('boot overlay never blocks the page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Control plane initializing')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
