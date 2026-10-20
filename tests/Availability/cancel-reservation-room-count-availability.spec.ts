import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import {
  addDaysToDate,
  buildFutureStay,
  FutureBookingResult,
  FutureReservationAvailabilityPage,
} from '../../src/pages/Availability/FutureReservationAvailabilityPage';
import { ReservationCancelAvailabilityPage, StayStatus } from '../../src/pages/Availability/ReservationCancelAvailabilityPage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

/** Arrival = business date + 1 (grid column 1). */
const ARRIVAL_OFFSET = 1;
/** Departure = business date + 3: a 2-night stay (columns 1–2). */
const DEPARTURE_OFFSET = 3;
const NIGHTS = DEPARTURE_OFFSET - ARRIVAL_OFFSET;
/** Grid columns logged in the before/expected/actual table (business date … day after the departure). */
const LOGGED_DAYS = DEPARTURE_OFFSET + 2;
/** Room counts of the two reservations. */
const SINGLE_ROOM = 1;
const FIVE_ROOMS = 5;
/** Stay of the 5-room reservation cancelled on its own first (partial cancellation). */
const FIRST_STAY_TO_CANCEL = 1;
const SUCCESS_MESSAGE = 'Details created/updated successfully.';

// Always run this suite in a headed, maximized window (ignores HEADED / MAXIMIZE_BROWSER)
test.use({ headless: false, viewport: null, launchOptions: { args: ['--start-maximized'] } });

// ── Shared LIVE browser session + state (serial mode) ───────────────────────
// The app rejects deep links / storageState restore, so the tests share one
// logged-in page in-process (same pattern as reservation-cancel-availability.spec.ts).
let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

/** A reservation created by this suite and whether all its stays are cancelled. */
interface TrackedBooking {
  booking: FutureBookingResult;
  cancelled: boolean;
}

/** Handoff between the serial tests. */
interface CancelRoomCountFlowState {
  roomType: string;
  businessDate: string;
  arrivalDate: string;
  departureDate: string;
  /** Availability of the room type per grid column (column 0 = business date) before any booking. */
  baseline: number[];
  /** "Total Available" row before any booking. */
  baselineTotal: number[];
  singleRoom: TrackedBooking | null;
  fiveRooms: TrackedBooking | null;
}
let state: CancelRoomCountFlowState | null = null;

async function getSharedSession(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  if (!sharedContext || !sharedPage || sharedPage.isClosed()) {
    // viewport: null → the page takes the size of the maximized window
    sharedContext = await browser.newContext({ viewport: null });
    sharedPage = await sharedContext.newPage();
    logger.info('Created shared browser session for the serial cancel-reservation room-count tests');
  }
  return { context: sharedContext, page: sharedPage };
}

/** Page objects used by every test. */
function pages(page: Page, context: BrowserContext) {
  return { future: new FutureReservationAvailabilityPage(page, context), cancel: new ReservationCancelAvailabilityPage(page, context) };
}

/** True when grid column `i` is a night of the stay. */
function isNight(i: number): boolean {
  return i >= ARRIVAL_OFFSET && i < DEPARTURE_OFFSET;
}

/**
 * Re-capture the grid and assert, per day, the room type and Total Available rows equal baseline − `roomsHeld` on the
 * stay nights and baseline on every other day.
 */
async function verifyAvailability(future: FutureReservationAvailabilityPage, roomsHeld: number, label: string): Promise<void> {
  const s = state!;
  const grid = await future.captureAvailability();
  const row = grid.roomTypes.find(r => r.roomType === s.roomType);
  expect(row, `Room type "${s.roomType}" should be present in the availability grid`).toBeDefined();
  const days = Math.min(s.baseline.length, grid.totalAvailable.length);

  const expectedRoom = s.baseline.slice(0, days).map((v, i) => (isNight(i) ? v - roomsHeld : v));
  const expectedTotal = s.baselineTotal.slice(0, days).map((v, i) => (isNight(i) ? v - roomsHeld : v));
  const actualRoom = row!.availableRooms.slice(0, days);
  const actualTotal = grid.totalAvailable.slice(0, days);

  logger.info('═══════════════════════════════════════════════');
  logger.info(`${label}: ${s.roomType}, ${roomsHeld} room(s) held ${s.arrivalDate} → ${s.departureDate} (business date ${grid.businessDate})`);
  for (let i = 0; i < Math.min(days, LOGGED_DAYS); i++) {
    logger.info(
      `  day ${i} (${grid.headerDays[i]})${isNight(i) ? ' [night]' : '        '}: ` +
        `${s.roomType} base ${s.baseline[i]} → expected ${expectedRoom[i]}, actual ${actualRoom[i]} | ` +
        `Total Available base ${s.baselineTotal[i]} → expected ${expectedTotal[i]}, actual ${actualTotal[i]}`
    );
  }
  logger.info('═══════════════════════════════════════════════');

  expect(actualRoom, `${s.roomType} availability per day`).toEqual(expectedRoom);
  expect(actualTotal, 'Total Available per day').toEqual(expectedTotal);
}

