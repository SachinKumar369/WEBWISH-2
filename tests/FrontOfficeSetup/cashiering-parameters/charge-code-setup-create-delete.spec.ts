import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { ChargeCodeSetupPage } from '../../../src/pages/FrontOfficeSetup/CashieringParameters/ChargeCodeSetupPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Cashiering Parameters - Charge Code Setup', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_CASHIER_CHARGECODE_001: create and delete charge code setup', async ({ page, context }) => {
    test.setTimeout(30 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const chargeCodeSetupPage = new ChargeCodeSetupPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Charge Code Setup flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await chargeCodeSetupPage.runChargeCodeSetupCreateDeleteFlow();

    await page.screenshot({
      path: 'screenshots/FOS_CASHIER_CHARGECODE_001.png',
      fullPage: true
    });
  });
});
