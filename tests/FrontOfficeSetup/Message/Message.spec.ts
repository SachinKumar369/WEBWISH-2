import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { MessagesPage } from '../../../src/pages/FrontOfficeSetup/Message/MessagePage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('Messages - All Screens', () => {

  const screens = [
    'Cancel/Refusal/Turn Away Reason',
    'Checkout Message',
    'Guest Message Type',
    'SMS Message Template',
    //'Marketing Information',
    'Room Upgrade',
    'Cancel Checkin'
  ];

  for (const screen of screens) {

    test(`CRUD - ${screen}`, async ({ page, context }) => {

      test.setTimeout(20 * 60 * 1000);

      const loginPage = new LoginPage(page, context);
      const msgPage = new MessagesPage(page, context, screen);

      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info(`Executing for: ${screen}`);

      await loginPage.loginWithPropertySelection(user.username, user.password, 2);

      await msgPage.runFlow();

      await page.screenshot({
        path: `screenshots/messages_${screen.replace(/\s/g, '_')}.png`,
        fullPage: true
      });
    });

  }
});