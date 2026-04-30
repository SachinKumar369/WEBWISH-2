import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { ParameterSetupCreateOperationsPage } from '../../../src/pages/FrontOfficeSetup/ParameterSetup/ParameterSetupCreateOperationsPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Parameter Setup - Create Operations Sequence', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_PARAM_CREATEOPS_001: create guest class, public area, then title master', async ({ page, context }) => {
    test.setTimeout(30 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const parameterSetupCreateOperationsPage = new ParameterSetupCreateOperationsPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Parameter Setup create operations sequence');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await parameterSetupCreateOperationsPage.runCreateOperationsInSequence();

    await page.screenshot({
      path: 'screenshots/FOS_PARAM_CREATEOPS_001.png',
      fullPage: true
    });
  });
});
