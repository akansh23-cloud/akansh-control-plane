import { defineConfig, devices } from '@playwright/test';

/**
 * The brief asks for the site to be checked at four widths and with reduced
 * motion on. Those are projects here rather than a checklist, so they run
 * every time rather than when someone remembers.
 *
 * `npm run test:e2e` starts the production build, not the dev server — the
 * thing being tested should be the thing being shipped.
 */

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/**
 * Some environments already have a Chromium on disk and cannot reach the
 * Playwright CDN to fetch the pinned one. `CHROMIUM_PATH` points the Chromium
 * projects at it. On a normal machine it is unset and nothing changes.
 */
const chromiumLaunch = process.env.CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } }
  : {};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'desktop-1920',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 }, ...chromiumLaunch },
    },
    {
      name: 'laptop-1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, ...chromiumLaunch },
    },
    {
      name: 'tablet-1024',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 }, ...chromiumLaunch },
    },
    {
      name: 'mobile-390',
      use: { ...devices['iPhone 13'] },
    },
    /* The two phone widths the brief names, on Chromium, so the responsive
       gates still run where WebKit cannot be installed. */
    {
      name: 'mobile-390-chromium',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
        ...chromiumLaunch,
      },
    },
    {
      name: 'mobile-430-chromium',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 430, height: 932 },
        ...chromiumLaunch,
      },
    },
    {
      name: 'reduced-motion',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        contextOptions: { reducedMotion: 'reduce' },
        ...chromiumLaunch,
      },
    },
    {
      name: 'safari',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run start',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
