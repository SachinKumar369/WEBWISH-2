import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { AvailabilityGridData } from '../../src/pages/Availability/RecreateAvailabilityPage';
import {
  BookingResult,
  ReservationCancelAvailabilityPage,
} from '../../src/pages/Availability/ReservationCancelAvailabilityPage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

/** Rooms booked in the one reservation (a multi-guest booking: one stay per room). */
const ROOMS_TO_BOOK = 3;
const SUCCESS_MESSAGE = 'Details created/updated successfully.';

// ── Shared LIVE browser session + state (serial mode) ───────────────────────
// The app rejects deep links / storageState restore, so the tests share one
// logged-in page in-process (same pattern as revise-availability.spec.ts).
let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

/** Handoff between the serial tests. */
interface CancelFlowState {
  roomType: string;
  /** Availability of the room type per grid column (column 0 = business date) before booking. */
  baseline: number[];
  /** "Total Available" row before booking. */
  baselineTotal: number[];
  booking: BookingResult | null;
  cancelled: boolean;
}
let state: CancelFlowState | null = null;

async function getSharedSession(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  if (!sharedContext || !sharedPage || sharedPage.isClosed()) {
    const headed = process.env.HEADED !== 'false';
    sharedContext = await browser.newContext({ viewport: headed ? null : { width: 1920, height: 1080 } });
    sharedPage = await sharedContext.newPage();
    logger.info('Created shared browser session for the serial reservation-cancel availability tests');
  }
  return { context: sharedContext, page: sharedPage };
}

function roomTypeRow(grid: AvailabilityGridData, roomType: string): number[] {
  const row = grid.roomTypes.find(r => r.roomType === roomType);
  expect(row, `Room type "${roomType}" should be present in the availability grid`).toBeDefined();
  return row!.availableRooms;
}

/**
 * Re-capture the grid and assert, per day, the room type and Total Available rows equal
 * baseline + delta on the business date (1-night stay) and baseline on every other day.
 */
async function verifyAvailability(cancelPage: ReservationCancelAvailabilityPage, businessDateDelta: number, label: string): Promise<void> {
  const s = state!;
  const grid = await cancelPage.captureAvailability();
  const days = Math.min(s.baseline.length, grid.totalAvailable.length);

  const expectedRoom = s.baseline.slice(0, days).map((v, i) => (i === 0 ? v + businessDateDelta : v));
  const expectedTotal = s.baselineTotal.slice(0, days).map((v, i) => (i === 0 ? v + businessDateDelta : v));
  const actualRoom = roomTypeRow(grid, s.roomType).slice(0, days);
  const actualTotal = grid.totalAvailable.slice(0, days);

  logger.info('═══════════════════════════════════════════════');
  logger.info(`${label} — ${s.roomType} (business date ${grid.businessDate}, delta ${businessDateDelta >= 0 ? '+' : ''}${businessDateDelta})`);
  for (let i = 0; i < Math.min(days, 5); i++) {
    logger.info(
      `  day ${i}: ${s.roomType} base ${s.baseline[i]} → expected ${expectedRoom[i]}, actual ${actualRoom[i]} | ` +
        `Total Available base ${s.baselineTotal[i]} → expected ${expectedTotal[i]}, actual ${actualTotal[i]}`
    );
  }
  logger.info('═══════════════════════════════════════════════');

  expect(actualRoom, `${s.roomType} availability per day`).toEqual(expectedRoom);
  expect(actualTotal, 'Total Available per day').toEqual(expectedTotal);
}

/**
 * Availability before/after creating and cancelling a reservation.
 *
 * AVAIL_CXL_001  capture the baseline and choose a room type with headroom
 * AVAIL_CXL_002  book ROOMS_TO_BOOK rooms for 1 night: availability on the business date drops by ROOMS_TO_BOOK
 * AVAIL_CXL_003  cancel every stay of that reservation: availability is back to the baseline
 *
 * The booking is multi-guest (one stay per room), so each stay is cancelled from its own
 * Reservation Details view (see ReservationCancelAvailabilityPage).
 */
