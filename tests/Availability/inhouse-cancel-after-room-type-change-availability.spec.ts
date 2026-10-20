import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { addDaysToDate, buildFutureStay, FutureBookingResult } from '../../src/pages/Availability/FutureReservationAvailabilityPage';
import { RoomTypeChangeResult } from '../../src/pages/Availability/ChangeRoomTypePage';
import { AvailabilitySnapshot } from '../../src/pages/Availability/CancelAfterRoomTypeChangePage';
import { CheckInResult, IN_HOUSE_STATUS, InHouseCancelAfterRoomTypeChangePage } from '../../src/pages/Availability/InHouseCancelAfterRoomTypeChangePage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

/** Arrival = business date (grid column 0): a guest can only be checked in on the arrival day. */
const ARRIVAL_OFFSET = 0;
/** Departure = business date + 2: a 2-night stay (columns 0–1). */
const DEPARTURE_OFFSET = 2;
const NIGHTS = DEPARTURE_OFFSET - ARRIVAL_OFFSET;
/** Grid columns logged in the before/expected/actual table (business date … day after the departure). */
const LOGGED_DAYS = DEPARTURE_OFFSET + 2;
const ROOMS_TO_BOOK = 1; // single-stay reservation
const SUCCESS_MESSAGE = 'Details created/updated successfully.';
const CHECKIN_MESSAGE = 'Guest(s) checked in successfully.';

// Always run this suite in a headed, maximized window (ignores HEADED / MAXIMIZE_BROWSER)
test.use({ headless: false, viewport: null, launchOptions: { args: ['--start-maximized'] } });

// ── Shared LIVE browser session + state (serial mode) ───────────────────────
// The app rejects deep links / storageState restore, so the tests share one logged-in page in-process.
let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

/** Which room type currently holds the booked room (null = nothing booked). */
type Holder = 'from' | 'to' | null;

/** Handoff between the serial tests. */
interface InHouseCancelFlowState {
  /** Room type booked first (grid NAME). */
  fromRoomType: string;
  /** Room type the stay is moved to before the check-in. */
  toRoomType: string;
  arrivalDate: string;
  departureDate: string;
  /** Whole grid before booking. */
  baseline: AvailabilitySnapshot;
  booking: FutureBookingResult | null;
  change: RoomTypeChangeResult | null;
  checkIn: CheckInResult | null;
  checkinCancelled: boolean;
  cancelled: boolean;
}
let state: InHouseCancelFlowState | null = null;

async function getSharedSession(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  if (!sharedContext || !sharedPage || sharedPage.isClosed()) {
    // viewport: null → the page takes the size of the maximized window
    sharedContext = await browser.newContext({ viewport: null });
    sharedPage = await sharedContext.newPage();
    logger.info('Created shared browser session for the serial in-house cancel tests');
  }
  return { context: sharedContext, page: sharedPage };
}

/** True when grid column `i` is a night of the stay. */
function isNight(i: number): boolean {
  return i >= ARRIVAL_OFFSET && i < DEPARTURE_OFFSET;
}

/**
 * Re-capture the grid and assert, per day, that EVERY room type and Total Available equal the baseline, minus
 * ROOMS_TO_BOOK on the stay nights for the room type that holds the booking (`holder`) and for Total Available.
 * With `holder = null` Total Booked must also be back on the baseline.
 */
