import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { addDaysToDate, buildFutureStay, FutureBookingResult } from '../../src/pages/Availability/FutureReservationAvailabilityPage';
import { RoomTypeChangeResult } from '../../src/pages/Availability/ChangeRoomTypePage';
import { AvailabilitySnapshot, CancelAfterRoomTypeChangePage } from '../../src/pages/Availability/CancelAfterRoomTypeChangePage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

/** Arrival = business date + 1 (grid column 1). */
const ARRIVAL_OFFSET = 1;
/** Departure = business date + 3: a 2-night stay (columns 1–2). */
const DEPARTURE_OFFSET = 3;
const NIGHTS = DEPARTURE_OFFSET - ARRIVAL_OFFSET;
/** Grid columns logged in the before/expected/actual table (business date … day after the departure). */
const LOGGED_DAYS = DEPARTURE_OFFSET + 2;
const ROOMS_TO_BOOK = 1; // the room type is edited on a single-stay reservation
const SUCCESS_MESSAGE = 'Details created/updated successfully.';

// Always run this suite in a headed, maximized window (ignores HEADED / MAXIMIZE_BROWSER)
test.use({ headless: false, viewport: null, launchOptions: { args: ['--start-maximized'] } });

// ── Shared LIVE browser session + state (serial mode) ───────────────────────
// The app rejects deep links / storageState restore, so the tests share one logged-in page in-process.
let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

/** Which room type currently holds the booked room (null = nothing booked). */
type Holder = 'from' | 'to' | null;

/** Handoff between the serial tests. */
interface CancelAfterChangeFlowState {
  /** Room type booked first (grid NAME). */
  fromRoomType: string;
  /** Room type the stay is moved to before the cancellation. */
  toRoomType: string;
  arrivalDate: string;
  departureDate: string;
  /** Whole grid before booking. */
  baseline: AvailabilitySnapshot;
  booking: FutureBookingResult | null;
  change: RoomTypeChangeResult | null;
  cancelled: boolean;
}
let state: CancelAfterChangeFlowState | null = null;

