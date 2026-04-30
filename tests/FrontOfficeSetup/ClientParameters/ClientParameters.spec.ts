import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { ClientParameterPage } from '../../../src/pages/FrontOfficeSetup/ClientParameters/ClientParametersPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('Client Parameters - All Screens', () => {

  const screens = [
    'Action Type',
    'Alert Types',
    'AR Account Type',
    'Designation',
    'Group Type',
    'Guest Type',
    'Meeting Type',
    'Membership Types',
    'Occupations',
    'Purpose of Visit',
    //'Reservation Status',
    'Special Services Group',
    'Tax Exempt',
    'Telephone Category',
    'Feed Code',
    'Feed Level',
    'Season Code'
  ];

  for (const screen of screens) {

    test(`CRUD - ${screen}`, async ({ page, context }) => {
      test.setTimeout(20 * 60 * 1000);

      const loginPage = new LoginPage(page, context);
      const cpPage = new ClientParameterPage(page, context, screen);

      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info(`Executing for: ${screen}`);

      await loginPage.loginWithPropertySelection(user.username, user.password, 2);

      await cpPage.runFlow();

      await page.screenshot({
        path: `screenshots/${screen.replace(/\s/g, '_')}.png`,
        fullPage: true
      });
    });

  }
});