import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginDemoPage } from '../../src/pages/Login/LoginDemoPage';
import { testDataManager } from '../../src/utils/TestDataManager';

/**
 * TC_LOGIN_POS_001 — Successful Login with Valid Credentials
 *
 * Precondition: User `SACH` (or test-data manager user) exists in the system.
 *
 * Steps:
 *  1. Navigate to the login page
 *  2. Verify all login UI elements are visible
 *  3. Enter valid User Id
 *  4. Enter valid Password (verify characters are masked)
 *  5. Click the Log in button
 *  6. Wait for navigation away from /login
 *  7. Verify the user lands on "Select a property to signin!" or Dashboard
 */
test.describe.serial('TC_LOGIN_POS_001 — Successful Login with Valid Credentials', () => {
  let validUsername = process.env.VALID_USERNAME || 'SACH';
  let validPassword = process.env.VALID_PASSWORD || 'Sachin@578';

  test.beforeAll(async () => {
    try {
      const user = await testDataManager.getUserCredentials('all');
      validUsername = user.username;
      validPassword = user.password;
    } catch (error) {
      logger.warn(`Falling back to default credentials for LoginDemo suite: ${error}`);
    }
  });

  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Browser remains open after test.');
    }
  });

  test('TC_LOGIN_POS_001: Should login successfully with valid credentials and land on property selection', async ({
    page,
    context,
  }) => {
    const loginDemoPage = new LoginDemoPage(page, context);

    // Step 1 — Navigate to the login page
    await loginDemoPage.openLoginUrl();

    // Step 2 — Verify all login UI elements are visible
    await loginDemoPage.expectLoginFormFullyVisible();

    // Steps 3–4 — Enter valid credentials (password masking verified inside)
    await loginDemoPage.fillCredentials(validUsername, validPassword);

    // Step 5 — Click the Log in button
    await loginDemoPage.clickLogin();

    // Step 6 — Wait for navigation away from /login
    const landingUrl = await loginDemoPage.waitForNavigationAwayFromLogin();
    expect(landingUrl).not.toContain('/login');

    // Step 7 — Verify authenticated landing
    const landingType = await loginDemoPage.expectAuthenticatedLanding();
    expect(['Property Selection', 'Dashboard']).toContain(landingType);

    logger.info(`TC_LOGIN_POS_001 PASSED — Landed on: ${landingType}`);

    // Take a final screenshot for evidence
    await page.screenshot({
      path: 'screenshots/TC_LOGIN_POS_001.png',
      fullPage: true,
    });
  });
});
