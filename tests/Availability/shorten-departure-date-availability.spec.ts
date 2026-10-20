import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { addDaysToDate, buildFutureStay, FutureBookingResult } from '../../src/pages/Availability/FutureReservationAvailabilityPage';
import { ShortenDepartureDatePage } from '../../src/pages/Availability/ShortenDepartureDatePage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

/** Arrival = business date + 1 throughout (grid column 1). */
const ARRIVAL_OFFSET = 1;
/** Original departure = business date + 5: a 4-night stay (columns 1–4). */
const ORIGINAL_DEPARTURE_OFFSET = 5;
/** Shortened departure = business date + 3: a 2-night stay (columns 1–2); columns 3–4 are released. */
const SHORTENED_DEPARTURE_OFFSET = 3;
/** Grid columns logged in the before/expected/actual table (business date … day after the original departure). */
const LOGGED_DAYS = ORIGINAL_DEPARTURE_OFFSET + 2;
const ROOMS_TO_BOOK = 1; // the stay is edited on a single-stay reservation
const SUCCESS_MESSAGE = 'Details created/updated successfully.';

// Always run this suite in a headed, maximized window (ignores HEADED / MAXIMIZE_BROWSER)
test.use({ headless: false, viewport: null, launchOptions: { args: ['--start-maximized'] } });

// ── Shared LIVE browser session + state (serial mode) ───────────────────────
// The app rejects deep links / storageState restore, so the tests share one
// logged-in page in-process (same pattern as extend-departure-date-availability.spec.ts).
let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

/** Handoff between the serial tests. */
interface ShortenDepartureFlowState {
  roomType: string;
  businessDate: string;
  arrivalDate: string;
  /** Availability of the room type per grid column (column 0 = business date) before booking. */
  baseline: number[];
  /** "Total Available" row before booking. */
  baselineTotal: number[];
  booking: FutureBookingResult | null;
  cancelled: boolean;
}
let state: ShortenDepartureFlowState | null = null;

async function getSharedSession(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  if (!sharedContext || !sharedPage || sharedPage.isClosed()) {
    // viewport: null → the page takes the size of the maximized window
    sharedContext = await browser.newContext({ viewport: null });
    sharedPage = await sharedContext.newPage();
    logger.info('Created shared browser session for the serial shorten-departure-date tests');
  }
  return { context: sharedContext, page: sharedPage };
}

/** True when grid column `i` is a night of a stay leaving at column `departureOffset` (null = no stay). */
function isNight(i: number, departureOffset: number | null): boolean {
  return departureOffset !== null && i >= ARRIVAL_OFFSET && i < departureOffset;
}

/**
 * Re-capture the grid and assert, per day, the room type and Total Available rows equal baseline − ROOMS_TO_BOOK on the
 * nights of a stay from ARRIVAL_OFFSET to `departureOffset` (null = cancelled) and baseline on every other day.
 */
async function verifyAvailability(shortenPage: ShortenDepartureDatePage, departureOffset: number | null, label: string): Promise<void> {
  const s = state!;
  const grid = await shortenPage.future.captureAvailability();
  const row = grid.roomTypes.find(r => r.roomType === s.roomType);
  expect(row, `Room type "${s.roomType}" should be present in the availability grid`).toBeDefined();
  const days = Math.min(s.baseline.length, grid.totalAvailable.length);

  const expectedRoom = s.baseline.slice(0, days).map((v, i) => (isNight(i, departureOffset) ? v - ROOMS_TO_BOOK : v));
  const expectedTotal = s.baselineTotal.slice(0, days).map((v, i) => (isNight(i, departureOffset) ? v - ROOMS_TO_BOOK : v));
  const actualRoom = row!.availableRooms.slice(0, days);
  const actualTotal = grid.totalAvailable.slice(0, days);

  const stayText = departureOffset === null ? 'no stay' : `stay ${s.arrivalDate} → ${addDaysToDate(s.businessDate, departureOffset)}`;
  logger.info('═══════════════════════════════════════════════');
  logger.info(`${label}: ${s.roomType}, ${stayText} (business date ${grid.businessDate})`);
  for (let i = 0; i < Math.min(days, LOGGED_DAYS); i++) {
    logger.info(
      `  day ${i} (${grid.headerDays[i]})${isNight(i, departureOffset) ? ' [night]' : '        '}: ` +
        `${s.roomType} base ${s.baseline[i]} → expected ${expectedRoom[i]}, actual ${actualRoom[i]} | ` +
        `Total Available base ${s.baselineTotal[i]} → expected ${expectedTotal[i]}, actual ${actualTotal[i]}`
    );
  }
  logger.info('═══════════════════════════════════════════════');

  expect(actualRoom, `${s.roomType} availability per day`).toEqual(expectedRoom);
  expect(actualTotal, 'Total Available per day').toEqual(expectedTotal);
}

