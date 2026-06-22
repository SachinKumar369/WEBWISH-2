import { test, expect } from '@playwright/test';

test.describe('Google Search', () => {
  test('seed', async ({ page }) => {
    await page.goto('https://www.google.com');
    await page.waitForLoadState('domcontentloaded');
  });
});
