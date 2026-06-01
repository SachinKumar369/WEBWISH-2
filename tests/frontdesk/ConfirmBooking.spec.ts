import { test, expect, Page, BrowserContext } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { ConfirmBookingPage } from '../../src/pages/FrontDesk/ConfirmBookingPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe('Frontdesk - Confirm Booking', () => {
  let page: Page;
  let context: BrowserContext;
  let confirmBookingPage: ConfirmBookingPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page: testPage, context: testContext }) => {
    page = testPage;
    context = testContext;
    confirmBookingPage = new ConfirmBookingPage(page, context);
    loginPage = new LoginPage(page, context);

    logger.info(`Starting test: ${test.info().title}`);
    await page.setViewportSize({ width: 1280, height: 720 });

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();
    expect(user.username).toBeTruthy();
    expect(user.password).toBeTruthy();

    logger.info(`Using credentials for user: ${user.username}`);
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    logger.info('Login and property selection completed');
  });

  test.afterEach(async () => {
    logger.info(`Test finished: ${test.info().title}`);

    if (test.info().status === 'failed') {
      const screenshotPath = await confirmBookingPage.takeScreenshot(`test_failure_${test.info().title}`);
      logger.error(`Test failed. Screenshot: ${screenshotPath}`);
    }

    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'false';

    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Browser will stay open. Press any key in console to continue...');
      await page.pause();
    } else {
      const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '50000', 10);
      logger.info(`Pausing for ${pauseDuration}ms before browser closes...`);
      await page.waitForTimeout(pauseDuration);
      logger.info('Resuming - Browser will close now');
    }
  });

  test('FD_CB_001: confirm booking flow from front desk', async () => {
    await confirmBookingPage.completeConfirmBookingFlow({
      bookingDate: '134',
      lastName: 'kumar',
      firstName: 'sachin',
      phone: '9759357070',
      email: 'abec@gmail.com',
      dropdownArrowDownPresses: 9,
      returnUrl: 'https://qc2webwish.prologicfirst.in/login/z6cQJcxmrEbhhFXqdoj64Q%3D%3D'
    });
  });
});