import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { ARAccountTypePage } from '../../../src/pages/FrontOfficeSetup/ClientParameters/ARAccountTypePage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Client Parameters - AR Account Type', () => {

  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';

    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser...');
      await page.pause();
    }
  });

  test('FOS_CLIENT_ARACCOUNT_001: create and delete AR account type automation records', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const arAccountTypePage = new ARAccountTypePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and navigating to AR Account Type');

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // ✅ Same clean call
    await arAccountTypePage.runARAccountTypeCreateDeleteFlow();

    await page.screenshot({
      path: 'screenshots/FOS_CLIENT_ARACCOUNT_001.png',
      fullPage: true
    });
  });

});