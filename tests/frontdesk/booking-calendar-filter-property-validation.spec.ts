import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import {
  BookingCalendarFilterPropertyValidationPage,
  SelectedFilterProperty
} from '../../src/pages/FrontDesk/BookingCalendarFilterPropertyValidationPage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe.serial('Front Desk - Booking Calendar Filter Property Validation', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FD_BOOKING_FILTER_001: select property in filter and validate on booking calendar page', async ({
    page,
    context
  }) => {
    test.setTimeout(15 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const bookingCalendarPage = new BookingCalendarFilterPropertyValidationPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting base property');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    logger.info('Navigating to booking calendar page');
    await bookingCalendarPage.navigateToBookingCalendar();

    const selectedPropertyKeys = new Set<string>();

    for (let index = 0; index < 5; index += 1) {
      logger.info(`Opening filter and selecting random property ${index + 1}`);
      await bookingCalendarPage.openFilter();

      const selectedProperty: SelectedFilterProperty =
        await bookingCalendarPage.selectRandomPropertyAndCaptureValue(Array.from(selectedPropertyKeys));

      const selectionKey = selectedProperty.rawText || selectedProperty.name || selectedProperty.code;
      selectedPropertyKeys.add(selectionKey);

      await bookingCalendarPage.clickSearch();
      await bookingCalendarPage.validatePropertyOnBookingCalendar(selectedProperty);

      logger.info(
        `Validated selected property ${index + 1} from filter on booking calendar page: ${selectedProperty.rawText}`
      );
    }

    await page.screenshot({
      path: 'screenshots/FD_BOOKING_FILTER_001.png',
      fullPage: true
    });
  });
});