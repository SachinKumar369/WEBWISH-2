import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { GuestManagementPage } from '../../src/pages/FrontDesk/GuestManagementPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe('Frontdesk - Guest Management', () => {
  let guestManagement: GuestManagementPage;

  test.beforeEach(async ({ page, context }) => {
    guestManagement = new GuestManagementPage(page, context);
    logger.info(`Starting test: ${test.info().title}`);

    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.afterEach(async ({ page }) => {
    logger.info(`Test finished: ${test.info().title}`);

    // Take screenshot if test failed
    if (test.info().status === 'failed') {
      const screenshotPath = await page.screenshot({
        path: `screenshots/test_failure_${test.info().title}.png`,
        fullPage: true
      });
      logger.error(`Test failed. Screenshot: ${screenshotPath}`);
    }

    // Check if browser should stay open
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';

    if (keepBrowserOpen) {
      logger.info('🔒 KEEP_BROWSER_OPEN is enabled. Browser will stay open. Press any key in console to continue...');
      await page.pause();
    } else {
      // Pause before closing browser so you can see the result
      const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '5000', 10);
      logger.info(`⏸️  Pausing for ${pauseDuration}ms before browser closes... You can inspect the page.`);
      await page.waitForTimeout(pauseDuration);
      logger.info('✅ Resuming - Browser will close now');
    }
  });

  test('FD_GUEST_001: Create new guest reservation with all details', async ({ page, context }) => {
    try {
      logger.info('Starting Guest Management - New Reservation test');

      // Login with property selection
      const loginPage = new LoginPage(page, context);
      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info('Step 1: Login and select property');
      await loginPage.loginWithPropertySelection(user.username, user.password, 2);

      // Wait for navigation to complete
      await page.waitForTimeout(2000);

      // Create guest reservation with full flow
      logger.info('Step 2: Create new guest reservation');
      await guestManagement.createFullGuestReservation({
        lastName: 'ali',
        firstName: 'AMIR',
        guestType: 'Guets',
        packageType: 'Packages',
        businessSource: 'Direct Booking',
        email: 'ABBB@GMAILC.COM'
      });

      // Take success screenshot
      await page.screenshot({
        path: 'screenshots/guest_reservation_success.png',
        fullPage: true
      });

      logger.info('✅ Guest reservation test completed successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('FD_GUEST_002: Create guest reservation with minimal details', async ({ page, context }) => {
    try {
      logger.info('Starting Guest Management - Minimal Details test');

      // Login with property selection
      const loginPage = new LoginPage(page, context);
      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info('Step 1: Login and select property');
      await loginPage.loginWithPropertySelection(user.username, user.password, 2);

      // Wait for navigation to complete
      await page.waitForTimeout(2000);

      // Create guest reservation with minimal details
      logger.info('Step 2: Create guest reservation with minimal details');
      await guestManagement.searchAndOpenGuestManagement();
      await guestManagement.createNewReservation();
      await guestManagement.selectRoom('Delux Room');
      await guestManagement.enterLastName('Khan');
      await guestManagement.closeDialog();
      await guestManagement.enterFirstName('Sara');
      await guestManagement.selectBusinessSource('Direct Booking');

      // Take screenshot
      await page.screenshot({
        path: 'screenshots/guest_reservation_minimal.png',
        fullPage: true
      });

      logger.info('✅ Minimal guest reservation test completed successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('FD_GUEST_003: Verify Guest Management page loads correctly', async ({ page, context }) => {
    try {
      logger.info('Starting Guest Management - Page Load Verification test');

      // Login with property selection
      const loginPage = new LoginPage(page, context);
      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info('Step 1: Login and select property');
      await loginPage.loginWithPropertySelection(user.username, user.password, 2);

      // Wait for navigation to complete
      await page.waitForTimeout(2000);

      // Search and open Guest Management
      logger.info('Step 2: Search and verify Guest Management module');
      //await guestManagement.searchAndOpenGuestManagement();
      await guestManagement.searchGuestManagement('Guest Management');

      // Verify the page loaded with correct heading
      const heading = page.locator('h3');
      await expect(heading).toContainText('Guest Management');

      logger.info('✅ Guest Management page verification test completed successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });
});