async function verifyAvailability(flowPage: InHouseCancelAfterRoomTypeChangePage, holder: Holder, label: string): Promise<void> {
  const s = state!;
  const actual = await flowPage.cancelFlow.captureSnapshot();
  expect(actual.businessDate, 'Business date must not change during the suite').toBe(s.baseline.businessDate);
  const days = Math.min(s.baseline.totalAvailable.length, actual.totalAvailable.length);
  const holderName = holder === 'from' ? s.fromRoomType : holder === 'to' ? s.toRoomType : null;

  const expectFor = (baseline: number[], holds: boolean) =>
    baseline.slice(0, days).map((v, i) => (holds && isNight(i) ? v - ROOMS_TO_BOOK : v));

  logger.info('═══════════════════════════════════════════════');
  logger.info(`${label}: ${holderName ? `stay ${s.arrivalDate} → ${s.departureDate} in ${holderName}` : 'no stay'} (business date ${actual.businessDate})`);
  for (const roomType of [s.fromRoomType, s.toRoomType]) {
    const base = s.baseline.roomTypes[roomType];
    const exp = expectFor(base, roomType === holderName);
    const act = actual.roomTypes[roomType] ?? [];
    const cells = Array.from({ length: Math.min(days, LOGGED_DAYS) }, (_, i) => `d${i}${isNight(i) ? '*' : ''} ${base[i]}→${exp[i]}/${act[i]}`);
    logger.info(`  ${roomType} (base→expected/actual): ${cells.join(' | ')}`);
  }
  const expTotal = expectFor(s.baseline.totalAvailable, holder !== null);
  const totalCells = Array.from({ length: Math.min(days, LOGGED_DAYS) }, (_, i) => `d${i}${isNight(i) ? '*' : ''} ${s.baseline.totalAvailable[i]}→${expTotal[i]}/${actual.totalAvailable[i]}`);
  logger.info(`  Total Available (base→expected/actual): ${totalCells.join(' | ')}`);
  logger.info('═══════════════════════════════════════════════');

  // Every room type of the baseline, so a stray release/consumption on an unrelated type is caught too
  for (const [roomType, base] of Object.entries(s.baseline.roomTypes)) {
    expect(actual.roomTypes[roomType], `Room type "${roomType}" should be present in the availability grid`).toBeDefined();
    expect(actual.roomTypes[roomType].slice(0, days), `${roomType} availability per day`).toEqual(expectFor(base, roomType === holderName));
  }
  expect(actual.totalAvailable.slice(0, days), 'Total Available per day').toEqual(expTotal);
  if (holder === null) {
    expect(actual.totalBooked.slice(0, days), 'Total Booked per day').toEqual(s.baseline.totalBooked.slice(0, days));
  }
}

/**
 * Cancel an in-house reservation after its room type was changed.
 *
 * IH_CXL_RTC_001  capture the whole availability grid; choose two room types with headroom on the business date + next day
 * IH_CXL_RTC_002  book 1 room of the first type BD → BD+2 and change it to the second type (first type back to baseline,
 *                 second type −1 on the 2 nights)
 * IH_CXL_RTC_003  check the guest in to an inspected vacant room of the NEW room type: IN-HOUSE, availability unchanged
 * IH_CXL_RTC_004  an in-house stay can't be cancelled directly: More → Cancel is "Cancel Checkin" → CONFIRMED,
 *                 room still assigned, availability unchanged
 * IH_CXL_RTC_005  cancel the reservation: CANCELLED, the stay card still shows the new room type
 * IH_CXL_RTC_006  every room type, Total Available and Total Booked are back to the baseline on every day
 */
