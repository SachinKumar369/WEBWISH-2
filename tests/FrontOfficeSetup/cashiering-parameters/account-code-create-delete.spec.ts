import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { AccountCodePage } from '../../../src/pages/FrontOfficeSetup/CashieringParameters/AccountCodePage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Cashiering Parameters - Account Code', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_CASHIER_ACCCODE_001: create and delete account code', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const accountCodePage = new AccountCodePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Account Code create/delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 0);

    await accountCodePage.runAccountCodeCreateDeleteFlow();

    await page.screenshot({
      path: 'screenshots/FOS_CASHIER_ACCCODE_001.png',
      fullPage: true
    });
  });
});
