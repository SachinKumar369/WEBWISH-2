import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import {
  AvailabilityGridWithDays,
  buildFutureStay,
  FutureBookingResult,
  FutureStay,
} from '../../src/pages/Availability/FutureReservationAvailabilityPage';
import { MultiNightReservationPage } from '../../src/pages/Availability/MultiNightReservationPage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

/** Rooms booked in the reservation (1 = single-stay reservation). */
const ROOMS_TO_BOOK = 1;
/** Arrival = business date + ARRIVAL_OFFSET_DAYS (0 = arriving on the business date). */
const ARRIVAL_OFFSET_DAYS = 0;
const NIGHTS = 4;
/** Grid columns logged in the before/expected/actual table (business date … day after departure). */
const LOGGED_DAYS = ARRIVAL_OFFSET_DAYS + NIGHTS + 2;
const SUCCESS_MESSAGE = 'Details created/updated successfully.';

// Always run this suite in a headed, maximized window (ignores HEADED / MAXIMIZE_BROWSER)
test.use({ headless: false, viewport: null, launchOptions: { args: ['--start-maximized'] } });

// ── Shared LIVE browser session + state (serial mode) ───────────────────────
// The app rejects deep links / storageState restore, so the tests share one
// logged-in page in-process (same pattern as future-reservation-availability.spec.ts).
let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

/** Handoff between the serial tests. */
interface MultiNightFlowState {
  roomType: string;
  stay: FutureStay;
  /** Availability of the room type per grid column (column 0 = business date) before booking. */
  baseline: number[];
  /** "Total Available" row before booking. */
  baselineTotal: number[];
  booking: FutureBookingResult | null;
  cancelled: boolean;
}
let state: MultiNightFlowState | null = null;