/** Open `confirmationNo` and read the status badge of each of its `expectedStays` stays. */
async function readStayStatuses(cancel: ReservationCancelAvailabilityPage, confirmationNo: string, expectedStays: number): Promise<StayStatus[]> {
  await cancel.openReservation(confirmationNo);
  return cancel.getStayStatuses(expectedStays);
}

/** Book `rooms` × the chosen room type for the 2-night stay in ONE reservation. */
async function book(future: FutureReservationAvailabilityPage, rooms: number, guestPrefix: string): Promise<FutureBookingResult> {
  const s = state!;
  const stay = buildFutureStay(s.businessDate, ARRIVAL_OFFSET, NIGHTS);
  const booking = await future.bookFutureRooms(s.roomType, `${guestPrefix}${Date.now()}`, rooms, stay);
  logger.info(`Reservation ${booking.confirmationNo}: ${rooms} × ${s.roomType} for guest ${booking.lastName}`);
  return booking;
}

/**
 * Cancel a 1-room reservation and a 5-room reservation; availability must be released in full each time.
 *
 * CXL_RM_001  capture the baseline and choose a room type with headroom for 5 rooms on both stay nights
 * CXL_RM_002  book a 1-room reservation BD+1 → BD+3: 1 stay CONFIRMED, availability −1 on the 2 nights
 * CXL_RM_003  cancel the 1-room reservation: the stay is CANCELLED, availability back to the baseline
 * CXL_RM_004  book a 5-room reservation for the same nights: 5 stays CONFIRMED, availability −5 on the 2 nights
 * CXL_RM_005  cancel stay #1 only: 1 CANCELLED + 4 CONFIRMED, availability −4 (one room released)
 * CXL_RM_006  cancel the 4 remaining stays: all 5 CANCELLED, availability back to the baseline
 */
