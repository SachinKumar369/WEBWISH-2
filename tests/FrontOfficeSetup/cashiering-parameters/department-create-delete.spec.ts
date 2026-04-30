import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { DepartmentCreateDeletePage } from '../../../src/pages/FrontOfficeSetup/CashieringParameters/DepartmentCreateDeletePage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Cashiering Parameters - Department Create Delete', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_CASHIER_DEPT_002: create unique and delete department', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const departmentPage = new DepartmentCreateDeletePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Department create/delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await departmentPage.runDepartmentCreateDeleteFlowWithUniqueness();

    await page.screenshot({
      path: 'screenshots/FOS_CASHIER_DEPT_002.png',
      fullPage: true
    });
  });
});
