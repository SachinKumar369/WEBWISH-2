import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { UserDepartmentPage } from '../../../src/pages/FrontOfficeSetup/ParameterSetup/UserDepartmentPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Parameter Setup - User Department', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_PARAM_USERDEPT_001: create and delete user department', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const userDepartmentPage = new UserDepartmentPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for User Department flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await userDepartmentPage.runUserDepartmentCreateDeleteFlow();

    await page.screenshot({
      path: 'screenshots/FOS_PARAM_USERDEPT_001.png',
      fullPage: true
    });
  });
});
