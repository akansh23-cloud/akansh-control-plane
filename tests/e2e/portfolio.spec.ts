import { expect, test, type Page } from '@playwright/test';

const RESUME_PDF = '/Akansh_Mowar_DevOps_Platform_Engineer_Resume.pdf';

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

test.describe('production shell', () => {
  test('loads with correct identity, role and no runtime errors', async ({ page }) => {
    const errors = watchConsole(page);
    await page.goto('/');

    await expect(page).toHaveTitle(/Akansh Mowar/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Akansh\s*Mowar/i);
    await expect(page.getByText(/DevOps \/ Platform \/ Cloud Engineer/i).first()).toBeVisible();
    await expect(page.getByText(/Barclays/i).first()).toBeVisible();

    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('has no horizontal overflow and all major chapters render', async ({ page }) => {
    await page.goto('/');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    for (const id of ['headwater', 'flight', 'refit', 'basin', 'split', 'gauges', 'tidewater']) {
      const section = page.locator(`#${id}`);
      await expect(section).toHaveCount(1);
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
    }
  });

  test('publishes metadata and only completed credentials as structured data', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{80,}/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og\.png/);

    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(raw).toBeTruthy();
    const schema = JSON.parse(raw!);
    expect(schema['@type']).toBe('Person');
    expect(schema.name).toBe('Akansh Mowar');
    const creds = JSON.stringify(schema.hasCredential ?? []);
    expect(creds).not.toMatch(/solutions architect/i);
    expect(creds).not.toMatch(/CKAD/i);
    expect(creds).not.toMatch(/DOP-C02/i);
  });

  test('keeps certification claims accurate on the rendered page', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/AWS Certified Solutions Architect/i);

    const tidewater = page.locator('#tidewater');
    await tidewater.scrollIntoViewIfNeeded();
    const text = await tidewater.innerText();
    expect(text).toMatch(/CKAD/i);
    expect(text).toMatch(/DOP-C02/i);
    expect(text.match(/In preparation\s*[—–-]\s*not certified/gi)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  test('resume page and generated PDF are reachable', async ({ page, request }) => {
    const resume = await request.get('/resume');
    expect(resume.status()).toBe(200);

    await page.goto('/resume');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Akansh Mowar');
    await expect(page.getByRole('link', { name: /Download PDF/i })).toHaveAttribute('href', RESUME_PDF);

    const pdf = await request.get(RESUME_PDF);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toMatch(/application\/pdf/i);
    expect((await pdf.body()).length).toBeGreaterThan(10_000);
  });
});

test.describe('signature interactions', () => {
  test('Flight promotes a clean release', async ({ page }) => {
    await page.goto('/');
    const flight = page.locator('#flight');
    await flight.scrollIntoViewIfNeeded();
    await flight.getByRole('button', { name: 'Run a release' }).click();
    await expect(flight.getByText('Promoted', { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('Flight refuses a critical CVE and recovers after the fix', async ({ page }) => {
    await page.goto('/');
    const flight = page.locator('#flight');
    await flight.scrollIntoViewIfNeeded();

    await flight.getByRole('button', { name: /Critical CVE in the image/i }).click();
    await expect(flight.getByText(/Held at/i)).toBeVisible({ timeout: 12_000 });
    await expect(flight.getByRole('button', { name: 'Apply the fix' })).toBeVisible();
    await flight.getByRole('button', { name: 'Apply the fix' }).click();
    await expect(flight.getByText('Promoted', { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('Refit supports presets and keyboard seam movement', async ({ page }) => {
    await page.goto('/');
    const refit = page.locator('#refit');
    await refit.scrollIntoViewIfNeeded();
    const seam = refit.getByRole('slider', { name: /Modernisation seam/i });

    await refit.getByRole('button', { name: 'Before', exact: true }).click();
    await expect(seam).toHaveAttribute('aria-valuenow', '0');
    await refit.getByRole('button', { name: 'After', exact: true }).click();
    await expect(seam).toHaveAttribute('aria-valuenow', '100');

    await seam.focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => Number(await seam.getAttribute('aria-valuenow'))).toBeLessThan(100);
  });

  test('Basin exposes platform and delivery views, selection and GitOps reconciliation', async ({ page }) => {
    await page.goto('/');
    const basin = page.locator('#basin');
    await basin.scrollIntoViewIfNeeded();

    await expect(basin.getByRole('tab')).toHaveCount(7);
    for (const name of ['Verification', 'Evidence', 'Access', 'Build', 'GitOps', 'Infrastructure', 'Runtime']) {
      await basin.getByRole('tab', { name, exact: true }).click();
      await expect(basin.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
    }

    await basin.getByRole('tab', { name: 'Access', exact: true }).click();
    await basin.getByRole('button', { name: /Five roles/i }).click();
    await expect(basin.getByText(/owner · admin · engineer · auditor · viewer/i).last()).toBeVisible();

    await basin.getByRole('tab', { name: 'GitOps', exact: true }).click();
    await basin.getByRole('button', { name: 'Edit the cluster' }).click();
    await expect(basin.getByText('Out of sync', { exact: true })).toBeVisible();
    await basin.getByRole('button', { name: 'Reconcile', exact: true }).click();
    await expect(basin.getByText('Synced', { exact: true })).toBeVisible({ timeout: 8_000 });
  });

  test('Split extracts services and falls back to the monolith', async ({ page }) => {
    await page.goto('/');
    const split = page.locator('#split');
    await split.scrollIntoViewIfNeeded();

    for (let i = 0; i < 5; i += 1) {
      await split.getByRole('button', { name: 'Extract a service' }).click();
    }
    await expect(split.getByText(/7 of 16 still answered here/i)).toBeVisible();

    await split.getByRole('button', { name: 'Take one out of service' }).click();
    await expect(split).toContainText(/not answering.*falls back to the monolith/i);
  });

  test('Gauges responds to load changes', async ({ page }) => {
    await page.goto('/');
    const gauges = page.locator('#gauges');
    await gauges.scrollIntoViewIfNeeded();
    const load = gauges.getByRole('slider', { name: /Load against the resource limit/i });
    const before = Number(await load.getAttribute('aria-valuenow'));

    await load.focus();
    for (let i = 0; i < 9; i += 1) await page.keyboard.press('ArrowRight');

    await expect.poll(async () => Number(await load.getAttribute('aria-valuenow'))).toBeGreaterThan(before);
    await expect(gauges).toContainText(/degrading|shedding/i);
  });

  test('persistent index opens and primary contact links are correct', async ({ page }) => {
    await page.goto('/');
    const index = page.locator('button[aria-controls="key-plate"]');
    await expect(index).toContainText('Index');
    await index.click();
    await expect(index).toHaveAttribute('aria-expanded', 'true');

    const linkedin = page.getByRole('link', { name: 'LinkedIn', exact: true }).first();
    const github = page.getByRole('link', { name: 'GitHub', exact: true }).first();
    await expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/akansh-mowar-5a83261a0');
    await expect(github).toHaveAttribute('href', 'https://github.com/akansh23-cloud');
  });
});
