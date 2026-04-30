import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { GuestClassDeletePage } from '../../../src/pages/FrontOfficeSetup/ParameterSetup/GuestClassDeletePage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Parameter Setup - Guest Class Delete', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_PARAM_GUESTCLASS_DELETE_001: delete all automation guest classes', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const guestClassDeletePage = new GuestClassDeletePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Guest Class delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await guestClassDeletePage.openGuestClassPage();
    await guestClassDeletePage.deleteAllAutomationGuestClasses('automation');

    await page.screenshot({
      path: 'screenshots/FOS_PARAM_GUESTCLASS_DELETE_001.png',
      fullPage: true
    });
  });
});
