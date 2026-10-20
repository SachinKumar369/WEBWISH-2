import { BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { RecreateAvailabilityPage } from './RecreateAvailabilityPage';
import { ReservationCancelAvailabilityPage } from './ReservationCancelAvailabilityPage';
import { FutureBookingResult, FutureReservationAvailabilityPage, FutureStay } from './FutureReservationAvailabilityPage';

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

/** Stay fields shown on the Reservation Details view (…/SE/<conf no>). Dates are DD/MM/YYYY. */
export interface StayDetails {
  stayNo: number;
  reservationId: string;
  status: string; // CONFIRMED | CANCELLED | …
  arrivalDate: string;
  departureDate: string;
  nights: number;
  /** "Rooms and No. of Guest", e.g. "1-Rooms, 1-A, 0-Y, 0-C". */
  roomsAndGuests: string;
  /** Room type CODE on the stay's room card (`app-checkin-assign-room .room-type`), e.g. "BEAC". */
  roomTypeCode: string;
  /** "Agreed Rate" per night, e.g. "3,000.00" → 3000. */
  agreedRate: number;
}

// ──────────────────────────────────────────────────────────────
//  Page Object – Reservation spanning multiple nights
// ──────────────────────────────────────────────────────────────

/**
 * Books a reservation that spans several nights and reads the stay back from Reservation Details.
 * Booking is delegated to {@link FutureReservationAvailabilityPage} (any arrival ≥ business date works,
 * offset 0 = arrival on the business date), cancelling to {@link ReservationCancelAvailabilityPage}.
 *
 * UI flow and quirks (verified live on QC2 / WEBMI, 2026-10-19):
 * - A single-stay reservation opens straight into the stay details on `…/SE/<conf no>`: there is no
 *   Stay card ⋮ menu, and the red Cancel button (`.card.hstack button.btn-soft-danger`) is already on the page.
 * - Section "Stay Details": heading row `h5` "Stay #1 - <last name>" + `h5` "<12-digit reservation id>",
 *   badge `span.badge` " CONFIRMED", then `readonly-field` elements (`label` + `h6` value):
 *   "Arrival/Departure" = `02/10/2026 to 06/10/2026`, "Nights" = `4`,
 *   "Rooms and No. of Guest" = `1-Rooms, 1-A, 0-Y, 0-C`, "Expected Arrival Date", "Expected Departure Date".
 *   The room card beside them (`app-checkin-assign-room .room-type`) shows the room type CODE (`BEAC`), not its name.
 * - Multi-stay reservations (one stay per room) show the same block per "Stay #n" card, plus a ⋮ menu.
 * - Nights = departure − arrival. The departure day isn't a night, so its availability is untouched.
 */
export class MultiNightReservationPage extends BasePage {
  /** Stay date entry + booking + availability grid with header days. */
  readonly future: FutureReservationAvailabilityPage;
  /** Open / cancel a reservation. */
  readonly reservations: ReservationCancelAvailabilityPage;
  /** Shared Quick Access availability grid + booking steps. */
  readonly availability: RecreateAvailabilityPage;

  /* ── Reservation Details (Stay Details section) ── */
  private readonly stayHeadings: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.future = new FutureReservationAvailabilityPage(page, context);
    this.reservations = this.future.reservations;
    this.availability = this.future.availability;

    // Reservation Details
    this.stayHeadings = this.page.locator('h5').filter({ hasText: /^\s*Stay #\d+/ });
  }

  // ──────────────────────────────────────────────────────────────
  //  Booking
  // ──────────────────────────────────────────────────────────────

  /** Book `numberOfRooms` × `roomType` for every night of `stay` in one reservation. */
  async bookMultiNightStay(roomType: string, lastName: string, numberOfRooms: number, stay: FutureStay): Promise<FutureBookingResult> {
    logger.info(`Multi-night booking: ${numberOfRooms} × "${roomType}", ${stay.nights} nights (${stay.arrivalDate} → ${stay.departureDate})`);
    return this.future.bookFutureRooms(roomType, lastName, numberOfRooms, stay);
  }

  // ──────────────────────────────────────────────────────────────
  //  Stay details
  // ──────────────────────────────────────────────────────────────

  /** The Stay Details block of stay `stayNo`: the innermost `col-md-12` holding its heading and its fields. */
  private stayBlock(stayNo: number): Locator {
    return this.page
      .locator('div.col-md-12')
      .filter({ has: this.page.locator('h5', { hasText: new RegExp(`^\\s*Stay #${stayNo}\\b`) }) })
      .filter({ has: this.page.locator('readonly-field label', { hasText: /^\s*Nights\s*$/ }) })
      .last();
  }

  /** Value (`h6`) of the `readonly-field` labelled `label` inside `block`. */
  private async readField(block: Locator, label: string): Promise<string> {
    const field = block
      .locator('readonly-field')
      .filter({ has: this.page.locator('label', { hasText: new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\s*$`) }) })
      .first();
    return ((await field.locator('h6').first().textContent({ timeout: 15000 })) ?? '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Open `confirmationNo` and read every stay's dates, nights, rooms/guests and status
   * from the Stay Details section.
   */
  async getStayDetails(confirmationNo: string, expectedStays = 1): Promise<StayDetails[]> {
    await this.reservations.openReservation(confirmationNo);
    await this.stayHeadings.nth(expectedStays - 1).waitFor({ state: 'visible', timeout: 60000 });

    const details: StayDetails[] = [];
    const count = await this.stayHeadings.count();
    for (let stayNo = 1; stayNo <= count; stayNo++) {
      const block = this.stayBlock(stayNo);
      await block.waitFor({ state: 'visible', timeout: 30000 });

      const arrDep = await this.readField(block, 'Arrival/Departure');
      const [arrivalDate = '', departureDate = ''] = arrDep.split(/\s+to\s+/);
      const nightsText = await this.readField(block, 'Nights');
      const stay: StayDetails = {
        stayNo,
        reservationId: ((await block.textContent()) ?? '').match(/\b(\d{12})\b/)?.[1] ?? '',
        status: ((await block.locator('span.badge').first().textContent()) ?? '').trim(),
        arrivalDate,
        departureDate,
        nights: parseInt(nightsText, 10),
        roomsAndGuests: await this.readField(block, 'Rooms and No. of Guest'),
        roomTypeCode: ((await block.locator('app-checkin-assign-room .room-type').first().textContent()) ?? '').trim(),
        agreedRate: parseFloat((await this.readField(block, 'Agreed Rate')).replace(/,/g, '')),
      };
      logger.info(
        `Stay #${stay.stayNo} ${stay.reservationId} ${stay.status}: ${stay.roomTypeCode}, ${stay.arrivalDate} → ${stay.departureDate}, ` +
          `${stay.nights} night(s), ${stay.roomsAndGuests}`
      );
      details.push(stay);
    }
    return details;
  }
}
