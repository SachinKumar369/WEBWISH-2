import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { VisaTypePage } from '../../../src/pages/FrontOfficeSetup/ParameterSetup/VisaTypePage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Parameter Setup - Visa Type Delete', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_PARAM_VISATYPE_002: delete all automation visa types', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const visaTypePage = new VisaTypePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Visa Type delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await visaTypePage.runVisaTypeDeleteAllAutomationFlow('automation');

    await page.screenshot({
      path: 'screenshots/FOS_PARAM_VISATYPE_002.png',
      fullPage: true
    });
  });
});
