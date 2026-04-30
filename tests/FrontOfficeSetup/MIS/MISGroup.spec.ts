import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { testDataManager } from '../../../src/utils/TestDataManager';
import { MisGroupPage } from '../../../src/pages/FrontOfficeSetup/MIS/MisGroupPage';

test.describe.serial('MIS Group - All Screens', () => {

  const screens = [
    'Business Source Main Head',
    'Corporate',
    'Domicile Code Main Head',
    'Market Segment Main Head',
    'Special Service',
    'Travel Agent Main Head',
    'Room Attribute Category'
  ];

  for (const screen of screens) {

    test(`CRUD - ${screen}`, async ({ page, context }) => {

      test.setTimeout(20 * 60 * 1000);

      const loginPage = new LoginPage(page, context);
      const misPage = new  MisGroupPage(page, context, screen);

      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info(`Executing MIS Group for: ${screen}`);

      await loginPage.loginWithPropertySelection(user.username, user.password, 2);

      await misPage.runFlow();

      await page.screenshot({
        path: `screenshots/mis_${screen.replace(/\s/g, '_')}.png`,
        fullPage: true
      });
    });

  }
});