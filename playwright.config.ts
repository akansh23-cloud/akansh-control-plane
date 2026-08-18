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
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-1920', use: chrome(1920, 1080) },
    { name: 'desktop-1600', use: chrome(1600, 900) },
    { name: 'laptop-1440', use: chrome(1440, 900) },
    { name: 'laptop-1366', use: chrome(1366, 768) },
    { name: 'laptop-1280', use: chrome(1280, 800) },
    { name: 'tablet-1024', use: chrome(1024, 768) },
    {
      name: 'mobile-430-chromium',
      use: { ...devices['Pixel 5'], browserName: 'chromium', viewport: { width: 430, height: 932 }, ...chromiumLaunch },
    },
    {
      name: 'mobile-390-chromium',
      use: { ...devices['Pixel 5'], browserName: 'chromium', viewport: { width: 390, height: 844 }, ...chromiumLaunch },
    },
    {
      name: 'reduced-motion',
      use: { ...chrome(1440, 900), contextOptions: { reducedMotion: 'reduce' } },
    },
    {
      name: 'webkit-1440',
      use: { ...devices['Desktop Safari'], browserName: 'webkit', viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'webkit-mobile-390',
      use: { ...devices['iPhone 13'], browserName: 'webkit', viewport: { width: 390, height: 844 } },
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
