import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { SpecialAccountPage, SpecialAccountData } from '../../src/pages/FrontDesk/SpecialAccountPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe('Frontdesk - Special Accounts', () => {
  let special: SpecialAccountPage;

  test.beforeEach(async ({ page, context }) => {
    special = new SpecialAccountPage(page, context);
    logger.info(`Starting test: ${test.info().title}`);
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.afterEach(async ({ page }) => {
    logger.info(`Finished test: ${test.info().title}`);
    if (test.info().status === 'failed') {
      const path = await page.screenshot({
        path: `screenshots/${test.info().title.replace(/\s+/g, '_')}.png`,
        fullPage: true
      });
      logger.error(`Failure screenshot: ${path}`);
    }

    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FD_SPECIAL_001: create and verify new special account', async ({ page, context }) => {
    // login and property select
    const loginPage = new LoginPage(page, context);
    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // wait for navigation
    await page.waitForTimeout(2000);

    // navigate to special accounts
    await special.searchAndOpenSpecialAccounts('Special Accounts');
    await special.waitForPageLoad();

    const account: SpecialAccountData = {
      name: 'Test Account',
      billTo: 'Test Bill',
      fxCode: 'AFN Afghanistan',
      rateCode: 'BARD best rate',
      marketSegment: 'OPER Agents/',
      businessSource: 'BSTE BUSINESS SRC',
      domicile: 'AF Afghanistan AL',
      corporateId: 'C0001 Corporate'
    };

    await special.createSpecialAccount(account);

    // verify success message & close dialog
    await expect(special.successMessage).toContainText('Details created/updated successfully.');
    await special.confirmDialog();

    // search for the created account and verify it appears in the list
    await special.searchAccount('test account');
    await expect(special.listContainer).toContainText('TEST ACCOUNT');
  });
});