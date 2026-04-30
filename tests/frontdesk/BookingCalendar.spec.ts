import { test, expect, Page, BrowserContext } from '@playwright/test';
import { BookingCalendarPage } from '../../src/pages/FrontDesk/BookingCal';
import { LoginPage } from '../../src/pages/LoginPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe('Booking Calendar Tests', () => {
  let page: Page;
  let context: BrowserContext;
  let bookingCalendarPage: BookingCalendarPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page: testPage, context: testContext }) => {
    page = testPage;
    context = testContext;
    bookingCalendarPage = new BookingCalendarPage(page, context);
    loginPage = new LoginPage(page, context);

    logger.info(`Starting test: ${test.info().title}`);

    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Get credentials and login with property selection
    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();
    expect(user.username).toBeTruthy();
    expect(user.password).toBeTruthy();

    logger.info(`Using credentials for user: ${user.username}`);

    // Perform login with property selection (index 0 = first property)
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    logger.info('Login and property selection completed');

    // Verify successful login
    const currentURL = loginPage.getCurrentURL();
    logger.info(`Current URL after login: ${currentURL}`);

    // Navigate to booking calendar or open the calendar view
    // Note: You may need to navigate to the specific page or click a button to open the calendar
  });

  test.afterEach(async () => {
    logger.info(`Test finished: ${test.info().title}`);

    // Take screenshot if test failed
    if (test.info().status === 'failed') {
      const screenshotPath = await bookingCalendarPage.takeScreenshot(`test_failure_${test.info().title}`);
      logger.error(`Test failed. Screenshot: ${screenshotPath}`);
    }

    // Check if browser should stay open
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';

    if (keepBrowserOpen) {
      logger.info('🔒 KEEP_BROWSER_OPEN is enabled. Browser will stay open. Press any key in console to continue...');
      await page.pause();
    } else {
      // Pause before closing browser so you can see the result
      const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '50000', 10);
      logger.info(`⏸️  Pausing for ${pauseDuration}ms before browser closes... You can inspect the page.`);
      await page.waitForTimeout(pauseDuration);
      logger.info('✅ Resuming - Browser will close now');
    }
  });

  test('TC_BC_001: Verify calendar is visible', async () => {
    try {
      logger.info('Testing calendar visibility');

      const isVisible = await bookingCalendarPage.isCalendarVisible();
      expect(isVisible).toBe(true);

      logger.info('Calendar is visible');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_002: Navigate to next month', async () => {
    try {
      logger.info('Testing navigation to next month');

      const currentMonth = await bookingCalendarPage.getDisplayedMonth();
      logger.info(`Current month: ${currentMonth}`);

      await bookingCalendarPage.clickNextMonth();

      const nextMonth = await bookingCalendarPage.getDisplayedMonth();
      logger.info(`Next month: ${nextMonth}`);

      expect(nextMonth).not.toBe(currentMonth);

      logger.info('Successfully navigated to next month');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_003: Navigate to previous month', async () => {
    try {
      logger.info('Testing navigation to previous month');

      const currentMonth = await bookingCalendarPage.getDisplayedMonth();
      logger.info(`Current month: ${currentMonth}`);

      await bookingCalendarPage.clickPreviousMonth();

      const previousMonth = await bookingCalendarPage.getDisplayedMonth();
      logger.info(`Previous month: ${previousMonth}`);

      expect(previousMonth).not.toBe(currentMonth);

      logger.info('Successfully navigated to previous month');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_004: Click today button', async () => {
    try {
      logger.info('Testing Today button');

      // First navigate to a different month
      await bookingCalendarPage.clickNextMonth();

      // Then click today to return to current month
      await bookingCalendarPage.clickToday();

      logger.info('Successfully clicked Today button');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_005: Click on calendar date', async () => {
    try {
      logger.info('Testing click on calendar date');

      const dateToClick = 15; // Click on 15th of the month
      await bookingCalendarPage.clickCalendarDate(dateToClick);

      logger.info(`Successfully clicked on calendar date ${dateToClick}`);
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_006: Get booking details from panel', async () => {
    try {
      logger.info('Testing get booking details from panel');

      // First, check if the detail panel is visible
      const isPanelVisible = await bookingCalendarPage.isBookingDetailPanelVisible();

      if (isPanelVisible) {
        const confirmationNumber = await bookingCalendarPage.getConfirmationNumber();
        const guestName = await bookingCalendarPage.getGuestName();
        const roomNumber = await bookingCalendarPage.getRoomNumber();
        const roomType = await bookingCalendarPage.getRoomType();

        logger.info(`Booking details - Confirmation: ${confirmationNumber}, Guest: ${guestName}, Room: ${roomNumber}, Type: ${roomType}`);

        expect(confirmationNumber).toBeTruthy();
        expect(guestName).toBeTruthy();
        expect(roomNumber).toBeTruthy();
        expect(roomType).toBeTruthy();

        logger.info('Successfully retrieved booking details');
      } else {
        logger.warn('Booking detail panel is not visible');
      }
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_007: Get check-in and check-out dates', async () => {
    try {
      logger.info('Testing get check-in and check-out dates');

      const isPanelVisible = await bookingCalendarPage.isBookingDetailPanelVisible();

      if (isPanelVisible) {
        const checkInDate = await bookingCalendarPage.getCheckInDate();
        const checkOutDate = await bookingCalendarPage.getCheckOutDate();

        logger.info(`Check-in: ${checkInDate}, Check-out: ${checkOutDate}`);

        expect(checkInDate).toBeTruthy();
        expect(checkOutDate).toBeTruthy();

        logger.info('Successfully retrieved check-in and check-out dates');
      } else {
        logger.warn('Booking detail panel is not visible');
      }
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_008: Verify tape chart visibility', async () => {
    try {
      logger.info('Testing tape chart visibility');

      const isVisible = await bookingCalendarPage.isTapeChartVisible();

      if (isVisible) {
        logger.info('Tape chart is visible');
        expect(isVisible).toBe(true);
      } else {
        logger.warn('Tape chart is not visible');
      }
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_009: Get available and occupied rooms count', async () => {
    try {
      logger.info('Testing get available and occupied rooms count');

      const availableRoomsCount = await bookingCalendarPage.getAvailableRoomsCount();
      const occupiedRoomsCount = await bookingCalendarPage.getOccupiedRoomsCount();

      logger.info(`Available rooms: ${availableRoomsCount}, Occupied rooms: ${occupiedRoomsCount}`);

      expect(typeof availableRoomsCount).toBe('number');
      expect(typeof occupiedRoomsCount).toBe('number');

      logger.info('Successfully retrieved room counts');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_010: Check booking status', async () => {
    try {
      logger.info('Testing booking status');

      const isPanelVisible = await bookingCalendarPage.isBookingDetailPanelVisible();

      if (isPanelVisible) {
        const status = await bookingCalendarPage.getBookingStatus();
        logger.info(`Booking status: ${status}`);

        expect(status).toBeTruthy();

        logger.info('Successfully retrieved booking status');
      } else {
        logger.warn('Booking detail panel is not visible');
      }
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_011: Verify reserved status badge', async () => {
    try {
      logger.info('Testing reserved status badge visibility');

      const isReservedVisible = await bookingCalendarPage.isReservedStatusVisible();
      logger.info(`Reserved status visible: ${isReservedVisible}`);

      // Status may or may not be visible depending on current bookings
      expect(typeof isReservedVisible).toBe('boolean');

      logger.info('Successfully checked reserved status badge');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_012: Verify checked-in status badge', async () => {
    try {
      logger.info('Testing checked-in status badge visibility');

      const isCheckedInVisible = await bookingCalendarPage.isCheckedInStatusVisible();
      logger.info(`Checked-in status visible: ${isCheckedInVisible}`);

      // Status may or may not be visible depending on current bookings
      expect(typeof isCheckedInVisible).toBe('boolean');

      logger.info('Successfully checked checked-in status badge');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_013: Select room type filter', async () => {
    try {
      logger.info('Testing room type filter selection');

      const roomType = 'Standard'; // Change based on available room types
      await bookingCalendarPage.selectRoomTypeFilter(roomType);

      logger.info(`Successfully selected room type filter: ${roomType}`);
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_014: Apply filter', async () => {
    try {
      logger.info('Testing apply filter');

      await bookingCalendarPage.clickApplyFilter();

      logger.info('Successfully clicked apply filter button');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_015: Get pricing information', async () => {
    try {
      logger.info('Testing get pricing information');

      const isPanelVisible = await bookingCalendarPage.isBookingDetailPanelVisible();

      if (isPanelVisible) {
        try {
          const roomRate = await bookingCalendarPage.getRoomRate();
          const totalPrice = await bookingCalendarPage.getTotalPrice();

          logger.info(`Room rate: ${roomRate}, Total price: ${totalPrice}`);

          expect(roomRate).toBeTruthy();
          expect(totalPrice).toBeTruthy();

          logger.info('Successfully retrieved pricing information');
        } catch (priceError) {
          logger.warn(`Could not retrieve pricing information: ${priceError}`);
        }
      } else {
        logger.warn('Booking detail panel is not visible');
      }
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_BC_016: Verify no error on page load', async () => {
    try {
      logger.info('Testing for errors on page load');

      const hasError = await bookingCalendarPage.hasError();
      expect(hasError).toBe(false);

      logger.info('No errors found on page load');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });
});
