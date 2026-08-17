#!/usr/bin/env node
/**
 * Visual QA capture.
 *
 * The previous build was signed off from source rather than from screenshots,
 * and it shipped mobile screens that were 70% empty. This script exists so
 * that cannot happen again: it drives a real browser through every
 * interaction at six viewports and writes the frames to disk, then reports
 * horizontal overflow, page height and console errors per viewport.
 *
 *   npx playwright install chromium
 *   npx next build && npx next start -p 3100
 *   node scripts/screenshots.mjs qa                  all viewports
 *   node scripts/screenshots.mjs qa mobile390        one viewport
 *
 * CHROMIUM overrides the browser binary when Playwright's own download is
 * unavailable — set it to any Chrome/Chromium executable.
 */

import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const EXEC = process.env.CHROMIUM || undefined;
const BASE = process.env.BASE_URL || 'http://localhost:3100';
const OUT = process.argv[2] || 'qa';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile390', width: 390, height: 844, dsf: 2, mobile: true },
  { name: 'mobile430', width: 430, height: 932, dsf: 2, mobile: true },
  { name: 'mobile360', width: 360, height: 780, dsf: 2, mobile: true },
  { name: 'tablet1024', width: 1024, height: 768, dsf: 2, mobile: false },
  { name: 'laptop1440', width: 1440, height: 900, dsf: 1, mobile: false },
  { name: 'desktop1920', width: 1920, height: 1080, dsf: 1, mobile: false },
];

const only = process.argv[3];

const browser = await chromium.launch({
  executablePath: EXEC,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
});

const report = [];

for (const vp of VIEWPORTS) {
  if (only && !vp.name.includes(only)) continue;
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dsf,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  const shot = async (label, opts = {}) => {
    await page.screenshot({ path: `${OUT}/${vp.name}-${label}.png`, ...opts });
  };

  // horizontal overflow check
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  await shot('01-hero');
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await page.waitForTimeout(400);
  await shot('02-hero-second');

  // Flight
  await page.locator('#flight').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await shot('03-flight-idle');
  await page.getByRole('button', { name: 'Run a release' }).click();
  await page.waitForTimeout(3000);
  await shot('04-flight-running');
  await page.getByRole('button', { name: 'Critical CVE in the image' }).click();
  await page.waitForTimeout(5200);
  await shot('05-flight-failed');
  const fix = page.getByRole('button', { name: 'Apply the fix' });
  if (await fix.count()) { await fix.click(); await page.waitForTimeout(6000); }
  await shot('06-flight-recovered');

  // Refit
  await page.locator('#refit').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await shot('07-refit');
  await page.getByRole('button', { name: 'Before', exact: true }).click();
  await page.waitForTimeout(500);
  await shot('08-refit-before');
  await page.getByRole('button', { name: 'After', exact: true }).click();
  await page.waitForTimeout(600);
  await shot('09-refit-after');

  // Basin
  await page.locator('#basin').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await shot('10-basin-gitops');
  await page.getByRole('button', { name: 'Edit the cluster' }).click();
  await page.waitForTimeout(700);
  await shot('11-basin-drift');
  await page.getByRole('button', { name: 'Reconcile' }).click();
  await page.waitForTimeout(1100);
  await shot('12-basin-reconciled');
  await page.getByRole('tab', { name: 'Runtime' }).click();
  await page.waitForTimeout(600);
  await shot('13-basin-runtime');
  await page.getByRole('tab', { name: 'Build' }).click();
  await page.waitForTimeout(600);
  await shot('14-basin-build');

  // Split
  await page.locator('#split').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await shot('15-split');
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Extract a service' }).click();
    await page.waitForTimeout(90);
  }
  await page.getByRole('button', { name: 'Take one out of service' }).click();
  await page.waitForTimeout(600);
  await shot('16-split-fallback');

  // Gauges
  await page.locator('#gauges').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await shot('17-gauges');
  const marker = page.locator('[role="slider"][aria-label*="Load"]');
  await marker.focus();
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(700);
  await shot('18-gauges-shedding');

  // Tidewater
  await page.locator('#tidewater').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await shot('19-tidewater');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await shot('20-contact');

  // Index panel
  await page.getByRole('button', { name: /Index/ }).click();
  await page.waitForTimeout(500);
  await shot('21-index');
  await page.keyboard.press('Escape');

  // Resume
  await page.goto(`${BASE}/resume`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await shot('22-resume');

  // full page
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await shot('99-fullpage', { fullPage: true });

  const height = await page.evaluate(() => document.body.scrollHeight);
  report.push({ viewport: vp.name, overflowPx: overflow, pageHeight: height, errors });
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
