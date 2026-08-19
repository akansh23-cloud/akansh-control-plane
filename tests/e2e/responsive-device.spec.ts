import { mkdir } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const routes = ['/', '/resume', '/cloud-ops'] as const;
const plateIds = ['headwater', 'flight', 'refit', 'basin', 'split', 'gauges', 'watch', 'vault', 'tidewater'] as const;

function safeName(value: string) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

async function settle(page: Page) {
  await page.waitForLoadState('domcontentloaded');

  if (new URL(page.url()).pathname === '/cloud-ops') {
    const commissioning = page.getByRole('status', { name: 'Commissioning the BLACKOUT incident room' });
    await commissioning.waitFor({ state: 'visible', timeout: 1_000 }).catch(() => undefined);
    await commissioning.waitFor({ state: 'detached', timeout: 4_000 }).catch(() => undefined);
  }

  await page.evaluate(async () => {
    if ('fonts' in document) await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

async function expectNoPageOverflow(page: Page, label: string) {
  const geometry = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect.soft(geometry.document, `${label}: document width`).toBeLessThanOrEqual(geometry.viewport + 1);
  expect.soft(geometry.body, `${label}: body width`).toBeLessThanOrEqual(geometry.viewport + 1);
}

async function capture(page: Page, testInfo: TestInfo, label: string) {
  const dir = 'test-results/device-qa';
  await mkdir(dir, { recursive: true });
  await page.screenshot({
    path: `${dir}/${safeName(testInfo.project.name)}-${safeName(label)}.png`,
    fullPage: false,
  });
}

test.describe('Responsive device contract', () => {
  test('public routes never widen the viewport', async ({ page }, testInfo) => {
    for (const route of routes) {
      await page.goto(route);
      await settle(page);
      await expectNoPageOverflow(page, `${testInfo.project.name} ${route}`);
      await capture(page, testInfo, route === '/' ? 'home' : route.slice(1));
    }
  });

  test('operator chrome, Cloud Ops launcher and Flight compose without collisions', async ({ page }, testInfo) => {
    await page.goto('/');
    await settle(page);

    const indexButton = page.locator('button[aria-controls="key-plate"]');
    const runButton = page.locator('button[aria-controls="living-release-panel"]');
    const bar = indexButton.locator('..');
    const portal = page.getByRole('button', { name: 'Enter BLACKOUT Cloud Ops incident room' });

    const chrome = await page.evaluate(() => {
      const index = document.querySelector<HTMLButtonElement>('button[aria-controls="key-plate"]');
      const barNode = index?.parentElement;
      const portalNode = document.querySelector<HTMLButtonElement>('button[aria-label="Enter BLACKOUT Cloud Ops incident room"]');
      const capsuleNode = document.querySelector<HTMLElement>('[data-capsule-root]');
      const barRect = barNode?.getBoundingClientRect();
      const portalRect = portalNode?.getBoundingClientRect();
      const capsuleRect = capsuleNode?.getBoundingClientRect();
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        rail: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail')) || 0,
        bar: barRect ? { left: barRect.left, right: barRect.right, top: barRect.top, bottom: barRect.bottom, height: barRect.height } : null,
        portal: portalRect ? { left: portalRect.left, right: portalRect.right, top: portalRect.top, bottom: portalRect.bottom } : null,
        capsule: capsuleRect ? { left: capsuleRect.left, right: capsuleRect.right, top: capsuleRect.top, bottom: capsuleRect.bottom } : null,
      };
    });

    expect(chrome.bar).not.toBeNull();
    expect(chrome.portal).not.toBeNull();
    if (chrome.bar) {
      expect.soft(chrome.bar.left, 'operator bar left edge').toBeGreaterThanOrEqual(-1);
      expect.soft(chrome.bar.right, 'operator bar right edge').toBeLessThanOrEqual(chrome.width + 1);
      expect.soft(chrome.bar.bottom, 'operator bar bottom edge').toBeLessThanOrEqual(chrome.height + 1);
      expect.soft(chrome.bar.height, 'operator bar must stay inside the reserved rail').toBeLessThanOrEqual(chrome.rail + 2);
    }
    if (chrome.portal) {
      expect.soft(chrome.portal.left, 'Cloud Ops launcher left edge').toBeGreaterThanOrEqual(-1);
      expect.soft(chrome.portal.right, 'Cloud Ops launcher right edge').toBeLessThanOrEqual(chrome.width + 1);
      expect.soft(chrome.portal.top, 'Cloud Ops launcher top edge').toBeGreaterThanOrEqual(-1);
      expect.soft(chrome.portal.bottom, 'Cloud Ops launcher bottom edge').toBeLessThanOrEqual(chrome.height + 1);
    }
    if (chrome.width <= 719 && chrome.portal && chrome.capsule) {
      const portalCapsuleOverlap = !(
        chrome.portal.right <= chrome.capsule.left ||
        chrome.portal.left >= chrome.capsule.right ||
        chrome.portal.bottom <= chrome.capsule.top ||
        chrome.portal.top >= chrome.capsule.bottom
      );
      expect.soft(portalCapsuleOverlap, 'mobile Cloud Ops launcher must not overlap the release capsule').toBeFalsy();
    }

    if (chrome.width <= 719) {
      const experience = page.locator('#headwater').getByText('Experience', { exact: true }).first();
      const box = await experience.boundingBox();
      const lineHeight = await experience.evaluate((node) => Number.parseFloat(getComputedStyle(node).lineHeight));
      expect(box).not.toBeNull();
      if (box && Number.isFinite(lineHeight)) {
        expect.soft(box.height, 'Experience label must remain on one line').toBeLessThanOrEqual(lineHeight * 1.25);
      }
    }

    await indexButton.click();
    const index = page.locator('#key-plate');
    await expect(index).toBeVisible();
    const indexBox = await index.boundingBox();
    expect(indexBox).not.toBeNull();
    if (indexBox) {
      expect.soft(indexBox.x).toBeGreaterThanOrEqual(-1);
      expect.soft(indexBox.x + indexBox.width).toBeLessThanOrEqual(chrome.width + 1);
    }
    await indexButton.click();

    await runButton.click();
    const runPanel = page.locator('#living-release-panel');
    await expect(runPanel).toBeVisible();
    const runBox = await runPanel.boundingBox();
    expect(runBox).not.toBeNull();
    if (runBox) {
      expect.soft(runBox.x).toBeGreaterThanOrEqual(-1);
      expect.soft(runBox.x + runBox.width).toBeLessThanOrEqual(chrome.width + 1);
    }
    await runButton.click();

    const flight = page.locator('#flight');
    await flight.scrollIntoViewIfNeeded();
    await expectNoPageOverflow(page, `${testInfo.project.name} Flight`);

    const stages = flight.locator('ol[aria-label="Release stages"] > li');
    await expect(stages).toHaveCount(9);
    const stageReadability = await stages.evaluateAll((nodes) => nodes.map((node) => {
      const label = node.querySelector<HTMLElement>('span:last-child');
      if (!label) return { text: '', visible: false, inside: false, height: 0 };
      const chamber = node.getBoundingClientRect();
      const rect = label.getBoundingClientRect();
      const style = getComputedStyle(label);
      return {
        text: label.textContent?.trim() ?? '',
        visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0 && rect.width > 0 && rect.height > 0,
        inside: rect.left >= chamber.left - 1 && rect.right <= chamber.right + 1 && rect.top >= chamber.top - 1 && rect.bottom <= chamber.bottom + 1,
        height: chamber.height,
      };
    }));

    for (const [indexNumber, stage] of stageReadability.entries()) {
      expect.soft(stage.text.length, `Flight stage ${indexNumber + 1} has a label`).toBeGreaterThan(0);
      expect.soft(stage.visible, `Flight stage ${indexNumber + 1} label is visible`).toBeTruthy();
      expect.soft(stage.inside, `Flight stage ${indexNumber + 1} label stays inside its chamber`).toBeTruthy();
      if (chrome.width <= 719) {
        expect.soft(stage.height, `Flight stage ${indexNumber + 1} mobile chamber height`).toBeLessThanOrEqual(52);
      }
    }

    await capture(page, testInfo, 'flight');
    await expect(portal).toBeVisible();
    await expect(bar).toBeVisible();
  });

  test('every portfolio plate remains page-safe while scrolling', async ({ page }, testInfo) => {
    await page.goto('/');
    await settle(page);

    for (const id of plateIds) {
      const plate = page.locator(`#${id}`);
      await plate.scrollIntoViewIfNeeded();
      await expect(plate).toBeVisible();
      await expectNoPageOverflow(page, `${testInfo.project.name} #${id}`);
    }

    await capture(page, testInfo, 'tidewater');
  });
});
