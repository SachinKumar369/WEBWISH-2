import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test('Navigate to Task Management', async ({ page }) => {
    // Step 1: Login with valid credentials (User ID: SACH, Password: Sachin@578).
    await page.goto('https://qc2webwish.prologicfirst.in/#/login/z6cQJcxmrEbhhFXqdoj64Q%3D%3D');
    await page.fill('input[placeholder="User ID"]', 'SACH');
    await page.fill('input[placeholder="Password"]', 'Sachin@578');
    await page.click('button:has-text("Login")');
    await page.waitForLoadState('networkidle');

    // Step 2: Select the property from the property selection screen.
    await page.click('text=WEBWE Webwish Hotel');

    // Step 3: Hover over the leftmost menu and click on 'Front Desk'.
    await page.hover('text=Front Desk');
    await page.click('text=Front Desk');

    // Step 4: Click on 'Task Management'.
    await page.click('text=Task Management');

    // Expect: The Task Management page is displayed.
    await expect(page).toHaveURL(/.*task-management/);
  });
});