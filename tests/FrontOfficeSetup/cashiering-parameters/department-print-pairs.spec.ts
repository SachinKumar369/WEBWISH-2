import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { DepartmentPrintSeqPage } from '../../../src/pages/FrontOfficeSetup/CashieringParameters/DepartmentPrintSeqPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Cashiering Parameters - Department Print Pairs', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_CASHIER_DEPT_001: print code and print seq no pairs', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const departmentPrintSeqPage = new DepartmentPrintSeqPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Department print pairs flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    const pairs = await departmentPrintSeqPage.runCollectAllCodeAndPrintSeqNoFlow();

    console.log('Final Pairs:', `[${pairs.join(', ')}]`);
    logger.info(`Final Pairs: [${pairs.join(', ')}]`);

    expect(pairs.length).toBeGreaterThan(0);

    await page.screenshot({
      path: 'screenshots/FOS_CASHIER_DEPT_001.png',
      fullPage: true
    });
  });
});
