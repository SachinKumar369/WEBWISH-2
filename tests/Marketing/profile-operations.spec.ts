import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { ProfileOperationsPage } from '../../src/pages/Marketing/ProfileOperationsPage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe.serial('Marketing - Profile Operations', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('MKT_PROFILE_OP_001: search profile and run marketing section operations', async ({ page, context }) => {
    test.setTimeout(120 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const profileOperationsPage = new ProfileOperationsPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for profile operations flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await profileOperationsPage.runCompleteProfileOperationsFlow('sachin');

    await page.screenshot({
      path: 'screenshots/MKT_PROFILE_OP_001.png',
      fullPage: true
    });
  });
});
