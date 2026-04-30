import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { MealPlanDetailsSaveAndAddNewPage } from '../../src/pages/ManagerFunction/MealPlanDetailsSaveAndAddNewPage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe.serial('Manager Function - Meal Plan Details Save And Add New', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('MGR_MEAL_ADDNEW_001: Create multiple meal plans using Save & Add New', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const mealPlanSaveAddNewPage = new MealPlanDetailsSaveAndAddNewPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Meal Plan Save & Add New flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 0);

    const createdRecords = await mealPlanSaveAddNewPage.runMealPlanSaveAndAddNewFlow(2);
    expect(createdRecords.length).toBe(2);

    logger.info('Validating created meal plans in table');
    await mealPlanSaveAddNewPage.verifyCreatedMealPlansInTable(createdRecords);

    await page.screenshot({
      path: 'screenshots/MGR_MEAL_ADDNEW_001.png',
      fullPage: true
    });
  });
});