/**
 * Reservation Details must show the stay from the (unchanged) arrival to `departureOffset`, CONFIRMED, and a room charge
 * of agreed rate × nights in the Bill Summary.
 */
async function verifyStayAndCharge(shortenPage: ShortenDepartureDatePage, departureOffset: number): Promise<void> {
  const s = state!;
  const nights = departureOffset - ARRIVAL_OFFSET;
  const [stay] = await shortenPage.stayDetails.getStayDetails(s.booking!.confirmationNo, ROOMS_TO_BOOK);
  expect.soft(stay.arrivalDate, 'Arrival (unchanged)').toBe(s.arrivalDate);
  expect.soft(stay.departureDate, 'Departure').toBe(addDaysToDate(s.businessDate, departureOffset));
  expect.soft(stay.nights, 'Nights').toBe(nights);
  expect.soft(stay.status, 'Status').toBe('CONFIRMED');

  const charge = await shortenPage.getRoomCharge(s.roomType);
  logger.info(`Room charge ${charge} = agreed rate ${stay.agreedRate} × ${nights} night(s)?`);
  expect.soft(charge, `Bill Summary room charge = agreed rate × ${nights} nights`).toBeCloseTo(stay.agreedRate * nights, 2);
}

/**
 * Shorten the departure date of a reservation.
 *
 * SHORT_DEP_001  capture the baseline and choose a room type with headroom on every night of the original stay
 * SHORT_DEP_002  book 1 room BD+1 → BD+5 (4 nights): availability −1 on those nights, charge = rate × 4
 * SHORT_DEP_003  shorten the departure to BD+3: the 2 released nights (BD+3, BD+4) are back to the baseline, the
 *                remaining nights (BD+1, BD+2) stay −1, 2 nights, charge = rate × 2
 * SHORT_DEP_004  cancel the reservation: availability is back to the baseline
 */