async function getSharedSession(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  if (!sharedContext || !sharedPage || sharedPage.isClosed()) {
    // viewport: null → the page takes the size of the maximized window
    sharedContext = await browser.newContext({ viewport: null });
    sharedPage = await sharedContext.newPage();
    logger.info('Created shared browser session for the serial multi-night reservation tests');
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
 * baseline + delta on each stay night and baseline on every other day (the departure day and later).
 */
async function verifyAvailability(multiNightPage: MultiNightReservationPage, stayNightDelta: number, label: string): Promise<void> {
  const s = state!;
  const grid = await multiNightPage.future.captureAvailability();
  const days = Math.min(s.baseline.length, grid.totalAvailable.length);

  const expectedRoom = s.baseline.slice(0, days).map((v, i) => (isStayNight(i, s.stay) ? v + stayNightDelta : v));
  const expectedTotal = s.baselineTotal.slice(0, days).map((v, i) => (isStayNight(i, s.stay) ? v + stayNightDelta : v));
  const actualRoom = roomTypeRow(grid, s.roomType).slice(0, days);
  const actualTotal = grid.totalAvailable.slice(0, days);

  logger.info('═══════════════════════════════════════════════');
  logger.info(
    `${label}: ${s.roomType}, stay ${s.stay.arrivalDate} → ${s.stay.departureDate} (${s.stay.nights} nights, ` +
      `business date ${grid.businessDate}, delta per night ${stayNightDelta >= 0 ? '+' : ''}${stayNightDelta})`
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
 * Create a reservation spanning multiple nights.
 *
 * MULTI_NIGHT_001  capture the baseline and choose a room type with headroom on every stay night
 * MULTI_NIGHT_002  book ROOMS_TO_BOOK room(s) from business date + ARRIVAL_OFFSET_DAYS for NIGHTS nights:
 *                  availability drops by ROOMS_TO_BOOK on every stay night and nowhere else
 * MULTI_NIGHT_003  the reservation shows the full stay: arrival, departure, NIGHTS nights, CONFIRMED
 * MULTI_NIGHT_004  cancel the reservation: availability is back to the baseline
 */
test.describe.serial('Availability - Reservation spanning multiple nights', () => {
  test.afterAll(async () => {
    // Hooks get the 30 s default timeout; a cleanup cancel takes longer
    test.setTimeout(10 * 60 * 1000);
    // Cleanup: if a run fails between booking and cancelling, don't leave the rooms blocked on QC
    if (sharedPage && !sharedPage.isClosed() && state?.booking && !state.cancelled) {
      logger.warn(`Cleanup: cancelling reservation ${state.booking.confirmationNo} left by a failed run`);
      await new MultiNightReservationPage(sharedPage, sharedContext!).reservations
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

  test('MULTI_NIGHT_001: Capture availability before the multi-night booking', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    const { context, page } = await getSharedSession(browser);
    const multiNightPage = new MultiNightReservationPage(page, context);

    const user = getUserByIndexFromExcel(1);
    const property = getPropertyByIndexFromExcel(3);
    expect(user).toBeDefined();
    expect(property).toBeDefined();

    await test.step('Step 1: Login with user + property from Excel', async () => {
      await new LoginPage(page, context).loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    await test.step('Step 2: Capture availability grid and choose a room type with headroom on every stay night', async () => {
      const grid = await multiNightPage.future.captureAvailability();
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

  test(`MULTI_NIGHT_002: Book ${ROOMS_TO_BOOK} room(s) for ${NIGHTS} nights and verify availability drops on every stay night`, async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state, 'MULTI_NIGHT_001 must run first').not.toBeNull();
    const { context, page } = await getSharedSession(browser);
    const multiNightPage = new MultiNightReservationPage(page, context);
    const s = state!;

    await test.step(`Step 1: Book ${ROOMS_TO_BOOK} × "${s.roomType}" from ${s.stay.arrivalDate} to ${s.stay.departureDate}`, async () => {
      s.booking = await multiNightPage.bookMultiNightStay(s.roomType, `MultiNight${Date.now()}`, ROOMS_TO_BOOK, s.stay);
      logger.info(`Reservation ${s.booking.confirmationNo} for guest ${s.booking.lastName}`);

      // The room selection page shows one column per stay night, with the same numbers as the grid
      const gridNights = s.baseline.slice(s.stay.offsetDays, s.stay.offsetDays + s.stay.nights);
      expect(s.booking.selectionPageAvailability, 'Room selection availability per night = grid baseline').toEqual(gridNights);
    });

    await test.step(`Step 2: Verify availability decreased by ${ROOMS_TO_BOOK} on each of the ${NIGHTS} nights and not on the departure day`, async () => {
      await verifyAvailability(multiNightPage, -ROOMS_TO_BOOK, 'MULTI_NIGHT_002 After booking');
    });

    await page.screenshot({ path: 'screenshots/MULTI_NIGHT_002.png', fullPage: true });
  });

  test(`MULTI_NIGHT_003: Reservation details show the full ${NIGHTS}-night stay`, async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    expect(state?.booking, 'MULTI_NIGHT_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const multiNightPage = new MultiNightReservationPage(page, context);
    const { stay, booking } = { stay: state!.stay, booking: state!.booking! };

    await test.step(`Step 1: Open reservation ${booking.confirmationNo} and verify every stay`, async () => {
      const stays = await multiNightPage.getStayDetails(booking.confirmationNo, booking.roomsBooked);
      expect(stays, 'One stay per booked room').toHaveLength(booking.roomsBooked);
      for (const s of stays) {
        expect.soft(s.arrivalDate, `Stay #${s.stayNo} arrival`).toBe(stay.arrivalDate);
        expect.soft(s.departureDate, `Stay #${s.stayNo} departure`).toBe(stay.departureDate);
        expect.soft(s.nights, `Stay #${s.stayNo} nights`).toBe(NIGHTS);
        expect.soft(s.status, `Stay #${s.stayNo} status`).toBe('CONFIRMED');
        expect.soft(s.reservationId, `Stay #${s.stayNo} reservation id`).toMatch(/^\d{12}$/);
      }
    });

    await page.screenshot({ path: 'screenshots/MULTI_NIGHT_003.png', fullPage: true });
  });

  test('MULTI_NIGHT_004: Cancel the multi-night reservation and verify availability is restored', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.booking, 'MULTI_NIGHT_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const multiNightPage = new MultiNightReservationPage(page, context);
    const booking = state!.booking!;

    await test.step(`Step 1: Cancel every stay of reservation ${booking.confirmationNo}`, async () => {
      const result = await multiNightPage.reservations.cancelReservation(booking.confirmationNo, booking.roomsBooked);
      state!.cancelled = result.statuses.every(s => s.status === 'CANCELLED');

      expect(result.staysCancelled).toBe(booking.roomsBooked);
      for (const message of result.messages) expect(message).toBe(SUCCESS_MESSAGE);
      expect(result.statuses.map(s => s.status)).toEqual(Array(booking.roomsBooked).fill('CANCELLED'));
    });

    await test.step('Step 2: Verify availability is back to the baseline on every night', async () => {
      await verifyAvailability(multiNightPage, 0, 'MULTI_NIGHT_004 After cancellation');
    });

    await page.screenshot({ path: 'screenshots/MULTI_NIGHT_004.png', fullPage: true });
  });
});
