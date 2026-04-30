import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { ItemParametersPage } from '../../../src/pages/FrontOfficeSetup/ItemParameters/ItemParametersPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('Item Parameters - All Screens', () => {

  const screens = [
    'Item Category',
    'Items Master'
  ];

  for (const screen of screens) {

    test(`CRUD - ${screen}`, async ({ page, context }) => {

      test.setTimeout(20 * 60 * 1000);

      const loginPage = new LoginPage(page, context);
      const itemPage = new ItemParametersPage(page, context, screen);

      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info(`Executing Item Parameters for: ${screen}`);

      await loginPage.loginWithPropertySelection(user.username, user.password, 2);

      await itemPage.runFlow();

      await page.screenshot({
        path: `screenshots/item_${screen.replace(/\s/g, '_')}.png`,
        fullPage: true
      });
    });

  }
});