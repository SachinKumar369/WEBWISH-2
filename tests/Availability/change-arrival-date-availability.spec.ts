import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { addDaysToDate, buildFutureStay, FutureBookingResult } from '../../src/pages/Availability/FutureReservationAvailabilityPage';
import { ChangeArrivalDatePage } from '../../src/pages/Availability/ChangeArrivalDatePage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

/** Original stay: arrival business date + 1, departure business date + 4 (3 nights, grid columns 1–3). */
const ORIGINAL_ARRIVAL_OFFSET = 1;
const DEPARTURE_OFFSET = 4;
/** Arrival postponed one day: the first night (column 1) is released, 2 nights remain (columns 2–3). */
const LATER_ARRIVAL_OFFSET = 2;
/** Arrival brought forward to the business date: 4 nights (columns 0–3). */
const EARLIER_ARRIVAL_OFFSET = 0;
/** Grid columns logged in the before/expected/actual table (business date … day after departure). */
const LOGGED_DAYS = DEPARTURE_OFFSET + 2;
const ROOMS_TO_BOOK = 1; // changing the arrival is done on a single-stay reservation
const SUCCESS_MESSAGE = 'Details created/updated successfully.';

// Always run this suite in a headed, maximized window (ignores HEADED / MAXIMIZE_BROWSER)
test.use({ headless: false, viewport: null, launchOptions: { args: ['--start-maximized'] } });

// ── Shared LIVE browser session + state (serial mode) ───────────────────────
// The app rejects deep links / storageState restore, so the tests share one
// logged-in page in-process (same pattern as multi-night-reservation-availability.spec.ts).
let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

/** Handoff between the serial tests. */
interface ChangeArrivalFlowState {
  roomType: string;
  businessDate: string;
  departureDate: string;
  /** Availability of the room type per grid column (column 0 = business date) before booking. */
  baseline: number[];
  /** "Total Available" row before booking. */
  baselineTotal: number[];
  booking: FutureBookingResult | null;
  cancelled: boolean;
}
let state: ChangeArrivalFlowState | null = null;

async function getSharedSession(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  if (!sharedContext || !sharedPage || sharedPage.isClosed()) {
    // viewport: null → the page takes the size of the maximized window
    sharedContext = await browser.newContext({ viewport: null });
    sharedPage = await sharedContext.newPage();
    logger.info('Created shared browser session for the serial change-arrival-date tests');
  }
  return { context: sharedContext, page: sharedPage };
}

/** True when grid column `i` is a night of a stay arriving at column `arrivalOffset` (the departure day is not a night). */
function isNight(i: number, arrivalOffset: number | null): boolean {
  return arrivalOffset !== null && i >= arrivalOffset && i < DEPARTURE_OFFSET;
}

/**
 * Re-capture the grid and assert, per day, the room type and Total Available rows equal baseline − ROOMS_TO_BOOK
 * on the nights of a stay arriving at `arrivalOffset` (null = no stay, i.e. cancelled) and baseline on every other day.
 */
async function verifyAvailability(arrivalPage: ChangeArrivalDatePage, arrivalOffset: number | null, label: string): Promise<void> {
  const s = state!;
  const grid = await arrivalPage.future.captureAvailability();
  const row = grid.roomTypes.find(r => r.roomType === s.roomType);
  expect(row, `Room type "${s.roomType}" should be present in the availability grid`).toBeDefined();
  const days = Math.min(s.baseline.length, grid.totalAvailable.length);

  const expectedRoom = s.baseline.slice(0, days).map((v, i) => (isNight(i, arrivalOffset) ? v - ROOMS_TO_BOOK : v));
  const expectedTotal = s.baselineTotal.slice(0, days).map((v, i) => (isNight(i, arrivalOffset) ? v - ROOMS_TO_BOOK : v));
  const actualRoom = row!.availableRooms.slice(0, days);
  const actualTotal = grid.totalAvailable.slice(0, days);

  const stayText = arrivalOffset === null ? 'no stay' : `stay ${addDaysToDate(s.businessDate, arrivalOffset)} → ${s.departureDate}`;
  logger.info('═══════════════════════════════════════════════');
  logger.info(`${label}: ${s.roomType}, ${stayText} (business date ${grid.businessDate})`);
  for (let i = 0; i < Math.min(days, LOGGED_DAYS); i++) {
    logger.info(
      `  day ${i} (${grid.headerDays[i]})${isNight(i, arrivalOffset) ? ' [night]' : '        '}: ` +
        `${s.roomType} base ${s.baseline[i]} → expected ${expectedRoom[i]}, actual ${actualRoom[i]} | ` +
        `Total Available base ${s.baselineTotal[i]} → expected ${expectedTotal[i]}, actual ${actualTotal[i]}`
    );
  }
  logger.info('═══════════════════════════════════════════════');

  expect(actualRoom, `${s.roomType} availability per day`).toEqual(expectedRoom);
  expect(actualTotal, 'Total Available per day').toEqual(expectedTotal);
}

