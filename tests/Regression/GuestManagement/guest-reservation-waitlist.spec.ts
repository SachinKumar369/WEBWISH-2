import { test, expect, BrowserContext, Page } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { PageFactory } from '../../../src/core/PageFactory';
import { LoginPage } from '../../../src/pages/LoginPage';
import { GuestReservationWaitlistPage } from '../../../src/pages/Regression/GuestReservationWaitlistPage';
import { getUserByUsernameFromExcel } from '../../../src/utils/UserDataProvider';

const guestLastName = 'Kumar';

// ── Shared browser session — ONE context + page for the whole serial suite ──
// The browser is launched once in beforeAll; test 1 logs in (the ONLY login),
// and tests 2 & 3 reuse the same page — no re-login, no new browser per test.
let sharedContext: BrowserContext;
let sharedPage: Page;

// ── Cross-test state (module-level — persists across serial tests in the same worker) ──
/** Booking detail URL captured in test 1 — deep-linked by tests 2 & 3 */
let waitlistBookingUrl = '';
/** Booking id captured in test 1 (parsed from the "Guest Details <id>" heading) */
let waitlistBookingId = '';
/** Linked profile guest name from test 1 — for logging/assertions in later tests */
let linkedGuestName = '';

/**
 * Tests: WAITLIST Guest Reservation lifecycle via Guest Management.
 *
 * Test 1 — Create the waitlist booking:
 *   Same process as guest-reservation.spec.ts, except that in the Quick
 *   Reservation dialog "Confirm" is selected by default — this test switches
 *   it to "Waitlist" and completes the flow, then opens the booking and
 *   captures its detail URL for test 2.
 *
 * Test 2 — Confirm the waitlist booking:
 *   Reuses the SAME browser session (no re-login), reopens the booking created
 *   in test 1, verifies WAIT-LISTED, assigns a vacant & inspected (IN & VA)
 *   room via the Assign Room popup, then confirms and verifies CONFIRMED.
 *
 * Test 3 — Cancel the confirmed booking:
 *   Reuses the SAME browser session, clicks Cancel on the confirmed booking,
 *   fills the Cancel Reservation dialog (Cancellation Reason + Remarks),
 *   submits and verifies the badge becomes CANCELLED.
 *
 * Shared browser: beforeAll creates ONE BrowserContext/Page; only test 1
 * logs in (Excel-based user). Tests 2 & 3 continue on the same page.
 *
 * Verified live via Playwright MCP (stage env, user CR01, property BDAR):
 *   - Selecting Waitlist changes the footer button to "Waitlist & Continue"
 *   - No confirmation-letter prompt appears for waitlist
 *   - Success alert: "Congratulations, your reservation for <Guest> has been
 *     waitlisted successfully"
 *   - Waitlist booking detail page: "WAIT-LISTED" badge + "Confirm" button
 *   - Assign Room → "Choose Room (<type>)" popup → first IN & VA tile →
 *     "Details created/updated successfully." → room box shows the room number
 *   - Confirm → SweetAlert "Are u want to Confirm these Guests.?" → Yes
 *   - Success SweetAlert: "Details created/updated successfully."
 *   - After reload the badge reads "CONFIRMED" and Cancel/Checkin appear
 *   - Cancel → "Cancel Reservation" dialog (Cancellation Reason* ng-select +
 *     Remarks* textbox) → Ok → "Details created/updated successfully." →
 *     badge becomes "CANCELLED" (updates immediately)
 *
 * Uses env.stage environment and Excel-based user/property selection.
 */