async function getSharedSession(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  if (!sharedContext || !sharedPage || sharedPage.isClosed()) {
    // viewport: null → the page takes the size of the maximized window
    sharedContext = await browser.newContext({ viewport: null });
    sharedPage = await sharedContext.newPage();
    logger.info('Created shared browser session for the serial cancel-after-room-type-change tests');
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
async function verifyAvailability(flowPage: CancelAfterRoomTypeChangePage, holder: Holder, label: string): Promise<void> {
  const s = state!;
  const actual = await flowPage.captureSnapshot();
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
 * Cancel a reservation after its room type was changed.
 *
 * CXL_RTC_001  capture the whole availability grid and choose two room types with headroom on both stay nights
 * CXL_RTC_002  book 1 room of the first type BD+1 → BD+3 and change it to the second type:
 *              first type back to baseline, second type −1 on the 2 nights, every other type unchanged
 * CXL_RTC_003  cancel the reservation: stay CANCELLED, stay card still shows the NEW room type
 * CXL_RTC_004  every room type, Total Available and Total Booked are back to the baseline on every day
 *              (the original room type is not released a second time: it ends on the baseline, not baseline + 1)
 */
test.describe.serial('Availability - Cancel a reservation after its room type was changed', () => {
  test.afterAll(async () => {
    // Hooks get the 30 s default timeout; a cleanup cancel takes longer
    test.setTimeout(10 * 60 * 1000);
    // Cleanup: if a run fails between booking and cancelling, don't leave the room blocked on QC
    if (sharedPage && !sharedPage.isClosed() && state?.booking && !state.cancelled) {
      logger.warn(`Cleanup: cancelling reservation ${state.booking.confirmationNo} left by a failed run`);
      await new CancelAfterRoomTypeChangePage(sharedPage, sharedContext!)
        .cancelAfterRoomTypeChange(state.booking.confirmationNo)
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

  test('CXL_RTC_001: Capture availability of every room type before the booking', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    const { context, page } = await getSharedSession(browser);
    const flowPage = new CancelAfterRoomTypeChangePage(page, context);

    const user = getUserByIndexFromExcel(1);
    const property = getPropertyByIndexFromExcel(3);
    expect(user).toBeDefined();
    expect(property).toBeDefined();

    await test.step('Step 1: Login with user + property from Excel', async () => {
      await new LoginPage(page, context).loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    await test.step('Step 2: Capture the availability grid and choose two room types with headroom on both stay nights', async () => {
      const baseline = await flowPage.captureSnapshot();
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
        cancelled: false,
      };
      logger.info(
        `Business date ${baseline.businessDate}; ${Object.keys(baseline.roomTypes).length} room types; ` +
          `booking "${fromRoomType}" then changing to "${toRoomType}" (days ${nightColumns.join(', ')})`
      );
    });
  });

  test('CXL_RTC_002: Book a room and change its room type before cancelling', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state, 'CXL_RTC_001 must run first').not.toBeNull();
    const { context, page } = await getSharedSession(browser);
    const flowPage = new CancelAfterRoomTypeChangePage(page, context);
    const s = state!;
    const stay = buildFutureStay(s.baseline.businessDate, ARRIVAL_OFFSET, NIGHTS);

    await test.step(`Step 1: Book 1 × "${s.fromRoomType}" from ${stay.arrivalDate} to ${stay.departureDate}`, async () => {
      s.booking = await flowPage.roomTypeChange.future.bookFutureRooms(s.fromRoomType, `CxlRtc${Date.now()}`, ROOMS_TO_BOOK, stay);
      logger.info(`Reservation ${s.booking.confirmationNo} for guest ${s.booking.lastName}`);
    });

    await test.step(`Step 2: Verify "${s.fromRoomType}" decreased on the stay nights`, async () => {
      await verifyAvailability(flowPage, 'from', 'CXL_RTC_002 After booking');
    });

    await test.step(`Step 3: Change the room type "${s.fromRoomType}" → "${s.toRoomType}"`, async () => {
      s.change = await flowPage.roomTypeChange.changeRoomType(s.booking!.confirmationNo, s.toRoomType);
      expect(s.change.message).toBe(SUCCESS_MESSAGE);
      expect(s.change.from.name, 'Room type before the change').toBe(s.fromRoomType);
      expect(s.change.to.name, 'Room type after the change').toBe(s.toRoomType);
    });

    await test.step(`Step 4: Verify the reservation is CONFIRMED in "${s.toRoomType}" with unchanged dates`, async () => {
      const [details] = await flowPage.roomTypeChange.stayDetails.getStayDetails(s.booking!.confirmationNo, ROOMS_TO_BOOK);
      expect.soft(details.roomTypeCode, 'Room type code on the stay card').toBe(s.change!.to.code);
      expect.soft(details.arrivalDate, 'Arrival (unchanged)').toBe(s.arrivalDate);
      expect.soft(details.departureDate, 'Departure (unchanged)').toBe(s.departureDate);
      expect.soft(details.nights, 'Nights (unchanged)').toBe(NIGHTS);
      expect(details.status, 'Status before the cancellation').toBe('CONFIRMED');
    });

    await test.step(`Step 5: Verify "${s.fromRoomType}" is back to the baseline and "${s.toRoomType}" decreased on the stay nights`, async () => {
      await verifyAvailability(flowPage, 'to', 'CXL_RTC_002 After changing the room type');
    });

    await page.screenshot({ path: 'screenshots/CXL_RTC_002.png', fullPage: true });
  });

  test('CXL_RTC_003: Cancel the reservation after the room type change', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.change, 'CXL_RTC_002 must book and change the room type first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const flowPage = new CancelAfterRoomTypeChangePage(page, context);
    const s = state!;

    await test.step(`Step 1: Cancel reservation ${s.booking!.confirmationNo}`, async () => {
      const result = await flowPage.cancelAfterRoomTypeChange(s.booking!.confirmationNo);
      s.cancelled = result.statuses.every(st => st.status === 'CANCELLED');

      expect(result.staysCancelled, 'Stays cancelled').toBe(ROOMS_TO_BOOK);
      for (const message of result.messages) expect(message).toBe(SUCCESS_MESSAGE);
      expect(result.statuses.map(st => st.status), 'Stay status after the cancellation').toEqual(Array(ROOMS_TO_BOOK).fill('CANCELLED'));
      // The cancelled stay keeps the room type it held at cancellation time (empty = the card hides it once cancelled)
      if (result.roomTypeCodeAfterCancel) {
        expect.soft(result.roomTypeCodeAfterCancel, 'Room type code on the cancelled stay card').toBe(s.change!.to.code);
      } else {
        logger.warn('The cancelled stay card shows no room type code');
      }
    });

    await page.screenshot({ path: 'screenshots/CXL_RTC_003.png', fullPage: true });
  });

  test('CXL_RTC_004: Verify every room type is back to the baseline after the cancellation', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    expect(state?.cancelled, 'CXL_RTC_003 must cancel the reservation first').toBe(true);
    const { context, page } = await getSharedSession(browser);
    const flowPage = new CancelAfterRoomTypeChangePage(page, context);

    await test.step(`Step 1: Verify "${state!.toRoomType}" released, "${state!.fromRoomType}" not released twice, all others unchanged`, async () => {
      await verifyAvailability(flowPage, null, 'CXL_RTC_004 After cancellation');
    });

    await page.screenshot({ path: 'screenshots/CXL_RTC_004.png', fullPage: true });
  });
});
