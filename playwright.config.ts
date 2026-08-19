import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const chromiumLaunch = process.env.CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } }
  : {};

const chrome = (width: number, height: number) => ({
  ...devices['Desktop Chrome'],
  browserName: 'chromium' as const,
  viewport: { width, height },
  ...chromiumLaunch,
});

const responsiveMatch = /(cross-browser|responsive-device)\.spec\.ts/;
const deviceOnlyMatch = /responsive-device\.spec\.ts/;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    /* Chromium desktop/laptop matrix. These projects intentionally run the
       responsive contract instead of legacy version-labelled interaction specs. */
    { name: 'desktop-1920-chromium', testMatch: deviceOnlyMatch, use: chrome(1920, 1080) },
    { name: 'desktop-1600-chromium', testMatch: deviceOnlyMatch, use: chrome(1600, 900) },
    { name: 'desktop-1440-chromium', testMatch: deviceOnlyMatch, use: chrome(1440, 900) },
    { name: 'laptop-1366-chromium', testMatch: responsiveMatch, use: chrome(1366, 768) },
    { name: 'laptop-1280-chromium', testMatch: deviceOnlyMatch, use: chrome(1280, 800) },
    { name: 'laptop-1024-chromium', testMatch: deviceOnlyMatch, use: chrome(1024, 768) },

    /* Android-class Chromium runs use touch, mobile UA and coarse-pointer
       semantics, not just a resized desktop browser. */
    {
      name: 'android-360-chromium',
      testMatch: responsiveMatch,
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
        viewport: { width: 360, height: 800 },
        ...chromiumLaunch,
      },
    },
    {
      name: 'android-390-chromium',
      testMatch: responsiveMatch,
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        ...chromiumLaunch,
      },
    },
    {
      name: 'android-412-chromium',
      testMatch: responsiveMatch,
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
        viewport: { width: 412, height: 915 },
        ...chromiumLaunch,
      },
    },

    /* Tablet breakpoint coverage catches the 720px mobile/desktop handoff. */
    {
      name: 'tablet-768-chromium',
      testMatch: deviceOnlyMatch,
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
        ...chromiumLaunch,
      },
    },

    /* Safari/WebKit coverage on desktop and two iPhone-class widths. */
    {
      name: 'webkit-1440',
      testMatch: responsiveMatch,
      use: {
        ...devices['Desktop Safari'],
        browserName: 'webkit',
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'iphone-390-webkit',
      testMatch: responsiveMatch,
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'iphone-430-webkit',
      testMatch: responsiveMatch,
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
        viewport: { width: 430, height: 932 },
      },
    },

    /* A second desktop engine catches layout assumptions hidden by Blink/WebKit. */
    {
      name: 'firefox-1440',
      testMatch: deviceOnlyMatch,
      use: {
        ...devices['Desktop Firefox'],
        browserName: 'firefox',
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        /* Browser QA intentionally invokes Next directly. `npm run build` has a
           prebuild asset-freshness gate; that independent gate is covered by the
           quality job and must not prevent the browser matrix from booting. */
        command: 'npx --no-install next build && npm run start',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
