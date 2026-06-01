import { test, expect } from '@playwright/test';

import { LoginPage } from '../../src/pages/LoginPage';
import { BookingCalendarPage } from '../../src/pages/FrontDesk/BookingCalendarProperty';

import { testDataManager } from '../../src/utils/TestDataManager';

import logger from '../../src/core/Logger';

test.describe('Frontdesk - Booking Calendar Property Switch', () => {

    let bookingCalendar: BookingCalendarPage;

    test.beforeEach(async ({ page, context }) => {

        bookingCalendar = new BookingCalendarPage(page, context);

        logger.info(`Starting test: ${test.info().title}`);

        await page.setViewportSize({
            width: 1280,
            height: 720
        });
    });

    test.afterEach(async ({ page }) => {

        logger.info(`Test finished: ${test.info().title}`);

        if (test.info().status === 'failed') {

            const screenshotPath = await page.screenshot({
                path: `screenshots/test_failure_${test.info().title}.png`,
                fullPage: true
            });

            logger.error(`Test failed. Screenshot: ${screenshotPath}`);
        }

        const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';

        if (keepBrowserOpen) {

            logger.info('KEEP_BROWSER_OPEN enabled');

            await page.pause();

        } else {

            const pauseDuration = parseInt(
                process.env.PAUSE_ON_FINISH || '5000',
                10
            );

            logger.info(`Pausing for ${pauseDuration}ms`);

            await page.waitForTimeout(pauseDuration);
        }
    });

    test('FD_BOOKING_001: Verify property switch in booking calendar', async ({ page, context }) => {

        try {

            logger.info('Starting Booking Calendar Property Switch test');

            const loginPage = new LoginPage(page, context);

            const user = await testDataManager.getUserCredentials('all');

            expect(user).toBeDefined();

            logger.info('Step 1: Login and select property');

            await loginPage.loginWithPropertySelection(
                user.username,
                user.password,
                2
            );

            await page.waitForTimeout(2000);

            logger.info('Step 2: Navigate to Booking Calendar');

            await bookingCalendar.navigateToBookingCalendar();

            logger.info('Step 3: Select WEBWISH DUBAI property');

            await bookingCalendar.openPropertyFilter();

            await bookingCalendar.selectProperty('WEBWISH DUBAI');

            await bookingCalendar.clickSearchButton();

            await bookingCalendar.validateSelectedProperty('WEBWISH DUBAI');

            logger.info('Step 4: Select WEBWISHINDIA property');

            await bookingCalendar.openPropertyFilter();

            await bookingCalendar.selectProperty('WEBWISHINDIA');

            await bookingCalendar.clickSearchButton();

            await bookingCalendar.validateSelectedProperty('WEBWISHINDIA');

            logger.info('Step 5: Switch property');

            await bookingCalendar.switchProperty();

            await bookingCalendar.validateSelectedProperty('WEBWISHINDIA');

            await page.screenshot({
                path: 'screenshots/booking_calendar_property_switch.png',
                fullPage: true
            });

            logger.info('Booking Calendar Property Switch test completed successfully');

        } catch (error) {

            logger.error(`Test failed: ${error}`);

            throw error;
        }
    });
});