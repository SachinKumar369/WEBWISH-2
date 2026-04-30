import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { AlertTypePage } from '../../../src/pages/FrontOfficeSetup/ClientParameters/AlertTypePage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Client Parameters - Alert Types', () => {

  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';

    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser...');
      await page.pause();
    }
  });

  test('FOS_CLIENT_ALERTTYPE_001: create and delete alert type automation records', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const alertTypePage = new AlertTypePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and navigating to Alert Types');

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // ✅ Same pattern as Action Type
    await alertTypePage.runAlertTypeCreateDeleteFlow();

    await page.screenshot({
      path: 'screenshots/FOS_CLIENT_ALERTTYPE_001.png',
      fullPage: true
    });
  });

});