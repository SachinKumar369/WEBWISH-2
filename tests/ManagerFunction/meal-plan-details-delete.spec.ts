import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { MealPlanDetailsDeletePage } from '../../src/pages/ManagerFunction/MealPlanDetailsDeletePage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe.serial('Manager Function - Meal Plan Details Delete', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('MGR_MEAL_DEL_001: Deactivate all meal plans and delete selected rows', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const mealPlanDetailsDeletePage = new MealPlanDetailsDeletePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Meal Plan delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 0);

    await mealPlanDetailsDeletePage.runMealPlanDetailsDelete();

    await page.screenshot({
      path: 'screenshots/MGR_MEAL_DEL_001.png',
      fullPage: true
    });
  });
});
