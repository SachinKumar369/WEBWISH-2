import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { TitleMasterPage } from '../../../src/pages/FrontOfficeSetup/ParameterSetup/TitleMasterPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Parameter Setup - Title Master', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_PARAM_TITLEMASTER_001: create and delete title master', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const titleMasterPage = new TitleMasterPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Title Master flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await titleMasterPage.runTitleMasterCreateDeleteFlow();

    await page.screenshot({
      path: 'screenshots/FOS_PARAM_TITLEMASTER_001.png',
      fullPage: true
    });
  });
});
