import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { LockScreenAndSignoutPage } from '../../src/pages/Login/LockScreenAndSignoutPage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe.serial('Login - Dashboard Validation After Property Selection', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('LOGIN_DASH_001: Validate dashboard details after login and property selection', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const lockScreenPage = new LockScreenAndSignoutPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    // Use existing framework login + property selection flow used in other modules.
    await loginPage.loginWithPropertySelection(user.username, user.password, 0);

    // Step-by-step dashboard verification after login and property selection.
    await lockScreenPage.validateDashboardAfterPropertySelectionStepByStep();

    await page.screenshot({
      path: 'screenshots/LOGIN_DASH_001.png',
      fullPage: true
    });
  });
});
