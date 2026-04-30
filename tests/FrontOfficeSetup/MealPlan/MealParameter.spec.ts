import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { MealParametersPage } from '../../../src/pages/FrontOfficeSetup/MealPlan/MealParametersPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Parameter Setup - Meal Parameters', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_PARAM_MEALPARAM_001: create unique meal plans and delete all automation records', async ({ page, context }) => {
    test.setTimeout(30 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const mealParametersPage = new MealParametersPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Meal Parameters create/delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await mealParametersPage.runMealParametersCreateAndCleanupFlow('automation');

    await page.screenshot({
      path: 'screenshots/FOS_PARAM_MEALPARAM_001.png',
      fullPage: true
    });
  });
});