/** Reservation Details must show the stay arriving at `arrivalOffset` and leaving on the (unchanged) departure date. */
async function verifyStay(arrivalPage: ChangeArrivalDatePage, arrivalOffset: number): Promise<void> {
  const s = state!;
  const [stay] = await arrivalPage.stayDetails.getStayDetails(s.booking!.confirmationNo, ROOMS_TO_BOOK);
  expect.soft(stay.arrivalDate, 'Arrival').toBe(addDaysToDate(s.businessDate, arrivalOffset));
  expect.soft(stay.departureDate, 'Departure (unchanged)').toBe(s.departureDate);
  expect.soft(stay.nights, 'Nights').toBe(DEPARTURE_OFFSET - arrivalOffset);
  expect.soft(stay.status, 'Status').toBe('CONFIRMED');
}

/**
 * Change the arrival date of a reservation.
 *
 * CHG_ARR_001  capture the baseline and choose a room type with headroom on every day the stay can cover
 * CHG_ARR_002  book 1 room BD+1 → BD+4 (3 nights): availability −1 on those nights
 * CHG_ARR_003  postpone the arrival to BD+2 (departure unchanged): the released night (BD+1) is back, 2 nights remain
 * CHG_ARR_004  bring the arrival forward to BD (before the original arrival): 4 nights are taken
 * CHG_ARR_005  cancel the reservation: availability is back to the baseline
 */
