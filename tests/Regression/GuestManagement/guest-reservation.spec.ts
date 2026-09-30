import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { GuestReservationPage } from '../../../src/pages/Regression/GuestReservationPage';
import { getUserByUsernameFromExcel } from '../../../src/utils/UserDataProvider';

const timestamp = Date.now();
const guestLastName = 'Kumar';

/**
 * Test: Guest Reservation creation via Guest Management.
 * Flow: Login → Guest Management → New Reservation → Room Selection →
 * Guest Details → Profile Linking → Business Source / Guest Class / Market Segment →
 * Confirm & Continue → No confirmation letter → Verify success.
 *
 * Uses env.stage environment and Excel-based user/property selection.
 */
test.describe.serial('Guest Reservation - Regression', () => {

  test.beforeEach(async ({ page }) => {
    // Do NOT auto-accept dialogs - we need to handle the confirmation letter prompt manually
    // page.on('dialog', async (dialog) => {
    //   logger.info(`Handling dialog: ${dialog.type()} - ${dialog.message()}`);
    //   await dialog.accept();
    // });
  });

  test('Create guest reservation via Guest Management', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const guestReservation = new GuestReservationPage(page, context);

    // ── Step 1: Login with user from Excel ──
    const user = getUserByUsernameFromExcel('CR01'); // Stage user
    expect(user).toBeDefined();

    await test.step('Login with user + property from Excel', async () => {
      logger.info('Logging in and selecting property for Guest Reservation flow');
      // Pass undefined for property - if only one property exists, it auto-selects
      await loginPage.loginWithPropertySelection(user!.username, user!.password);
    });

    // ── Step 2: Navigate to Guest Management ──
    await test.step('Navigate to Guest Management', async () => {
      await guestReservation.navigateToGuestManagement();
      logger.info('Guest Management page opened');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-guest-management.png',
      fullPage: true,
    });

    // ── Step 3: Click New Reservation ──
    await test.step('Click New Reservation', async () => {
      await guestReservation.clickNewReservation();
      logger.info('New Reservation form opened');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-new-reservation.png',
      fullPage: true,
    });

    // ── Step 4: Click Next on Stay Details ──
    await test.step('Click Next on Stay Details', async () => {
      await guestReservation.clickNextOnStayDetails();
      logger.info('Room selection grid loaded');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-room-selection.png',
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
      path: 'screenshots/guest-reservation-quick-dialog.png',
      fullPage: true,
    });

    // ── Step 7: Enter last name and trigger profile search ──
    await test.step('Enter last name and trigger profile search', async () => {
      await guestReservation.enterLastNameAndTriggerProfileSearch(guestLastName);
      logger.info('Advance Search dialog opened');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-advance-search.png',
      fullPage: true,
    });

    // ── Step 8: Link first profile ──
    let linkedProfileName = '';
    await test.step('Link first profile', async () => {
      linkedProfileName = await guestReservation.linkFirstProfile();
      logger.info(`Profile linked: ${linkedProfileName}`);
      //await guestReservation.closeAdvanceSearchDialog   // modified later
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-profile-linked.png',
      fullPage: true,
    });

    // ── Step 9: Select Guest Class (first available option) ──
    await test.step('Select Guest Class', async () => {
      await guestReservation.selectGuestClass();
      logger.info('Guest Class selected');
    });

    // ── Step 10: Select Market Segment (first available option) ──
    await test.step('Select Market Segment', async () => {
      await guestReservation.selectMarketSegment();
      logger.info('Market Segment selected');
    });

    // ── Step 11: Select Business Source (first available option) ──
    await test.step('Select Business Source', async () => {
      await guestReservation.selectBusinessSource();
      logger.info('Business Source selected');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-dropdowns-selected.png',
      fullPage: true,
    });

    // ── Step 12: Click Confirm & Continue ──
    await test.step('Click Confirm & Continue', async () => {
      await guestReservation.clickConfirmAndContinue();
      logger.info('Confirm & Continue clicked');
    });

    // ── Step 13: Handle confirmation letter prompt (click No) ──
    await test.step('Handle confirmation letter prompt', async () => {
      await guestReservation.handleConfirmationLetterPrompt();
      logger.info('Confirmation letter prompt handled');
    });

    // ── Step 14: Verify reservation success ──
    let successMessage = '';
    await test.step('Verify reservation success', async () => {
      successMessage = await guestReservation.verifyReservationSuccess();
      logger.info(`Reservation success: ${successMessage}`);
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-success.png',
      fullPage: true,
    });

    // Final assertions
    logger.info(`Reservation result: ${successMessage}`);
    expect(successMessage).not.toBe('No success message detected');
    expect(linkedProfileName).toBeTruthy();

    logger.info(`✅ Guest Reservation created successfully for: ${linkedProfileName}`);
  });
});
