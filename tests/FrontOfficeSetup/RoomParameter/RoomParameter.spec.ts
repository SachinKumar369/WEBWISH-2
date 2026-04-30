import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { RoomParameterPage } from '../../../src/pages/FrontOfficeSetup/RoomParameter/RoomParameterPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('Room Parameter - All Screens', () => {

  const screens = [
    'Block',
    'Disc Status',
    'Floor',
    //'HK Status',
    //'Room',
    //'Room Attribute',
    'Room Category',
    //'Room Type',
    'Section',
    //'Selling Status',
    //'Room Inventory',
    'Maid List'
  ];

  for (const screen of screens) {

    test(`CRUD - ${screen}`, async ({ page, context }) => {

      test.setTimeout(20 * 60 * 1000);

      const loginPage = new LoginPage(page, context);
      const roomPage = new RoomParameterPage(page, context, screen);

      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info(`Executing Room Parameter for: ${screen}`);

      await loginPage.loginWithPropertySelection(user.username, user.password, 2);

      await roomPage.runFlow();

      await page.screenshot({
        path: `screenshots/room_${screen.replace(/\s/g, '_')}.png`,
        fullPage: true
      });
    });

  }
});