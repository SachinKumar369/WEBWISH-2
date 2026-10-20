import { BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { RecreateAvailabilityPage } from './RecreateAvailabilityPage';
import { ReservationCancelAvailabilityPage } from './ReservationCancelAvailabilityPage';
import { FutureReservationAvailabilityPage, FutureStay } from './FutureReservationAvailabilityPage';
import { MultiNightReservationPage, StayDetails } from './MultiNightReservationPage';

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

/** Rooms of one room type (grid / room selection page NAME, e.g. "Deluxe Rooms") to add to the reservation. */
export interface RoomTypeSelection {
  roomType: string;
  rooms: number;
}

/** Result of booking several room types in one reservation. */
export interface MultiRoomTypeBookingResult {
  confirmationNo: string;
  lastName: string;
  stay: FutureStay;
  selections: RoomTypeSelection[];
  /** Sum of `rooms` over all selections = number of stays in the reservation. */
  totalRooms: number;
  /** "N Rooms" per stay night on the room selection page, per room type, before the rooms were added. */
  selectionPageAvailability: Record<string, number[]>;
}

/** One "Future Postings" line of the Bill Summary: room type NAME + "(N Room)". */
export interface RoomTypePosting {
  roomType: string;
  rooms: number;
}

/** What Reservation Details shows for a multi-room-type reservation. */
export interface MultiRoomTypeReservationDetails {
  stays: StayDetails[];
  postings: RoomTypePosting[];
}

// ──────────────────────────────────────────────────────────────
//  Page Object – One reservation with several room types
// ──────────────────────────────────────────────────────────────

/**
 * Books one reservation that holds rooms of several room types and reads it back from Reservation Details.
 * Stay entry and booking steps come from {@link FutureReservationAvailabilityPage}, stay fields from
 * {@link MultiNightReservationPage}, and cancelling from {@link ReservationCancelAvailabilityPage}.
 *
 * UI flow and quirks (verified live on QC2 / WEBMI, 2026-10-19):
 * - On the room selection page each room type row has its own "+ N −" counter. Clicking + in several rows
 *   keeps every selection (each counter shows its count), and Next → Guest Details → Confirm creates ONE
 *   reservation (one confirmation number) with a green **M** (multi-guest) badge and one "Stay #n" per room.
 * - Each stay card shows the room type as a CODE (`app-checkin-assign-room .room-type`, e.g. `BEAC`, `BTRM`, `DLX`),
 *   while the availability grid and room selection page use NAMES ("Beachsuite", "Bed Type Standard Room").
 * - The Bill Summary's "Future Postings:" (`h6`) table lists one row per room type by NAME:
 *   `<td><span>Beachsuite</span><small> (1 Room)</small></td><td><h6>2,000.00</h6></td>`, followed by tax/total rows
 *   that have no `small`.
 * - Every stay is cancelled separately (⋮ → Reservation Details → Cancel), see
 *   ReservationCancelAvailabilityPage.cancelReservation().
 */
export class MultiRoomTypeReservationPage extends BasePage {
  /** Stay date entry + booking steps + availability grid with header days. */
  readonly future: FutureReservationAvailabilityPage;
  /** Stay details (dates, nights, status, room type code) on Reservation Details. */
  readonly stayDetails: MultiNightReservationPage;
  /** Open / cancel a reservation. */
  readonly reservations: ReservationCancelAvailabilityPage;
  /** Shared Quick Access availability grid + booking steps. */
  readonly availability: RecreateAvailabilityPage;

  /* ── Room selection ── */
  private readonly roomSelectionRows: Locator;

  /* ── Reservation Details → Bill Summary ── */
  private readonly futurePostingRows: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.stayDetails = new MultiNightReservationPage(page, context);
    this.future = this.stayDetails.future;
    this.reservations = this.stayDetails.reservations;
    this.availability = this.stayDetails.availability;

    // Room selection: one row per room type (heading = name, last cell = "+ N −" counter)
    this.roomSelectionRows = this.page.locator('table tbody tr');

    // Bill Summary: room type rows of the "Future Postings:" table (tax/total rows have no "(N Room)")
    this.futurePostingRows = this.page
      .locator('table')
      .filter({ has: this.page.locator('h6', { hasText: /^\s*Future Postings:?\s*$/ }) })
      .locator('tr')
      .filter({ has: this.page.locator('small', { hasText: /\(\s*\d+\s*Rooms?\s*\)/i }) });
  }

  // ──────────────────────────────────────────────────────────────
  //  Booking
  // ──────────────────────────────────────────────────────────────

  /** The room selection "+ N −" counter of `roomType`'s row (last cell, reads e.g. "+1-"). */
  async getSelectedRoomCount(roomType: string): Promise<number> {
    const name = roomType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const row = this.roomSelectionRows.filter({ has: this.page.locator('h5, h6, h4', { hasText: new RegExp(`^\\s*${name}\\s*$`) }) }).first();
    const counter = ((await row.locator('td').last().textContent()) ?? '').replace(/\s+/g, '');
    return parseInt(counter.match(/(\d+)/)?.[1] ?? '-1', 10);
  }

  /**
   * Book every selection for `stay` in a single reservation. Fails instead of switching room types when a
   * type can't take its rooms on every night.
   */
  async bookMultipleRoomTypes(selections: RoomTypeSelection[], lastName: string, stay: FutureStay): Promise<MultiRoomTypeBookingResult> {
    const summary = selections.map(s => `${s.rooms} × "${s.roomType}"`).join(' + ');
    logger.info(`Booking ${summary} for ${stay.arrivalDate} → ${stay.departureDate} (${stay.nights} nights), guest "${lastName}"`);

    await this.future.openRoomSelectionForStay(stay);

    const selectionPageAvailability: Record<string, number[]> = {};
    for (const { roomType, rooms } of selections) {
      const perNight = await this.future.getStayNightAvailability(roomType, stay.nights);
      selectionPageAvailability[roomType] = perNight;
      logger.info(`Room selection "${roomType}" per night: ${perNight.join(', ')}`);
      if (perNight.length !== stay.nights || Math.min(...perNight) < rooms) {
        throw new Error(`"${roomType}" can't take ${rooms} room(s) on every night: ${perNight.join(', ')}`);
      }
      if (!(await this.availability.selectRoomsByType(roomType, rooms))) {
        throw new Error(`Room type "${roomType}" not found on the room selection page`);
      }
      const selected = await this.getSelectedRoomCount(roomType);
      if (selected !== rooms) {
        throw new Error(`"${roomType}" counter shows ${selected} room(s) after selecting ${rooms}`);
      }
    }

    const confirmationNo = await this.future.completeBooking(lastName);
    const totalRooms = selections.reduce((sum, s) => sum + s.rooms, 0);
    logger.info(`✅ Reservation ${confirmationNo}: ${summary} (${totalRooms} stays), ${stay.arrivalDate} → ${stay.departureDate}`);
    return { confirmationNo, lastName, stay, selections, totalRooms, selectionPageAvailability };
  }

  // ──────────────────────────────────────────────────────────────
  //  Reservation Details
  // ──────────────────────────────────────────────────────────────

  /** Room type rows (name + room count) of the Bill Summary "Future Postings" on the open reservation. */
  async getFuturePostings(): Promise<RoomTypePosting[]> {
    await this.futurePostingRows.first().waitFor({ state: 'visible', timeout: 30000 });
    const postings: RoomTypePosting[] = [];
    for (const row of await this.futurePostingRows.all()) {
      const roomType = ((await row.locator('td span').first().textContent()) ?? '').replace(/\s+/g, ' ').trim();
      const roomsText = (await row.locator('small').first().textContent()) ?? '';
      postings.push({ roomType, rooms: parseInt(roomsText.match(/(\d+)/)?.[1] ?? '0', 10) });
    }
    logger.info(`Future Postings: ${postings.map(p => `${p.roomType} (${p.rooms})`).join(', ')}`);
    return postings;
  }

  /** Open `confirmationNo` and read every stay (dates, nights, status, room type code) and the Future Postings. */
  async getReservationDetails(confirmationNo: string, expectedStays: number): Promise<MultiRoomTypeReservationDetails> {
    const stays = await this.stayDetails.getStayDetails(confirmationNo, expectedStays);
    const postings = await this.getFuturePostings();
    return { stays, postings };
  }
}
