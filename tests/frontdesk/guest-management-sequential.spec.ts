import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { GuestManagementPage } from '../../src/pages/FrontDesk/GuestManagementPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe('Frontdesk - Guest Management (Sequential)', () => {
  let loginPage: LoginPage;
  let guestManagement: GuestManagementPage;

  test.beforeAll(async ({ browser }) => {
    logger.info('========================================');
    logger.info('🚀 STARTING GUEST MANAGEMENT TEST SUITE');
    logger.info('========================================');
  });

  test.beforeEach(async ({ page, context }) => {
    loginPage = new LoginPage(page, context);
    guestManagement = new GuestManagementPage(page, context);
    logger.info(`\n📋 Starting test: ${test.info().title}`);

    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.afterEach(async ({ page }) => {
    logger.info(`✅ Test finished: ${test.info().title}`);

    // Take screenshot if test failed
    if (test.info().status === 'failed') {
      const screenshotPath = await page.screenshot({
        path: `screenshots/test_failure_${test.info().title}.png`,
        fullPage: true
      });
      logger.error(`❌ Test failed. Screenshot: ${screenshotPath}`);
    }

    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test.afterAll(async () => {
    logger.info('\n========================================');
    logger.info('✅ GUEST MANAGEMENT TEST SUITE COMPLETE');
    logger.info('========================================\n');
  });

  test('FD_GUEST_001: Create new guest reservation with all details', async ({ page, context }) => {
    try {
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info('TEST 1: Full Reservation with All Details');
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Re-initialize page objects for this context
      loginPage = new LoginPage(page, context);
      guestManagement = new GuestManagementPage(page, context);

      // Login with property selection (only for first test)
      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info('Step 1: Logging in and selecting property...');
      await loginPage.loginWithPropertySelection(user.username, user.password, 2);
      await page.waitForTimeout(2000);
      logger.info('✅ Login successful, property selected');

      // Create guest reservation with full flow
      logger.info('Step 2: Creating new guest reservation with all details...');
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
        path: 'screenshots/guest_reservation_full_details.png',
        fullPage: true
      });

      logger.info('✅✅✅ TEST 1 PASSED: Full reservation created successfully');
    } catch (error) {
      logger.error(`❌ TEST 1 FAILED: ${error}`);
      throw error;
    }
  });

  test('FD_GUEST_002: Create guest reservation with minimal details', async ({ page, context }) => {
    try {
      logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info('TEST 2: Minimal Reservation Details');
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Re-initialize page objects for this context
      loginPage = new LoginPage(page, context);
      guestManagement = new GuestManagementPage(page, context);

      // Note: User is already logged in from TEST 1, property already selected
      logger.info('Step 1: Browser already logged in from TEST 1');
      logger.info('✅ Reusing existing session');

      // Create guest reservation with minimal details
      logger.info('Step 2: Creating guest reservation with minimal details...');
      await guestManagement.searchAndOpenGuestManagement();
      await guestManagement.createNewReservation();
      await guestManagement.selectRoom('Delux Room');
      await guestManagement.enterLastName('Khan');
      await guestManagement.closeDialog();
      await guestManagement.enterFirstName('Sara');
      await guestManagement.selectBusinessSource('Direct Booking');

      // Complete the reservation
      await guestManagement.confirmAndContinue();
      await page.getByRole('button', { name: 'Yes' }).click();
      await guestManagement.enterEmail('sara.khan@test.com');
      await guestManagement.completeReservation();

      // Take screenshot
      await page.screenshot({
        path: 'screenshots/guest_reservation_minimal_details.png',
        fullPage: true
      });

      logger.info('✅✅✅ TEST 2 PASSED: Minimal reservation created successfully');
    } catch (error) {
      logger.error(`❌ TEST 2 FAILED: ${error}`);
      throw error;
    }
  });

  test('FD_GUEST_003: Verify Guest Management page loads correctly', async ({ page, context }) => {
    try {
      logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info('TEST 3: Guest Management Page Verification');
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Re-initialize page objects for this context
      loginPage = new LoginPage(page, context);
      guestManagement = new GuestManagementPage(page, context);

      // Note: User is already logged in, property already selected
      logger.info('Step 1: Browser already logged in from previous tests');
      logger.info('✅ Reusing existing session');

      // Search and open Guest Management
      logger.info('Step 2: Verifying Guest Management module loads...');
      await guestManagement.searchAndOpenGuestManagement();

      // Verify the page loaded with correct heading
      const heading = page.locator('h3');
      await expect(heading).toContainText('Guest Management');

      // Take screenshot
      await page.screenshot({
        path: 'screenshots/guest_management_page_verification.png',
        fullPage: true
      });

      logger.info('✅ Guest Management heading verified');
      logger.info('✅✅✅ TEST 3 PASSED: Guest Management page verified successfully');
    } catch (error) {
      logger.error(`❌ TEST 3 FAILED: ${error}`);
      throw error;
    }
  });
});

