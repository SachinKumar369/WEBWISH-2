import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { GuestReservationPage } from '../../../src/pages/Regression/GuestReservationPage';
import { getUserByUsernameFromExcel } from '../../../src/utils/UserDataProvider';

const guestLastName = 'Kumar';
const guestFirstName = 'Rahul';

/**
 * Test: Guest Reservation creation via Guest Management WITHOUT profile linking.
 * Flow: Login → Guest Management → New Reservation → Room Selection →
 * Guest Details → Enter Last Name → Close Advance Search (no profile link) →
 * Fill First Name + Guest Class / Market Segment / Business Source →
 * Confirm & Continue → No confirmation letter → Verify success.
 *
 * This test creates a reservation by manually entering guest details
 * instead of linking an existing profile from Advance Search.
 */
test.describe.serial('Guest Reservation Without Profile - Regression', () => {

  test('Create guest reservation without linking profile', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const guestReservation = new GuestReservationPage(page, context);

    // ── Step 1: Login with user from Excel ──
    const user = getUserByUsernameFromExcel('CR01'); // Stage user
    expect(user).toBeDefined();

    await test.step('Login with user + property from Excel', async () => {
      logger.info('Logging in and selecting property for Guest Reservation (no profile) flow');
      await loginPage.loginWithPropertySelection(user!.username, user!.password);
    });

    // ── Step 2: Navigate to Guest Management ──
    await test.step('Navigate to Guest Management', async () => {
      await guestReservation.navigateToGuestManagement();
      logger.info('Guest Management page opened');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-no-profile-guest-management.png',
      fullPage: true,
    });

    // ── Step 3: Click New Reservation ──
    await test.step('Click New Reservation', async () => {
      await guestReservation.clickNewReservation();
      logger.info('New Reservation form opened');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-no-profile-new-reservation.png',
      fullPage: true,
    });

    // ── Step 4: Click Next on Stay Details ──
    // If the room grid gets stuck on the "Please wait! We are processing your request"
    // loader, the page object refreshes the page, returns to Guest Management,
    // clicks New Reservation again and retries the same steps.
    await test.step('Click Next on Stay Details', async () => {
      await guestReservation.clickNextOnStayDetailsWithRecovery();
      logger.info('Room selection grid loaded');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-no-profile-room-selection.png',
      fullPage: true,
    });

    // ── Step 5: Select first available room ──
    await test.step('Select first available room', async () => {
      await guestReservation.selectFirstAvailableRoom();
      logger.info('Room selected');
    });

    // ── Step 6: Click Next to go to Quick Reservation ──
    await test.step('Click Next on Room Selection', async () => {
      await guestReservation.clickNextOnRoomSelection();
      logger.info('Quick Reservation dialog opened');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-no-profile-quick-dialog.png',
      fullPage: true,
    });

    // ── Step 7: Enter last name and trigger profile search ──
    await test.step('Enter last name and trigger profile search', async () => {
      await guestReservation.enterLastNameAndTriggerProfileSearch(guestLastName);
      logger.info('Advance Search dialog opened');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-no-profile-advance-search.png',
      fullPage: true,
    });

    // ── Step 8: Close Advance Search WITHOUT linking profile ──
    await test.step('Close Advance Search dialog (skip profile linking)', async () => {
      await guestReservation.closeAdvanceSearchDialog();
      logger.info('Advance Search dialog closed — no profile linked');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-no-profile-search-closed.png',
      fullPage: true,
    });

    // ── Step 9: Enter first name manually ──
    await test.step('Enter first name', async () => {
      await guestReservation.enterFirstName(guestFirstName);
      logger.info('First name entered');
    });

    // ── Step 10: Select Guest Class (first available option) ──
    await test.step('Select Guest Class', async () => {
      await guestReservation.selectGuestClass();
      logger.info('Guest Class selected');
    });

    // ── Step 11: Select Market Segment (first available option) ──
    await test.step('Select Market Segment', async () => {
      await guestReservation.selectMarketSegment();
      logger.info('Market Segment selected');
    });

    // ── Step 12: Select Business Source (first available option) ──
    await test.step('Select Business Source', async () => {
      await guestReservation.selectBusinessSource();
      logger.info('Business Source selected');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-no-profile-dropdowns-selected.png',
      fullPage: true,
    });

    // ── Step 13: Click Confirm & Continue ──
    await test.step('Click Confirm & Continue', async () => {
      await guestReservation.clickConfirmAndContinue();
      logger.info('Confirm & Continue clicked');
    });

    // ── Step 14: Handle confirmation letter prompt (click No) ──
    await test.step('Handle confirmation letter prompt', async () => {
      await guestReservation.handleConfirmationLetterPrompt();
      logger.info('Confirmation letter prompt handled');
    });

    // ── Step 15: Verify reservation success ──
    let successMessage = '';
    await test.step('Verify reservation success', async () => {
      successMessage = await guestReservation.verifyReservationSuccess();
      logger.info(`Reservation success: ${successMessage}`);
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-no-profile-success.png',
      fullPage: true,
    });

    // Final assertions
    logger.info(`Reservation result: ${successMessage}`);
    expect(successMessage).not.toBe('No success message detected');

    logger.info(`✅ Guest Reservation (without profile) created successfully for: ${guestFirstName} ${guestLastName}`);
  });
});
