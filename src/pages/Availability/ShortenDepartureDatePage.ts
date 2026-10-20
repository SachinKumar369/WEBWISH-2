import { BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { RecreateAvailabilityPage } from './RecreateAvailabilityPage';
import { ReservationCancelAvailabilityPage } from './ReservationCancelAvailabilityPage';
import { FutureReservationAvailabilityPage } from './FutureReservationAvailabilityPage';
import { MultiNightReservationPage } from './MultiNightReservationPage';
import { ChangeArrivalDatePage } from './ChangeArrivalDatePage';
import { ExtendDepartureDatePage } from './ExtendDepartureDatePage';

// ──────────────────────────────────────────────────────────────
//  Page Object – Shorten the departure date of an existing reservation
// ──────────────────────────────────────────────────────────────

/**
 * Shortens (moves earlier) the departure date of an existing single-stay reservation from Reservation Details. The
 * Stay Details modal steps are shared with {@link ChangeArrivalDatePage} (`openStayEdit` → `setStayDate` →
 * `saveStayEdit`) and the Bill Summary room charge is read through {@link ExtendDepartureDatePage.getRoomCharge}.
 *
 * UI flow and quirks (verified live on QC2 / WEBMI, 2026-10-20; same modal as extending the departure):
 * - Reservation Details → stay pencil → "Stay Details" modal → Departure `date-control[formcontrolname="endDate"]`
 *   (flatpickr, visible input `d/m/Y`) → type the earlier date + Enter; Arrival stays as it is.
 * - Update → POST `GuestReservationSectional/Update_GuestStayDetails` → SweetAlert "Details created/updated
 *   successfully." (OK, no confirm prompt for an earlier departure either) → the card shows the new Departure and
 *   fewer Nights, and the Bill Summary room charge drops to agreed rate × remaining nights.
 * - Availability: every released night (new departure day … old departure − 1) rises by 1; the remaining nights stay taken.
 */
export class ShortenDepartureDatePage extends BasePage {
  /** Stay Details modal steps (open / set a date / save). */
  readonly stayEdit: ChangeArrivalDatePage;
  /** Bill Summary room charge. */
  readonly billing: ExtendDepartureDatePage;
  /** Stay details (dates, nights, status, agreed rate) on Reservation Details. */
  readonly stayDetails: MultiNightReservationPage;
  /** Stay date entry + booking + availability grid with header days. */
  readonly future: FutureReservationAvailabilityPage;
  /** Open / cancel a reservation. */
  readonly reservations: ReservationCancelAvailabilityPage;
  /** Shared Quick Access availability grid + booking steps. */
  readonly availability: RecreateAvailabilityPage;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.billing = new ExtendDepartureDatePage(page, context);
    this.stayEdit = this.billing.stayEdit;
    this.stayDetails = this.billing.stayDetails;
    this.future = this.billing.future;
    this.reservations = this.billing.reservations;
    this.availability = this.billing.availability;
  }

  // ──────────────────────────────────────────────────────────────
  //  Shorten departure date
  // ──────────────────────────────────────────────────────────────

  /**
   * Open `confirmationNo`, edit its stay and move the Departure back to `newDeparture` (DD/MM/YYYY), leaving Arrival as
   * it is. The new departure must be after the arrival (at least 1 night) and before the current departure.
   * Only for single-stay reservations (one room).
   * @returns the SweetAlert message after Update
   */
  async shortenDepartureDate(confirmationNo: string, newDeparture: string): Promise<string> {
    const current = await this.stayEdit.openStayEdit(confirmationNo);
    const newIso = newDeparture.split('/').reverse().join('-');
    if (newIso >= current.departure) {
      throw new Error(`New departure ${newIso} is not before the current departure ${current.departure}`);
    }
    if (newIso <= current.arrival) {
      throw new Error(`New departure ${newIso} must be after the arrival ${current.arrival} (at least 1 night)`);
    }
    logger.info(`Reservation ${confirmationNo}: shortening departure ${current.departure} → ${newIso} (arrival ${current.arrival})`);

    await this.stayEdit.setStayDate('departure', newDeparture);
    const message = await this.stayEdit.saveStayEdit();
    logger.info(`✅ Departure shortened to ${newDeparture}: ${message}`);
    return message;
  }

  /** Room charge (before tax) of `roomType` (NAME) in the Bill Summary "Future Postings" of the open reservation. */
  async getRoomCharge(roomType: string): Promise<number> {
    return this.billing.getRoomCharge(roomType);
  }
}
