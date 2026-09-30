import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { GuestReservationCancelPage } from '../../../src/pages/Regression/GuestReservationCancelPage';
import { getUserByUsernameFromExcel } from '../../../src/utils/UserDataProvider';

/**
 * Test: Cancel a Guest Reservation via Guest Management.
 * Flow: Login → Guest Management → Select a guest → Cancel →
 * Select cancellation reason → Confirm → Verify success message
 * "Details created/updated successfully."
 *
 * This test validates the complete flow of cancelling an existing
 * reservation in WebWish PMS.
 */
test.describe.serial('Guest Reservation Cancel - Regression', () => {

  test('Cancel guest reservation via Guest Management', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const guestCancel = new GuestReservationCancelPage(page, context);

    // ── Step 1: Login with user from Excel ──
    const user = getUserByUsernameFromExcel('CR01'); // Stage user
    expect(user).toBeDefined();

    await test.step('Login with user + property from Excel', async () => {
      logger.info('Logging in and selecting property for Guest Reservation Cancel flow');
      await loginPage.loginWithPropertySelection(user!.username, user!.password);
    });

    // ── Step 2: Navigate to Guest Management ──
    await test.step('Navigate to Guest Management', async () => {
      await guestCancel.navigateToGuestManagement();
      logger.info('Guest Management page opened');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-cancel-guest-management.png',
      fullPage: true,
    });

    // ── Step 3: Switch to Arrivals tab ──
    await test.step('Switch to Arrivals tab', async () => {
      await guestCancel.switchToArrivals();
      logger.info('Switched to Arrivals tab');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-cancel-arrivals.png',
      fullPage: true,
    });

    // ── Step 4: Select first guest card ──
    let guestName = '';
    await test.step('Select first guest card', async () => {
      guestName = await guestCancel.selectFirstGuestCard();
      logger.info(`Selected guest: ${guestName}`);
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-cancel-guest-selected.png',
      fullPage: true,
    });

    // ── Step 5: Click Cancel button ──
    await test.step('Click Cancel button', async () => {
      await guestCancel.clickCancelButton();
      logger.info('Cancel button clicked');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-cancel-dialog.png',
      fullPage: true,
    });

    // ── Step 6: Select cancellation reason ──
    await test.step('Select cancellation reason', async () => {
      await guestCancel.selectCancellationReason();
      logger.info('Cancellation reason selected');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-cancel-reason-selected.png',
      fullPage: true,
    });

    // ── Step 7: Confirm cancellation ──
    await test.step('Confirm cancellation', async () => {
      await guestCancel.confirmCancellation();
      logger.info('Cancellation confirmed');
    });

    // ── Step 8: Verify success message ──
    let successMessage = '';
    await test.step('Verify cancellation success', async () => {
      successMessage = await guestCancel.verifyCancellationSuccess();
      logger.info(`Cancellation result: ${successMessage}`);
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-cancel-success.png',
      fullPage: true,
    });

    // Final assertions
    expect(successMessage).toContain('successfully');
    logger.info(`✅ Guest Reservation cancelled successfully for: ${guestName}`);
  });
});