test.describe.serial('Availability - Booking cancellation releases rooms', () => {
  test.afterAll(async () => {
    // Cleanup: if a run fails between booking and cancelling, don't leave the rooms blocked on QC
    if (sharedPage && !sharedPage.isClosed() && state?.booking && !state.cancelled) {
      logger.warn(`Cleanup: cancelling reservation ${state.booking.confirmationNo} left by a failed run`);
      await new ReservationCancelAvailabilityPage(sharedPage, sharedContext!)
        .cancelReservation(state.booking.confirmationNo, state.booking.roomsBooked)
        .catch(e => logger.error(`Cleanup cancel failed: ${(e as Error).message}`));
    }
    if (process.env.KEEP_BROWSER_OPEN === 'true' && sharedPage && !sharedPage.isClosed()) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after the suite...');
      await sharedPage.pause();
    }
    await sharedContext?.close();
    sharedContext = null;
    sharedPage = null;
  });

  test('AVAIL_CXL_001: Capture availability before booking', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    const { context, page } = await getSharedSession(browser);
    const cancelPage = new ReservationCancelAvailabilityPage(page, context);

    const user = getUserByIndexFromExcel(1);
    const property = getPropertyByIndexFromExcel(3);
    expect(user).toBeDefined();
    expect(property).toBeDefined();

    await test.step('Step 1: Login with user + property from Excel', async () => {
      await new LoginPage(page, context).loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    await test.step('Step 2: Capture availability grid and choose a room type', async () => {
      const grid = await cancelPage.captureAvailability();
      const candidate = grid.roomTypes.find(r => r.availableRooms[0] >= ROOMS_TO_BOOK + 2);
      expect(candidate, `A room type with at least ${ROOMS_TO_BOOK + 2} rooms available on the business date`).toBeDefined();

      state = {
        roomType: candidate!.roomType,
        baseline: [...candidate!.availableRooms],
        baselineTotal: [...grid.totalAvailable],
        booking: null,
        cancelled: false,
      };
      logger.info(
        `Business date ${grid.businessDate}: "${state.roomType}" available ${state.baseline[0]}, ` +
          `Total Available ${state.baselineTotal[0]}`
      );
    });
  });

  test(`AVAIL_CXL_002: Book ${ROOMS_TO_BOOK} rooms and verify availability drops by ${ROOMS_TO_BOOK}`, async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state, 'AVAIL_CXL_001 must run first').not.toBeNull();
    const { context, page } = await getSharedSession(browser);
    const cancelPage = new ReservationCancelAvailabilityPage(page, context);

    await test.step(`Step 1: Book ${ROOMS_TO_BOOK} × "${state!.roomType}" for 1 night`, async () => {
      state!.booking = await cancelPage.bookRooms(state!.roomType, `AvailCxl${Date.now()}`, ROOMS_TO_BOOK);
      logger.info(`Reservation ${state!.booking.confirmationNo} for guest ${state!.booking.lastName}`);
    });

    await test.step(`Step 2: Verify availability on the business date decreased by ${ROOMS_TO_BOOK}`, async () => {
      await verifyAvailability(cancelPage, -ROOMS_TO_BOOK, 'AVAIL_CXL_002 After booking');
    });

    await page.screenshot({ path: 'screenshots/AVAIL_CXL_002.png', fullPage: true });
  });

  test('AVAIL_CXL_003: Cancel the reservation and verify availability is restored', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.booking, 'AVAIL_CXL_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const cancelPage = new ReservationCancelAvailabilityPage(page, context);
    const booking = state!.booking!;

    await test.step(`Step 1: Cancel every stay of reservation ${booking.confirmationNo}`, async () => {
      const result = await cancelPage.cancelReservation(booking.confirmationNo, booking.roomsBooked);
      state!.cancelled = result.statuses.every(s => s.status === 'CANCELLED');

      expect(result.staysCancelled).toBe(booking.roomsBooked);
      for (const message of result.messages) expect(message).toBe(SUCCESS_MESSAGE);
      expect(result.statuses).toHaveLength(booking.roomsBooked);
      expect(result.statuses.map(s => s.status)).toEqual(Array(booking.roomsBooked).fill('CANCELLED'));
    });

    await test.step('Step 2: Verify availability is back to the baseline', async () => {
      await verifyAvailability(cancelPage, 0, 'AVAIL_CXL_003 After cancellation');
    });

    await page.screenshot({ path: 'screenshots/AVAIL_CXL_003.png', fullPage: true });
  });
});
