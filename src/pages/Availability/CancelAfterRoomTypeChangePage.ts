import { BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { CancellationResult } from './ReservationCancelAvailabilityPage';
import { AvailabilityGridWithDays } from './FutureReservationAvailabilityPage';
import { ChangeRoomTypePage } from './ChangeRoomTypePage';

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

/** Availability of every grid row per day (column 0 = business date). */
export interface AvailabilitySnapshot {
  businessDate: string;
  headerDays: number[];
  /** Room type NAME → availability per day. */
  roomTypes: Record<string, number[]>;
  totalAvailable: number[];
  totalBooked: number[];
}

/** Result of {@link CancelAfterRoomTypeChangePage.cancelAfterRoomTypeChange}. */
export interface CancelAfterChangeResult extends CancellationResult {
  /** Room type code on the stay card right after the cancellation (the reservation stays open). */
  roomTypeCodeAfterCancel: string;
}

/** Convert a captured grid into an {@link AvailabilitySnapshot}. */
export function toSnapshot(grid: AvailabilityGridWithDays): AvailabilitySnapshot {
  return {
    businessDate: grid.businessDate,
    headerDays: [...grid.headerDays],
    roomTypes: Object.fromEntries(grid.roomTypes.map(r => [r.roomType, [...r.availableRooms]])),
    totalAvailable: [...grid.totalAvailable],
    totalBooked: [...grid.totalBooked],
  };
}

// ──────────────────────────────────────────────────────────────
//  Page Object – Cancel a reservation whose room type was changed
// ──────────────────────────────────────────────────────────────

/**
 * Cancels a single-stay reservation after its room type has been changed, and reads the whole availability grid
 * so every room type can be compared with the baseline. The steps are composed from {@link ChangeRoomTypePage}
 * (book / change room type / Stay Details) and its `reservations` ({@link ReservationCancelAvailabilityPage}).
 *
 * What this flow checks on QC2 / WEBMI: the cancellation must release the nights of the room type the stay holds
 * NOW (the new one). The original room type already got its nights back at the change, so it must not be released
 * a second time (it must end on the baseline, not baseline + 1).
 *
 * UI notes:
 * - A single-stay reservation is cancelled in place on `…/SE/<conf no>` and stays open afterwards, so the stay
 *   card's room type code (`app-checkin-assign-room .room-type`) can be read without reopening the reservation.
 */
export class CancelAfterRoomTypeChangePage extends BasePage {
  /** Booking, room type change, Stay Details, cancellation and the availability grid. */
  readonly roomTypeChange: ChangeRoomTypePage;

  /* ── Reservation summary → stay card ── */
  private readonly stayCardRoomType: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.roomTypeChange = new ChangeRoomTypePage(page, context);
    this.stayCardRoomType = this.page.locator('app-checkin-assign-room .room-type');
  }

  // ──────────────────────────────────────────────────────────────
  //  Availability
  // ──────────────────────────────────────────────────────────────

  /** Capture the Quick Access availability grid: every room type + Total Available / Total Booked. */
  async captureSnapshot(): Promise<AvailabilitySnapshot> {
    return toSnapshot(await this.roomTypeChange.future.captureAvailability());
  }

  // ──────────────────────────────────────────────────────────────
  //  Cancel
  // ──────────────────────────────────────────────────────────────

  /** Room type code on the open reservation's stay card ('' when the card doesn't show one). */
  async getStayCardRoomTypeCode(): Promise<string> {
    return ((await this.stayCardRoomType.first().textContent({ timeout: 15000 }).catch(() => '')) ?? '').trim();
  }

  /**
   * Open `confirmationNo` (a single-stay reservation whose room type was changed), cancel it and read the
   * room type code still shown on the cancelled stay card.
   */
  async cancelAfterRoomTypeChange(confirmationNo: string): Promise<CancelAfterChangeResult> {
    logger.info(`Cancelling reservation ${confirmationNo} after its room type change`);
    const result = await this.roomTypeChange.reservations.cancelReservation(
      confirmationNo,
      1,
      undefined,
      'Automation: cancel after room type change'
    );
    const roomTypeCodeAfterCancel = await this.getStayCardRoomTypeCode();
    logger.info(`Reservation ${confirmationNo} after cancel: ${result.statuses.map(s => s.status).join(', ')}, room type ${roomTypeCodeAfterCancel || '(not shown)'}`);
    return { ...result, roomTypeCodeAfterCancel };
  }
}
