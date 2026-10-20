import { BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';
import { CancelAfterRoomTypeChangePage } from './CancelAfterRoomTypeChangePage';

const VALIDATE_CHECKIN_API = '/ReservationCheckin/Validate_ChekinMandatoryFields';
const ASSIGN_ROOM_API = '/ReservationCheckin/Assign_CheckinRoom';
const CHECKIN_API = '/ReservationCheckin/Checkin_MultiReservations';
const CANCEL_CHECKIN_API = '/ReservationActions/CancelCheckin_Reservation';
const SEARCH_API = '/FrontDesk/Advance/GetAdvanceSearchData';

/** In-house status badge: the check-in page shows "IN-HOUSE", Reservation Details / the grid show "IH-HOUSE". */
export const IN_HOUSE_STATUS = /^I[NH]-HOUSE$/;

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

/** Result of {@link InHouseCancelAfterRoomTypeChangePage.checkInGuest}. */
export interface CheckInResult {
  /** Room number assigned in "Choose Room (<code>)". */
  roomNo: string;
  /** Room type code shown in the Choose Room title, i.e. the room type the stay holds at check-in. */
  roomTypeCode: string;
  /** SweetAlert after the room assignment. */
  assignMessage: string;
  /** SweetAlert after the check-in. */
  checkinMessage: string;
  /** Stay status badge after the check-in. */
  status: string;
}

/** Result of {@link InHouseCancelAfterRoomTypeChangePage.cancelCheckin}. */
export interface CancelCheckinResult {
  /** API message of `CancelCheckin_Reservation`. */
  message: string;
  /** Stay status badge afterwards (CONFIRMED). */
  status: string;
}

// ──────────────────────────────────────────────────────────────
//  Page Object – Check in a guest after a room type change, then cancel
// ──────────────────────────────────────────────────────────────

/**
 * Checks in a single-stay reservation arriving on the business date, undoes the check-in and cancels the reservation.
 * Booking, the room type change, the availability grid and the final cancel come from
 * {@link CancelAfterRoomTypeChangePage}.
 *
 * UI flow and quirks (verified live on QC2 / WEBMI, 2026-10-20):
 * - Check-in: Reservation Details (single stay, CONFIRMED, arrival = business date) → green **Checkin** button → check-in
 *   page `…/DC/<reservation id>`. Opening it sometimes shows a swal "Unable to reach the server" once; OK + reload fixes it.
 *   Page 1 (guest details) → **Next** (POST `ReservationCheckin/Validate_ChekinMandatoryFields`) → page 2 with the room card
 *   (`app-checkin-assign-room`, room number "N/A") and a final **Checkin** button.
 * - **Assign Room** (room card) → NGB modal "Choose Room (<room type code>)" listing only rooms of the stay's CURRENT room
 *   type: `button.room-btn` with `.room-number`, `.hk-status` (IN inspected / DI dirty / …) and `.selling_Status` (VA vacant /
 *   OC occupied). Clicking a room assigns it at once (POST `ReservationCheckin/Assign_CheckinRoom`) → swal
 *   "Details created/updated successfully." → OK. The card then shows the room number and a "Change Room" button.
 * - **Checkin** → swal question "Encoder No. is not set. Do you still want to proceed with Check-In?" (Yes / No) → Yes →
 *   POST `ReservationCheckin/Checkin_MultiReservations` → swal "Guest(s) checked in successfully." → OK. Badge: IN-HOUSE.
 * - Guest Management's default filter "Status : Reserved" hides in-house guests: use the **In-House** quick button above the
 *   grid before searching. The in-house reservation's badge reads "IH-HOUSE". It has NO red Cancel button any more.
 * - In-house: **More → Cancel** opens "Cancel Checkin" (NOT "Cancel Reservation"): Cancellation Reason ng-select only
 *   (`CXCI  No Reason Specified`), no remarks → Ok → POST `ReservationActions/CancelCheckin_Reservation` (no swal). The stay
 *   goes back to CONFIRMED with the room still assigned, and the normal red Cancel is available again.
 * - Availability: the stay keeps its room type's nights through check-in and Cancel Checkin (no change); only the
 *   reservation cancel releases them.
 */
export class InHouseCancelAfterRoomTypeChangePage extends BasePage {
  private readonly elementActions: ElementActions;
  /** Booking, room type change, availability snapshot, final cancel. */
  readonly cancelFlow: CancelAfterRoomTypeChangePage;

  /* ── Reservation Details ── */
  private readonly stayStatusBadge: Locator;
  private readonly checkinStartButton: Locator;
  private readonly moreButton: Locator;
  private readonly openDropdownMenu: Locator;

  /* ── Check-in page (…/DC/<reservation id>) ── */
  private readonly checkinNextButton: Locator;
  private readonly checkinSubmitButton: Locator;
  private readonly roomCard: Locator;
  private readonly assignRoomButton: Locator;
  private readonly roomCardNumber: Locator;

  /* ── Choose Room dialog ── */
  private readonly chooseRoomDialog: Locator;
  private readonly chooseRoomTitle: Locator;
  private readonly roomButtons: Locator;

  /* ── Cancel Checkin dialog ── */
  private readonly cancelCheckinDialog: Locator;
  private readonly cancelCheckinReasonSelect: Locator;
  private readonly reasonOptions: Locator;
  private readonly cancelCheckinOkButton: Locator;

  /* ── Guest Management ── */
  private readonly inHouseQuickButton: Locator;
  private readonly gridSearchInput: Locator;
  private readonly gridRows: Locator;

  /* ── SweetAlert ── */
  private readonly swalPopup: Locator;
  private readonly swalMessage: Locator;
  private readonly swalConfirmButton: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.cancelFlow = new CancelAfterRoomTypeChangePage(page, context);

    // Reservation Details
    // Innermost row holding the "Stay #1" heading and its badge (same resolution as ReservationCancelAvailabilityPage)
    this.stayStatusBadge = this.page
      .locator('div.row')
      .filter({ has: this.page.locator('h5', { hasText: /^\s*Stay #1\b/ }) })
      .filter({ has: this.page.locator('span.badge') })
      .last()
      .locator('span.badge')
      .first();
    this.checkinStartButton = this.page.locator('button:visible').filter({ hasText: /^\s*Checkin\s*$/ }).first();
    this.moreButton = this.page.locator('button[title="More"]:visible').first();
    this.openDropdownMenu = this.page.locator('.dropdown-menu.show');

    // Check-in page
    this.checkinNextButton = this.page.locator('button.btn-info:visible').filter({ hasText: /^\s*Next\s*$/ }).last();
    this.checkinSubmitButton = this.page.locator('button.btn-info:visible').filter({ hasText: /^\s*Checkin\s*$/ }).last();
    this.roomCard = this.page.locator('app-checkin-assign-room').first();
    this.assignRoomButton = this.roomCard.locator('button').filter({ hasText: /^\s*Assign Room\s*$/ });
    this.roomCardNumber = this.roomCard.locator('.room-number');

    // Choose Room dialog
    this.chooseRoomDialog = this.page.locator('ngb-modal-window').filter({ has: this.page.locator('app-room-numbers-control') }).last();
    this.chooseRoomTitle = this.chooseRoomDialog.locator('.modal-title');
    this.roomButtons = this.chooseRoomDialog.locator('button.room-btn');

    // Cancel Checkin dialog
    this.cancelCheckinDialog = this.page.locator('ngb-modal-window').filter({ hasText: 'Cancel Checkin' }).last();
    this.cancelCheckinReasonSelect = this.cancelCheckinDialog.locator('drop-down-searchable[formcontrolname="reason"] ng-select');
    this.reasonOptions = this.page.locator('ng-dropdown-panel .ng-option');
    this.cancelCheckinOkButton = this.cancelCheckinDialog.locator('button[type="submit"]').filter({ hasText: /^\s*Ok\s*$/ });

    // Guest Management
    this.inHouseQuickButton = this.page.locator('button:visible').filter({ hasText: /^\s*In-House\s*$/ }).first();
    this.gridSearchInput = this.page.locator('input.search').first();
    this.gridRows = this.page.locator('app-data-grid .dg-row');

    // SweetAlert
    this.swalPopup = this.page.locator('.swal2-popup');
    this.swalMessage = this.page.locator('.swal2-popup .swal2-html-container');
    this.swalConfirmButton = this.page.locator('.swal2-popup .swal2-confirm');
  }

  // ──────────────────────────────────────────────────────────────
  //  Helpers
  // ──────────────────────────────────────────────────────────────

  /** Read the visible SweetAlert message, click its confirm button (OK / Yes) and wait for it to close. */
  private async confirmSwal(timeout = 30000): Promise<string> {
    await this.swalPopup.waitFor({ state: 'visible', timeout });
    const message = ((await this.swalMessage.textContent()) ?? '').replace(/\s+/g, ' ').trim();
    await this.elementActions.click(this.swalConfirmButton, `SweetAlert confirm ("${message}")`);
    await this.swalPopup.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    return message;
  }

  /** Status badge of the single stay on the open reservation / check-in page. */
  async getStayStatus(): Promise<string> {
    await this.stayStatusBadge.waitFor({ state: 'visible', timeout: 60000 });
    return ((await this.stayStatusBadge.textContent()) ?? '').trim();
  }

  // ──────────────────────────────────────────────────────────────
  //  Check in
  // ──────────────────────────────────────────────────────────────

  /** From the open reservation, go to the check-in page and past page 1 (guest details). */
  private async openCheckinPage(): Promise<void> {
    await this.elementActions.click(this.checkinStartButton, 'Checkin (Reservation Details)');
    await this.page.waitForURL(/\/DC\/\d+/, { timeout: 60000 });

    // The first load sometimes fails with "Unable to reach the server": OK + reload fixes it
    const loaded = await Promise.race([
      this.checkinNextButton.waitFor({ state: 'visible', timeout: 60000 }).then(() => 'next' as const),
      this.swalPopup.waitFor({ state: 'visible', timeout: 60000 }).then(() => 'swal' as const),
    ]);
    if (loaded === 'swal') {
      const message = await this.confirmSwal();
      logger.warn(`Check-in page showed "${message}", reloading it`);
      await this.page.reload();
      await this.checkinNextButton.waitFor({ state: 'visible', timeout: 90000 });
    }

    const validate = this.page.waitForResponse(r => r.url().includes(VALIDATE_CHECKIN_API), { timeout: 60000 });
    await this.elementActions.click(this.checkinNextButton, 'Next (check-in guest details)');
    await validate;
    await this.checkinSubmitButton.waitFor({ state: 'visible', timeout: 60000 });
  }

  /**
   * Assign Room → pick the first inspected (IN) + vacant (VA) room in "Choose Room (<code>)".
   * @returns the room number, the room type code from the dialog title and the swal message
   */
  async assignRoom(): Promise<{ roomNo: string; roomTypeCode: string; message: string }> {
    await this.elementActions.click(this.assignRoomButton, 'Assign Room');
    await this.chooseRoomDialog.waitFor({ state: 'visible', timeout: 30000 });
    await this.roomButtons.first().waitFor({ state: 'visible', timeout: 30000 });
    const title = ((await this.chooseRoomTitle.textContent()) ?? '').trim();
    const roomTypeCode = title.match(/Choose Room\s*\(([^)]+)\)/)?.[1]?.trim() ?? '';

    const room = this.roomButtons
      .filter({ has: this.page.locator('.hk-status', { hasText: /^\s*IN\s*$/ }) })
      .filter({ has: this.page.locator('.selling_Status', { hasText: /^\s*VA\s*$/ }) })
      .first();
    if (!(await room.count())) {
      throw new Error(`"${title}" has no inspected (IN) vacant (VA) room to check in to`);
    }
    const roomNo = ((await room.locator('.room-number').textContent()) ?? '').trim();

    const assign = this.page.waitForResponse(r => r.url().includes(ASSIGN_ROOM_API), { timeout: 60000 });
    await this.elementActions.click(room, `Room ${roomNo}`);
    const response = await assign;
    if (!response.ok()) throw new Error(`Assign room API returned HTTP ${response.status()}`);
    const message = await this.confirmSwal();

    await this.roomCardNumber.filter({ hasText: roomNo }).waitFor({ state: 'visible', timeout: 30000 });
    logger.info(`Room ${roomNo} (${roomTypeCode}) assigned: ${message}`);
    return { roomNo, roomTypeCode, message };
  }

  /** Final Checkin → "Encoder No. is not set…" Yes (when asked) → "Guest(s) checked in successfully." OK. */
  private async submitCheckin(): Promise<string> {
    const checkin = this.page.waitForResponse(r => r.url().includes(CHECKIN_API), { timeout: 90000 });
    await this.elementActions.click(this.checkinSubmitButton, 'Checkin (submit)');

    // Optional confirm prompt(s) before the API call, e.g. the missing key encoder
    let response = await Promise.race([checkin, this.swalPopup.waitFor({ state: 'visible', timeout: 90000 }).then(() => null)]);
    while (!response) {
      const question = await this.confirmSwal();
      logger.info(`Check-in prompt answered Yes: "${question}"`);
      response = await Promise.race([checkin, this.swalPopup.waitFor({ state: 'visible', timeout: 90000 }).then(() => null)]);
    }
    if (!response.ok()) throw new Error(`Check-in API returned HTTP ${response.status()}`);
    return this.confirmSwal();
  }

  /**
   * Open `confirmationNo` (single stay, CONFIRMED, arriving on the business date), assign an inspected vacant room of its
   * current room type and check the guest in.
   */
  async checkInGuest(confirmationNo: string): Promise<CheckInResult> {
    logger.info(`Checking in reservation ${confirmationNo}`);
    await this.cancelFlow.roomTypeChange.reservations.openReservation(confirmationNo);
    await this.openCheckinPage();
    const { roomNo, roomTypeCode, message: assignMessage } = await this.assignRoom();
    const checkinMessage = await this.submitCheckin();
    const status = await this.getStayStatus();
    logger.info(`✅ Reservation ${confirmationNo} checked in to room ${roomNo}: ${checkinMessage} (${status})`);
    return { roomNo, roomTypeCode, assignMessage, checkinMessage, status };
  }

  // ──────────────────────────────────────────────────────────────
  //  In-house reservation
  // ──────────────────────────────────────────────────────────────

  /** Guest Management → In-House quick filter → search `confirmationNo` → open it (…/SE/<conf no>). */
  async openInHouseReservation(confirmationNo: string): Promise<void> {
    logger.info(`Opening in-house reservation ${confirmationNo}`);
    await this.cancelFlow.roomTypeChange.reservations.navigateToGuestManagement();

    const reload = this.page.waitForResponse(r => r.url().includes(SEARCH_API) && r.ok(), { timeout: 30000 });
    await this.elementActions.click(this.inHouseQuickButton, 'In-House quick filter');
    await reload;

    await this.gridSearchInput.fill('');
    await this.gridSearchInput.pressSequentially(confirmationNo, { delay: 30 });
    await this.gridSearchInput.press('Enter');
    const row = this.gridRows.filter({ hasText: confirmationNo }).first();
    await row.waitFor({ state: 'visible', timeout: 30000 });
    // Row action icons are covered by overlays → JS click
    await row.locator('[title="Open"]').first().evaluate(el => (el as { click: () => void }).click());
    await this.page.waitForURL(url => url.href.includes(`/SE/${confirmationNo}`), { timeout: 60000 });
    await this.stayStatusBadge.waitFor({ state: 'visible', timeout: 90000 });
  }

  /** Room number on the open reservation's room card. */
  async getAssignedRoomNo(): Promise<string> {
    return ((await this.roomCardNumber.textContent({ timeout: 15000 }).catch(() => '')) ?? '').trim();
  }

  /**
   * Undo the check-in of in-house `confirmationNo`: More → Cancel ("Cancel Checkin") → reason → Ok.
   * The stay goes back to CONFIRMED, after which it can be cancelled like any reservation.
   */
  async cancelCheckin(confirmationNo: string, reason?: string): Promise<CancelCheckinResult> {
    await this.openInHouseReservation(confirmationNo);
    const before = await this.getStayStatus();
    if (!IN_HOUSE_STATUS.test(before)) {
      throw new Error(`Reservation ${confirmationNo} is ${before}, not in-house`);
    }

    await this.elementActions.click(this.moreButton, 'More');
    await this.elementActions.click(this.openDropdownMenu.locator('button, a').filter({ hasText: /^\s*Cancel\s*$/ }).first(), 'More → Cancel');
    await this.cancelCheckinDialog.waitFor({ state: 'visible', timeout: 15000 });

    await this.elementActions.click(this.cancelCheckinReasonSelect, 'Cancel Checkin reason dropdown');
    const option = reason ? this.reasonOptions.filter({ hasText: reason }).first() : this.reasonOptions.first();
    logger.info(`Cancel Checkin reason: ${((await option.textContent()) ?? '').replace(/\s+/g, ' ').trim()}`);
    await this.elementActions.click(option, 'Cancel Checkin reason option');

    const cancelResponse = this.page.waitForResponse(r => r.url().includes(CANCEL_CHECKIN_API), { timeout: 60000 });
    await this.elementActions.click(this.cancelCheckinOkButton, 'Ok (Cancel Checkin)');
    const response = await cancelResponse;
    const body = (await response.json().catch(() => ({}))) as { is_success?: boolean; message?: string };
    if (!response.ok() || body.is_success === false) {
      throw new Error(`Cancel Checkin failed: HTTP ${response.status()} ${body.message ?? ''}`);
    }
    // Some setups follow up with a swal; close it when present
    if (await this.swalPopup.waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false)) {
      await this.confirmSwal();
    }
    await this.cancelCheckinDialog.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});

    let status = await this.getStayStatus();
    for (let i = 0; i < 15 && /HOUSE/.test(status); i++) {
      await this.page.waitForTimeout(1000);
      status = await this.getStayStatus();
    }
    logger.info(`✅ Check-in of ${confirmationNo} cancelled: ${body.message ?? ''} (${status})`);
    return { message: body.message ?? '', status };
  }
}
