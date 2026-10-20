import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import {
  AvailabilityGridWithDays,
  buildFutureStay,
  FutureBookingResult,
  FutureReservationAvailabilityPage,
  FutureStay,
} from '../../src/pages/Availability/FutureReservationAvailabilityPage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

/** Rooms booked in the one reservation (a multi-guest booking: one stay per room). */
const ROOMS_TO_BOOK = 2;
/** Arrival = business date + ARRIVAL_OFFSET_DAYS. */
const ARRIVAL_OFFSET_DAYS = 5;
const NIGHTS = 3;
/** Grid columns logged in the before/expected/actual table (business date … day after departure). */
const LOGGED_DAYS = ARRIVAL_OFFSET_DAYS + NIGHTS + 2;
const SUCCESS_MESSAGE = 'Details created/updated successfully.';

// Always run this suite in a headed, maximized window (ignores HEADED / MAXIMIZE_BROWSER)
test.use({ headless: false, viewport: null, launchOptions: { args: ['--start-maximized'] } });

// ── Shared LIVE browser session + state (serial mode) ───────────────────────
// The app rejects deep links / storageState restore, so the tests share one
// logged-in page in-process (same pattern as reservation-cancel-availability.spec.ts).
let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

/** Handoff between the serial tests. */
interface FutureFlowState {
  roomType: string;
  stay: FutureStay;
  /** Availability of the room type per grid column (column 0 = business date) before booking. */
  baseline: number[];
  /** "Total Available" row before booking. */
  baselineTotal: number[];
  booking: FutureBookingResult | null;
  cancelled: boolean;
}
let state: FutureFlowState | null = null;

async function getSharedSession(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  if (!sharedContext || !sharedPage || sharedPage.isClosed()) {
    // viewport: null → the page takes the size of the maximized window
    sharedContext = await browser.newContext({ viewport: null });
    sharedPage = await sharedContext.newPage();
    logger.info('Created shared browser session for the serial future-reservation availability tests');
  }
  return { context: sharedContext, page: sharedPage };
}

function roomTypeRow(grid: AvailabilityGridWithDays, roomType: string): number[] {
  const row = grid.roomTypes.find(r => r.roomType === roomType);
  expect(row, `Room type "${roomType}" should be present in the availability grid`).toBeDefined();
  return row!.availableRooms;
}

/** True when grid column `i` is one of the stay nights (the departure day is not a night). */
function isStayNight(i: number, stay: FutureStay): boolean {
  return i >= stay.offsetDays && i < stay.offsetDays + stay.nights;
}

/**
 * Re-capture the grid and assert, per day, the room type and Total Available rows equal
 * baseline + delta on each stay night and baseline on every other day (business date,
 * days before arrival, the departure day and later).
 */
async function verifyAvailability(futurePage: FutureReservationAvailabilityPage, stayNightDelta: number, label: string): Promise<void> {
  const s = state!;
  const grid = await futurePage.captureAvailability();
  const days = Math.min(s.baseline.length, grid.totalAvailable.length);

  const expectedRoom = s.baseline.slice(0, days).map((v, i) => (isStayNight(i, s.stay) ? v + stayNightDelta : v));
  const expectedTotal = s.baselineTotal.slice(0, days).map((v, i) => (isStayNight(i, s.stay) ? v + stayNightDelta : v));
  const actualRoom = roomTypeRow(grid, s.roomType).slice(0, days);
  const actualTotal = grid.totalAvailable.slice(0, days);

  logger.info('═══════════════════════════════════════════════');
  logger.info(
    `${label}: ${s.roomType}, stay ${s.stay.arrivalDate} → ${s.stay.departureDate} ` +
      `(business date ${grid.businessDate}, delta per night ${stayNightDelta >= 0 ? '+' : ''}${stayNightDelta})`
  );
  for (let i = 0; i < Math.min(days, LOGGED_DAYS); i++) {
    logger.info(
      `  day ${i} (${grid.headerDays[i]})${isStayNight(i, s.stay) ? ' [night]' : '        '}: ` +
        `${s.roomType} base ${s.baseline[i]} → expected ${expectedRoom[i]}, actual ${actualRoom[i]} | ` +
        `Total Available base ${s.baselineTotal[i]} → expected ${expectedTotal[i]}, actual ${actualTotal[i]}`
    );
  }
  logger.info('═══════════════════════════════════════════════');

  expect(actualRoom, `${s.roomType} availability per day`).toEqual(expectedRoom);
  expect(actualTotal, 'Total Available per day').toEqual(expectedTotal);
}

/**
 * Availability for a reservation on future dates.
 *
 * FUT_AVAIL_001  capture the baseline and choose a room type with headroom on every stay night
 * FUT_AVAIL_002  book ROOMS_TO_BOOK rooms from business date + ARRIVAL_OFFSET_DAYS for NIGHTS nights:
 *                availability drops by ROOMS_TO_BOOK on those nights only
 * FUT_AVAIL_003  cancel every stay of that reservation: availability is back to the baseline
 */
