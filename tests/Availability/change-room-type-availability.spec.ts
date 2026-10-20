import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { addDaysToDate, buildFutureStay, FutureBookingResult } from '../../src/pages/Availability/FutureReservationAvailabilityPage';
import { ChangeRoomTypePage, RoomTypeChangeResult } from '../../src/pages/Availability/ChangeRoomTypePage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

/** Arrival = business date + 1 (grid column 1). */
const ARRIVAL_OFFSET = 1;
/** Departure = business date + 3: a 2-night stay (columns 1–2). Dates never change in this suite. */
const DEPARTURE_OFFSET = 3;
const NIGHTS = DEPARTURE_OFFSET - ARRIVAL_OFFSET;
/** Grid columns logged in the before/expected/actual table (business date … day after the departure). */
const LOGGED_DAYS = DEPARTURE_OFFSET + 2;
const ROOMS_TO_BOOK = 1; // the room type is edited on a single-stay reservation
const SUCCESS_MESSAGE = 'Details created/updated successfully.';

// Always run this suite in a headed, maximized window (ignores HEADED / MAXIMIZE_BROWSER)
test.use({ headless: false, viewport: null, launchOptions: { args: ['--start-maximized'] } });

// ── Shared LIVE browser session + state (serial mode) ───────────────────────
// The app rejects deep links / storageState restore, so the tests share one
// logged-in page in-process (same pattern as extend-departure-date-availability.spec.ts).
let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

/** Which room type currently holds the booked room. */
type Holder = 'from' | 'to' | null;

/** Handoff between the serial tests. */
interface ChangeRoomTypeFlowState {
  /** Room type booked first (grid / dropdown NAME). */
  fromRoomType: string;
  /** Room type the stay is moved to. */
  toRoomType: string;
  businessDate: string;
  arrivalDate: string;
  departureDate: string;
  /** Availability per grid column (column 0 = business date) before booking. */
  baselineFrom: number[];
  baselineTo: number[];
  baselineTotal: number[];
  booking: FutureBookingResult | null;
  /** Agreed rate per night read after booking (must survive the room type change). */
  agreedRate: number | null;
  change: RoomTypeChangeResult | null;
  cancelled: boolean;
}
let state: ChangeRoomTypeFlowState | null = null;

async function getSharedSession(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  if (!sharedContext || !sharedPage || sharedPage.isClosed()) {
    // viewport: null → the page takes the size of the maximized window
    sharedContext = await browser.newContext({ viewport: null });
    sharedPage = await sharedContext.newPage();
    logger.info('Created shared browser session for the serial change-room-type tests');
  }
  return { context: sharedContext, page: sharedPage };
}

/** True when grid column `i` is a night of the stay. */
function isNight(i: number): boolean {
  return i >= ARRIVAL_OFFSET && i < DEPARTURE_OFFSET;
}

/**
 * Re-capture the grid and assert, per day, that BOTH room types and Total Available equal their baseline, minus
 * ROOMS_TO_BOOK on the stay nights for the room type that holds the booking (`holder`) and for Total Available
 * (unless nothing is booked).
 */
async function verifyAvailability(roomTypePage: ChangeRoomTypePage, holder: Holder, label: string): Promise<void> {
  const s = state!;
  const grid = await roomTypePage.future.captureAvailability();
  const fromRow = grid.roomTypes.find(r => r.roomType === s.fromRoomType);
  const toRow = grid.roomTypes.find(r => r.roomType === s.toRoomType);
  expect(fromRow, `Room type "${s.fromRoomType}" should be present in the availability grid`).toBeDefined();
  expect(toRow, `Room type "${s.toRoomType}" should be present in the availability grid`).toBeDefined();
  const days = Math.min(s.baselineTotal.length, grid.totalAvailable.length);

  const expectFor = (baseline: number[], holds: boolean) =>
    baseline.slice(0, days).map((v, i) => (holds && isNight(i) ? v - ROOMS_TO_BOOK : v));
  const expectedFrom = expectFor(s.baselineFrom, holder === 'from');
  const expectedTo = expectFor(s.baselineTo, holder === 'to');
  const expectedTotal = expectFor(s.baselineTotal, holder !== null);
  const actualFrom = fromRow!.availableRooms.slice(0, days);
  const actualTo = toRow!.availableRooms.slice(0, days);
  const actualTotal = grid.totalAvailable.slice(0, days);

  const holderText = holder === null ? 'no stay' : `stay ${s.arrivalDate} → ${s.departureDate} in ${holder === 'from' ? s.fromRoomType : s.toRoomType}`;
  logger.info('═══════════════════════════════════════════════');
  logger.info(`${label}: ${holderText} (business date ${grid.businessDate})`);
  for (let i = 0; i < Math.min(days, LOGGED_DAYS); i++) {
    logger.info(
      `  day ${i} (${grid.headerDays[i]})${isNight(i) ? ' [night]' : '        '}: ` +
        `${s.fromRoomType} base ${s.baselineFrom[i]} → expected ${expectedFrom[i]}, actual ${actualFrom[i]} | ` +
        `${s.toRoomType} base ${s.baselineTo[i]} → expected ${expectedTo[i]}, actual ${actualTo[i]} | ` +
        `Total Available base ${s.baselineTotal[i]} → expected ${expectedTotal[i]}, actual ${actualTotal[i]}`
    );
  }
  logger.info('═══════════════════════════════════════════════');

  expect(actualFrom, `${s.fromRoomType} (original room type) availability per day`).toEqual(expectedFrom);
  expect(actualTo, `${s.toRoomType} (new room type) availability per day`).toEqual(expectedTo);
  expect(actualTotal, 'Total Available per day').toEqual(expectedTotal);
}

