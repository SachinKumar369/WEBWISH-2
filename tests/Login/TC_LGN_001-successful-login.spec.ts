import { test, expect } from '@playwright/test';

const BASE_URL =
  process.env.BASE_URL || 'https://qc2webwish.prologicfirst.in/login/z6cQJcxmrEbhhFXqdoj64Q%3D%3D';

const VALID_USERNAME = process.env.VALID_USERNAME || 'SACH';
const VALID_PASSWORD = process.env.VALID_PASSWORD || 'Sachin@578';

test.describe('TC_LGN_001 - Successful Login with Valid Credentials', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('TC_LGN_001: Should login successfully with valid credentials and land on property selection', async ({
    page,
  }) => {
    // ── Step 1: Verify login page is displayed with all expected elements ──
    const logo = page.getByRole('link', { name: 'logo' });
    const welcomeHeading = page.getByRole('heading', { name: 'Welcome!' });
    const subtitle = page.getByText('Please login to your account');
    const userIdInput = page.getByRole('textbox', { name: 'Enter username.' });
    const passwordInput = page.getByRole('textbox', { name: 'Enter password' });
    const loginButton = page.getByRole('button', { name: 'Log in' });
    const forgotPasswordLink = page.getByRole('link', { name: 'Forgot password?' });

    await expect(logo).toBeVisible();
    await expect(welcomeHeading).toBeVisible();
    await expect(subtitle).toBeVisible();
    await expect(userIdInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
    await expect(forgotPasswordLink).toBeVisible();

    // ── Step 2: Enter valid User Id ──
    await userIdInput.fill(VALID_USERNAME);
    await expect(userIdInput).toHaveValue(VALID_USERNAME);

    // ── Step 3: Enter valid Password (verify characters are masked) ──
    await passwordInput.fill(VALID_PASSWORD);
    expect(await passwordInput.getAttribute('type')).toBe('password');
    await expect(passwordInput).toHaveValue(VALID_PASSWORD);

    // ── Step 4: Click the Log in button ──
    await loginButton.click();

    // ── Step 5: Wait for navigation away from login ──
    await expect
      .poll(
        async () => {
          const url = page.url();
          return !url.includes('/login');
        },
        { timeout: 15000 }
      )
      .toBeTruthy();

    // ── Step 6: Verify authenticated landing (property selection or dashboard) ──
    const currentUrl = page.url();
    const propertySelectionVisible = await page
      .getByText('Select a property to signin!')
      .isVisible()
      .catch(() => false);
    const dashboardVisible = await page
      .locator('#page-topbar')
      .isVisible()
      .catch(() => false);

    expect(propertySelectionVisible || dashboardVisible).toBeTruthy();
    expect(currentUrl).not.toContain('/login');
  });
});