test.describe.serial('Availability - Cancel a 1-room and a 5-room reservation', () => {
  test.afterAll(async () => {
    // Hooks get the 30 s default timeout; cleanup cancels take longer
    test.setTimeout(15 * 60 * 1000);
    // Cleanup: if a run fails between booking and cancelling, don't leave rooms blocked on QC
    if (sharedPage && !sharedPage.isClosed()) {
      const cancel = new ReservationCancelAvailabilityPage(sharedPage, sharedContext!);
      for (const tracked of [state?.singleRoom, state?.fiveRooms]) {
        if (!tracked || tracked.cancelled) continue;
        logger.warn(`Cleanup: cancelling reservation ${tracked.booking.confirmationNo} left by a failed run`);
        await cancel
          .cancelReservation(tracked.booking.confirmationNo, tracked.booking.roomsBooked)
          .catch(e => logger.error(`Cleanup cancel failed: ${(e as Error).message}`));
      }
    }
    if (process.env.KEEP_BROWSER_OPEN === 'true' && sharedPage && !sharedPage.isClosed()) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after the suite...');
      await sharedPage.pause();
    }
    await sharedContext?.close();
    sharedContext = null;
    sharedPage = null;
  });

  test('CXL_RM_001: Capture availability before the bookings', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    const { context, page } = await getSharedSession(browser);
    const { future } = pages(page, context);

    const user = getUserByIndexFromExcel(1);
    const property = getPropertyByIndexFromExcel(3);
    expect(user).toBeDefined();
    expect(property).toBeDefined();

    await test.step('Step 1: Login with user + property from Excel', async () => {
      await new LoginPage(page, context).loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    await test.step(`Step 2: Capture availability grid and choose a room type with headroom for ${FIVE_ROOMS} rooms`, async () => {
      const grid = await future.captureAvailability();
      expect(grid.totalAvailable.length, 'Grid must cover the departure day').toBeGreaterThan(DEPARTURE_OFFSET);
      expect(grid.headerDays[0], 'Grid column 0 should be the business date').toBe(Number(grid.businessDate.split('/')[0]));

      const nightColumns = Array.from({ length: NIGHTS }, (_, n) => ARRIVAL_OFFSET + n);
      const candidate = grid.roomTypes.find(r => nightColumns.every(c => r.availableRooms[c] >= FIVE_ROOMS + 2));
      expect(candidate, `A room type with at least ${FIVE_ROOMS + 2} rooms available on days ${nightColumns.join(', ')}`).toBeDefined();

      state = {
        roomType: candidate!.roomType,
        businessDate: grid.businessDate,
        arrivalDate: addDaysToDate(grid.businessDate, ARRIVAL_OFFSET),
        departureDate: addDaysToDate(grid.businessDate, DEPARTURE_OFFSET),
        baseline: [...candidate!.availableRooms],
        baselineTotal: [...grid.totalAvailable],
        singleRoom: null,
        fiveRooms: null,
      };
      logger.info(
        `Business date ${grid.businessDate}; "${state.roomType}" days ${nightColumns.join(', ')}: ` +
          nightColumns.map(c => state!.baseline[c]).join(', ')
      );
    });
  });

  // ── 1-room reservation ──────────────────────────────────────────────────

  test('CXL_RM_002: Book a 1-room reservation and verify availability drops by 1', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state, 'CXL_RM_001 must run first').not.toBeNull();
    const { context, page } = await getSharedSession(browser);
    const { future, cancel } = pages(page, context);

    await test.step(`Step 1: Book ${SINGLE_ROOM} × "${state!.roomType}" ${state!.arrivalDate} → ${state!.departureDate}`, async () => {
      state!.singleRoom = { booking: await book(future, SINGLE_ROOM, 'Cxl1Rm'), cancelled: false };
    });

    await test.step('Step 2: Verify the reservation has 1 CONFIRMED stay', async () => {
      const statuses = await readStayStatuses(cancel, state!.singleRoom!.booking.confirmationNo, SINGLE_ROOM);
      expect(statuses.map(s => s.status)).toEqual(['CONFIRMED']);
    });

    await test.step(`Step 3: Verify availability decreased by ${SINGLE_ROOM} on the stay nights`, async () => {
      await verifyAvailability(future, SINGLE_ROOM, 'CXL_RM_002 After booking 1 room');
    });

    await page.screenshot({ path: 'screenshots/CXL_RM_002.png', fullPage: true });
  });

  test('CXL_RM_003: Cancel the 1-room reservation and verify availability is restored', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.singleRoom, 'CXL_RM_002 must create the 1-room booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const { future, cancel } = pages(page, context);
    const tracked = state!.singleRoom!;

    await test.step(`Step 1: Cancel reservation ${tracked.booking.confirmationNo}`, async () => {
      const result = await cancel.cancelReservation(tracked.booking.confirmationNo, SINGLE_ROOM);
      tracked.cancelled = result.statuses.every(s => s.status === 'CANCELLED');

      expect(result.staysCancelled).toBe(SINGLE_ROOM);
      for (const message of result.messages) expect(message).toBe(SUCCESS_MESSAGE);
      expect(result.statuses.map(s => s.status)).toEqual(['CANCELLED']);
    });

    await test.step('Step 2: Verify availability is back to the baseline', async () => {
      await verifyAvailability(future, 0, 'CXL_RM_003 After cancelling the 1-room reservation');
    });

    await page.screenshot({ path: 'screenshots/CXL_RM_003.png', fullPage: true });
  });

  // ── 5-room reservation ──────────────────────────────────────────────────

  test(`CXL_RM_004: Book a ${FIVE_ROOMS}-room reservation and verify availability drops by ${FIVE_ROOMS}`, async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state, 'CXL_RM_001 must run first').not.toBeNull();
    const { context, page } = await getSharedSession(browser);
    const { future, cancel } = pages(page, context);

    await test.step(`Step 1: Book ${FIVE_ROOMS} × "${state!.roomType}" ${state!.arrivalDate} → ${state!.departureDate} in one reservation`, async () => {
      state!.fiveRooms = { booking: await book(future, FIVE_ROOMS, 'Cxl5Rm'), cancelled: false };
    });

    await test.step(`Step 2: Verify the reservation has ${FIVE_ROOMS} CONFIRMED stays (one per room)`, async () => {
      const statuses = await readStayStatuses(cancel, state!.fiveRooms!.booking.confirmationNo, FIVE_ROOMS);
      expect(statuses.map(s => s.status)).toEqual(Array(FIVE_ROOMS).fill('CONFIRMED'));
      expect(new Set(statuses.map(s => s.reservationId)).size, 'Each stay has its own reservation id').toBe(FIVE_ROOMS);
    });

    await test.step(`Step 3: Verify availability decreased by ${FIVE_ROOMS} on the stay nights`, async () => {
      await verifyAvailability(future, FIVE_ROOMS, `CXL_RM_004 After booking ${FIVE_ROOMS} rooms`);
    });

    await page.screenshot({ path: 'screenshots/CXL_RM_004.png', fullPage: true });
  });

  test(`CXL_RM_005: Cancel 1 stay of the ${FIVE_ROOMS}-room reservation and verify exactly 1 room is released`, async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.fiveRooms, 'CXL_RM_004 must create the 5-room booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const { future, cancel } = pages(page, context);
    const tracked = state!.fiveRooms!;

    await test.step(`Step 1: Cancel only Stay #${FIRST_STAY_TO_CANCEL} of reservation ${tracked.booking.confirmationNo}`, async () => {
      const result = await cancel.cancelStays(tracked.booking.confirmationNo, FIVE_ROOMS, [FIRST_STAY_TO_CANCEL]);

      expect(result.staysCancelled).toBe(1);
      expect(result.messages).toEqual([SUCCESS_MESSAGE]);
      expect(result.statuses.map(s => s.status), `Only Stay #${FIRST_STAY_TO_CANCEL} is cancelled`).toEqual(
        Array.from({ length: FIVE_ROOMS }, (_, i) => (i + 1 === FIRST_STAY_TO_CANCEL ? 'CANCELLED' : 'CONFIRMED'))
      );
    });

    await test.step(`Step 2: Verify availability is baseline − ${FIVE_ROOMS - 1} on the stay nights`, async () => {
      await verifyAvailability(future, FIVE_ROOMS - 1, 'CXL_RM_005 After cancelling 1 of 5 stays');
    });

    await page.screenshot({ path: 'screenshots/CXL_RM_005.png', fullPage: true });
  });

  test(`CXL_RM_006: Cancel the remaining stays of the ${FIVE_ROOMS}-room reservation and verify availability is restored`, async ({ browser }) => {
    test.setTimeout(20 * 60 * 1000);
    expect(state?.fiveRooms, 'CXL_RM_004 must create the 5-room booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const { future, cancel } = pages(page, context);
    const tracked = state!.fiveRooms!;

    await test.step(`Step 1: Cancel every remaining CONFIRMED stay of reservation ${tracked.booking.confirmationNo}`, async () => {
      // cancelReservation skips stays that are already CANCELLED
      const result = await cancel.cancelReservation(tracked.booking.confirmationNo, FIVE_ROOMS);
      tracked.cancelled = result.statuses.every(s => s.status === 'CANCELLED');

      expect(result.staysCancelled).toBe(FIVE_ROOMS - 1);
      for (const message of result.messages) expect(message).toBe(SUCCESS_MESSAGE);
      expect(result.statuses.map(s => s.status)).toEqual(Array(FIVE_ROOMS).fill('CANCELLED'));
    });

    await test.step('Step 2: Verify availability is back to the baseline', async () => {
      await verifyAvailability(future, 0, `CXL_RM_006 After cancelling all ${FIVE_ROOMS} stays`);
    });

    await page.screenshot({ path: 'screenshots/CXL_RM_006.png', fullPage: true });
  });
});
