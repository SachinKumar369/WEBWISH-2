import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { GroupManagementPage } from '../../src/pages/FrontDesk/GroupManagementPage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe.serial('Front Desk - Group Management', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FD_GROUP_001: Create new group with business date driven dates', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const groupManagementPage = new GroupManagementPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Group Management flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 0);

    logger.info('Step 1: Creating new group with business date-driven dates');
    const createdGroup = await groupManagementPage.runGroupManagementFlow('Sachin');

    logger.info(`Group created with details:
      - Name: ${createdGroup.groupName}
      - Arrival Date: ${createdGroup.arrivalDate}
      - Departure Date: ${createdGroup.departureDate}
      - Release Block Date: ${createdGroup.releaseBlockDate}
      - Business Date: ${createdGroup.businessDate}`);

    await page.screenshot({
      path: 'screenshots/FD_GROUP_001.png',
      fullPage: true
    });
  });
});
