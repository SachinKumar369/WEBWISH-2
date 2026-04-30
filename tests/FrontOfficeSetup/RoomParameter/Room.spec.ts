import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { RoomPage } from '../../../src/pages/FrontOfficeSetup/RoomParameter/RoomPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Room Parameter - Room', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_ROOMPARAM_ROOM_001: iterate pages, create room records, and delete by room number', async ({ page, context }) => {
    test.setTimeout(30 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const roomPage = new RoomPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Room Parameter Room flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await roomPage.runRoomCreateAndCleanupFlow();

    await page.screenshot({
      path: 'screenshots/FOS_ROOMPARAM_ROOM_001.png',
      fullPage: true
    });
  });
});