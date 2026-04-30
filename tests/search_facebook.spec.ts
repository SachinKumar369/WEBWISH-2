import { test } from '@playwright/test';

test.use({ channel: 'chrome' });

test('Search Facebook on Google', async ({ page }) => {
  await page.goto('https://www.google.com');
  await page.fill('textarea[name="q"]', 'Facebook');
  await page.press('textarea[name="q"]', 'Enter');
  await page.waitForLoadState();

  const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
  if (keepBrowserOpen) {
    await page.pause();
  }
});
