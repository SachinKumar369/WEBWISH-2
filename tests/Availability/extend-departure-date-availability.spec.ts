import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { addDaysToDate, buildFutureStay, FutureBookingResult } from '../../src/pages/Availability/FutureReservationAvailabilityPage';
import { ExtendDepartureDatePage } from '../../src/pages/Availability/ExtendDepartureDatePage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

/** Arrival = business date + 1 throughout (grid column 1). */
const ARRIVAL_OFFSET = 1;
/** Original departure = business date + 2: a 1-night stay (column 1). */
const ORIGINAL_DEPARTURE_OFFSET = 2;
/** Extended departure = business date + 4: a 3-night stay (columns 1–3); columns 2–3 are the added nights. */
const EXTENDED_DEPARTURE_OFFSET = 4;
/** Grid columns logged in the before/expected/actual table (business date … day after the extended departure). */
const LOGGED_DAYS = EXTENDED_DEPARTURE_OFFSET + 2;
const ROOMS_TO_BOOK = 1; // the stay is edited on a single-stay reservation
const SUCCESS_MESSAGE = 'Details created/updated successfully.';

// Always run this suite in a headed, maximized window (ignores HEADED / MAXIMIZE_BROWSER)
test.use({ headless: false, viewport: null, launchOptions: { args: ['--start-maximized'] } });

// ── Shared LIVE browser session + state (serial mode) ───────────────────────
// The app rejects deep links / storageState restore, so the tests share one
// logged-in page in-process (same pattern as change-arrival-date-availability.spec.ts).
let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

