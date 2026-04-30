import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { SpecialAccountsPage } from '../../src/pages/FrontDesk/SpecialAccountsPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe.serial('Special Accounts Operations', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FA_SPECIAL_ACCOUNT_001: search and perform operations on special account', async ({ page, context }) => {
    test.setTimeout(120 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const specialAccountsPage = new SpecialAccountsPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Take initial screenshot
    await page.screenshot({ path: 'test-results/special-accounts-start.png' });

    // Run complete special account workflow
    await specialAccountsPage.runCompleteSpecialAccountFlow();

    // Take final screenshot
    await page.screenshot({ path: 'test-results/special-accounts-complete.png' });

    logger.info('Special accounts complete workflow test completed successfully');
  });

  test.afterAll(async () => {
    logger.info('Completed Special Accounts test suite');
  });
});
