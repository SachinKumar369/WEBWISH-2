import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { PublicAreaPage } from '../../../src/pages/FrontOfficeSetup/ParameterSetup/PublicAreaPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Parameter Setup - Public Area', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_PARAM_PUBLICAREA_001: duplicate public area code validation', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const publicAreaPage = new PublicAreaPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Public Area flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await publicAreaPage.openPublicAreaPage();
    await publicAreaPage.validateDuplicatePublicAreaCode();

    await page.screenshot({
      path: 'screenshots/FOS_PARAM_PUBLICAREA_001.png',
      fullPage: true
    });
  });
});
