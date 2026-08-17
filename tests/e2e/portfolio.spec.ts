import { expect, test, type Page } from '@playwright/test';

/**
 * The §35 checklist, as tests.
 *
 * Two rules kept throughout:
 *  - Assertions go through accessible names and visible text, not CSS module
 *    class names, which are hashed at build time and would make this suite
 *    fail for cosmetic reasons.
 *  - Nothing here asserts an exact pixel. The interactions are checked by
 *    their consequences — a value changed, a gate refused, a fallback label
 *    appeared — because that is what actually has to keep working.
 */

const RESUME_PDF = '/Akansh_Mowar_DevOps_Platform_Engineer_Resume.pdf';

/** Console errors are collected per test and asserted at the end. */
function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 720;

/* ================================================================== */
/* the page loads and says who this is                                 */
/* ================================================================== */

test.describe('homepage', () => {
  test('loads, names him, and states the role', async ({ page }) => {
    const errors = watchConsole(page);
    await page.goto('/');

    await expect(page).toHaveTitle(/Akansh Mowar/);
    await expect(
      page.getByRole('heading', { level: 1 }).first(),
    ).toContainText(/Akansh Mowar/i);

    const body = await page.locator('body').innerText();
    expect(body).toMatch(/DevOps/i);
    expect(body).toMatch(/Barclays/);
    expect(body).toMatch(/Pune/i);

    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('carries the thesis line', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByText(
        /move software safely from code to production/i,
      ).first(),
    ).toBeVisible();
  });

  test('has exactly one h1', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('has canonical, description and Open Graph metadata', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /.{80,}/,
    );
    await expect(
      page.locator('meta[property="og:image"]'),
    ).toHaveAttribute('content', /og\.png/);
  });

  test('publishes Person structured data with no unheld credential', async ({
    page,
  }) => {
    await page.goto('/');
    const raw = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent();
    expect(raw).toBeTruthy();

    const schema = JSON.parse(raw!);
    expect(schema['@type']).toBe('Person');
    expect(schema.name).toBe('Akansh Mowar');

    const creds = JSON.stringify(schema.hasCredential ?? []);
    expect(creds).not.toMatch(/solutions architect/i);
    expect(creds).not.toMatch(/CKAD/i);
  });
});

/* ================================================================== */
/* accuracy, as seen by a visitor                                      */
/* ================================================================== */

test.describe('accuracy on the rendered page', () => {
  test('never claims AWS Certified Solutions Architect', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/solutions architect/i);
  });

  test('shows CKAD only as preparation', async ({ page }) => {
    await page.goto('/');
    const tidewater = page.locator('#tidewater');
    await tidewater.scrollIntoViewIfNeeded();
    const text = await tidewater.innerText();

    if (/CKAD/i.test(text)) {
      expect(text).toMatch(/not certified|in preparation/i);
    }
  });

  test('keeps the three scale numbers as three separate facts', async ({
    page,
  }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();

    expect(body).toMatch(/50\+/);
    expect(body).toMatch(/30\+/);
    expect(body).toMatch(/20\+/);
    // never merged into one claim
    expect(body).not.toMatch(/50\+[^.\n]{0,40}containeris/i);
    expect(body).not.toMatch(/30\+[^.\n]{0,40}microservice/i);
  });

  test('does not attach MAP infrastructure to Career Autopilot', async ({
    page,
  }) => {
    await page.goto('/');
    const split = page.locator('#split');
    await split.scrollIntoViewIfNeeded();
    const text = await split.innerText();

    for (const forbidden of ['Terraform', 'Argo CD', 'EKS', 'GitOps']) {
      expect(text, `Career Autopilot must not claim ${forbidden}`).not.toContain(
        forbidden,
      );
    }
  });

  test('labels the simulated drawings as simulations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/simulation/i).first()).toBeVisible();
  });
});

/* ================================================================== */
/* the four signature interactions                                     */
/* ================================================================== */

