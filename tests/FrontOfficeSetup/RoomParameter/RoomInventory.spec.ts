import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { RoomInventoryPage } from '../../../src/pages/FrontOfficeSetup/RoomParameter/RoomInventoryPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Room Parameter - Room Inventory', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_ROOMPARAM_ROOMINVENTORY_001: iterate pages, create room inventory, and delete by inventory number', async ({ page, context }) => {
    test.setTimeout(35 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const roomInventoryPage = new RoomInventoryPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Room Inventory create/delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await roomInventoryPage.runRoomInventoryCreateAndCleanupFlow();

    await page.screenshot({
      path: 'screenshots/FOS_ROOMPARAM_ROOMINVENTORY_001.png',
      fullPage: true
    });
  });
});
