import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { GuestReservationPage } from '../../../src/pages/Regression/GuestReservationPage';
import { getUserByUsernameFromExcel } from '../../../src/utils/UserDataProvider';

const guestLastName = 'Kumar';
const guestFirstName = 'Rahul';
const newContactNumber = '9876543210';
const newEmail = 'rahul.kumar@test.com';

/**
 * Test: Create a Guest Reservation, then open the booking and modify it.
 * Flow: Login → Guest Management → Create Reservation (no profile) →
 * Open Booking → Modify Guest Details (Contact Number + Email) →
 * Modify Stay Details (extend Departure Date by 1 day) →
 * Save → Verify success.
 *
 * This test validates the complete cycle of creating and then
 * modifying an existing reservation in WebWish PMS.
 */
test.describe.serial('Guest Reservation - Modify Booking - Regression', () => {

  test('Create reservation then modify guest details and departure date', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000); // Extended timeout for create + modify flow

    const loginPage = new LoginPage(page, context);
    const guestReservation = new GuestReservationPage(page, context);

    // ── Step 1: Login with user from Excel ──
    const user = getUserByUsernameFromExcel('CR01'); // Stage user
    expect(user).toBeDefined();

    await test.step('Login with user + property from Excel', async () => {
      logger.info('Logging in for Guest Reservation Modify Booking flow');
      await loginPage.loginWithPropertySelection(user!.username, user!.password);
    });

    // ════════════════════════════════════════════════════
    //  PART 1: CREATE THE RESERVATION (without profile)
    // ════════════════════════════════════════════════════

    await test.step('Navigate to Guest Management', async () => {
      await guestReservation.navigateToGuestManagement();
      logger.info('Guest Management page opened');
    });

    await page.screenshot({
      path: 'screenshots/modify-booking-guest-management.png',
      fullPage: true,
    });

    await test.step('Click New Reservation', async () => {
      await guestReservation.clickNewReservation();
      logger.info('New Reservation form opened');
    });

    await test.step('Click Next on Stay Details', async () => {
      await guestReservation.clickNextOnStayDetails();
      logger.info('Room selection grid loaded');
    });

    await page.screenshot({
      path: 'screenshots/modify-booking-room-selection.png',
      fullPage: true,
    });

    await test.step('Select first available room', async () => {
      await guestReservation.selectFirstAvailableRoom();
      logger.info('Room selected');
    });

    await test.step('Click Next on Room Selection', async () => {
      await guestReservation.clickNextOnRoomSelection();
      logger.info('Quick Reservation dialog opened');
    });

    await page.screenshot({
      path: 'screenshots/modify-booking-quick-dialog.png',
      fullPage: true,
    });

    await test.step('Enter last name and trigger profile search', async () => {
      await guestReservation.enterLastNameAndTriggerProfileSearch(guestLastName);
      logger.info('Advance Search dialog opened');
    });

    await test.step('Close Advance Search dialog (skip profile linking)', async () => {
      await guestReservation.closeAdvanceSearchDialog();
      logger.info('Advance Search dialog closed — no profile linked');
    });

    await test.step('Enter first name', async () => {
      await guestReservation.enterFirstName(guestFirstName);
      logger.info('First name entered');
    });

    await test.step('Select Guest Class', async () => {
      await guestReservation.selectGuestClass();
      logger.info('Guest Class selected');
    });

    await test.step('Select Market Segment', async () => {
      await guestReservation.selectMarketSegment();
      logger.info('Market Segment selected');
    });

    await test.step('Select Business Source', async () => {
      await guestReservation.selectBusinessSource();
      logger.info('Business Source selected');
    });

    await page.screenshot({
      path: 'screenshots/modify-booking-dropdowns-selected.png',
      fullPage: true,
    });

    await test.step('Click Confirm & Continue', async () => {
      await guestReservation.clickConfirmAndContinue();
      logger.info('Confirm & Continue clicked');
    });

    await test.step('Handle confirmation letter prompt', async () => {
      await guestReservation.handleConfirmationLetterPrompt();
      logger.info('Confirmation letter prompt handled');
    });

    let creationSuccessMessage = '';
    await test.step('Verify reservation creation success', async () => {
      creationSuccessMessage = await guestReservation.verifyReservationSuccess();
      logger.info(`Reservation creation result: ${creationSuccessMessage}`);
    });

    await page.screenshot({
      path: 'screenshots/modify-booking-creation-success.png',
      fullPage: true,
    });

    // Verify reservation was created successfully
    expect(creationSuccessMessage).not.toBe('No success message detected');
    logger.info('✅ Reservation created successfully, proceeding to modification...');

    // ════════════════════════════════════════════════════
    //  PART 2: OPEN BOOKING AND MODIFY IT
    // ════════════════════════════════════════════════════

    await test.step('Click Open Booking', async () => {
      await guestReservation.openBookingForModification();
      logger.info('Booking detail page opened');
    });

    await page.screenshot({
      path: 'screenshots/modify-booking-detail-page.png',
      fullPage: true,
    });

    // ── Step 2a: Modify Guest Details (Contact + Email) via dialog ──
    // Flow: Open Guest Details dialog → Modify fields → Update → OK → Close
    await test.step('Modify Guest Details (Contact Number + Email)', async () => {
      await guestReservation.modifyGuestDetails(newContactNumber, newEmail);
      logger.info(`Guest details modified: Contact=${newContactNumber}, Email=${newEmail}`);
    });

    await page.screenshot({
      path: 'screenshots/modify-booking-guest-details-saved.png',
      fullPage: true,
    });

    // ── Step 2b: Get current departure date ──
    let originalDepartureDate = '';
    await test.step('Get current departure date', async () => {
      originalDepartureDate = await guestReservation.getDepartureDate();
      logger.info(`Original departure date: ${originalDepartureDate}`);
    });

    // ── Step 2c: Modify Stay Details (Departure Date) via pencil button ──
    // Flow: Open Stay Details (pencil) → Modify departure → Update → OK
    await test.step('Modify Departure Date (extend by 1 day)', async () => {
      await guestReservation.modifyStayDetails(1);
      logger.info('Stay details modified - departure date extended by 1 day');
    });

    await page.screenshot({
      path: 'screenshots/modify-booking-departure-modified.png',
      fullPage: true,
    });

    // ── Step 3: Verify modification success ──
    let modificationSuccessMessage = '';
    await test.step('Verify modification success', async () => {
      modificationSuccessMessage = await guestReservation.verifyModificationSuccess();
      logger.info(`Modification result: ${modificationSuccessMessage}`);
    });

    await page.screenshot({
      path: 'screenshots/modify-booking-final.png',
      fullPage: true,
    });

    // Final assertions
    logger.info(`Modification result: ${modificationSuccessMessage}`);

    // Verify the modification was processed (either success message or still on booking detail page)
    const isModified = modificationSuccessMessage.toLowerCase().includes('success') ||
                       modificationSuccessMessage.toLowerCase().includes('updated') ||
                       modificationSuccessMessage.toLowerCase().includes('saved') ||
                       modificationSuccessMessage.toLowerCase().includes('modified') ||
                       modificationSuccessMessage.toLowerCase().includes('completed') ||
                       modificationSuccessMessage.toLowerCase().includes('confirmed') ||
                       modificationSuccessMessage.toLowerCase().includes('accepted') ||
                       modificationSuccessMessage.includes('Congratulations');

    expect(isModified).toBeTruthy();

    logger.info(`✅ Guest Reservation modified successfully: Contact=${newContactNumber}, Email=${newEmail}, Departure extended by 1 day`);
  });
});