test.describe.serial('Availability - Shorten the departure date of a reservation', () => {
  test.afterAll(async () => {
    // Hooks get the 30 s default timeout; a cleanup cancel takes longer
    test.setTimeout(10 * 60 * 1000);
    // Cleanup: if a run fails between booking and cancelling, don't leave the room blocked on QC
    if (sharedPage && !sharedPage.isClosed() && state?.booking && !state.cancelled) {
      logger.warn(`Cleanup: cancelling reservation ${state.booking.confirmationNo} left by a failed run`);
      await new ShortenDepartureDatePage(sharedPage, sharedContext!).reservations
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

  test('SHORT_DEP_001: Capture availability before the booking', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    const { context, page } = await getSharedSession(browser);
    const shortenPage = new ShortenDepartureDatePage(page, context);

    const user = getUserByIndexFromExcel(1);
    const property = getPropertyByIndexFromExcel(3);
    expect(user).toBeDefined();
    expect(property).toBeDefined();

    await test.step('Step 1: Login with user + property from Excel', async () => {
      await new LoginPage(page, context).loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    await test.step('Step 2: Capture availability grid and choose a room type with headroom on every night of the original stay', async () => {
      const grid = await shortenPage.future.captureAvailability();
      expect(grid.totalAvailable.length, 'Grid must cover the original departure day').toBeGreaterThan(ORIGINAL_DEPARTURE_OFFSET);
      expect(grid.headerDays[0], 'Grid column 0 should be the business date').toBe(Number(grid.businessDate.split('/')[0]));

      const nightColumns = Array.from({ length: ORIGINAL_DEPARTURE_OFFSET - ARRIVAL_OFFSET }, (_, n) => ARRIVAL_OFFSET + n);
      const candidate = grid.roomTypes.find(r => nightColumns.every(c => r.availableRooms[c] >= ROOMS_TO_BOOK + 2));
      expect(candidate, `A room type with at least ${ROOMS_TO_BOOK + 2} rooms available on days ${nightColumns.join(', ')}`).toBeDefined();

      state = {
        roomType: candidate!.roomType,
        businessDate: grid.businessDate,
        arrivalDate: addDaysToDate(grid.businessDate, ARRIVAL_OFFSET),
        baseline: [...candidate!.availableRooms],
        baselineTotal: [...grid.totalAvailable],
        booking: null,
        cancelled: false,
      };
      logger.info(
        `Business date ${grid.businessDate}; "${state.roomType}" days ${nightColumns.join(', ')}: ` +
          nightColumns.map(c => state!.baseline[c]).join(', ')
      );
    });
  });

  test('SHORT_DEP_002: Book a 4-night stay and verify availability and room charge', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state, 'SHORT_DEP_001 must run first').not.toBeNull();
    const { context, page } = await getSharedSession(browser);
    const shortenPage = new ShortenDepartureDatePage(page, context);
    const s = state!;
    const stay = buildFutureStay(s.businessDate, ARRIVAL_OFFSET, ORIGINAL_DEPARTURE_OFFSET - ARRIVAL_OFFSET);

    await test.step(`Step 1: Book 1 × "${s.roomType}" from ${stay.arrivalDate} to ${stay.departureDate}`, async () => {
      s.booking = await shortenPage.future.bookFutureRooms(s.roomType, `ShortDep${Date.now()}`, ROOMS_TO_BOOK, stay);
      logger.info(`Reservation ${s.booking.confirmationNo} for guest ${s.booking.lastName}`);
    });

    await test.step('Step 2: Verify availability decreased on every night of the stay', async () => {
      await verifyAvailability(shortenPage, ORIGINAL_DEPARTURE_OFFSET, 'SHORT_DEP_002 After booking');
    });

    await test.step(`Step 3: Verify the reservation shows ${ORIGINAL_DEPARTURE_OFFSET - ARRIVAL_OFFSET} nights and the matching room charge`, async () => {
      await verifyStayAndCharge(shortenPage, ORIGINAL_DEPARTURE_OFFSET);
    });

    await page.screenshot({ path: 'screenshots/SHORT_DEP_002.png', fullPage: true });
  });

  test('SHORT_DEP_003: Shorten the departure date and verify the released nights are available again', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.booking, 'SHORT_DEP_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const shortenPage = new ShortenDepartureDatePage(page, context);
    const newDeparture = addDaysToDate(state!.businessDate, SHORTENED_DEPARTURE_OFFSET);

    await test.step(`Step 1: Shorten the departure to ${newDeparture} (arrival stays ${state!.arrivalDate})`, async () => {
      const message = await shortenPage.shortenDepartureDate(state!.booking!.confirmationNo, newDeparture);
      expect(message).toBe(SUCCESS_MESSAGE);
    });

    await test.step(`Step 2: Verify the reservation shows ${state!.arrivalDate} → ${newDeparture}, ${SHORTENED_DEPARTURE_OFFSET - ARRIVAL_OFFSET} nights, and the room charge dropped`, async () => {
      await verifyStayAndCharge(shortenPage, SHORTENED_DEPARTURE_OFFSET);
    });

    await test.step('Step 3: Verify the released nights are back to the baseline and the remaining nights are still taken', async () => {
      await verifyAvailability(shortenPage, SHORTENED_DEPARTURE_OFFSET, 'SHORT_DEP_003 After shortening the departure');
    });

    await page.screenshot({ path: 'screenshots/SHORT_DEP_003.png', fullPage: true });
  });

  test('SHORT_DEP_004: Cancel the reservation and verify availability is restored', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.booking, 'SHORT_DEP_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const shortenPage = new ShortenDepartureDatePage(page, context);
    const booking = state!.booking!;

    await test.step(`Step 1: Cancel reservation ${booking.confirmationNo}`, async () => {
      const result = await shortenPage.reservations.cancelReservation(booking.confirmationNo, ROOMS_TO_BOOK);
      state!.cancelled = result.statuses.every(s => s.status === 'CANCELLED');

      expect(result.staysCancelled).toBe(ROOMS_TO_BOOK);
      for (const message of result.messages) expect(message).toBe(SUCCESS_MESSAGE);
      expect(result.statuses.map(s => s.status)).toEqual(Array(ROOMS_TO_BOOK).fill('CANCELLED'));
    });

    await test.step('Step 2: Verify availability is back to the baseline', async () => {
      await verifyAvailability(shortenPage, null, 'SHORT_DEP_004 After cancellation');
    });

    await page.screenshot({ path: 'screenshots/SHORT_DEP_004.png', fullPage: true });
  });
});
