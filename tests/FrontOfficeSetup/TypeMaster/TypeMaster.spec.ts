import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { TypeMasterPage } from '../../../src/pages/FrontOfficeSetup/TypeMaster/TypeMasterPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('Type Master - All Screens', () => {

  const screens = [
    'Activity Type',
    'Contact Type',
    'Notes Type',
    'Service Type'
  ];

  for (const screen of screens) {

    test(`CRUD - ${screen}`, async ({ page, context }) => {

      test.setTimeout(20 * 60 * 1000);

      const loginPage = new LoginPage(page, context);
      const typePage = new TypeMasterPage(page, context, screen);

      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info(`Executing Type Master for: ${screen}`);

      await loginPage.loginWithPropertySelection(user.username, user.password, 2);

      await typePage.runFlow();

      await page.screenshot({
        path: `screenshots/type_${screen.replace(/\s/g, '_')}.png`,
        fullPage: true
      });
    });

  }
});