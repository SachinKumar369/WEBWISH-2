import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { MealTypePage } from '../../../src/pages/FrontOfficeSetup/MealPlan/MealTypePage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Parameter Setup - Meal Type', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_PARAM_MEALTYPE_001: create meal type and delete all automation records', async ({ page, context }) => {
    test.setTimeout(30 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const mealTypePage = new MealTypePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Meal Type create/update/delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await mealTypePage.runMealTypeCreateUpdateDeleteFlow('automation');

    await page.screenshot({
      path: 'screenshots/FOS_PARAM_MEALTYPE_001.png',
      fullPage: true
    });
  });
});