/**
 * Change the room type of a reservation.
 *
 * CHG_RT_001  capture the baseline and choose two room types with headroom on both stay nights
 * CHG_RT_002  book 1 room of the first type BD+1 → BD+3: first type −1 on the 2 nights, second type unchanged,
 *             Bill Summary shows the first type, charge = rate × 2
 * CHG_RT_003  change the room type to the second type: first type back to baseline, second type −1 on the 2 nights,
 *             Total Available unchanged; stay card shows the new code, dates/nights/agreed rate unchanged,
 *             Bill Summary shows only the second type
 * CHG_RT_004  cancel the reservation: both room types are back to the baseline
 */
test.describe.serial('Availability - Change the room type of a reservation', () => {
  test.afterAll(async () => {
    // Hooks get the 30 s default timeout; a cleanup cancel takes longer
    test.setTimeout(10 * 60 * 1000);
    // Cleanup: if a run fails between booking and cancelling, don't leave the room blocked on QC
    if (sharedPage && !sharedPage.isClosed() && state?.booking && !state.cancelled) {
      logger.warn(`Cleanup: cancelling reservation ${state.booking.confirmationNo} left by a failed run`);
      await new ChangeRoomTypePage(sharedPage, sharedContext!).reservations
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

  test('CHG_RT_001: Capture availability of both room types before the booking', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    const { context, page } = await getSharedSession(browser);
    const roomTypePage = new ChangeRoomTypePage(page, context);

    const user = getUserByIndexFromExcel(1);
    const property = getPropertyByIndexFromExcel(3);
    expect(user).toBeDefined();
    expect(property).toBeDefined();

    await test.step('Step 1: Login with user + property from Excel', async () => {
      await new LoginPage(page, context).loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    await test.step('Step 2: Capture availability grid and choose two room types with headroom on both stay nights', async () => {
      const grid = await roomTypePage.future.captureAvailability();
      expect(grid.totalAvailable.length, 'Grid must cover the departure day').toBeGreaterThan(DEPARTURE_OFFSET);
      expect(grid.headerDays[0], 'Grid column 0 should be the business date').toBe(Number(grid.businessDate.split('/')[0]));

      const nightColumns = Array.from({ length: NIGHTS }, (_, n) => ARRIVAL_OFFSET + n);
      const candidates = grid.roomTypes.filter(r => nightColumns.every(c => r.availableRooms[c] >= ROOMS_TO_BOOK + 2));
      expect(candidates.length, `Two room types with at least ${ROOMS_TO_BOOK + 2} rooms available on days ${nightColumns.join(', ')}`).toBeGreaterThanOrEqual(2);
      const [from, to] = candidates;

      state = {
        fromRoomType: from.roomType,
        toRoomType: to.roomType,
        businessDate: grid.businessDate,
        arrivalDate: addDaysToDate(grid.businessDate, ARRIVAL_OFFSET),
        departureDate: addDaysToDate(grid.businessDate, DEPARTURE_OFFSET),
        baselineFrom: [...from.availableRooms],
        baselineTo: [...to.availableRooms],
        baselineTotal: [...grid.totalAvailable],
        booking: null,
        agreedRate: null,
        change: null,
        cancelled: false,
      };
      logger.info(
        `Business date ${grid.businessDate}; days ${nightColumns.join(', ')}: ` +
          `"${from.roomType}" ${nightColumns.map(c => from.availableRooms[c]).join(', ')}, ` +
          `"${to.roomType}" ${nightColumns.map(c => to.availableRooms[c]).join(', ')}`
      );
    });
  });

  test('CHG_RT_002: Book the first room type and verify availability of both room types', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state, 'CHG_RT_001 must run first').not.toBeNull();
    const { context, page } = await getSharedSession(browser);
    const roomTypePage = new ChangeRoomTypePage(page, context);
    const s = state!;
    const stay = buildFutureStay(s.businessDate, ARRIVAL_OFFSET, NIGHTS);

    await test.step(`Step 1: Book 1 × "${s.fromRoomType}" from ${stay.arrivalDate} to ${stay.departureDate}`, async () => {
      s.booking = await roomTypePage.future.bookFutureRooms(s.fromRoomType, `ChgRt${Date.now()}`, ROOMS_TO_BOOK, stay);
      logger.info(`Reservation ${s.booking.confirmationNo} for guest ${s.booking.lastName}`);
    });

    await test.step(`Step 2: Verify "${s.fromRoomType}" decreased on the stay nights and "${s.toRoomType}" did not change`, async () => {
      await verifyAvailability(roomTypePage, 'from', 'CHG_RT_002 After booking');
    });

    await test.step(`Step 3: Verify the reservation and Bill Summary show "${s.fromRoomType}"`, async () => {
      const [details] = await roomTypePage.stayDetails.getStayDetails(s.booking!.confirmationNo, ROOMS_TO_BOOK);
      s.agreedRate = details.agreedRate;
      expect.soft(details.nights, 'Nights').toBe(NIGHTS);
      expect.soft(details.status, 'Status').toBe('CONFIRMED');

      expect.soft(await roomTypePage.getFuturePostings(), 'Future Postings room types').toEqual([{ roomType: s.fromRoomType, rooms: ROOMS_TO_BOOK }]);
      const charge = await roomTypePage.getRoomCharge(s.fromRoomType);
      expect.soft(charge, `Room charge = agreed rate × ${NIGHTS} nights`).toBeCloseTo(details.agreedRate * NIGHTS, 2);
    });

    await page.screenshot({ path: 'screenshots/CHG_RT_002.png', fullPage: true });
  });

  test('CHG_RT_003: Change the room type and verify availability of both room types', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.booking, 'CHG_RT_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const roomTypePage = new ChangeRoomTypePage(page, context);
    const s = state!;

    await test.step(`Step 1: Change the room type "${s.fromRoomType}" → "${s.toRoomType}"`, async () => {
      s.change = await roomTypePage.changeRoomType(s.booking!.confirmationNo, s.toRoomType);
      expect(s.change.message).toBe(SUCCESS_MESSAGE);
      expect(s.change.from.name, 'Room type before the change').toBe(s.fromRoomType);
      expect(s.change.to.name, 'Room type after the change').toBe(s.toRoomType);
    });

    await test.step(`Step 2: Verify the reservation shows "${s.toRoomType}" with the same dates, nights and agreed rate`, async () => {
      // getStayDetails reopens the reservation, which also refreshes the Bill Summary (it is stale right after the save)
      const [details] = await roomTypePage.stayDetails.getStayDetails(s.booking!.confirmationNo, ROOMS_TO_BOOK);
      expect.soft(details.roomTypeCode, 'Room type code on the stay card').toBe(s.change!.to.code);
      expect.soft(details.arrivalDate, 'Arrival (unchanged)').toBe(s.arrivalDate);
      expect.soft(details.departureDate, 'Departure (unchanged)').toBe(s.departureDate);
      expect.soft(details.nights, 'Nights (unchanged)').toBe(NIGHTS);
      expect.soft(details.status, 'Status').toBe('CONFIRMED');
      expect.soft(details.agreedRate, 'Agreed rate (unchanged)').toBe(s.agreedRate);

      expect.soft(await roomTypePage.getFuturePostings(), 'Future Postings room types').toEqual([{ roomType: s.toRoomType, rooms: ROOMS_TO_BOOK }]);
      const charge = await roomTypePage.getRoomCharge(s.toRoomType);
      expect.soft(charge, `Room charge = agreed rate × ${NIGHTS} nights`).toBeCloseTo(details.agreedRate * NIGHTS, 2);
    });

    await test.step(`Step 3: Verify "${s.fromRoomType}" is back to the baseline and "${s.toRoomType}" decreased on the stay nights`, async () => {
      await verifyAvailability(roomTypePage, 'to', 'CHG_RT_003 After changing the room type');
    });

    await page.screenshot({ path: 'screenshots/CHG_RT_003.png', fullPage: true });
  });

  test('CHG_RT_004: Cancel the reservation and verify both room types are restored', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.booking, 'CHG_RT_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const roomTypePage = new ChangeRoomTypePage(page, context);
    const booking = state!.booking!;

    await test.step(`Step 1: Cancel reservation ${booking.confirmationNo}`, async () => {
      const result = await roomTypePage.reservations.cancelReservation(booking.confirmationNo, ROOMS_TO_BOOK);
      state!.cancelled = result.statuses.every(s => s.status === 'CANCELLED');

      expect(result.staysCancelled).toBe(ROOMS_TO_BOOK);
      for (const message of result.messages) expect(message).toBe(SUCCESS_MESSAGE);
      expect(result.statuses.map(s => s.status)).toEqual(Array(ROOMS_TO_BOOK).fill('CANCELLED'));
    });

    await test.step('Step 2: Verify both room types and Total Available are back to the baseline', async () => {
      await verifyAvailability(roomTypePage, null, 'CHG_RT_004 After cancellation');
    });

    await page.screenshot({ path: 'screenshots/CHG_RT_004.png', fullPage: true });
  });
});