test.describe.serial('Availability - Cancel an in-house reservation after its room type was changed', () => {
  test.afterAll(async () => {
    // Hooks get the 30 s default timeout; cleanup takes longer
    test.setTimeout(10 * 60 * 1000);
    // Cleanup: if a run fails part-way, don't leave the guest in-house or the room blocked on QC
    if (sharedPage && !sharedPage.isClosed() && state?.booking && !state.cancelled) {
      const flowPage = new InHouseCancelAfterRoomTypeChangePage(sharedPage, sharedContext!);
      const confNo = state.booking.confirmationNo;
      if (state.checkIn && !state.checkinCancelled) {
        logger.warn(`Cleanup: cancelling the check-in of ${confNo} left by a failed run`);
        await flowPage.cancelCheckin(confNo).catch(e => logger.error(`Cleanup Cancel Checkin failed: ${(e as Error).message}`));
      }
      logger.warn(`Cleanup: cancelling reservation ${confNo} left by a failed run`);
      await flowPage.cancelFlow
        .cancelAfterRoomTypeChange(confNo)
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

  test('IH_CXL_RTC_001: Capture availability of every room type before the booking', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    const { context, page } = await getSharedSession(browser);
    const flowPage = new InHouseCancelAfterRoomTypeChangePage(page, context);

    const user = getUserByIndexFromExcel(1);
    const property = getPropertyByIndexFromExcel(3);
    expect(user).toBeDefined();
    expect(property).toBeDefined();

    await test.step('Step 1: Login with user + property from Excel', async () => {
      await new LoginPage(page, context).loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    await test.step('Step 2: Capture the availability grid and choose two room types with headroom on both stay nights', async () => {
      const baseline = await flowPage.cancelFlow.captureSnapshot();
      expect(baseline.totalAvailable.length, 'Grid must cover the departure day').toBeGreaterThan(DEPARTURE_OFFSET);
      expect(baseline.headerDays[0], 'Grid column 0 should be the business date').toBe(Number(baseline.businessDate.split('/')[0]));

      const nightColumns = Array.from({ length: NIGHTS }, (_, n) => ARRIVAL_OFFSET + n);
      const candidates = Object.entries(baseline.roomTypes).filter(([, days]) => nightColumns.every(c => days[c] >= ROOMS_TO_BOOK + 2));
      expect(candidates.length, `Two room types with at least ${ROOMS_TO_BOOK + 2} rooms available on days ${nightColumns.join(', ')}`).toBeGreaterThanOrEqual(2);
      const [[fromRoomType], [toRoomType]] = candidates;

      state = {
        fromRoomType,
        toRoomType,
        arrivalDate: addDaysToDate(baseline.businessDate, ARRIVAL_OFFSET),
        departureDate: addDaysToDate(baseline.businessDate, DEPARTURE_OFFSET),
        baseline,
        booking: null,
        change: null,
        checkIn: null,
        checkinCancelled: false,
        cancelled: false,
      };
      logger.info(
        `Business date ${baseline.businessDate}; ${Object.keys(baseline.roomTypes).length} room types; ` +
          `booking "${fromRoomType}" then changing to "${toRoomType}" (days ${nightColumns.join(', ')})`
      );
    });
  });

  test('IH_CXL_RTC_002: Book a room arriving today and change its room type', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state, 'IH_CXL_RTC_001 must run first').not.toBeNull();
    const { context, page } = await getSharedSession(browser);
    const flowPage = new InHouseCancelAfterRoomTypeChangePage(page, context);
    const s = state!;
    const stay = buildFutureStay(s.baseline.businessDate, ARRIVAL_OFFSET, NIGHTS);

    await test.step(`Step 1: Book 1 × "${s.fromRoomType}" from ${stay.arrivalDate} to ${stay.departureDate}`, async () => {
      s.booking = await flowPage.cancelFlow.roomTypeChange.future.bookFutureRooms(s.fromRoomType, `IhCxl${Date.now()}`, ROOMS_TO_BOOK, stay);
      logger.info(`Reservation ${s.booking.confirmationNo} for guest ${s.booking.lastName}`);
    });

    await test.step(`Step 2: Verify "${s.fromRoomType}" decreased on the stay nights`, async () => {
      await verifyAvailability(flowPage, 'from', 'IH_CXL_RTC_002 After booking');
    });

    await test.step(`Step 3: Change the room type "${s.fromRoomType}" → "${s.toRoomType}"`, async () => {
      s.change = await flowPage.cancelFlow.roomTypeChange.changeRoomType(s.booking!.confirmationNo, s.toRoomType);
      expect(s.change.message).toBe(SUCCESS_MESSAGE);
      expect(s.change.from.name, 'Room type before the change').toBe(s.fromRoomType);
      expect(s.change.to.name, 'Room type after the change').toBe(s.toRoomType);
    });

    await test.step(`Step 4: Verify "${s.fromRoomType}" is back to the baseline and "${s.toRoomType}" decreased on the stay nights`, async () => {
      await verifyAvailability(flowPage, 'to', 'IH_CXL_RTC_002 After changing the room type');
    });

    await page.screenshot({ path: 'screenshots/IH_CXL_RTC_002.png', fullPage: true });
  });

  test('IH_CXL_RTC_003: Check the guest in to a room of the new room type', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.change, 'IH_CXL_RTC_002 must book and change the room type first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const flowPage = new InHouseCancelAfterRoomTypeChangePage(page, context);
    const s = state!;

    await test.step(`Step 1: Check in reservation ${s.booking!.confirmationNo}`, async () => {
      s.checkIn = await flowPage.checkInGuest(s.booking!.confirmationNo);
      expect(s.checkIn.roomTypeCode, 'Choose Room lists rooms of the NEW room type').toBe(s.change!.to.code);
      expect(s.checkIn.roomNo, 'Assigned room number').toBeTruthy();
      expect.soft(s.checkIn.assignMessage, 'Room assignment message').toBe(SUCCESS_MESSAGE);
      expect(s.checkIn.checkinMessage, 'Check-in message').toBe(CHECKIN_MESSAGE);
      expect(s.checkIn.status, 'Status after the check-in').toMatch(IN_HOUSE_STATUS);
    });

    await test.step('Step 2: Verify the reservation is in-house in the assigned room', async () => {
      await flowPage.openInHouseReservation(s.booking!.confirmationNo);
      expect(await flowPage.getStayStatus(), 'Status in Guest Management → In-House').toMatch(IN_HOUSE_STATUS);
      expect.soft(await flowPage.getAssignedRoomNo(), 'Room number on the stay card').toBe(s.checkIn!.roomNo);
      expect.soft(await flowPage.cancelFlow.getStayCardRoomTypeCode(), 'Room type code on the stay card').toBe(s.change!.to.code);
    });

    await test.step(`Step 3: Verify availability did not change: "${s.toRoomType}" still −1, "${s.fromRoomType}" on the baseline`, async () => {
      await verifyAvailability(flowPage, 'to', 'IH_CXL_RTC_003 After check-in');
    });

    await page.screenshot({ path: 'screenshots/IH_CXL_RTC_003.png', fullPage: true });
  });

  test('IH_CXL_RTC_004: Cancel the check-in of the in-house guest', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.checkIn, 'IH_CXL_RTC_003 must check the guest in first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const flowPage = new InHouseCancelAfterRoomTypeChangePage(page, context);
    const s = state!;

    await test.step(`Step 1: More → Cancel ("Cancel Checkin") on ${s.booking!.confirmationNo}`, async () => {
      const result = await flowPage.cancelCheckin(s.booking!.confirmationNo);
      s.checkinCancelled = result.status === 'CONFIRMED';
      expect.soft(result.message, 'Cancel Checkin API message').toBe(SUCCESS_MESSAGE);
      expect(result.status, 'Status after Cancel Checkin').toBe('CONFIRMED');
      expect.soft(await flowPage.getAssignedRoomNo(), 'Room stays assigned after Cancel Checkin').toBe(s.checkIn!.roomNo);
    });

    await test.step(`Step 2: Verify availability did not change: "${s.toRoomType}" still −1`, async () => {
      await verifyAvailability(flowPage, 'to', 'IH_CXL_RTC_004 After Cancel Checkin');
    });

    await page.screenshot({ path: 'screenshots/IH_CXL_RTC_004.png', fullPage: true });
  });

  test('IH_CXL_RTC_005: Cancel the reservation', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.checkinCancelled, 'IH_CXL_RTC_004 must cancel the check-in first').toBe(true);
    const { context, page } = await getSharedSession(browser);
    const flowPage = new InHouseCancelAfterRoomTypeChangePage(page, context);
    const s = state!;

    await test.step(`Step 1: Cancel reservation ${s.booking!.confirmationNo}`, async () => {
      const result = await flowPage.cancelFlow.cancelAfterRoomTypeChange(s.booking!.confirmationNo);
      s.cancelled = result.statuses.every(st => st.status === 'CANCELLED');

      expect(result.staysCancelled, 'Stays cancelled').toBe(ROOMS_TO_BOOK);
      for (const message of result.messages) expect(message).toBe(SUCCESS_MESSAGE);
      expect(result.statuses.map(st => st.status), 'Stay status after the cancellation').toEqual(Array(ROOMS_TO_BOOK).fill('CANCELLED'));
      expect.soft(result.roomTypeCodeAfterCancel, 'Room type code on the cancelled stay card').toBe(s.change!.to.code);
    });

    await page.screenshot({ path: 'screenshots/IH_CXL_RTC_005.png', fullPage: true });
  });

  test('IH_CXL_RTC_006: Verify every room type is back to the baseline after the cancellation', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    expect(state?.cancelled, 'IH_CXL_RTC_005 must cancel the reservation first').toBe(true);
    const { context, page } = await getSharedSession(browser);
    const flowPage = new InHouseCancelAfterRoomTypeChangePage(page, context);

    await test.step(`Step 1: Verify "${state!.toRoomType}" released, "${state!.fromRoomType}" not released twice, all others unchanged`, async () => {
      await verifyAvailability(flowPage, null, 'IH_CXL_RTC_006 After cancellation');
    });

    await page.screenshot({ path: 'screenshots/IH_CXL_RTC_006.png', fullPage: true });
  });
});
