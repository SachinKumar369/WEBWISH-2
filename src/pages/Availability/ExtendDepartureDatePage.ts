import { BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { RecreateAvailabilityPage } from './RecreateAvailabilityPage';
import { ReservationCancelAvailabilityPage } from './ReservationCancelAvailabilityPage';
import { FutureReservationAvailabilityPage } from './FutureReservationAvailabilityPage';
import { MultiNightReservationPage } from './MultiNightReservationPage';
import { ChangeArrivalDatePage } from './ChangeArrivalDatePage';

// ──────────────────────────────────────────────────────────────
//  Page Object – Extend the departure date of an existing reservation
// ──────────────────────────────────────────────────────────────

/**
 * Extends (moves later) the departure date of an existing single-stay reservation from Reservation Details, and reads
 * the room charge back from the Bill Summary. The Stay Details modal steps are shared with
 * {@link ChangeArrivalDatePage} (`openStayEdit` → `setStayDate` → `saveStayEdit`).
 *
 * UI flow and quirks (verified live on QC2 / WEBMI, 2026-10-19):
 * - Reservation Details → stay pencil → "Stay Details" modal. Departure = `date-control[formcontrolname="endDate"]`
 *   (flatpickr, visible input `d/m/Y`). Typing the new date + Enter commits it; Arrival stays as it is, and
 *   "Expected departure" follows the new departure. The Agreed Rate does not change.
 * - Update → POST `GuestReservationSectional/Update_GuestStayDetails` → SweetAlert "Details created/updated
 *   successfully." (OK, no confirm prompt) → the modal closes, the card shows the new Arrival/Departure and Nights, and the
 *   Bill Summary is reloaded (`Cashiering/GetBillingSummary`).
 * - Bill Summary "Future Postings:" room row = `<span>Deluxe Rooms</span><small> (1 Room)</small>` + amount `h6`
 *   (agreed rate × nights, before tax).
 * - Availability: every added night (old departure day … new departure − 1) drops by 1; the new departure day is untouched.
 */
export class ExtendDepartureDatePage extends BasePage {
  /** Stay Details modal steps (open / set a date / save). */
  readonly stayEdit: ChangeArrivalDatePage;
  /** Stay details (dates, nights, status, agreed rate) on Reservation Details. */
  readonly stayDetails: MultiNightReservationPage;
  /** Stay date entry + booking + availability grid with header days. */
  readonly future: FutureReservationAvailabilityPage;
  /** Open / cancel a reservation. */
  readonly reservations: ReservationCancelAvailabilityPage;
  /** Shared Quick Access availability grid + booking steps. */
  readonly availability: RecreateAvailabilityPage;

  /* ── Reservation Details → Bill Summary ── */
  private readonly futurePostingRows: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.stayEdit = new ChangeArrivalDatePage(page, context);
    this.stayDetails = this.stayEdit.stayDetails;
    this.future = this.stayEdit.future;
    this.reservations = this.stayEdit.reservations;
    this.availability = this.stayEdit.availability;

    // Bill Summary: room type rows of the "Future Postings:" table (tax/total rows have no "(N Room)")
    this.futurePostingRows = this.page
      .locator('table')
      .filter({ has: this.page.locator('h6', { hasText: /^\s*Future Postings:?\s*$/ }) })
      .locator('tr')
      .filter({ has: this.page.locator('small', { hasText: /\(\s*\d+\s*Rooms?\s*\)/i }) });
  }

  // ──────────────────────────────────────────────────────────────
  //  Extend departure date
  // ──────────────────────────────────────────────────────────────

  /**
   * Open `confirmationNo`, edit its stay and move the Departure to `newDeparture` (DD/MM/YYYY), leaving Arrival as it is.
   * Only for single-stay reservations (one room).
   * @returns the SweetAlert message after Update
   */
  async extendDepartureDate(confirmationNo: string, newDeparture: string): Promise<string> {
    const current = await this.stayEdit.openStayEdit(confirmationNo);
    const newIso = newDeparture.split('/').reverse().join('-');
    if (newIso <= current.departure) {
      throw new Error(`New departure ${newIso} is not after the current departure ${current.departure}`);
    }
    logger.info(`Reservation ${confirmationNo}: extending departure ${current.departure} → ${newIso} (arrival ${current.arrival})`);

    await this.stayEdit.setStayDate('departure', newDeparture);
    const message = await this.stayEdit.saveStayEdit();
    logger.info(`✅ Departure extended to ${newDeparture}: ${message}`);
    return message;
  }

  // ──────────────────────────────────────────────────────────────
  //  Bill Summary
  // ──────────────────────────────────────────────────────────────

  /** Room charge (before tax) of `roomType` (NAME) in the Bill Summary "Future Postings" of the open reservation. */
  async getRoomCharge(roomType: string): Promise<number> {
    const name = roomType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const row = this.futurePostingRows.filter({ has: this.page.locator('span', { hasText: new RegExp(`^\\s*${name}\\s*$`) }) }).first();
    await row.waitFor({ state: 'visible', timeout: 30000 });
    const amountText = ((await row.locator('h6').first().textContent()) ?? '').trim();
    const amount = parseFloat(amountText.replace(/,/g, ''));
    logger.info(`Bill Summary "${roomType}" room charge: ${amountText}`);
    return amount;
  }
}
