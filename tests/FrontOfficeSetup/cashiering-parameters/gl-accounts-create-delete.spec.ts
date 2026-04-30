import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { GLAccountsPage } from '../../../src/pages/FrontOfficeSetup/CashieringParameters/GLAccountsPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Cashiering Parameters - GL Accounts', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_CASHIER_GL_001: create and delete GL Accounts automation records', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const glAccountsPage = new GLAccountsPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for GL Accounts create/delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await glAccountsPage.runGLAccountCreateDeleteFlow();

    await page.screenshot({
      path: 'screenshots/FOS_CASHIER_GL_001.png',
      fullPage: true
    });
  });
});
