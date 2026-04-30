import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { PredefinedChargePage } from '../../../src/pages/FrontOfficeSetup/ParameterSetup/PredefinedChargePage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Parameter Setup - Predefined Charge', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_PARAM_CHARGE_001: duplicate validation then create predefined charge', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const predefinedChargePage = new PredefinedChargePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Predefined Charge flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Test parameters
    const chargeAmount = '1000.00';

    await predefinedChargePage.runPredefinedChargeDuplicateThenCreateFlow(chargeAmount);

    await page.screenshot({
      path: 'screenshots/FOS_PARAM_CHARGE_001.png',
      fullPage: true
    });
  });
});
