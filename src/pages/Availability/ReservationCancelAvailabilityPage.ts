import { BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';
import { AvailabilityGridData, RecreateAvailabilityPage } from './RecreateAvailabilityPage';

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

/** Result of booking N rooms of one room type in a single reservation. */
export interface BookingResult {
  roomType: string;
  roomsBooked: number;
  confirmationNo: string;
  lastName: string;
}

/** One "Stay #N" card on the Reservation Details summary view (…/SE/<conf no>). */
export interface StayStatus {
  stayNo: number;
  reservationId: string;
  status: string; // CONFIRMED | CANCELLED | …
}

/** Result of cancelling every confirmed stay of a reservation. */
export interface CancellationResult {
  confirmationNo: string;
  staysCancelled: number;
  messages: string[];
  statuses: StayStatus[];
}

const CANCEL_API = '/ReservationActions/CancelationReservation';
const SEARCH_API = '/FrontDesk/Advance/GetAdvanceSearchData';

// ──────────────────────────────────────────────────────────────
//  Page Object – Book a reservation, cancel it, and read availability
// ──────────────────────────────────────────────────────────────

/**
 * Books N rooms in one reservation, cancels that reservation stay by stay,
 * and reads the Quick Access → Availability grid around both steps.
 *
 * Booking and the availability grid are delegated to {@link RecreateAvailabilityPage}.
 *
 * UI flow and quirks (verified live on QC2 / WEBMI, 2026-10-19):
 * - After "No" on the confirmation-letter prompt, the confirmation page (`app-guest-confirmation`)
 *   shows "Congratulations, your reservation for <name> has been confirmed successfully" and the
 *   heading `Guest Details <conf no>`. Its buttons are Open Booking / Print Registration / Back.
 * - A booking with several rooms is ONE Guest Management row with a green **M** (multi-guest) badge.
 *   Each room is its own stay ("Stay #1 … Stay #N", each with its own 12-digit reservation id).
 *   It can't be cancelled from the grid. Every stay has to be cancelled on its own:
 *   Stay card ⋮ → Reservation Details (URL …/DE/<reservation id>) → red **Cancel** button.
 * - Cancel dialog `ngb-modal-window` "Cancel Reservation": Cancellation Reason (ng-select, required,
 *   options like `****  No Reason Specified`, `R002  Guest – Travel cancelled`), Remarks (textarea,
 *   required), Ok / Close. Ok → POST `ReservationActions/CancelationReservation` → SweetAlert
 *   "Details created/updated successfully." → OK. The stay badge changes CONFIRMED → CANCELLED.
 * - "View all bookings" (toolbar, `title` attribute) returns from the DE view to the SE summary.
 * - Each cancelled stay gives one room back to the availability grid straight away (no refresh needed).
 * - Guest Management grid: search box `input.search`, rows `app-data-grid .dg-row`, open action `[title="Open"]`.
 *   A right-click opens the grid's layout context menu, not row actions.
 * - Guest Management opens with the filter chip "Quick Search : Expected Arrival (Today)", which hides
 *   reservations arriving on other days. Its `button.btn-close` removes it and re-runs
 *   POST `FrontDesk/Advance/GetAdvanceSearchData` (quick_Button_Ind "EA" → ""). See clearQuickSearchFilter().
 */
export class ReservationCancelAvailabilityPage extends BasePage {
  private readonly elementActions: ElementActions;
  /** Shared Quick Access availability grid + booking flow. */
  readonly availability: RecreateAvailabilityPage;

  /* ── Header / Guest Management ── */
  private readonly globalSearchInput: Locator;
  private readonly guestManagementHeading: Locator;
  private readonly gridSearchInput: Locator;
  private readonly gridRows: Locator;
  private readonly quickSearchChipClose: Locator;

  /* ── Booking confirmation page ── */
  private readonly confirmationPage: Locator;
  private readonly confirmationNoHeading: Locator;
  private readonly confirmationBackButton: Locator;

  /* ── Reservation Details (SE summary / DE per-stay) ── */
  private readonly stayHeadings: Locator;
  private readonly openDropdownMenu: Locator;
  private readonly viewAllBookingsButton: Locator;
  private readonly cancelStayButton: Locator;

  /* ── Cancel Reservation dialog ── */
  private readonly cancelDialog: Locator;
  private readonly cancelReasonSelect: Locator;
  private readonly cancelReasonOptions: Locator;
  private readonly cancelRemarksInput: Locator;
  private readonly cancelOkButton: Locator;

  /* ── SweetAlert ── */
  private readonly swalPopup: Locator;
  private readonly swalMessage: Locator;
  private readonly swalConfirmButton: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.availability = new RecreateAvailabilityPage(page, context);

    // Header / Guest Management
    this.globalSearchInput = this.page.locator('#search-options');
    this.guestManagementHeading = this.page.locator('h4, h3').filter({ hasText: /^\s*Guest Management\s*$/ }).first();
    this.gridSearchInput = this.page.locator('input.search').first();
    this.gridRows = this.page.locator('app-data-grid .dg-row');
    this.quickSearchChipClose = this.page
      .locator('.filters-list > div')
      .filter({ hasText: /Quick Search\s*:/ })
      .locator('button.btn-close');

    // Booking confirmation page
    this.confirmationPage = this.page.locator('app-guest-confirmation');
    this.confirmationNoHeading = this.confirmationPage.locator('h5').filter({ hasText: /Guest Details\s+\d+/ }).first();
    this.confirmationBackButton = this.confirmationPage.locator('button').filter({ hasText: /^\s*Back\s*$/ }).first();

    // Reservation Details
    this.stayHeadings = this.page.locator('h5').filter({ hasText: /^\s*Stay #\d+/ });
    this.openDropdownMenu = this.page.locator('.dropdown-menu.show');
    this.viewAllBookingsButton = this.page.locator('button[title="View all bookings"]:visible').first();
    this.cancelStayButton = this.page
      .locator('.card.hstack button.btn-soft-danger:visible')
      .filter({ hasText: /^\s*Cancel\s*$/ })
      .first();

    // Cancel Reservation dialog
    this.cancelDialog = this.page.locator('ngb-modal-window').filter({ hasText: 'Cancel Reservation' }).last();
    this.cancelReasonSelect = this.cancelDialog.locator('drop-down-searchable[formcontrolname="reason"] ng-select');
    this.cancelReasonOptions = this.page.locator('ng-dropdown-panel .ng-option');
    this.cancelRemarksInput = this.cancelDialog.locator('text-area-control[formcontrolname="remarks"] textarea');
    this.cancelOkButton = this.cancelDialog.locator('button[type="submit"]').filter({ hasText: /^\s*Ok\s*$/ });

    // SweetAlert
    this.swalPopup = this.page.locator('.swal2-popup');
    this.swalMessage = this.page.locator('.swal2-popup .swal2-html-container');
    this.swalConfirmButton = this.page.locator('.swal2-popup .swal2-confirm');
  }

  // ──────────────────────────────────────────────────────────────
  //  Availability grid
  // ──────────────────────────────────────────────────────────────

  /** Open Quick Access → Availability, capture the whole grid, and close it again. */
  async captureAvailability(): Promise<AvailabilityGridData> {
    await this.availability.openQuickAccessPanel();
    await this.availability.clickAvailabilityQuickLink();
    const grid = await this.availability.captureAvailabilityGrid();
    await this.availability.closeAvailabilityModal();
    return grid;
  }

  // ──────────────────────────────────────────────────────────────
  //  Booking
  // ──────────────────────────────────────────────────────────────

  /**
   * Book `numberOfRooms` rooms of `roomType` for one night (default stay dates = business date)
   * in a single reservation, and read its confirmation number from the confirmation page.
   */
  async bookRooms(roomType: string, lastName: string, numberOfRooms: number): Promise<BookingResult> {
    logger.info(`Booking ${numberOfRooms} room(s) of "${roomType}" for guest "${lastName}"`);
    const booked = await this.availability.runBookingFlow(roomType, lastName, numberOfRooms);
    if (booked.roomType !== roomType) {
      throw new Error(`Booking switched room type from "${roomType}" to "${booked.roomType}" (no availability)`);
    }

    const confirmationNo = await this.readConfirmationNumber();
    logger.info(`✅ Reservation ${confirmationNo} created: ${numberOfRooms} × ${roomType}`);
    return { roomType, roomsBooked: numberOfRooms, confirmationNo, lastName };
  }

  /** Read the confirmation number from the booking confirmation page heading `Guest Details <conf no>`. */
  async readConfirmationNumber(): Promise<string> {
    await this.confirmationNoHeading.waitFor({ state: 'visible', timeout: 60000 });
    const headingText = (await this.confirmationNoHeading.textContent()) ?? '';
    const confirmationNo = headingText.match(/Guest Details\s+(\d+)/)?.[1] ?? '';
    if (!confirmationNo) {
      throw new Error(`Could not read the confirmation number from "${headingText.trim()}"`);
    }
    return confirmationNo;
  }

  // ──────────────────────────────────────────────────────────────
  //  Find & open a reservation
  // ──────────────────────────────────────────────────────────────

  /**
   * Go to Guest Management. From the booking confirmation page this uses its Back button;
   * otherwise it uses the header search.
   */
  async navigateToGuestManagement(): Promise<void> {
    if (await this.confirmationBackButton.isVisible().catch(() => false)) {
      await this.confirmationBackButton.evaluate(el => (el as { click: () => void }).click());
      if (await this.guestManagementHeading.waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false)) {
        logger.info('✅ Back on Guest Management (confirmation page Back)');
        return;
      }
    }

    // Typing (not fill) is needed for the header search to show its results
    await this.elementActions.click(this.globalSearchInput, 'Global search input');
    await this.globalSearchInput.fill('');
    await this.globalSearchInput.pressSequentially('guest mana', { delay: 50 });
    await this.elementActions.click(this.page.locator('#page-topbar').getByText('Guest Management').first(), 'Guest Management menu item');
    await this.guestManagementHeading.waitFor({ state: 'visible', timeout: 30000 });
    logger.info('✅ Guest Management page loaded');
  }

  /**
   * Remove the default "Quick Search : Expected Arrival (Today)" filter chip, so reservations
   * arriving on other dates (e.g. future bookings) show up in the grid as well.
   */
  async clearQuickSearchFilter(): Promise<void> {
    if (!(await this.quickSearchChipClose.isVisible().catch(() => false))) return;
    const reload = this.page.waitForResponse(r => r.url().includes(SEARCH_API) && r.ok(), { timeout: 30000 });
    await this.quickSearchChipClose.evaluate(el => (el as { click: () => void }).click());
    await reload;
    logger.info('Cleared the "Quick Search : Expected Arrival (Today)" filter');
  }

  /**
   * Search the Guest Management grid for `confirmationNo` and open it
   * (Reservation Details summary view …/SE/<conf no>).
   */
  async openReservation(confirmationNo: string): Promise<void> {
    logger.info(`Opening reservation ${confirmationNo} from Guest Management`);
    await this.navigateToGuestManagement();
    await this.clearQuickSearchFilter();

    await this.gridSearchInput.fill('');
    await this.gridSearchInput.pressSequentially(confirmationNo, { delay: 30 });
    await this.gridSearchInput.press('Enter');

    const row = this.gridRows.filter({ hasText: confirmationNo }).first();
    await row.waitFor({ state: 'visible', timeout: 30000 });
    // Row action icons are covered by overlays → JS click
    await row.locator('[title="Open"]').first().evaluate(el => (el as { click: () => void }).click());

    await this.page.waitForURL(url => url.href.includes(`/SE/${confirmationNo}`), { timeout: 60000 });
    await this.stayHeadings.first().waitFor({ state: 'visible', timeout: 90000 });
    logger.info(`✅ Reservation ${confirmationNo} opened`);
  }

  // ──────────────────────────────────────────────────────────────
  //  Stays (Reservation Details summary view)
  // ──────────────────────────────────────────────────────────────

  /**
   * The card holding the "Stay #n" heading, its status badge and its ⋮ menu. A single-stay reservation
   * has no ⋮ menu (see {@link isSingleStayView}), so there the heading row with the badge is used.
   */
  private stayCard(stayNo: number, singleStay = false): Locator {
    return this.page
      .locator('div.row')
      .filter({ has: this.page.locator('h5', { hasText: new RegExp(`^\\s*Stay #${stayNo}\\b`) }) })
      .filter({ has: this.page.locator(singleStay ? 'span.badge' : 'i.mdi-dots-vertical') })
      .last();
  }

  /**
   * True when the summary view is a single-stay reservation: one "Stay #1" with its details and the
   * red Cancel button shown directly, and no Stay card ⋮ menu (verified 2026-10-19).
   */
  private async isSingleStayView(): Promise<boolean> {
    return (await this.stayHeadings.count()) === 1 && (await this.page.locator('i.mdi-dots-vertical:visible').count()) === 0;
  }

  /**
   * Read every stay's reservation id and status badge on the summary view.
   * Stay cards render one by one, so pass `expectedStays` to wait until they have all appeared.
   */
  async getStayStatuses(expectedStays = 1): Promise<StayStatus[]> {
    await this.stayHeadings.first().waitFor({ state: 'visible', timeout: 90000 });
    await this.stayHeadings.nth(expectedStays - 1).waitFor({ state: 'visible', timeout: 60000 });
    await this.page.waitForTimeout(1000);
    const count = await this.stayHeadings.count();
    const singleStay = await this.isSingleStayView();
    const statuses: StayStatus[] = [];
    for (let stayNo = 1; stayNo <= count; stayNo++) {
      const card = this.stayCard(stayNo, singleStay);
      const status = ((await card.locator('span.badge').first().textContent()) ?? '').trim();
      const reservationId = ((await card.textContent()) ?? '').match(/\b(\d{12})\b/)?.[1] ?? '';
      statuses.push({ stayNo, reservationId, status });
    }
    logger.info(`Stays: ${statuses.map(s => `#${s.stayNo} ${s.reservationId} ${s.status}`).join(', ')}`);
    return statuses;
  }

  /** Stay card ⋮ → Reservation Details (per-stay view …/DE/<reservation id>). */
  private async openStayDetails(stayNo: number): Promise<void> {
    const card = this.stayCard(stayNo);
    await this.elementActions.click(card.locator('button.dropdown-toggle:has(i.mdi-dots-vertical)'), `Stay #${stayNo} ⋮ menu`);
    await this.elementActions.click(
      this.openDropdownMenu.locator('a').filter({ hasText: /^\s*Reservation Details\s*$/ }),
      'Reservation Details menu item'
    );
    await this.page.waitForURL(/\/DE\/\d+/, { timeout: 60000 });
    await this.cancelStayButton.waitFor({ state: 'visible', timeout: 90000 });
  }

  /** Back from the per-stay view to the reservation summary. */
  private async backToAllBookings(confirmationNo: string): Promise<void> {
    await this.elementActions.click(this.viewAllBookingsButton, 'View all bookings');
    await this.page.waitForURL(url => url.href.includes(`/SE/${confirmationNo}`), { timeout: 60000 });
    await this.stayHeadings.first().waitFor({ state: 'visible', timeout: 90000 });
  }

  // ──────────────────────────────────────────────────────────────
  //  Cancel
  // ──────────────────────────────────────────────────────────────

  /**
   * On the per-stay view: Cancel → reason + remarks → Ok → SweetAlert OK.
   * @param reason Option name (the text after the code), e.g. "Guest – Travel cancelled". Defaults to the first option.
   * @returns the SweetAlert message
   */
  private async cancelCurrentStay(reason: string | undefined, remarks: string): Promise<string> {
    await this.elementActions.click(this.cancelStayButton, 'Cancel (stay)');
    await this.cancelDialog.waitFor({ state: 'visible', timeout: 15000 });

    await this.elementActions.click(this.cancelReasonSelect, 'Cancellation Reason dropdown');
    const option = reason
      ? this.cancelReasonOptions.filter({ hasText: reason }).first()
      : this.cancelReasonOptions.first();
    logger.info(`Cancellation reason: ${((await option.textContent()) ?? '').replace(/\s+/g, ' ').trim()}`);
    await this.elementActions.click(option, 'Cancellation Reason option');
    await this.cancelRemarksInput.fill(remarks);

    const cancelResponse = this.page.waitForResponse(r => r.url().includes(CANCEL_API), { timeout: 60000 });
    await this.elementActions.click(this.cancelOkButton, 'Ok (Cancel Reservation)');
    const response = await cancelResponse;
    if (!response.ok()) {
      throw new Error(`Cancel API returned HTTP ${response.status()}`);
    }

    await this.swalPopup.waitFor({ state: 'visible', timeout: 30000 });
    const message = ((await this.swalMessage.textContent()) ?? '').trim();
    await this.elementActions.click(this.swalConfirmButton, 'SweetAlert OK');
    await this.swalPopup.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    return message;
  }

  /**
   * Open `confirmationNo` and cancel each CONFIRMED stay one at a time (stay ⋮ → Reservation
   * Details → Cancel). This also covers single-stay bookings.
   */
  async cancelReservation(
    confirmationNo: string,
    expectedStays: number,
    reason?: string,
    remarks = 'Automation: availability check after cancellation'
  ): Promise<CancellationResult> {
    await this.openReservation(confirmationNo);

    const messages: string[] = [];
    const initial = await this.getStayStatuses(expectedStays);

    // Single stay: the summary view already is the stay view with its Cancel button
    if (await this.isSingleStayView()) {
      if (initial[0]?.status === 'CONFIRMED') {
        logger.info(`Cancelling the single stay (${initial[0].reservationId}) of reservation ${confirmationNo}`);
        messages.push(await this.cancelCurrentStay(reason, remarks));
        logger.info(`Stay #1 cancel result: ${messages[0]}`);
      }
      const statuses = await this.getStayStatuses(1);
      logger.info(`✅ Reservation ${confirmationNo}: cancelled ${messages.length} stay(s)`);
      return { confirmationNo, staysCancelled: messages.length, messages, statuses };
    }

    messages.push(...(await this.cancelListedStays(confirmationNo, initial.filter(s => s.status === 'CONFIRMED'), reason, remarks)));

    const statuses = await this.getStayStatuses(initial.length);
    logger.info(`✅ Reservation ${confirmationNo}: cancelled ${messages.length} stay(s)`);
    return { confirmationNo, staysCancelled: messages.length, messages, statuses };
  }

  /**
   * Partial cancellation of a multi-stay reservation: open `confirmationNo` and cancel only the stays numbered
   * `stayNos` (1-based "Stay #N"), leaving the others as they are. Every listed stay must be CONFIRMED.
   * Single-stay reservations have no per-stay menu: use {@link cancelReservation} for those.
   */
  async cancelStays(
    confirmationNo: string,
    expectedStays: number,
    stayNos: number[],
    reason?: string,
    remarks = 'Automation: availability check after partial cancellation'
  ): Promise<CancellationResult> {
    await this.openReservation(confirmationNo);
    const initial = await this.getStayStatuses(expectedStays);
    if (await this.isSingleStayView()) {
      throw new Error(`Reservation ${confirmationNo} has a single stay: use cancelReservation()`);
    }

    const toCancel = stayNos.map(stayNo => {
      const stay = initial.find(s => s.stayNo === stayNo);
      if (!stay) throw new Error(`Reservation ${confirmationNo} has no Stay #${stayNo} (found ${initial.length} stays)`);
      if (stay.status !== 'CONFIRMED') throw new Error(`Stay #${stayNo} of ${confirmationNo} is ${stay.status}, not CONFIRMED`);
      return stay;
    });
    const messages = await this.cancelListedStays(confirmationNo, toCancel, reason, remarks);

    const statuses = await this.getStayStatuses(initial.length);
    logger.info(`✅ Reservation ${confirmationNo}: cancelled stay(s) ${stayNos.join(', ')} of ${initial.length}`);
    return { confirmationNo, staysCancelled: messages.length, messages, statuses };
  }

  /** Cancel each of `stays` from its own Reservation Details view and return to the summary after each one. */
  private async cancelListedStays(confirmationNo: string, stays: StayStatus[], reason: string | undefined, remarks: string): Promise<string[]> {
    const messages: string[] = [];
    for (const stay of stays) {
      logger.info(`Cancelling stay #${stay.stayNo} (${stay.reservationId}) of reservation ${confirmationNo}`);
      await this.openStayDetails(stay.stayNo);
      const message = await this.cancelCurrentStay(reason, remarks);
      logger.info(`Stay #${stay.stayNo} cancel result: ${message}`);
      messages.push(message);
      await this.backToAllBookings(confirmationNo);
    }
    return messages;
  }
}
