import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { DebtorAccountsPage } from '../../../src/pages/FrontOfficeSetup/CashieringParameters/DebtorAccountsPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Cashiering Parameters - Debtor Accounts', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_CASHIER_DEBTOR_001: create and delete debtor accounts', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const debtorAccountsPage = new DebtorAccountsPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Debtor Accounts create/delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await debtorAccountsPage.createDebtorAccountsAndDeleteFlow();

    await page.screenshot({
      path: 'screenshots/FOS_CASHIER_DEBTOR_001.png',
      fullPage: true
    });
  });
});
