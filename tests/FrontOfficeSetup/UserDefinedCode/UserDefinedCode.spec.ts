import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { UserDefinedCodesPage } from '../../../src/pages/FrontOfficeSetup/UserDefinedCode/UserDefinedCodePage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('User Defined Codes - All Screens', () => {

  const screens = [
    'User Defined Codes',
    'User Defined Fields'
    //'User Defined Field List Link'
  ];

  for (const screen of screens) {

    test(`CRUD - ${screen}`, async ({ page, context }) => {

      test.setTimeout(20 * 60 * 1000);

      const loginPage = new LoginPage(page, context);
      const udcPage = new UserDefinedCodesPage(page, context, screen);

      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info(`Executing User Defined Codes for: ${screen}`);

      await loginPage.loginWithPropertySelection(user.username, user.password, 2);

      await udcPage.runFlow();

      await page.screenshot({
        path: `screenshots/udc_${screen.replace(/\s/g, '_')}.png`,
        fullPage: true
      });
    });

  }
});