// spec: specs/plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('Login Basic', async ({ page }) => {
    // 1. Navigate to the login page
    await page.goto('https://qc2webwish.prologicfirst.in/login/z6cQJcxmrEbhhFXqdoj64Q%3D%3D');

    // 2. Enter username SACH
    const usernameField = page.getByRole('textbox', { name: 'Enter username.' });
    await usernameField.click();
    await usernameField.fill('SACH');

    // 3. Enter password Sachin@578
    const passwordField = page.getByRole('textbox', { name: 'Enter password' });
    await passwordField.fill('Sachin@578');

    // 4. Click Login button
    await page.getByRole('button', { name: 'Log in' }).click();

    // 5. Verify successful login - property selection page is visible
    await expect(page.getByRole('heading', { name: 'Select a property to signin!' })).toBeVisible();

    // 6. Select the Webwish Hotel property to complete login
    await page.getByRole('row', { name: 'WEBWE Webwish Hotel 󰍂' }).getByRole('link').click();

    // 7. Verify dashboard is loaded after property selection
    await expect(page.getByRole('heading', { name: 'Welcome! Sachin Kumar.' })).toBeVisible();
  });
});
