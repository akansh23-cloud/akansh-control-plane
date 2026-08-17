import { test } from '@playwright/test';

test('diagnose 390px horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-390', 'mobile diagnostic only');
  await page.goto('/');

  const report = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id,
          className: typeof el.className === 'string' ? el.className : '',
          left: Math.round(rect.left * 100) / 100,
          right: Math.round(rect.right * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 100),
        };
      })
      .filter((item) => item.left < -1 || item.right > viewport + 1 || item.scrollWidth > item.clientWidth + 1)
      .sort((a, b) => Math.max(b.right - viewport, -b.left, b.scrollWidth - b.clientWidth) - Math.max(a.right - viewport, -a.left, a.scrollWidth - a.clientWidth))
      .slice(0, 30);

    return {
      viewport,
      documentScrollWidth: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth - viewport,
      offenders,
    };
  });

  console.log(`MOBILE_OVERFLOW_DIAGNOSTIC ${JSON.stringify(report)}`);
});
