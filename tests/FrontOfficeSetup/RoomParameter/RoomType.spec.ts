import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { RoomTypePage } from '../../../src/pages/FrontOfficeSetup/RoomParameter/RoomTypePage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Room Parameter - Room Type', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_ROOMPARAM_ROOMTYPE_001: create room types, inactivate and delete created records', async ({ page, context }) => {
    test.setTimeout(35 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const roomTypePage = new RoomTypePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Room Type create/inactivate/delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await roomTypePage.runRoomTypeCreateInactivateDeleteFlow();

    await page.screenshot({
      path: 'screenshots/FOS_ROOMPARAM_ROOMTYPE_001.png',
      fullPage: true
    });
  });
});