test.describe.serial('Availability - Future-dated reservation reduces availability on the stay nights', () => {
  test.afterAll(async () => {
    // Cleanup: if a run fails between booking and cancelling, don't leave the rooms blocked on QC
    if (sharedPage && !sharedPage.isClosed() && state?.booking && !state.cancelled) {
      logger.warn(`Cleanup: cancelling reservation ${state.booking.confirmationNo} left by a failed run`);
      await new FutureReservationAvailabilityPage(sharedPage, sharedContext!).reservations
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

  test('FUT_AVAIL_001: Capture availability before the future booking', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    const { context, page } = await getSharedSession(browser);
    const futurePage = new FutureReservationAvailabilityPage(page, context);

    const user = getUserByIndexFromExcel(1);
    const property = getPropertyByIndexFromExcel(3);
    expect(user).toBeDefined();
    expect(property).toBeDefined();

    await test.step('Step 1: Login with user + property from Excel', async () => {
      await new LoginPage(page, context).loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    await test.step('Step 2: Capture availability grid and choose a room type with headroom on every stay night', async () => {
      const grid = await futurePage.captureAvailability();
      const stay = buildFutureStay(grid.businessDate, ARRIVAL_OFFSET_DAYS, NIGHTS);
      const nightColumns = Array.from({ length: NIGHTS }, (_, n) => ARRIVAL_OFFSET_DAYS + n);
      expect(grid.totalAvailable.length, 'Grid must cover the departure day').toBeGreaterThan(ARRIVAL_OFFSET_DAYS + NIGHTS);
      expect(grid.headerDays[ARRIVAL_OFFSET_DAYS], `Grid column ${ARRIVAL_OFFSET_DAYS} should be the arrival day`).toBe(
        Number(stay.arrivalDate.split('/')[0])
      );

      const candidate = grid.roomTypes.find(r => nightColumns.every(c => r.availableRooms[c] >= ROOMS_TO_BOOK + 2));
      expect(candidate, `A room type with at least ${ROOMS_TO_BOOK + 2} rooms available on every stay night`).toBeDefined();

      state = {
        roomType: candidate!.roomType,
        stay,
        baseline: [...candidate!.availableRooms],
        baselineTotal: [...grid.totalAvailable],
        booking: null,
        cancelled: false,
      };
      logger.info(
        `Business date ${grid.businessDate}; stay ${stay.arrivalDate} → ${stay.departureDate} (${NIGHTS} nights); ` +
          `"${state.roomType}" per night ${nightColumns.map(c => state!.baseline[c]).join(', ')}`
      );
    });
  });

  test(`FUT_AVAIL_002: Book ${ROOMS_TO_BOOK} rooms for a future stay and verify availability drops on the stay nights only`, async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state, 'FUT_AVAIL_001 must run first').not.toBeNull();
    const { context, page } = await getSharedSession(browser);
    const futurePage = new FutureReservationAvailabilityPage(page, context);
    const s = state!;

    await test.step(`Step 1: Book ${ROOMS_TO_BOOK} × "${s.roomType}" from ${s.stay.arrivalDate} to ${s.stay.departureDate}`, async () => {
      s.booking = await futurePage.bookFutureRooms(s.roomType, `FutAvail${Date.now()}`, ROOMS_TO_BOOK, s.stay);
      logger.info(`Reservation ${s.booking.confirmationNo} for guest ${s.booking.lastName}`);

      // The room selection page shows the same per-night availability as the grid did
      const gridNights = s.baseline.slice(s.stay.offsetDays, s.stay.offsetDays + s.stay.nights);
      expect(s.booking.selectionPageAvailability, 'Room selection availability per night = grid baseline').toEqual(gridNights);
    });

    await test.step(`Step 2: Verify availability decreased by ${ROOMS_TO_BOOK} on each stay night and nowhere else`, async () => {
      await verifyAvailability(futurePage, -ROOMS_TO_BOOK, 'FUT_AVAIL_002 After booking');
    });

    await page.screenshot({ path: 'screenshots/FUT_AVAIL_002.png', fullPage: true });
  });

  test('FUT_AVAIL_003: Cancel the future reservation and verify availability is restored', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.booking, 'FUT_AVAIL_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const futurePage = new FutureReservationAvailabilityPage(page, context);
    const booking = state!.booking!;

    await test.step(`Step 1: Cancel every stay of reservation ${booking.confirmationNo}`, async () => {
      const result = await futurePage.reservations.cancelReservation(booking.confirmationNo, booking.roomsBooked);
      state!.cancelled = result.statuses.every(s => s.status === 'CANCELLED');

      expect(result.staysCancelled).toBe(booking.roomsBooked);
      for (const message of result.messages) expect(message).toBe(SUCCESS_MESSAGE);
      expect(result.statuses.map(s => s.status)).toEqual(Array(booking.roomsBooked).fill('CANCELLED'));
    });

    await test.step('Step 2: Verify availability is back to the baseline', async () => {
      await verifyAvailability(futurePage, 0, 'FUT_AVAIL_003 After cancellation');
    });

    await page.screenshot({ path: 'screenshots/FUT_AVAIL_003.png', fullPage: true });
  });
});
