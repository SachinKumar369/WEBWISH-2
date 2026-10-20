import { BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';
import { RecreateAvailabilityPage } from './RecreateAvailabilityPage';
import { ReservationCancelAvailabilityPage } from './ReservationCancelAvailabilityPage';
import { FutureReservationAvailabilityPage } from './FutureReservationAvailabilityPage';
import { MultiNightReservationPage } from './MultiNightReservationPage';
import { ChangeArrivalDatePage } from './ChangeArrivalDatePage';
import { ExtendDepartureDatePage } from './ExtendDepartureDatePage';
import { MultiRoomTypeReservationPage, RoomTypePosting } from './MultiRoomTypeReservationPage';

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

/** A room type as the Stay Details "Room Type" dropdown shows it: name (label) + code (secondary). */
export interface RoomTypeOption {
  name: string;
  code: string;
}

/** Result of {@link ChangeRoomTypePage.changeRoomType}. */
export interface RoomTypeChangeResult {
  from: RoomTypeOption;
  to: RoomTypeOption;
  /** SweetAlert message after Update. */
  message: string;
}

// ──────────────────────────────────────────────────────────────
//  Page Object – Change the room type of an existing reservation
// ──────────────────────────────────────────────────────────────

/**
 * Changes the room type of an existing single-stay reservation from Reservation Details. The Stay Details modal steps
 * (open / save) are shared with {@link ChangeArrivalDatePage}, the Bill Summary readers with
 * {@link ExtendDepartureDatePage} (room charge) and {@link MultiRoomTypeReservationPage} (Future Postings rows).
 *
 * UI flow and quirks (verified live on QC2 / WEBMI, 2026-10-20):
 * - Reservation Details → stay pencil → "Stay Details" modal. Room Type is an `app-smart-dropdown`
 *   (`formcontrolname="room_Type"`, NOT ng-select): click `.sdd-control` → a CDK overlay listbox
 *   (`.cdk-overlay-container [role="option"].sdd-option`) with `.sdd-option__label` = name ("Deluxe Rooms") and
 *   `.sdd-option__secondary` = code ("DLX"). The current value is `.sdd-single__label` / `.sdd-single__secondary`.
 * - The list also holds room types that the availability grid doesn't show (e.g. "Manual Room Type" / ABC).
 * - Picking a room type fires no API call and changes nothing else in the form: Rate Code, Agreed Rate, dates stay the same.
 *   Room Number stays "--Select--".
 * - Update → POST `GuestReservationSectional/Update_GuestStayDetails` → SweetAlert "Details created/updated successfully."
 *   (OK, no confirm prompt) → the modal closes; the stay card's `.room-type` shows the new code at once.
 * - **The Bill Summary right after the save still names the OLD room type** in "Future Postings" even though
 *   `Cashiering/GetBillingSummary` is re-fetched. Reopening the reservation from Guest Management shows the new name, so
 *   read the Bill Summary only after {@link MultiNightReservationPage.getStayDetails} (which reopens it).
 * - Availability: the old room type gets its nights back (+1), the new one loses them (−1); Total Available is unchanged.
 */
export class ChangeRoomTypePage extends BasePage {
  private readonly elementActions: ElementActions;
  /** Stay Details modal steps (open / set a date / save). */
  readonly stayEdit: ChangeArrivalDatePage;
  /** Bill Summary room charge. */
  readonly billing: ExtendDepartureDatePage;
  /** Bill Summary "Future Postings" rows (room type name + room count). */
  readonly postings: MultiRoomTypeReservationPage;
  /** Stay details (dates, nights, status, room type code, agreed rate) on Reservation Details. */
  readonly stayDetails: MultiNightReservationPage;
  /** Stay date entry + booking + availability grid with header days. */
  readonly future: FutureReservationAvailabilityPage;
  /** Open / cancel a reservation. */
  readonly reservations: ReservationCancelAvailabilityPage;
  /** Shared Quick Access availability grid + booking steps. */
  readonly availability: RecreateAvailabilityPage;

  /* ── Stay Details modal → Room Type (app-smart-dropdown) ── */
  private readonly roomTypeDropdown: Locator;
  private readonly roomTypeControl: Locator;
  private readonly roomTypeValueLabel: Locator;
  private readonly roomTypeValueCode: Locator;
  private readonly roomTypeOptions: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.billing = new ExtendDepartureDatePage(page, context);
    this.postings = new MultiRoomTypeReservationPage(page, context);
    this.stayEdit = this.billing.stayEdit;
    this.stayDetails = this.billing.stayDetails;
    this.future = this.billing.future;
    this.reservations = this.billing.reservations;
    this.availability = this.billing.availability;

    const stayEditModal = this.page.locator('ngb-modal-window').filter({ has: this.page.locator('app-stay-edit') }).last();
    this.roomTypeDropdown = stayEditModal.locator('app-smart-dropdown[formcontrolname="room_Type"]');
    this.roomTypeControl = this.roomTypeDropdown.locator('.sdd-control');
    this.roomTypeValueLabel = this.roomTypeDropdown.locator('.sdd-single__label');
    this.roomTypeValueCode = this.roomTypeDropdown.locator('.sdd-single__secondary');
    // The listbox is rendered in the CDK overlay container (outside the modal)
    this.roomTypeOptions = this.page.locator('.cdk-overlay-container [role="option"].sdd-option');
  }

  // ──────────────────────────────────────────────────────────────
  //  Change room type
  // ──────────────────────────────────────────────────────────────

  /** Room type currently selected in the open Stay Details modal. */
  async getSelectedRoomType(): Promise<RoomTypeOption> {
    await this.roomTypeValueLabel.waitFor({ state: 'visible', timeout: 30000 });
    return {
      name: ((await this.roomTypeValueLabel.textContent()) ?? '').trim(),
      code: ((await this.roomTypeValueCode.textContent()) ?? '').trim(),
    };
  }

  /** Pick `roomTypeName` (exact NAME, e.g. "Deluxe Rooms") in the open Stay Details modal's Room Type dropdown. */
  async selectRoomType(roomTypeName: string): Promise<RoomTypeOption> {
    const name = roomTypeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.elementActions.click(this.roomTypeControl, 'Room Type dropdown (Stay Details)');
    const option = this.roomTypeOptions.filter({ has: this.page.locator('.sdd-option__label', { hasText: new RegExp(`^\\s*${name}\\s*$`) }) }).first();
    await option.waitFor({ state: 'visible', timeout: 15000 });
    await this.elementActions.click(option, `Room Type option "${roomTypeName}"`);

    const selected = await this.getSelectedRoomType();
    if (selected.name !== roomTypeName) {
      throw new Error(`Room Type not applied: expected "${roomTypeName}", dropdown shows "${selected.name}"`);
    }
    return selected;
  }

  /**
   * Open `confirmationNo`, edit its stay and change the Room Type to `newRoomTypeName` (NAME), leaving dates and rate as
   * they are. Only for single-stay reservations (one room).
   */
  async changeRoomType(confirmationNo: string, newRoomTypeName: string): Promise<RoomTypeChangeResult> {
    await this.stayEdit.openStayEdit(confirmationNo);
    const from = await this.getSelectedRoomType();
    if (from.name === newRoomTypeName) {
      throw new Error(`Reservation ${confirmationNo} already has room type "${newRoomTypeName}"`);
    }
    logger.info(`Reservation ${confirmationNo}: changing room type ${from.name} (${from.code}) → ${newRoomTypeName}`);

    const to = await this.selectRoomType(newRoomTypeName);
    const message = await this.stayEdit.saveStayEdit();
    logger.info(`✅ Room type changed to ${to.name} (${to.code}): ${message}`);
    return { from, to, message };
  }

  // ──────────────────────────────────────────────────────────────
  //  Bill Summary (read after reopening the reservation, see class doc)
  // ──────────────────────────────────────────────────────────────

  /** Room type rows of the Bill Summary "Future Postings" of the open reservation. */
  async getFuturePostings(): Promise<RoomTypePosting[]> {
    return this.postings.getFuturePostings();
  }

  /** Room charge (before tax) of `roomType` (NAME) in the Bill Summary "Future Postings" of the open reservation. */
  async getRoomCharge(roomType: string): Promise<number> {
    return this.billing.getRoomCharge(roomType);
  }
}
