import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { SelectProperty } from '../../src/pages/SelectProperty';
import { BookingCalendarPage } from '../../src/pages/FrontDesk/BookingCalendarPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe('Frontdesk - Booking Calendar', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FD_BOOKING_001: Open Booking Calendar after login and property select', async ({ page, context }) => {
    const loginPage = new LoginPage(page, context);
    const selectProperty = new SelectProperty(page, context);
    const bookingCalendar = new BookingCalendarPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    // Login and select first property
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Wait briefly for navigation
    await page.waitForTimeout(1000);

    // Search for Booking Calendar
     await bookingCalendar.searchAndOpenBookingCalendar('Booking Calendar');
    //expect(found).toBe(true);

    // Wait for page to load
    await bookingCalendar.waitForBookingCalendarPage(2000);
    
    await bookingCalendar.openFilter();
    

    // Take screenshot
    await page.screenshot({ path: 'screenshots/booking_calendar_result.png', fullPage: true });

    logger.info('FD_BOOKING_001 completed');
  });
});


test.describe('Frontdesk - Task Management', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FD_TASK_001: Open Task Management after login and property select', async ({ page, context }) => {
    const loginPage = new LoginPage(page, context);
    const selectProperty = new SelectProperty(page, context);
    const bookingCalendar = new BookingCalendarPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    // Login and select first property
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Wait briefly for navigation
    await page.waitForTimeout(1000);

    // Search for Booking Calendar
     //await bookingCalendar.searchAndOpenBookingCalendar('Booking Calendar');
    //expect(found).toBe(true);

    // Wait for page to load
    //await bookingCalendar.waitForBookingCalendarPage(5000);
    
    await bookingCalendar.taskManagement('Task Management');
    

    // Take screenshot
    await page.screenshot({ path: 'screenshots/booking_calendar_result.png', fullPage: true });

    logger.info('FD_BOOKING_001 completed');
  });
});
