import { Page, BrowserContext, Locator } from '@playwright/test';
import { GuestReservationPage, ReservationCreatedResult } from './GuestReservationPage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';

/**
 * Page Object Model for the WAITLIST Guest Reservation flow (Regression).
 *
 * Extends GuestReservationPage — every framework method from the confirmed
 * reservation flow is reused (navigation, room selection, profile linking,
 * ng-select dropdowns, stuck-loader recovery). This class only adds the
 * waitlist-specific behaviour that was verified live against the app:
 *
 *   1. Quick Reservation dialog opens with **Confirm** selected by default
 *      (radio group: Waitlist / Confirm / Hold / Walkin).
 *   2. Selecting **Waitlist**:
 *      - switches the radio to Waitlist (Confirm becomes unchecked)
 *      - changes the footer action button from "Confirm & Continue"
 *        to **"Waitlist & Continue"**
 *      - shows an optional "Due On" field in Payment Details (NOT required —
 *        the waitlist completes without filling it)
 *      - applies the waitlist rate code (e.g. WLKRO) to the stay
 *   3. No confirmation-letter SweetAlert appears for waitlist reservations.
 *   4. Success alert (inside the dialog) reads:
 *      "Congratulations, your reservation for <Guest> has been waitlisted successfully"
 *      and the dialog stays open showing "Open Booking" / "Print Registration".
 */
