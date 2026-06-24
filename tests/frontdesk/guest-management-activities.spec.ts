import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';
import { GuestManagementActivitiesPage } from '../../src/pages/FrontDesk/GuestManagementActivitiesPage';

test.describe('Frontdesk - Guest Management Activities', () => {
  let guestManagementActivities: GuestManagementActivitiesPage;

  test.beforeEach(async ({ page, context }) => {
    guestManagementActivities = new GuestManagementActivitiesPage(page, context);
    logger.info(`Starting test: ${test.info().title}`);
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.afterEach(async ({ page }) => {
    logger.info(`Finished test: ${test.info().title}`);

    if (test.info().status === 'failed') {
      const path = await page.screenshot({
        path: `screenshots/${test.info().title.replace(/\s+/g, '_')}.png`,
        fullPage: true
      });
      logger.error(`Failure screenshot: ${path}`);
    }

    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'false';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FD_GUEST_ACT_001: create and delete activity from Guest Management sections', async ({ page, context }) => {
    const loginPage = new LoginPage(page, context);
    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    await page.waitForTimeout(2000);

    const businessDate = await guestManagementActivities.getBusinessDateFromHeader();
    const nextBusinessDate = guestManagementActivities.getNextBusinessDate(businessDate);

    await guestManagementActivities.openActivitiesSection();

    await guestManagementActivities.startNewActivity();
    await guestManagementActivities.saveExpectMandatoryMessage();

    const invalidActivityName = "Act~!@#$%^&*()_+=-`[]\\|}{;'\":";
    await guestManagementActivities.fillActivityName(invalidActivityName);
    await guestManagementActivities.saveExpectMandatoryMessage();

    await guestManagementActivities.selectFirstLookup(2);
    await guestManagementActivities.selectSecondLookup(8);
    await guestManagementActivities.fillDescription("Desc~`!@#$%^&*()123-=+_[]\\|}{;'\":,./?><");
    await guestManagementActivities.saveExpectMandatoryMessage();

    await guestManagementActivities.fillActivityName('Activity ');
    await guestManagementActivities.fillSchedule({
      startDate: businessDate,
      startTime: '11111a',
      endDate: nextBusinessDate,
      endTime: '1212p',
      amount: '100',
      longDescription: "<>?/.,:\"';{}}|\\][_+=-)(*&^%$#@!`~12345 Long Description",
      secondaryAmount: '100'
    });
    await guestManagementActivities.saveExpectSuccess();
    await guestManagementActivities.closeActivityForm();

    await guestManagementActivities.openActivitiesSection();
    await guestManagementActivities.deleteSelectedActivities();

    // await guestManagementActivities.openActivitiesSection();
    // await guestManagementActivities.validateDeleteRequiresSelection();
    // await guestManagementActivities.closeActivityForm();
  });
});