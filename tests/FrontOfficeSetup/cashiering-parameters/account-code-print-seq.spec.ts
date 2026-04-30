import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { AccountCodePrintSeqPage } from '../../../src/pages/FrontOfficeSetup/CashieringParameters/AccountCodePrintSeqPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Cashiering Parameters - Account Code Print Seq', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_CASHIER_ACCCODE_002: collect all print sequence numbers', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const accountCodePrintSeqPage = new AccountCodePrintSeqPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Account Code print sequence flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    const printSeqList = await accountCodePrintSeqPage.runCollectAllPrintSeqNoFlow();

    expect(printSeqList.length).toBeGreaterThan(0);
    logger.info(`Collected Print Seq Numbers: ${printSeqList.join(', ')}`);

    await page.screenshot({
      path: 'screenshots/FOS_CASHIER_ACCCODE_002.png',
      fullPage: true
    });
  });
});