/** Handoff between the serial tests. */
interface ExtendDepartureFlowState {
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
let state: ExtendDepartureFlowState | null = null;

async function getSharedSession(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  if (!sharedContext || !sharedPage || sharedPage.isClosed()) {
    // viewport: null → the page takes the size of the maximized window
    sharedContext = await browser.newContext({ viewport: null });
    sharedPage = await sharedContext.newPage();
    logger.info('Created shared browser session for the serial extend-departure-date tests');
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
async function verifyAvailability(extendPage: ExtendDepartureDatePage, departureOffset: number | null, label: string): Promise<void> {
  const s = state!;
  const grid = await extendPage.future.captureAvailability();
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
async function verifyStayAndCharge(extendPage: ExtendDepartureDatePage, departureOffset: number): Promise<void> {
  const s = state!;
  const nights = departureOffset - ARRIVAL_OFFSET;
  const [stay] = await extendPage.stayDetails.getStayDetails(s.booking!.confirmationNo, ROOMS_TO_BOOK);
  expect.soft(stay.arrivalDate, 'Arrival (unchanged)').toBe(s.arrivalDate);
  expect.soft(stay.departureDate, 'Departure').toBe(addDaysToDate(s.businessDate, departureOffset));
  expect.soft(stay.nights, 'Nights').toBe(nights);
  expect.soft(stay.status, 'Status').toBe('CONFIRMED');

  const charge = await extendPage.getRoomCharge(s.roomType);
  logger.info(`Room charge ${charge} = agreed rate ${stay.agreedRate} × ${nights} night(s)?`);
  expect.soft(charge, `Bill Summary room charge = agreed rate × ${nights} nights`).toBeCloseTo(stay.agreedRate * nights, 2);
}

/**
 * Extend the departure date of a reservation.
 *
 * EXT_DEP_001  capture the baseline and choose a room type with headroom on every night of the extended stay
 * EXT_DEP_002  book 1 room BD+1 → BD+2 (1 night): availability −1 on that night, charge = rate × 1
 * EXT_DEP_003  extend the departure to BD+4: the 2 added nights drop by 1, the new departure day doesn't, 3 nights,
 *              charge = rate × 3
 * EXT_DEP_004  cancel the reservation: availability is back to the baseline
 */
test.describe.serial('Availability - Extend the departure date of a reservation', () => {
  test.afterAll(async () => {
    // Hooks get the 30 s default timeout; a cleanup cancel takes longer
    test.setTimeout(10 * 60 * 1000);
    // Cleanup: if a run fails between booking and cancelling, don't leave the room blocked on QC
    if (sharedPage && !sharedPage.isClosed() && state?.booking && !state.cancelled) {
      logger.warn(`Cleanup: cancelling reservation ${state.booking.confirmationNo} left by a failed run`);
      await new ExtendDepartureDatePage(sharedPage, sharedContext!).reservations
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

  test('EXT_DEP_001: Capture availability before the booking', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    const { context, page } = await getSharedSession(browser);
    const extendPage = new ExtendDepartureDatePage(page, context);

    const user = getUserByIndexFromExcel(1);
    const property = getPropertyByIndexFromExcel(3);
    expect(user).toBeDefined();
    expect(property).toBeDefined();

    await test.step('Step 1: Login with user + property from Excel', async () => {
      await new LoginPage(page, context).loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    await test.step('Step 2: Capture availability grid and choose a room type with headroom on every night of the extended stay', async () => {
      const grid = await extendPage.future.captureAvailability();
      expect(grid.totalAvailable.length, 'Grid must cover the extended departure day').toBeGreaterThan(EXTENDED_DEPARTURE_OFFSET);
      expect(grid.headerDays[0], 'Grid column 0 should be the business date').toBe(Number(grid.businessDate.split('/')[0]));

      const nightColumns = Array.from({ length: EXTENDED_DEPARTURE_OFFSET - ARRIVAL_OFFSET }, (_, n) => ARRIVAL_OFFSET + n);
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

  test('EXT_DEP_002: Book a 1-night stay and verify availability and room charge', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state, 'EXT_DEP_001 must run first').not.toBeNull();
    const { context, page } = await getSharedSession(browser);
    const extendPage = new ExtendDepartureDatePage(page, context);
    const s = state!;
    const stay = buildFutureStay(s.businessDate, ARRIVAL_OFFSET, ORIGINAL_DEPARTURE_OFFSET - ARRIVAL_OFFSET);

    await test.step(`Step 1: Book 1 × "${s.roomType}" from ${stay.arrivalDate} to ${stay.departureDate}`, async () => {
      s.booking = await extendPage.future.bookFutureRooms(s.roomType, `ExtDep${Date.now()}`, ROOMS_TO_BOOK, stay);
      logger.info(`Reservation ${s.booking.confirmationNo} for guest ${s.booking.lastName}`);
    });

    await test.step('Step 2: Verify availability decreased on the single night only', async () => {
      await verifyAvailability(extendPage, ORIGINAL_DEPARTURE_OFFSET, 'EXT_DEP_002 After booking');
    });

    await test.step('Step 3: Verify the reservation shows 1 night and a 1-night room charge', async () => {
      await verifyStayAndCharge(extendPage, ORIGINAL_DEPARTURE_OFFSET);
    });

    await page.screenshot({ path: 'screenshots/EXT_DEP_002.png', fullPage: true });
  });

  test('EXT_DEP_003: Extend the departure date and verify the added nights are taken', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.booking, 'EXT_DEP_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const extendPage = new ExtendDepartureDatePage(page, context);
    const newDeparture = addDaysToDate(state!.businessDate, EXTENDED_DEPARTURE_OFFSET);

    await test.step(`Step 1: Extend the departure to ${newDeparture} (arrival stays ${state!.arrivalDate})`, async () => {
      const message = await extendPage.extendDepartureDate(state!.booking!.confirmationNo, newDeparture);
      expect(message).toBe(SUCCESS_MESSAGE);
    });

    await test.step(`Step 2: Verify the reservation shows ${state!.arrivalDate} → ${newDeparture}, ${EXTENDED_DEPARTURE_OFFSET - ARRIVAL_OFFSET} nights, and the room charge grew`, async () => {
      await verifyStayAndCharge(extendPage, EXTENDED_DEPARTURE_OFFSET);
    });

    await test.step('Step 3: Verify the added nights decreased and the new departure day did not', async () => {
      await verifyAvailability(extendPage, EXTENDED_DEPARTURE_OFFSET, 'EXT_DEP_003 After extending the departure');
    });

    await page.screenshot({ path: 'screenshots/EXT_DEP_003.png', fullPage: true });
  });

  test('EXT_DEP_004: Cancel the reservation and verify availability is restored', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.booking, 'EXT_DEP_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const extendPage = new ExtendDepartureDatePage(page, context);
    const booking = state!.booking!;

    await test.step(`Step 1: Cancel reservation ${booking.confirmationNo}`, async () => {
      const result = await extendPage.reservations.cancelReservation(booking.confirmationNo, ROOMS_TO_BOOK);
      state!.cancelled = result.statuses.every(s => s.status === 'CANCELLED');

      expect(result.staysCancelled).toBe(ROOMS_TO_BOOK);
      for (const message of result.messages) expect(message).toBe(SUCCESS_MESSAGE);
      expect(result.statuses.map(s => s.status)).toEqual(Array(ROOMS_TO_BOOK).fill('CANCELLED'));
    });

    await test.step('Step 2: Verify availability is back to the baseline', async () => {
      await verifyAvailability(extendPage, null, 'EXT_DEP_004 After cancellation');
    });

    await page.screenshot({ path: 'screenshots/EXT_DEP_004.png', fullPage: true });
  });
});