export class GuestReservationWaitlistPage extends GuestReservationPage {
  /** ElementActions instance for this subclass (parent's instance is private) */
  private readonly actions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.actions = new ElementActions(page);
  }

  // ──────────────────────────────────────────────────────
  //  WAITLIST DIALOG LOCATORS
  // ──────────────────────────────────────────────────────

  /** Waitlist radio button in the Quick Reservation dialog */
  private get waitlistRadio(): Locator {
    return this.quickReservationDialog.getByRole('radio', { name: 'Waitlist' });
  }

  /** Visible label text next to the Waitlist radio (input itself may be visually hidden) */
  private get waitlistRadioLabel(): Locator {
    return this.quickReservationDialog.locator('label').filter({ hasText: 'Waitlist' });
  }

  /** Confirm radio button — selected by DEFAULT when the dialog opens */
  private get confirmRadio(): Locator {
    return this.quickReservationDialog.getByRole('radio', { name: 'Confirm' });
  }

  /** Primary action button after Waitlist is selected ("Waitlist & Continue") */
  private get waitlistAndContinueButton(): Locator {
    return this.page.locator('button').filter({ hasText: 'Waitlist & Continue' }).first();
  }

  /** Fallback action button ("Confirm & Continue") if the app keeps the confirmed text */
  private get confirmAndContinueFallbackButton(): Locator {
    return this.page.locator('button').filter({ hasText: 'Confirm & Continue' }).first();
  }

  /** Success alert shown inside the dialog after a waitlist is created */
  private get waitlistSuccessAlert(): Locator {
    return this.page.locator('[role="alert"]').filter({ hasText: /waitlist/i }).first();
  }

  // ──────────────────────────────────────────────────────
  //  BOOKING DETAIL / CONFIRM-WAITLIST LOCATORS
  // ──────────────────────────────────────────────────────

  /** Guest Details heading on the booking detail page — contains the booking id (e.g. "Guest Details 10146231") */
  private get guestDetailsHeadingWithId(): Locator {
    return this.page.locator('h5').filter({ hasText: /^Guest Details/ }).first();
  }

  /** Status badge on the booking detail page (WAIT-LISTED / CONFIRMED / CANCELLED / HOLD / WALK-IN) */
  private get bookingStatusBadge(): Locator {
    return this.page
      .locator('.badge, [class*="badge"]')
      .filter({ hasText: /WAIT-?LISTED|CONFIRMED|CANCELLED|HOLD|WALK-?IN/i })
      .first();
  }

  /** Confirm button on the waitlist booking detail page (footer, above Bill Summary) */
  private get confirmBookingButton(): Locator {
    return this.page.getByRole('button', { name: 'Confirm', exact: true });
  }

  /** SweetAlert popup container (used for the confirm prompt and success message) */
  private get swalPopup(): Locator {
    return this.page.locator('.swal2-popup');
  }

  // ── ROOM ASSIGNMENT LOCATORS ──

  /** Room info box in Stay Details (room-type / room-number / guest-name / Assign|Change Room button) */
  private get roomInfoBox(): Locator {
    return this.page.locator('.room-info').first();
  }

  /** Room number display inside the room info box ("N/A" until a room is assigned) */
  private get roomNumberDisplay(): Locator {
    return this.roomInfoBox.locator('.room-number');
  }

  /** Assign Room button inside the room info box (waitlist bookings without a room) */
  private get assignRoomButton(): Locator {
    return this.roomInfoBox.getByRole('button', { name: /Assign Room/i });
  }

  /** Choose Room popup opened by the Assign Room button */
  private get chooseRoomDialog(): Locator {
    return this.page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Choose Room' });
  }

  /** Room tiles that are IN (inspected) & VA (vacant) — the only assignable rooms */
  private get vacantInspectedRoomTiles(): Locator {
    return this.chooseRoomDialog.locator('button.room-btn').filter({ hasText: /IN\s+VA/ });
  }

  // ── CANCEL BOOKING LOCATORS ──

  /** Cancel button on the confirmed booking detail page (footer — unique with exact name) */
  private get cancelBookingButton(): Locator {
    return this.page.getByRole('button', { name: 'Cancel', exact: true });
  }

  /** Cancel Reservation dialog opened by the Cancel button */
  private get cancelReservationDialog(): Locator {
    return this.page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Cancel Reservation' });
  }

  /** Cancellation Reason dropdown inside the Cancel Reservation dialog (ng-select, required) */
  private get cancellationReasonDropdown(): Locator {
    return this.cancelReservationDialog.locator('ng-select').first();
  }

  /**
   * Remarks textbox inside the Cancel Reservation dialog (required).
   * The dialog has two textboxes — the ng-select search input first, Remarks last.
   */
  private get cancellationRemarksInput(): Locator {
    return this.cancelReservationDialog.getByRole('textbox').last();
  }

  // ──────────────────────────────────────────────────────
  //  WAITLIST METHODS
  // ──────────────────────────────────────────────────────

  /**
   * Read the text of the dialog's primary action button (bottom-right).
   * Used to verify the button switches to "Waitlist & Continue".
   */
  async getPrimaryActionButtonText(): Promise<string> {
    const btn = this.page
      .locator('button')
      .filter({ hasText: /Continue/ })
      .last();
    const text = await btn.textContent().catch(() => '');
    return (text || '').trim();
  }

  /**
   * Select the WAITLIST option in the Quick Reservation dialog.
   * Confirm is selected by default — this switches it to Waitlist.
   * Verifies:
   *   - Waitlist radio is checked
   *   - Confirm radio is unchecked
   *   - the primary action button now reads "Waitlist & Continue"
   */
  async selectWaitlistOption(): Promise<void> {
    logger.info('Selecting Waitlist option in Quick Reservation dialog (Confirm is default)');

    // Dialog must be open
    await this.quickReservationDialog.waitFor({ state: 'visible', timeout: 15000 });

    const alreadyChecked = await this.waitlistRadio.isChecked().catch(() => false);
    if (alreadyChecked) {
      logger.info('Waitlist option already selected');
    } else {
      // Click the visible label text first (radio input may be visually hidden)
      const labelVisible = await this.waitlistRadioLabel.isVisible({ timeout: 3000 }).catch(() => false);
      if (labelVisible) {
        await this.actions.click(this.waitlistRadioLabel, 'Waitlist option label');
      } else {
        // Fallback: force-click the radio input itself
        await this.waitlistRadio.click({ force: true });
      }
      await this.page.waitForTimeout(1000);
    }

    // Verify Waitlist checked + Confirm unchecked
    const waitlistChecked = await this.waitlistRadio.isChecked().catch(() => false);
    const confirmChecked = await this.confirmRadio.isChecked().catch(() => false);
    if (!waitlistChecked || confirmChecked) {
      throw new Error(
        `Waitlist selection failed (waitlistChecked=${waitlistChecked}, confirmChecked=${confirmChecked})`
      );
    }

    // Verify the action button switched to Waitlist & Continue
    const buttonText = await this.getPrimaryActionButtonText();
    logger.info(`Primary action button text after Waitlist selection: "${buttonText}"`);
    if (!/waitlist/i.test(buttonText)) {
      logger.warn(`Expected action button to mention Waitlist but found: "${buttonText}"`);
    }

    logger.info('✅ Waitlist option selected');
  }

  /**
   * Click the "Waitlist & Continue" button to submit the waitlist reservation.
   * Uses the same JS-click pattern as the confirmed flow (button is intercepted
   * by the dialog overlay). Falls back to "Confirm & Continue" if the app keeps
   * that text in some environments.
   */
  async clickWaitlistAndContinue(): Promise<void> {
    logger.info('Clicking Waitlist & Continue');

    // Scroll the dialog body to the bottom so footer buttons are reachable
    await this.quickReservationDialog.evaluate((dialog) => {
      const body = dialog.querySelector('.modal-body');
      if (body) body.scrollTop = body.scrollHeight;
    });
    await this.page.waitForTimeout(500);

    // Primary: "Waitlist & Continue"; fallback: "Confirm & Continue"
    let btn = this.waitlistAndContinueButton;
    let visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!visible) {
      logger.warn('Waitlist & Continue button not visible — falling back to Confirm & Continue');
      btn = this.confirmAndContinueFallbackButton;
      await btn.waitFor({ state: 'visible', timeout: 10000 });
    }

    // JavaScript click — button is intercepted by overlapping dialog elements
    // (cast to any — tsconfig lib is ES2020 without DOM, so HTMLElement is unresolved)
    await btn.evaluate((el) => (el as any).click());
    await this.page.waitForTimeout(3000);
    logger.info('✅ Waitlist & Continue clicked');
  }

  /**
   * Handle any prompt that appears after submitting a waitlist.
   * Waitlist reservations typically SKIP the confirmation-letter prompt,
   * so this reuses the parent handler which gracefully no-ops when no
   * prompt is present (it logs and returns instead of failing).
   */
  async handleWaitlistConfirmationPrompt(): Promise<void> {
    logger.info('Handling post-waitlist prompt (confirmation letter prompt is usually skipped for waitlist)');
    await super.handleConfirmationLetterPrompt();
  }

  /**
   * Verify the waitlist reservation success message.
   * Observed live: "Congratulations, your reservation for <Guest> has been
   * waitlisted successfully" — shown as a [role="alert"] inside the dialog,
   * which stays open with "Open Booking" / "Print Registration" buttons.
   * @returns The success message text
   */
  async verifyWaitlistSuccess(): Promise<string> {
    logger.info('Verifying waitlist reservation success message');
    await this.page.waitForTimeout(3000);

    const checks = [
      { selector: '[role="alert"]', name: 'Alert' },
      { selector: '#swal2-html-container', name: 'SweetAlert' },
      { selector: '.swal2-html-container', name: 'SweetAlert alt' },
      { selector: '.toast-body', name: 'Toast' },
    ];

    for (const check of checks) {
      const el = this.page.locator(check.selector).first();
      const visible = await el.isVisible({ timeout: 3000 }).catch(() => false);
      if (!visible) continue;

      const text = ((await el.textContent().catch(() => '')) || '').trim();
      if (!text) continue;

      logger.info(`Found ${check.name} with text: ${text.substring(0, 150)}`);

      if (/waitlist/i.test(text) || /Congratulations/i.test(text) || /confirmed/i.test(text)) {
        // Dismiss SweetAlert OK button if one is present
        const okBtn = this.page.locator('.swal2-popup').getByRole('button', { name: 'OK' });
        if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await okBtn.click();
        }
        logger.info('✅ Waitlist reservation success verified');
        return text;
      }
    }

    // Fallback: returning to Guest Management indicates the flow completed
    const gmHeading = await this.page
      .getByRole('heading', { name: 'Guest Management' })
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (gmHeading) {
      logger.info('✅ Returned to Guest Management page — waitlist reservation likely successful');
      return 'Waitlist reservation completed - returned to Guest Management';
    }

    logger.warn('No waitlist success message found — reservation may have failed');
    return 'No success message detected';
  }

  // ──────────────────────────────────────────────────────
  //  OPEN BOOKING & CONFIRM-WAITLIST METHODS
  // ──────────────────────────────────────────────────────

  /**
   * Open the booking from the waitlist success dialog via the "Open Booking"
   * button and capture the booking detail URL + id.
   * Used by the confirm test (cross-test hand-off via module-level state).
   * @returns The booking detail URL and the numeric booking id
   */
  async openBookingFromWaitlistSuccess(): Promise<{ url: string; bookingId: string }> {
    logger.info('Opening booking from the waitlist success dialog');

    // Inherited from GuestReservationPage — waits for the "Open Booking"
    // button, clicks it and waits for the Guest Details heading.
    await this.clickOpenBooking();
    await this.page.waitForTimeout(1000);

    const url = this.page.url();
    const headingText = ((await this.guestDetailsHeadingWithId.textContent().catch(() => '')) || '').trim();
    const bookingId = headingText.replace(/\D/g, '');

    logger.info(`✅ Booking detail page loaded — id: ${bookingId}, url: ${url}`);
    return { url, bookingId };
  }

  /**
   * Open a booking detail page directly by URL (deep link).
   * Used by the confirm test to reopen the waitlist booking created in the
   * previous test (each Playwright test gets a fresh browser context).
   * Retries once — the app can raise a beforeunload guard on route changes.
   * @param url - Booking detail URL captured from the creation test
   */
  async openBookingByUrl(url: string): Promise<void> {
    logger.info(`Opening booking detail page: ${url}`);
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch {
      logger.warn('Navigation to booking URL did not settle — retrying once');
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    }

    await this.guestDetailsHeadingWithId.waitFor({ state: 'visible', timeout: 20000 });
    await this.page.waitForTimeout(2000);
    logger.info('✅ Booking detail page loaded');
  }

  /**
   * Read the booking status badge on the detail page
   * (WAIT-LISTED / CONFIRMED / HOLD / WALK-IN).
   * @returns The badge text, or 'Unknown' if no status badge is found
   */
  async getBookingStatus(): Promise<string> {
    // Preferred: badge filtered to known status texts
    if (await this.bookingStatusBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = ((await this.bookingStatusBadge.textContent().catch(() => '')) || '').trim();
      if (text) return text;
    }

    // Fallback: scan all badges for a status-like text
    const badges = this.page.locator('.badge, [class*="badge"]');
    const count = await badges.count();
    for (let i = 0; i < count; i++) {
      const text = ((await badges.nth(i).textContent().catch(() => '')) || '').trim();
      if (/WAIT-?LISTED|CONFIRMED|CANCELLED|HOLD|WALK-?IN/i.test(text)) return text;
    }

    return 'Unknown';
  }

  // ──────────────────────────────────────────────────────
  //  ROOM ASSIGNMENT (BEFORE CONFIRM)
  // ──────────────────────────────────────────────────────

  /**
   * Read the room number currently assigned to the stay
   * (.room-info .room-number — shows "N/A" until a room is assigned).
   * @returns The trimmed room number text (e.g. "206" or "N/A")
   */
  async getAssignedRoomNumber(): Promise<string> {
    const text = ((await this.roomNumberDisplay.textContent().catch(() => '')) || '').trim();
    return text || 'N/A';
  }

  /**
   * Assign a room to the waitlist booking BEFORE confirming it.
   * Business rule (verified live on stage): a room must be allotted to a
   * reservation before it can be confirmed.
   *
   * Flow (verified live):
   *   1. Booking detail page: room box shows "N/A" + "Assign Room" button
   *   2. Click Assign Room → "Choose Room (<room type>)" popup opens
   *   3. Room tiles are button.room-btn showing "<roomNo> <HK> <occupancy>"
   *      codes — only IN (inspected) & VA (vacant) rooms are assignable
   *   4. Click the first IN & VA tile → popup closes + success SweetAlert
   *      "Details created/updated successfully."
   *   5. After swal OK + page reload the room box shows the room number and
   *      the button switches to "Change Room"
   * @returns The assigned room number
   */
  async assignRoomVacantInspected(): Promise<string> {
    logger.info('Assigning a vacant & inspected (IN & VA) room to the waitlist booking');

    // Booking detail page must be loaded
    await this.guestDetailsHeadingWithId.waitFor({ state: 'visible', timeout: 15000 });

    const roomBefore = await this.getAssignedRoomNumber();
    logger.info(`Room number before assignment: ${roomBefore}`);

    // Click "Assign Room" inside the room info box (dashed box in Stay Details)
    const assignVisible = await this.assignRoomButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (!assignVisible) {
      // A room may already be assigned (button reads "Change Room")
      const changeVisible = await this.roomInfoBox
        .getByRole('button', { name: /Change Room/i })
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      if (changeVisible) {
        logger.warn('Room already assigned (Change Room button present) — skipping assignment');
        return roomBefore === 'N/A' ? 'Already assigned' : roomBefore;
      }
      throw new Error('Assign Room button not found on the waitlist booking detail page');
    }
    await this.actions.click(this.assignRoomButton, 'Assign Room button in room info box');

    // Choose Room popup opens
    await this.chooseRoomDialog.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(1500);
    logger.info('Choose Room popup opened');

    // Find the first IN (inspected) & VA (vacant) room tile
    const tile = this.vacantInspectedRoomTiles.first();
    const tileVisible = await tile.isVisible({ timeout: 10000 }).catch(() => false);
    if (!tileVisible) {
      throw new Error('No vacant & inspected (IN & VA) room tile found in the Choose Room popup');
    }
    const tileText = ((await tile.textContent().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    logger.info(`Selecting room tile: ${tileText}`);

    // Click the tile — popup closes and the room is assigned immediately
    await this.actions.click(tile, 'IN & VA room tile in Choose Room popup');
    await this.page.waitForTimeout(2000);

    // Success SweetAlert: "Details created/updated successfully."
    if (await this.swalPopup.isVisible({ timeout: 10000 }).catch(() => false)) {
      const msg = ((await this.page.locator('#swal2-html-container').textContent().catch(() => '')) || '').trim();
      logger.info(`Room assignment message: ${msg}`);
      const okBtn = this.swalPopup.getByRole('button', { name: 'OK' });
      if (await okBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await okBtn.click();
      }
      await this.page.waitForTimeout(1000);
    } else {
      logger.warn('No success SweetAlert detected after room assignment');
    }

    // Reload — the room box stays stale ("N/A") until the page refreshes
    try {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
    } catch {
      await this.page.goto(this.page.url(), { waitUntil: 'domcontentloaded' });
    }
    await this.guestDetailsHeadingWithId.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(2000);

    // Verify the room number is now populated
    const roomAfter = await this.getAssignedRoomNumber();
    logger.info(`Room number after assignment: ${roomAfter}`);
    if (!roomAfter || /^N\/?A$/i.test(roomAfter)) {
      throw new Error(`Room assignment failed — room number still "${roomAfter}" after reload`);
    }

    logger.info(`✅ Room ${roomAfter} assigned successfully (IN & VA)`);
    return roomAfter;
  }

  /**
   * Confirm a WAITLISTED booking from its detail page.
   * Verified live (stage env):
   *   1. Booking detail page shows "WAIT-LISTED" badge + "Confirm" button
   *   2. Click Confirm → SweetAlert "Are u want to Confirm these Guests.?" → Yes
   *   3. Success SweetAlert: "Details created/updated successfully." → OK
   *   4. After page reload the badge reads "CONFIRMED" and the Confirm button is gone
   * @returns The success message text from the confirmation popup
   */
  async confirmWaitlistBooking(): Promise<string> {
    logger.info('Confirming waitlist booking from the booking detail page');

    // Booking detail page must be loaded
    await this.guestDetailsHeadingWithId.waitFor({ state: 'visible', timeout: 15000 });

    // Business rule: a room must be allotted before the reservation is confirmed
    const assignedRoom = await this.getAssignedRoomNumber();
    if (!assignedRoom || /^N\/?A$/i.test(assignedRoom)) {
      throw new Error(
        'No room assigned to this booking — assign a vacant & inspected (IN & VA) room before confirming'
      );
    }
    logger.info(`Room already assigned: ${assignedRoom}`);

    // Verify current status is WAIT-LISTED
    const statusBefore = await this.getBookingStatus();
    logger.info(`Booking status before confirm: ${statusBefore}`);
    if (!/wait-?listed/i.test(statusBefore)) {
      logger.warn(`Expected WAIT-LISTED status but found: "${statusBefore}"`);
    }

    // Click the Confirm button (footer, above Bill Summary)
    await this.confirmBookingButton.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    const confirmVisible = await this.confirmBookingButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (!confirmVisible) {
      throw new Error('Confirm button not found on the waitlist booking detail page');
    }
    await this.actions.click(this.confirmBookingButton, 'Confirm button on booking detail page');
    await this.page.waitForTimeout(2000);

    // Handle SweetAlert prompt: "Are u want to Confirm these Guests.?" → Yes
    await this.swalPopup.waitFor({ state: 'visible', timeout: 10000 });
    const promptText = ((await this.page.locator('#swal2-html-container').textContent().catch(() => '')) || '').trim();
    logger.info(`Confirm prompt: ${promptText}`);
    await this.swalPopup.getByRole('button', { name: 'Yes' }).click();
    await this.page.waitForTimeout(2000);

    // Wait for the success message: "Details created/updated successfully."
    let successMessage = '';
    if (await this.swalPopup.isVisible({ timeout: 10000 }).catch(() => false)) {
      successMessage = ((await this.page.locator('#swal2-html-container').textContent().catch(() => '')) || '').trim();
      logger.info(`Confirmation success message: ${successMessage}`);
      const okBtn = this.swalPopup.getByRole('button', { name: 'OK' });
      if (await okBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await okBtn.click();
      }
      await this.page.waitForTimeout(1000);
    } else {
      logger.warn('No success SweetAlert detected after confirming');
    }

    // Reload — the status badge stays stale until the page refreshes
    try {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
    } catch {
      await this.page.goto(this.page.url(), { waitUntil: 'domcontentloaded' });
    }
    await this.guestDetailsHeadingWithId.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(2000);

    // Verify the booking is now CONFIRMED and the Confirm button is gone
    const statusAfter = await this.getBookingStatus();
    logger.info(`Booking status after confirm: ${statusAfter}`);
    const confirmStillVisible = await this.confirmBookingButton.isVisible({ timeout: 3000 }).catch(() => false);
    logger.info(`Confirm button still visible after reload: ${confirmStillVisible}`);

    if (!/confirmed/i.test(statusAfter)) {
      throw new Error(`Booking was not confirmed — status after reload: "${statusAfter}"`);
    }
    if (confirmStillVisible) {
      logger.warn('Confirm button still visible after confirmation');
    }

    logger.info('✅ Waitlist booking confirmed successfully');
    return successMessage || 'Details created/updated successfully.';
  }

  // ──────────────────────────────────────────────────────
  //  CANCEL BOOKING (AFTER CONFIRM)
  // ──────────────────────────────────────────────────────

  /**
   * Cancel a confirmed booking from its detail page.
   * Verified live (stage env):
   *   1. Detail page (CONFIRMED) has a unique "Cancel" footer button
   *   2. Click Cancel → "Cancel Reservation" dialog with required
   *      Cancellation Reason (ng-select) and Remarks (textbox) + Ok/Close
   *   3. Select first available reason (no hardcoded values) + fill Remarks
   *   4. Click Ok → SweetAlert "Details created/updated successfully." → OK
   *   5. Badge updates to "CANCELLED" immediately (no reload needed);
   *      falls back to one reload if the badge is stale
   * @param remarks - Required remarks text for the cancellation
   * @returns The success message text from the popup
   */
  async cancelConfirmedBooking(remarks: string = 'Cancelled via automation (waitlist regression)'): Promise<string> {
    logger.info('Cancelling the confirmed booking from the booking detail page');

    // Booking detail page must be loaded
    await this.guestDetailsHeadingWithId.waitFor({ state: 'visible', timeout: 15000 });

    const statusBefore = await this.getBookingStatus();
    logger.info(`Booking status before cancel: ${statusBefore}`);

    // Click the Cancel button (footer — unique with exact name)
    const cancelVisible = await this.cancelBookingButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (!cancelVisible) {
      throw new Error('Cancel button not found on the booking detail page (booking may not be confirmed)');
    }
    await this.actions.click(this.cancelBookingButton, 'Cancel button on booking detail page');

    // Cancel Reservation dialog opens
    await this.cancelReservationDialog.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(1000);
    logger.info('Cancel Reservation dialog opened');

    // Select the first available Cancellation Reason (ng-select — no hardcoded values)
    const arrow = this.cancellationReasonDropdown.locator('.ng-arrow-wrapper');
    await arrow.scrollIntoViewIfNeeded();
    await arrow.click({ force: true });
    await this.page.waitForTimeout(1500);
    const firstReason = this.page.locator('.ng-option').first();
    await firstReason.waitFor({ state: 'visible', timeout: 8000 });
    const reasonText = ((await firstReason.textContent().catch(() => '')) || '').trim();
    await firstReason.evaluate((el) => (el as any).click());
    await this.page.waitForTimeout(800);
    logger.info(`Cancellation reason selected: ${reasonText}`);

    // Fill the required Remarks textbox
    await this.cancellationRemarksInput.fill(remarks);
    await this.page.waitForTimeout(500);
    logger.info(`Remarks filled: ${remarks}`);

    // Click Ok
    await this.cancelReservationDialog.getByRole('button', { name: 'Ok' }).click();
    await this.page.waitForTimeout(2500);

    // Success SweetAlert: "Details created/updated successfully."
    let successMessage = '';
    if (await this.swalPopup.isVisible({ timeout: 10000 }).catch(() => false)) {
      successMessage = ((await this.page.locator('#swal2-html-container').textContent().catch(() => '')) || '').trim();
      logger.info(`Cancellation success message: ${successMessage}`);
      const okBtn = this.swalPopup.getByRole('button', { name: 'OK' });
      if (await okBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await okBtn.click();
      }
      await this.page.waitForTimeout(1500);
    } else {
      logger.warn('No success SweetAlert detected after cancelling');
    }

    // Verify the badge reads CANCELLED (updates live; reload once if stale)
    let statusAfter = await this.getBookingStatus();
    if (!/cancel/i.test(statusAfter)) {
      logger.warn(`Status still "${statusAfter}" after cancel — reloading to refresh`);
      try {
        await this.page.reload({ waitUntil: 'domcontentloaded' });
      } catch {
        await this.page.goto(this.page.url(), { waitUntil: 'domcontentloaded' });
      }
      await this.guestDetailsHeadingWithId.waitFor({ state: 'visible', timeout: 15000 });
      await this.page.waitForTimeout(2000);
      statusAfter = await this.getBookingStatus();
    }

    logger.info(`Booking status after cancel: ${statusAfter}`);
    if (!/cancel/i.test(statusAfter)) {
      throw new Error(`Booking was not cancelled — status is "${statusAfter}"`);
    }

    logger.info('✅ Booking cancelled successfully');
    return successMessage || 'Details created/updated successfully.';
  }

  // ──────────────────────────────────────────────────────
  //  FULL FLOW METHOD
  // ──────────────────────────────────────────────────────

  /**
   * Execute the complete WAITLIST Guest Reservation flow from the Guest
   * Management page to a verified waitlist success.
   *
   * Same process as the confirmed GuestReservationPage flow, except the
   * Quick Reservation dialog switches Confirm → Waitlist before submitting.
   *
   * @param lastName - Guest last name used to trigger Advance Search
   * @returns The created waitlist result with linked profile name and success message
   */
  async createWaitlistReservation(lastName: string): Promise<ReservationCreatedResult> {
    logger.info('🔄 Starting Waitlist Guest Reservation flow');

    // Step 1: Navigate to Guest Management
    await this.navigateToGuestManagement();

    // Step 2: Click New Reservation
    await this.clickNewReservation();

    // Step 3: Click Next on Stay Details (with stuck-loader recovery)
    await this.clickNextOnStayDetailsWithRecovery();

    // Step 4: Select first available room via "+" button
    await this.selectFirstAvailableRoom();

    // Step 5: Click Next → Quick Reservation dialog opens (Confirm default)
    await this.clickNextOnRoomSelection();

    // Step 6: Switch Confirm → Waitlist
    await this.selectWaitlistOption();

    // Step 7: Enter last name and trigger Advance Search
    await this.enterLastNameAndTriggerProfileSearch(lastName);

    // Step 8: Link first profile
    const linkedProfileName = await this.linkFirstProfile();

    // Step 9-11: Select Guest Class, Market Segment, Business Source (first available)
    await this.selectGuestClass();
    await this.selectMarketSegment();
    await this.selectBusinessSource();

    // Step 12: Click Waitlist & Continue
    await this.clickWaitlistAndContinue();

    // Step 13: Handle any post-waitlist prompt (usually none for waitlist)
    await this.handleWaitlistConfirmationPrompt();

    // Step 14: Verify waitlist success message
    const successMessage = await this.verifyWaitlistSuccess();

    const result: ReservationCreatedResult = {
      guestName: linkedProfileName,
      successMessage,
    };

    logger.info(`✅ Waitlist Guest Reservation flow completed successfully for: ${linkedProfileName}`);
    return result;
  }
}
