import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { ActionTypePage } from '../../../src/pages/FrontOfficeSetup/ClientParameters/ActionTypePage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Client Parameters - Action Type', () => {

  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';

    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser...');
      await page.pause();
    }
  });

  test('FOS_CLIENT_ACTIONTYPE_001: create and delete action type automation records', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const actionTypePage = new ActionTypePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and navigating to Action Type');

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // ✅ No change here — wrapper handles CRUD engine internally
    await actionTypePage.runActionTypeCreateDeleteFlow();

    await page.screenshot({
      path: 'screenshots/FOS_CLIENT_ACTIONTYPE_001.png',
      fullPage: true
    });
  });

});