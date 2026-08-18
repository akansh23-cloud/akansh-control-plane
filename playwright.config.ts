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

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    /* The complete interaction/content suite runs once at the hardest laptop
       composition. Individual responsive tests inside that suite then exercise
       every required width without multiplying the entire suite eight times. */
    {
      name: 'laptop-1366',
      use: chrome(1366, 768),
    },
    /* Real mobile Chromium semantics (touch/coarse pointer/user agent) get a
       focused interaction pass in addition to the width matrix. */
    {
      name: 'mobile-390-chromium',
      testMatch: /cross-browser\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        ...chromiumLaunch,
      },
    },
    /* WebKit is intentionally focused on the cross-browser contract: chrome,
       release, refit, intro and responsive overflow. */
    {
      name: 'webkit-1440',
      testMatch: /cross-browser\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
        browserName: 'webkit',
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'webkit-mobile-390',
      testMatch: /cross-browser\.spec\.ts/,
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
      },
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
