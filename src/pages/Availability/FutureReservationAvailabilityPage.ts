import { BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';
import { AvailabilityGridData, RecreateAvailabilityPage } from './RecreateAvailabilityPage';
import { BookingResult, ReservationCancelAvailabilityPage } from './ReservationCancelAvailabilityPage';

// ──────────────────────────────────────────────────────────────
//  Types & helpers
// ──────────────────────────────────────────────────────────────

/** A future stay, relative to the business date. Dates are DD/MM/YYYY. */
export interface FutureStay {
  /** Days between the business date and the arrival date (= availability grid column of the first night). */
  offsetDays: number;
  nights: number;
  arrivalDate: string;
  departureDate: string;
}

/** Availability grid plus the day number shown in each date column header ("7 Wed" → 7). */
export interface AvailabilityGridWithDays extends AvailabilityGridData {
  headerDays: number[];
}

/** Result of booking a future stay. */
export interface FutureBookingResult extends BookingResult {
  stay: FutureStay;
  /** "N Rooms" per stay night on the room selection page, before the rooms were added. */
  selectionPageAvailability: number[];
}

/** Add `days` to a DD/MM/YYYY date and return DD/MM/YYYY. */
export function addDaysToDate(ddmmyyyy: string, days: number): string {
  const [day, month, year] = ddmmyyyy.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

/** Build the stay `offsetDays` after the business date for `nights` nights. */
export function buildFutureStay(businessDate: string, offsetDays: number, nights: number): FutureStay {
  return {
    offsetDays,
    nights,
    arrivalDate: addDaysToDate(businessDate, offsetDays),
    departureDate: addDaysToDate(businessDate, offsetDays + nights),
  };
}

// ──────────────────────────────────────────────────────────────
//  Page Object – Book a reservation for future dates
// ──────────────────────────────────────────────────────────────

/**
 * Books N rooms of one room type for a future stay (arrival after the business date) and reads
 * the Quick Access → Availability grid around it. Cancelling is delegated to
 * {@link ReservationCancelAvailabilityPage}, booking steps to {@link RecreateAvailabilityPage}.
 *
 * UI flow and quirks (verified live on QC2 / WEBMI, 2026-10-19):
 * - New Reservation → Stay Details has one "Check In/ Check Out Date" field: `<date-range-control>` wrapping a
 *   flatpickr in `mode: "range"` (hidden input `Y-m-d`, visible alt input `d/m/Y`, `allowInput: true`,
 *   `minDate` = business date). It defaults to business date → business date + 1.
 * - Typing `DD/MM/YYYY to DD/MM/YYYY` into the visible input and pressing Enter commits the range
 *   (hidden value becomes `YYYY-MM-DD to YYYY-MM-DD`). There's no separate Nights field: nights = departure − arrival.
 * - Next → POST `GuestReservation/GetRoomRateAvailability` with `date_From` = arrival, `date_To` = departure.
 *   The room selection page shows badges `Arrival : … Departure : …` and a 10-day table starting at the
 *   arrival date. Only the stay nights are highlighted; the departure day is not part of the stay.
 * - Availability grid column i (0 = business date) is business date + i, and its header reads "<day> <weekday>".
 *   The grid and the room selection page show the same per-night numbers.
 */
export class FutureReservationAvailabilityPage extends BasePage {
  private readonly elementActions: ElementActions;
  /** Cancel flow + confirmation number + availability capture. */
  readonly reservations: ReservationCancelAvailabilityPage;
  /** Shared Quick Access availability grid + booking steps. */
  readonly availability: RecreateAvailabilityPage;

  /* ── Stay Details (New Reservation) ── */
  private readonly stayDateRangeInput: Locator;
  private readonly stayDateRangeValue: Locator;

  /* ── Room selection ── */
  private readonly arrivalBadge: Locator;
  private readonly departureBadge: Locator;
  private readonly roomSelectionRows: Locator;

  /* ── Availability grid (Quick Access modal) ── */
  private readonly availabilityHeaderCells: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.reservations = new ReservationCancelAvailabilityPage(page, context);
    this.availability = this.reservations.availability;

    // Stay Details
    this.stayDateRangeInput = this.page.locator('date-range-control input.flatpickr-input[type="text"]').first();
    this.stayDateRangeValue = this.page.locator('date-range-control input.flatpickr-input[type="hidden"]').first();

    // Room selection
    this.arrivalBadge = this.page.getByText(/^\s*Arrival\s*:\s*\d{2}\/\d{2}\/\d{4}\s*$/).first();
    this.departureBadge = this.page.getByText(/^\s*Departure\s*:\s*\d{2}\/\d{2}\/\d{4}\s*$/).first();
    this.roomSelectionRows = this.page.locator('table tbody tr');

    // Availability grid
    this.availabilityHeaderCells = this.page.locator('ngb-modal-window.show app-data-grid .dg-header-cell');
  }

  // ──────────────────────────────────────────────────────────────
  //  Availability grid
  // ──────────────────────────────────────────────────────────────

  /** Open Quick Access → Availability, capture the grid and its header day numbers, and close it again. */
  async captureAvailability(): Promise<AvailabilityGridWithDays> {
    await this.availability.openQuickAccessPanel();
    await this.availability.clickAvailabilityQuickLink();
    const grid = await this.availability.captureAvailabilityGrid();
    // Header cell 0 is the room type column; the rest read "<day> <weekday>"
    const headers = await this.availabilityHeaderCells.allTextContents();
    const headerDays = headers.slice(1).map(h => parseInt(h.trim(), 10));
    await this.availability.closeAvailabilityModal();
    return { ...grid, headerDays };
  }

  // ──────────────────────────────────────────────────────────────
  //  Stay Details
  // ──────────────────────────────────────────────────────────────

  /** Type the stay range into the Check In/ Check Out flatpickr and verify the committed value. */
  async setStayDates(stay: FutureStay): Promise<void> {
    const range = `${stay.arrivalDate} to ${stay.departureDate}`;
    logger.info(`Setting stay dates: ${range} (${stay.nights} night(s))`);

    await this.stayDateRangeInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.elementActions.click(this.stayDateRangeInput, 'Check In/ Check Out Date input');
    await this.stayDateRangeInput.fill('');
    await this.stayDateRangeInput.pressSequentially(range, { delay: 20 });
    await this.stayDateRangeInput.press('Enter'); // commits the flatpickr range
    await this.page.keyboard.press('Escape');

    const toIso = (d: string) => d.split('/').reverse().join('-');
    const expected = `${toIso(stay.arrivalDate)} to ${toIso(stay.departureDate)}`;
    const actual = await this.stayDateRangeValue.inputValue();
    if (actual !== expected) {
      throw new Error(`Stay dates not applied: expected "${expected}", field holds "${actual}"`);
    }
    logger.info(`✅ Stay dates set: ${actual}`);
  }

  // ──────────────────────────────────────────────────────────────
  //  Room selection
  // ──────────────────────────────────────────────────────────────

  /** The "N Rooms" figure for each of the first `nights` date columns of `roomType`'s row. */
  async getStayNightAvailability(roomType: string, nights: number): Promise<number[]> {
    const name = roomType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const row = this.roomSelectionRows.filter({ has: this.page.locator('h5, h6, h4', { hasText: new RegExp(`^\\s*${name}\\s*$`) }) }).first();
    const cells = await row.locator('td').allTextContents();
    // td 0 = room type, then one td per date, last td = "+ 0 −" controls
    return cells.slice(1, 1 + nights).map(text => parseInt(text.match(/(\d+)\s*Rooms/i)?.[1] ?? '0', 10));
  }

  // ──────────────────────────────────────────────────────────────
  //  Booking
  // ──────────────────────────────────────────────────────────────

  /**
   * Guest Management → New Reservation → enter `stay` → Next, retrying once if the room list doesn't load,
   * and check that the room selection page shows the stay's arrival and departure dates.
   */
  async openRoomSelectionForStay(stay: FutureStay): Promise<void> {
    const MAX_ATTEMPTS = 2;
    await this.availability.navigateToGuestManagement();
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await this.availability.clickNewReservation();
      await this.setStayDates(stay);
      await this.availability.clickNextToRoomSelection();

      if ((await this.availability.isRoomListLoaded()) && !(await this.availability.isProcessingMessageVisible())) break;
      if (attempt === MAX_ATTEMPTS) {
        logger.warn('⚠️ Room list still not loaded on the last attempt. Waiting for the table anyway...');
        break;
      }
      logger.warn('⚠️ Room list did not load ("processing" message). Waiting 30s, then reloading and retrying...');
      await this.page.waitForTimeout(30000);
      await this.page.reload();
      await this.availability.navigateToGuestManagement();
    }
    await this.availability.waitForRoomSelectionTableLoaded();

    const arrivalText = ((await this.arrivalBadge.textContent()) ?? '').replace(/\s+/g, ' ').trim();
    const departureText = ((await this.departureBadge.textContent()) ?? '').replace(/\s+/g, ' ').trim();
    if (!arrivalText.includes(stay.arrivalDate) || !departureText.includes(stay.departureDate)) {
      throw new Error(`Room selection shows "${arrivalText}" / "${departureText}", expected ${stay.arrivalDate} / ${stay.departureDate}`);
    }
  }

  /**
   * Room selection page → Guest Details (last name) → Confirm & Continue → "No" to the confirmation letter,
   * and read the confirmation number. Call after the rooms have been selected.
   */
  async completeBooking(lastName: string): Promise<string> {
    await this.availability.clickNextToGuestDetails();
    await this.availability.fillLastName(lastName);
    await this.availability.closeAvailabilityModal();
    await this.availability.clickConfirmAndContinue();
    await this.availability.handleConfirmationLetterNo();
    return this.reservations.readConfirmationNumber();
  }

  /**
   * Book `numberOfRooms` × `roomType` for `stay` in a single reservation.
   * Unlike RecreateAvailabilityPage.runBookingFlow, it never switches to another room type; it fails instead.
   */
  async bookFutureRooms(roomType: string, lastName: string, numberOfRooms: number, stay: FutureStay): Promise<FutureBookingResult> {
    logger.info(`Booking ${numberOfRooms} × "${roomType}" for ${stay.arrivalDate} → ${stay.departureDate}, guest "${lastName}"`);
    await this.openRoomSelectionForStay(stay);

    const selectionPageAvailability = await this.getStayNightAvailability(roomType, stay.nights);
    logger.info(`Room selection "${roomType}" per night: ${selectionPageAvailability.join(', ')}`);
    if (selectionPageAvailability.length !== stay.nights || Math.min(...selectionPageAvailability) < numberOfRooms) {
      throw new Error(`"${roomType}" can't take ${numberOfRooms} room(s) on every night: ${selectionPageAvailability.join(', ')}`);
    }

    if (!(await this.availability.selectRoomsByType(roomType, numberOfRooms))) {
      throw new Error(`Room type "${roomType}" not found on the room selection page`);
    }

    const confirmationNo = await this.completeBooking(lastName);
    logger.info(`✅ Reservation ${confirmationNo}: ${numberOfRooms} × ${roomType}, ${stay.arrivalDate} → ${stay.departureDate}`);
    return { roomType, roomsBooked: numberOfRooms, confirmationNo, lastName, stay, selectionPageAvailability };
  }
}
