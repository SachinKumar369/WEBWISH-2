import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { CityStateMasterPage } from '../../../src/pages/FrontOfficeSetup/CityStateMaster/CityStateMasterPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - City State Master Create/Delete', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_CITYSTATE_001: create and delete city master records', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const cityStateMasterPage = new CityStateMasterPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for City State Master flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await cityStateMasterPage.runFlow();

    await page.screenshot({
      path: 'screenshots/FOS_CITYSTATE_001.png',
      fullPage: true
    });
  });
});