test.describe('signature interactions', () => {
  test('01 Headwater — the sluice raises the water', async ({ page }) => {
    await page.goto('/');
    const sluice = page.getByRole('slider', { name: /sluice paddle/i });
    await expect(sluice).toBeVisible();

    const before = Number(await sluice.getAttribute('aria-valuenow'));
    await sluice.focus();
    for (let i = 0; i < 8; i += 1) await page.keyboard.press('ArrowRight');

    await expect
      .poll(async () => Number(await sluice.getAttribute('aria-valuenow')))
      .toBeGreaterThan(before);
  });

  test('02 The Flight — a release climbs the staircase', async ({ page }) => {
    await page.goto('/');
    const flight = page.locator('#flight');
    await flight.scrollIntoViewIfNeeded();

    const status = flight.getByRole('status');
    const before = await status.innerText();

    await flight.getByRole('button', { name: /send the release/i }).click();
    await expect.poll(async () => status.innerText()).not.toBe(before);
  });

  test('02 The Flight — an armed fault is refused at the gate', async ({
    page,
  }) => {
    await page.goto('/');
    const flight = page.locator('#flight');
    await flight.scrollIntoViewIfNeeded();

    await flight.getByRole('button', { name: /cve|vulnerab/i }).first().click();
    await flight.getByRole('button', { name: /send the release/i }).click();

    await expect(
      flight.getByRole('button', { name: /fix and re-run/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('03 The Refit — dragging the seam rebuilds the layers', async ({
    page,
  }) => {
    await page.goto('/');
    const refit = page.locator('#refit');
    await refit.scrollIntoViewIfNeeded();

    const seam = refit.getByRole('slider', { name: /boundary/i });
    await expect(seam).toBeVisible();

    const before = Number(await seam.getAttribute('aria-valuenow'));
    await seam.focus();
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowRight');

    await expect
      .poll(async () => Number(await seam.getAttribute('aria-valuenow')))
      .toBeGreaterThan(before);
  });

  test('04 The Basin — the four views are all reachable', async ({ page }) => {
    await page.goto('/');
    const basin = page.locator('#basin');
    await basin.scrollIntoViewIfNeeded();

    const tabs = basin.getByRole('tab');
    await expect(tabs).toHaveCount(4);

    for (const name of ['Build', 'GitOps', 'Infrastructure', 'Runtime']) {
      await basin.getByRole('tab', { name }).click();
      await expect(basin.getByRole('tab', { name })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    }
  });

  test('04 The Basin — Argo CD reconciles hand-made drift', async ({
    page,
  }) => {
    await page.goto('/');
    const basin = page.locator('#basin');
    await basin.scrollIntoViewIfNeeded();
    await basin.getByRole('tab', { name: 'GitOps' }).click();

    await basin
      .getByRole('button', { name: /change the cluster by hand/i })
      .click();

    await expect(basin.getByRole('status')).toContainText(/drift/i);
    await expect(basin.getByRole('status')).toContainText(/matches Git/i, {
      timeout: 20_000,
    });
  });

  test('05 The Split — services extract and traffic falls back', async ({
    page,
  }) => {
    await page.goto('/');
    const split = page.locator('#split');
    await split.scrollIntoViewIfNeeded();

    const extract = split.getByRole('button', { name: /extract a service/i });
    await extract.click();
    await extract.click();

    await expect(split.getByRole('status')).toContainText(/2/);

    await split
      .getByRole('button', { name: /take one out of service/i })
      .click();
    await expect(split.getByRole('status')).toContainText(/fall(s|ing)? back|monolith/i);
  });

  test('06 Gauge House — load moves the signals', async ({ page }) => {
    await page.goto('/');
    const gauges = page.locator('#gauges');
    await gauges.scrollIntoViewIfNeeded();

    const load = gauges.getByRole('slider', { name: /load on the workload/i });
    const status = gauges.getByRole('status');
    const before = await status.innerText();

    await load.fill('95');
    await expect.poll(async () => status.innerText()).not.toBe(before);
  });
});

/* ================================================================== */
/* the key plate                                                       */
/* ================================================================== */

test.describe('navigation', () => {
  test('the key plate opens and jumps to a plate', async ({ page }) => {
    await page.goto('/');

    const key = page.getByRole('button', { name: /key/i }).first();
    await key.click();
    await expect(key).toHaveAttribute('aria-expanded', 'true');

    await page.getByRole('link', { name: /Gauge House/i }).click();
    await expect(page.locator('#gauges')).toBeInViewport({ ratio: 0.05 });
  });

  test('Escape closes the key plate and returns focus', async ({ page }) => {
    await page.goto('/');
    const key = page.getByRole('button', { name: /key/i }).first();
    await key.click();
    await page.keyboard.press('Escape');
    await expect(key).toHaveAttribute('aria-expanded', 'false');
    await expect(key).toBeFocused();
  });

  test('every plate has a section on the page', async ({ page }) => {
    await page.goto('/');
    for (const id of [
      'headwater',
      'flight',
      'refit',
      'basin',
      'split',
      'gauges',
      'tidewater',
    ]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });
});

/* ================================================================== */
/* résumé and PDF                                                      */
/* ================================================================== */

test.describe('résumé', () => {
  test('/resume renders the document', async ({ page }) => {
    const errors = watchConsole(page);
    await page.goto('/resume');

    await expect(
      page.getByRole('heading', { level: 1 }),
    ).toContainText(/Akansh Mowar/i);

    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Barclays/);
    expect(body).toMatch(/CloudNXT/);
    expect(body).toMatch(/AZ-104/);
    expect(body).not.toMatch(/solutions architect/i);

    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('/resume carries the education section', async ({ page }) => {
    await page.goto('/resume');

    const heading = page.getByRole('heading', { name: /^Education$/i });
    await expect(heading).toBeVisible();

    const body = await page.locator('body').innerText();
    expect(body).toMatch(/University of Petroleum and Energy Studies/i);
    expect(body).toMatch(/B\.Tech/i);
    expect(body).toMatch(/Cloud Computing & Virtualization Technology/i);
    expect(body).toMatch(/July 2019/i);
  });

  test('/resume lists the restored ATS skills', async ({ page }) => {
    await page.goto('/resume');
    const body = await page.locator('body').innerText();
    for (const kw of [
      'Ansible',
      'Prometheus',
      'Grafana',
      'Maven',
      'Gradle',
      'Netcool',
      'GitHub Actions',
      'Bitbucket',
      'Amazon EKS',
    ]) {
      expect(body, `résumé is missing ${kw}`).toContain(kw);
    }
  });

  test('the PDF is served as a real PDF', async ({ request }) => {
    const res = await request.get(RESUME_PDF);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/pdf');

    const body = await res.body();
    expect(body.length).toBeGreaterThan(10_000);
    // A PDF starts with %PDF-
    expect(body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  test('the résumé links to the PDF', async ({ page }) => {
    await page.goto('/resume');
    await expect(
      page.getByRole('link', { name: /download pdf/i }),
    ).toHaveAttribute('href', RESUME_PDF);
  });
});

/* ================================================================== */
/* contact                                                             */
/* ================================================================== */

test.describe('contact', () => {
  test('the real email, LinkedIn and GitHub are reachable', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('#tidewater').scrollIntoViewIfNeeded();

    await expect(
      page.locator('a[href="mailto:mowar23akansh@gmail.com"]').first(),
    ).toBeVisible();
    await expect(
      page
        .locator(
          'a[href="https://www.linkedin.com/in/akansh-mowar-5a83261a0"]',
        )
        .first(),
    ).toBeVisible();
    await expect(
      page.locator('a[href="https://github.com/akansh23-cloud"]').first(),
    ).toBeVisible();
  });

  test('external links open safely', async ({ page }) => {
    await page.goto('/');
    const external = page.locator('a[target="_blank"]');
    const count = await external.count();
    for (let i = 0; i < count; i += 1) {
      await expect(external.nth(i)).toHaveAttribute('rel', /noopener/);
    }
  });
});

/* ================================================================== */
/* crawlability                                                        */
/* ================================================================== */

test.describe('crawlability', () => {
  test('the hero does not swallow vertical scrolling on touch', async ({
    page,
  }) => {
    await page.goto('/');
    /* The opening drawing must let the page scroll through it. Only the
       sluice handle may claim the gesture. */
    const svgTouch = await page
      .locator('#headwater svg')
      .first()
      .evaluate((el) => getComputedStyle(el).touchAction);
    expect(svgTouch).not.toBe('none');

    const handleTouch = await page
      .locator('#headwater [role="slider"]')
      .first()
      .evaluate((el) => getComputedStyle(el).touchAction);
    expect(handleTouch).toBe('none');
  });

  test('robots.txt points at the sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/Sitemap:/i);
  });

  test('sitemap.xml lists the routes', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toMatch(/<urlset/);
    expect(xml).toMatch(/\/resume/);
  });

  test('the OG image exists and is the right size', async ({ request }) => {
    const res = await request.get('/og.png');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
    expect((await res.body()).length).toBeGreaterThan(10_000);
  });

  test('an unknown route returns a designed 404', async ({ page }) => {
    const res = await page.goto('/no-such-plate');
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/dry|not on this drawing set/i).first()).toBeVisible();
  });
});

/* ================================================================== */
/* layout integrity                                                    */
/* ================================================================== */

test.describe('layout', () => {
  for (const path of ['/', '/resume']) {
    test(`${path} does not scroll sideways`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(400);

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('the skip link is the first thing a keyboard reaches', async ({
    page,
  }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator('a.skip-link')).toBeFocused();
  });

  test('tap targets on mobile are big enough', async ({ page }) => {
    test.skip(!isMobile(page), 'mobile only');
    await page.goto('/');

    const key = page.getByRole('button', { name: /key/i }).first();
    const box = await key.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(40);
  });
});

/* ================================================================== */
/* reduced motion                                                      */
/* ================================================================== */

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the drawings still work, they just stop moving', async ({ page }) => {
    await page.goto('/');

    // Headwater still fills.
    const sluice = page.getByRole('slider', { name: /sluice paddle/i });
    await sluice.focus();
    await page.keyboard.press('End');
    await expect
      .poll(async () => Number(await sluice.getAttribute('aria-valuenow')))
      .toBeGreaterThan(50);

    // The flight still completes.
    const flight = page.locator('#flight');
    await flight.scrollIntoViewIfNeeded();
    await flight.getByRole('button', { name: /send the release/i }).click();
    await expect(flight.getByRole('status')).not.toBeEmpty();
  });

  test('nothing animates for longer than a frame', async ({ page }) => {
    await page.goto('/');
    const longest = await page.evaluate(() => {
      let max = 0;
      for (const el of Array.from(document.querySelectorAll('*'))) {
        const s = getComputedStyle(el);
        for (const d of [s.transitionDuration, s.animationDuration]) {
          for (const part of d.split(',')) {
            const v = part.trim();
            const ms = v.endsWith('ms')
              ? parseFloat(v)
              : parseFloat(v) * 1000 || 0;
            if (Number.isFinite(ms)) max = Math.max(max, ms);
          }
        }
      }
      return max;
    });
    expect(longest).toBeLessThanOrEqual(50);
  });
});