test.describe.serial('Guest Waitlist Reservation - Regression', () => {

  // ── Shared browser: launch once, login once (in test 1), reuse everywhere ──
  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
    logger.info('🚀 Shared browser context created — all tests reuse this session');
  });

  test.afterAll(async () => {
    // Framework convention: keep the browser open for inspection when enabled
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen && sharedPage) {
      logger.info('🔒 KEEP_BROWSER_OPEN enabled — shared browser stays open. Press any key in console to continue...');
      await sharedPage.pause();
    }
    await sharedContext?.close();
  });

  test('Create waitlist guest reservation via Guest Management', async () => {
    const page = sharedPage;
    const context = sharedContext;
    test.setTimeout(10 * 60 * 1000);

    // Page objects created via PageFactory (framework convention)
    const loginPage = PageFactory.create(page, context, LoginPage);
    const waitlistPage = PageFactory.create(page, context, GuestReservationWaitlistPage);

    // ── Step 1: Login with user from Excel ──
    const user = getUserByUsernameFromExcel('CR01'); // Stage user
    expect(user).toBeDefined();

    await test.step('Login with user + property from Excel', async () => {
      logger.info('Logging in and selecting property for Waitlist Guest Reservation flow');
      // Pass undefined for property - if only one property exists, it auto-selects
      await loginPage.loginWithPropertySelection(user!.username, user!.password);
    });

    // ── Step 2: Navigate to Guest Management ──
    await test.step('Navigate to Guest Management', async () => {
      await waitlistPage.navigateToGuestManagement();
      logger.info('Guest Management page opened');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-guest-management.png',
      fullPage: true,
    });

    // ── Step 3: Click New Reservation ──
    await test.step('Click New Reservation', async () => {
      await waitlistPage.clickNewReservation();
      logger.info('New Reservation form opened');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-new-reservation.png',
      fullPage: true,
    });

    // ── Step 4: Click Next on Stay Details ──
    // If the room grid gets stuck on the "Please wait! We are processing your request"
    // loader, the page object refreshes the page, returns to Guest Management,
    // clicks New Reservation again and retries the same steps.
    await test.step('Click Next on Stay Details', async () => {
      await waitlistPage.clickNextOnStayDetailsWithRecovery();
      logger.info('Room selection grid loaded');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-room-selection.png',
      fullPage: true,
    });

    // ── Step 5: Select first available room via "+" button ──
    await test.step('Select first available room', async () => {
      await waitlistPage.selectFirstAvailableRoom();
      logger.info('Room selected');
    });

    // ── Step 6: Click Next to open Quick Reservation dialog ──
    // The dialog opens with "Confirm" selected by default.
    await test.step('Click Next on Room Selection', async () => {
      await waitlistPage.clickNextOnRoomSelection();
      logger.info('Quick Reservation dialog opened (Confirm selected by default)');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-quick-dialog.png',
      fullPage: true,
    });

    // ── Step 7: Select WAITLIST (switch from default Confirm) ──
    await test.step('Select Waitlist option', async () => {
      await waitlistPage.selectWaitlistOption();
      logger.info('Waitlist option selected — action button now reads "Waitlist & Continue"');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-option-selected.png',
      fullPage: true,
    });

    // ── Step 8: Enter last name and trigger profile search ──
    await test.step('Enter last name and trigger profile search', async () => {
      await waitlistPage.enterLastNameAndTriggerProfileSearch(guestLastName);
      logger.info('Advance Search dialog opened');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-advance-search.png',
      fullPage: true,
    });

    // ── Step 9: Link first profile ──
    let linkedProfileName = '';
    await test.step('Link first profile', async () => {
      linkedProfileName = await waitlistPage.linkFirstProfile();
      logger.info(`Profile linked: ${linkedProfileName}`);
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-profile-linked.png',
      fullPage: true,
    });

    // ── Step 10: Select Guest Class (first available option) ──
    await test.step('Select Guest Class', async () => {
      await waitlistPage.selectGuestClass();
      logger.info('Guest Class selected');
    });

    // ── Step 11: Select Market Segment (first available option) ──
    await test.step('Select Market Segment', async () => {
      await waitlistPage.selectMarketSegment();
      logger.info('Market Segment selected');
    });

    // ── Step 12: Select Business Source (first available option) ──
    await test.step('Select Business Source', async () => {
      await waitlistPage.selectBusinessSource();
      logger.info('Business Source selected');
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-dropdowns-selected.png',
      fullPage: true,
    });

    // ── Step 13: Click Waitlist & Continue ──
    await test.step('Click Waitlist & Continue', async () => {
      await waitlistPage.clickWaitlistAndContinue();
      logger.info('Waitlist & Continue clicked');
    });

    // ── Step 14: Handle post-waitlist prompt ──
    // Waitlist reservations typically skip the confirmation-letter prompt —
    // the page object handles that gracefully.
    await test.step('Handle post-waitlist prompt', async () => {
      await waitlistPage.handleWaitlistConfirmationPrompt();
      logger.info('Post-waitlist prompt handled');
    });

    // ── Step 15: Verify waitlist success ──
    let successMessage = '';
    await test.step('Verify waitlist success', async () => {
      successMessage = await waitlistPage.verifyWaitlistSuccess();
      logger.info(`Waitlist success: ${successMessage}`);
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-success.png',
      fullPage: true,
    });

    // ── Step 16: Open the booking and capture its URL/id ──
    // The booking detail URL is handed off to the next test (confirm flow)
    // via module-level variables — serial tests share the same worker.
    await test.step('Open booking from waitlist success dialog', async () => {
      const booking = await waitlistPage.openBookingFromWaitlistSuccess();
      waitlistBookingUrl = booking.url;
      waitlistBookingId = booking.bookingId;
      linkedGuestName = linkedProfileName;
      logger.info(`Booking captured — id: ${waitlistBookingId}, guest: ${linkedGuestName}, url: ${waitlistBookingUrl}`);
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-booking-opened.png',
      fullPage: true,
    });

    // Final assertions
    logger.info(`Waitlist reservation result: ${successMessage}`);
    expect(successMessage).not.toBe('No success message detected');
    expect(successMessage.toLowerCase()).toContain('waitlist');
    expect(linkedProfileName).toBeTruthy();
    expect(waitlistBookingUrl).toBeTruthy();
    expect(waitlistBookingId).toBeTruthy();

    logger.info(`✅ Waitlist Guest Reservation created successfully for: ${linkedGuestName} (booking ${waitlistBookingId})`);
  });

  // ════════════════════════════════════════════════════
  //  TEST 2: CONFIRM THE WAITLIST BOOKING (created in test 1)
  // ════════════════════════════════════════════════════

  /**
   * Test 2: Open the waitlist booking created in test 1 (SAME browser session —
   * no re-login), assign a room and confirm it.
   *
   * Flow: Open booking (captured URL) → Verify status WAIT-LISTED →
   * Assign Room (Choose Room popup → first IN & VA tile) →
   * Click Confirm → SweetAlert "Yes" →
   * Verify "Details created/updated successfully." → Reload →
   * Verify badge CONFIRMED and Confirm button gone.
   *
   * Business rule: a room must be allotted (vacant + inspected) before a
   * reservation can be confirmed — confirmWaitlistBooking enforces this.
   */
  test('Confirm the waitlist booking created in previous test', async () => {
    const page = sharedPage;
    const context = sharedContext;
    test.setTimeout(10 * 60 * 1000);

    const waitlistPage = PageFactory.create(page, context, GuestReservationWaitlistPage);

    // Guard: the booking URL must have been captured by test 1
    expect(waitlistBookingUrl, 'Waitlist booking URL captured by test 1 is required').toBeTruthy();

    // ── Step 1: Open the waitlist booking via its detail URL ──
    // The shared browser is already logged in (test 1) and still on the
    // booking detail page — openBookingByUrl makes this deterministic.
    await test.step('Open waitlist booking detail page', async () => {
      await waitlistPage.openBookingByUrl(waitlistBookingUrl);
      logger.info(`Booking detail page opened: ${waitlistBookingUrl}`);
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-confirm-detail-page.png',
      fullPage: true,
    });

    // ── Step 2: Verify status is WAIT-LISTED ──
    let statusBefore = '';
    await test.step('Verify booking status is WAIT-LISTED', async () => {
      statusBefore = await waitlistPage.getBookingStatus();
      logger.info(`Booking status before confirm: ${statusBefore}`);
    });

    expect(statusBefore.toUpperCase()).toContain('WAIT');

    // ── Step 3: Assign a vacant & inspected (IN & VA) room ──
    // Business rule: a room must be allotted before confirming a reservation.
    // Opens the "Choose Room" popup via Assign Room and picks the first tile
    // showing IN (inspected) & VA (vacant). The page object verifies the room
    // number appears after reload ("Change Room" button).
    let assignedRoom = '';
    await test.step('Assign vacant & inspected room (IN & VA)', async () => {
      assignedRoom = await waitlistPage.assignRoomVacantInspected();
      logger.info(`Room assigned: ${assignedRoom}`);
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-confirm-room-assigned.png',
      fullPage: true,
    });

    expect(assignedRoom).toBeTruthy();
    expect(assignedRoom.toUpperCase()).not.toBe('N/A');

    // ── Step 4: Confirm the waitlist booking ──
    // Room is assigned — confirmWaitlistBooking re-checks this and throws if
    // the room number is still "N/A". Clicks Confirm → answers "Are u want
    // to Confirm these Guests.?" → Yes → verifies "Details created/updated
    // successfully." → reloads → asserts CONFIRMED.
    let confirmMessage = '';
    await test.step('Confirm waitlist booking', async () => {
      confirmMessage = await waitlistPage.confirmWaitlistBooking();
      logger.info(`Confirm result: ${confirmMessage}`);
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-confirm-success.png',
      fullPage: true,
    });

    // ── Step 5: Verify final status is CONFIRMED ──
    let finalStatus = '';
    await test.step('Verify booking status is CONFIRMED', async () => {
      finalStatus = await waitlistPage.getBookingStatus();
      logger.info(`Booking status after confirm: ${finalStatus}`);
    });

    // Final assertions
    logger.info(`Waitlist confirm result: ${confirmMessage} | room: ${assignedRoom} | final status: ${finalStatus}`);
    expect(confirmMessage.toLowerCase()).toContain('successfully');
    expect(finalStatus.toUpperCase()).toContain('CONFIRMED');

    logger.info(`✅ Waitlist booking ${waitlistBookingId} confirmed with room ${assignedRoom} for: ${linkedGuestName}`);
  });

  // ════════════════════════════════════════════════════
  //  TEST 3: CANCEL THE CONFIRMED BOOKING (created in test 1, confirmed in test 2)
  // ════════════════════════════════════════════════════

  /**
   * Test 3: Cancel the confirmed waitlist booking via the Cancel button.
   * Reuses the SAME browser session (no re-login).
   *
   * Flow: Open booking (captured URL) → Verify status CONFIRMED →
   * Click Cancel → "Cancel Reservation" dialog → select first
   * Cancellation Reason + fill Remarks → Ok →
   * Verify "Details created/updated successfully." →
   * Verify badge becomes CANCELLED.
   */
  test('Cancel the confirmed waitlist booking', async () => {
    const page = sharedPage;
    const context = sharedContext;
    test.setTimeout(10 * 60 * 1000);

    const waitlistPage = PageFactory.create(page, context, GuestReservationWaitlistPage);

    // Guard: the booking URL must have been captured by test 1
    expect(waitlistBookingUrl, 'Waitlist booking URL captured by test 1 is required').toBeTruthy();

    // ── Step 1: Open the booking (shared browser — already logged in) ──
    await test.step('Open booking detail page', async () => {
      await waitlistPage.openBookingByUrl(waitlistBookingUrl);
      logger.info(`Booking detail page opened: ${waitlistBookingUrl}`);
    });

    // ── Step 2: Verify status is CONFIRMED before cancelling ──
    let statusBefore = '';
    await test.step('Verify booking status is CONFIRMED', async () => {
      statusBefore = await waitlistPage.getBookingStatus();
      logger.info(`Booking status before cancel: ${statusBefore}`);
    });

    expect(statusBefore.toUpperCase()).toContain('CONFIRMED');

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-cancel-detail-page.png',
      fullPage: true,
    });

    // ── Step 3: Cancel the booking ──
    // Clicks Cancel → fills Cancel Reservation dialog (first Cancellation
    // Reason + Remarks) → Ok → verifies success message → badge CANCELLED.
    let cancelMessage = '';
    await test.step('Cancel the confirmed booking', async () => {
      cancelMessage = await waitlistPage.cancelConfirmedBooking();
      logger.info(`Cancel result: ${cancelMessage}`);
    });

    await page.screenshot({
      path: 'screenshots/guest-reservation-waitlist-cancel-success.png',
      fullPage: true,
    });

    // ── Step 4: Verify final status is CANCELLED ──
    let finalStatus = '';
    await test.step('Verify booking status is CANCELLED', async () => {
      finalStatus = await waitlistPage.getBookingStatus();
      logger.info(`Booking status after cancel: ${finalStatus}`);
    });

    // Final assertions
    logger.info(`Cancel result: ${cancelMessage} | final status: ${finalStatus}`);
    expect(cancelMessage.toLowerCase()).toContain('successfully');
    expect(finalStatus.toUpperCase()).toContain('CANCEL');

    logger.info(`✅ Waitlist booking ${waitlistBookingId} cancelled successfully for: ${linkedGuestName}`);
  });
});
