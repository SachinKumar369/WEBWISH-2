import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { MealPlanDetailsPage } from '../../src/pages/ManagerFunction/MealPlanDetailsPage';
import { MealPlanDetailsDeletePage } from '../../src/pages/ManagerFunction/MealPlanDetailsDeletePage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe.serial('Manager Function - Meal Plan Details', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('MGR_MEAL_001: Create and delete meal plan details in same flow', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const mealPlanDetailsPage = new MealPlanDetailsPage(page, context);
    const mealPlanDetailsDeletePage = new MealPlanDetailsDeletePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Meal Plan create and delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 0);

    logger.info('Step 1: Creating meal plan details');
    const createdMealPlan = await mealPlanDetailsPage.runMealPlanDetailsFlow();

    // logger.info('Step 1.1: Validating created meal plan in table');
    // await mealPlanDetailsPage.verifyCreatedMealPlanInTable(createdMealPlan);

    logger.info('Step 2: Deactivating and deleting meal plan details');
    await mealPlanDetailsDeletePage.runMealPlanDetailsDeleteFlow();

    await page.screenshot({
      path: 'screenshots/MGR_MEAL_001.png',
      fullPage: true
    });
  });
});
