import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { GSTTypePage } from '../../../src/pages/FrontOfficeSetup/CashieringParameters/GSTTypePage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Cashiering Parameters - GST Type', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_CASHIER_GSTTYPE_001: create and delete GST Type automation records', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const gstTypePage = new GSTTypePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for GST Type create/delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await gstTypePage.runGSTTypeCreateDeleteFlow();

    await page.screenshot({
      path: 'screenshots/FOS_CASHIER_GSTTYPE_001.png',
      fullPage: true
    });
  });
});