test.describe.serial('Availability - Change the arrival date of a reservation', () => {
  test.afterAll(async () => {
    // Hooks get the 30 s default timeout; a cleanup cancel takes longer
    test.setTimeout(10 * 60 * 1000);
    // Cleanup: if a run fails between booking and cancelling, don't leave the room blocked on QC
    if (sharedPage && !sharedPage.isClosed() && state?.booking && !state.cancelled) {
      logger.warn(`Cleanup: cancelling reservation ${state.booking.confirmationNo} left by a failed run`);
      await new ChangeArrivalDatePage(sharedPage, sharedContext!).reservations
        .cancelReservation(state.booking.confirmationNo, ROOMS_TO_BOOK)
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

  test('CHG_ARR_001: Capture availability before the booking', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    const { context, page } = await getSharedSession(browser);
    const arrivalPage = new ChangeArrivalDatePage(page, context);

    const user = getUserByIndexFromExcel(1);
    const property = getPropertyByIndexFromExcel(3);
    expect(user).toBeDefined();
    expect(property).toBeDefined();

    await test.step('Step 1: Login with user + property from Excel', async () => {
      await new LoginPage(page, context).loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    await test.step('Step 2: Capture availability grid and choose a room type with headroom on every day the stay can cover', async () => {
      const grid = await arrivalPage.future.captureAvailability();
      expect(grid.totalAvailable.length, 'Grid must cover the departure day').toBeGreaterThan(DEPARTURE_OFFSET);
      expect(grid.headerDays[0], 'Grid column 0 should be the business date').toBe(Number(grid.businessDate.split('/')[0]));

      // The stay covers columns 0..DEPARTURE_OFFSET-1 at most (after the arrival is brought forward)
      const columns = Array.from({ length: DEPARTURE_OFFSET }, (_, c) => c);
      const candidate = grid.roomTypes.find(r => columns.every(c => r.availableRooms[c] >= ROOMS_TO_BOOK + 2));
      expect(candidate, `A room type with at least ${ROOMS_TO_BOOK + 2} rooms available on days 0–${DEPARTURE_OFFSET - 1}`).toBeDefined();

      state = {
        roomType: candidate!.roomType,
        businessDate: grid.businessDate,
        departureDate: addDaysToDate(grid.businessDate, DEPARTURE_OFFSET),
        baseline: [...candidate!.availableRooms],
        baselineTotal: [...grid.totalAvailable],
        booking: null,
        cancelled: false,
      };
      logger.info(
        `Business date ${grid.businessDate}; "${state.roomType}" days 0–${DEPARTURE_OFFSET - 1}: ` +
          columns.map(c => state!.baseline[c]).join(', ')
      );
    });
  });

  test('CHG_ARR_002: Book a 3-night stay and verify availability drops on those nights', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state, 'CHG_ARR_001 must run first').not.toBeNull();
    const { context, page } = await getSharedSession(browser);
    const arrivalPage = new ChangeArrivalDatePage(page, context);
    const s = state!;
    const stay = buildFutureStay(s.businessDate, ORIGINAL_ARRIVAL_OFFSET, DEPARTURE_OFFSET - ORIGINAL_ARRIVAL_OFFSET);

    await test.step(`Step 1: Book 1 × "${s.roomType}" from ${stay.arrivalDate} to ${stay.departureDate}`, async () => {
      s.booking = await arrivalPage.future.bookFutureRooms(s.roomType, `ChgArr${Date.now()}`, ROOMS_TO_BOOK, stay);
      logger.info(`Reservation ${s.booking.confirmationNo} for guest ${s.booking.lastName}`);
    });

    await test.step('Step 2: Verify availability decreased on the 3 original nights only', async () => {
      await verifyAvailability(arrivalPage, ORIGINAL_ARRIVAL_OFFSET, 'CHG_ARR_002 After booking');
    });

    await page.screenshot({ path: 'screenshots/CHG_ARR_002.png', fullPage: true });
  });

  test('CHG_ARR_003: Postpone the arrival by one day and verify the released night is available again', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.booking, 'CHG_ARR_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const arrivalPage = new ChangeArrivalDatePage(page, context);
    const newArrival = addDaysToDate(state!.businessDate, LATER_ARRIVAL_OFFSET);

    await test.step(`Step 1: Change the arrival to ${newArrival} (departure stays ${state!.departureDate})`, async () => {
      const message = await arrivalPage.changeArrivalDate(state!.booking!.confirmationNo, newArrival);
      expect(message).toBe(SUCCESS_MESSAGE);
    });

    await test.step(`Step 2: Verify the reservation shows ${newArrival} → ${state!.departureDate}, ${DEPARTURE_OFFSET - LATER_ARRIVAL_OFFSET} nights`, async () => {
      await verifyStay(arrivalPage, LATER_ARRIVAL_OFFSET);
    });

    await test.step('Step 3: Verify the old first night is back to the baseline and the remaining nights stay reduced', async () => {
      await verifyAvailability(arrivalPage, LATER_ARRIVAL_OFFSET, 'CHG_ARR_003 After postponing the arrival');
    });

    await page.screenshot({ path: 'screenshots/CHG_ARR_003.png', fullPage: true });
  });

  test('CHG_ARR_004: Bring the arrival forward to the business date and verify the extra nights are taken', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.booking, 'CHG_ARR_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const arrivalPage = new ChangeArrivalDatePage(page, context);
    const newArrival = addDaysToDate(state!.businessDate, EARLIER_ARRIVAL_OFFSET);

    await test.step(`Step 1: Change the arrival to ${newArrival} (departure stays ${state!.departureDate})`, async () => {
      const message = await arrivalPage.changeArrivalDate(state!.booking!.confirmationNo, newArrival);
      expect(message).toBe(SUCCESS_MESSAGE);
    });

    await test.step(`Step 2: Verify the reservation shows ${newArrival} → ${state!.departureDate}, ${DEPARTURE_OFFSET - EARLIER_ARRIVAL_OFFSET} nights`, async () => {
      await verifyStay(arrivalPage, EARLIER_ARRIVAL_OFFSET);
    });

    await test.step('Step 3: Verify availability decreased on every night from the new arrival to the departure', async () => {
      await verifyAvailability(arrivalPage, EARLIER_ARRIVAL_OFFSET, 'CHG_ARR_004 After bringing the arrival forward');
    });

    await page.screenshot({ path: 'screenshots/CHG_ARR_004.png', fullPage: true });
  });

  test('CHG_ARR_005: Cancel the reservation and verify availability is restored', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.booking, 'CHG_ARR_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const arrivalPage = new ChangeArrivalDatePage(page, context);
    const booking = state!.booking!;

    await test.step(`Step 1: Cancel reservation ${booking.confirmationNo}`, async () => {
      const result = await arrivalPage.reservations.cancelReservation(booking.confirmationNo, ROOMS_TO_BOOK);
      state!.cancelled = result.statuses.every(s => s.status === 'CANCELLED');

      expect(result.staysCancelled).toBe(ROOMS_TO_BOOK);
      for (const message of result.messages) expect(message).toBe(SUCCESS_MESSAGE);
      expect(result.statuses.map(s => s.status)).toEqual(Array(ROOMS_TO_BOOK).fill('CANCELLED'));
    });

    await test.step('Step 2: Verify availability is back to the baseline', async () => {
      await verifyAvailability(arrivalPage, null, 'CHG_ARR_005 After cancellation');
    });

    await page.screenshot({ path: 'screenshots/CHG_ARR_005.png', fullPage: true });
  });
});
