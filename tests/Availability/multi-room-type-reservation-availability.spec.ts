import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { AvailabilityGridWithDays, buildFutureStay, FutureStay } from '../../src/pages/Availability/FutureReservationAvailabilityPage';
import {
  MultiRoomTypeBookingResult,
  MultiRoomTypeReservationPage,
  RoomTypeSelection,
} from '../../src/pages/Availability/MultiRoomTypeReservationPage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

/** Different room types in the one reservation. */
const ROOM_TYPE_COUNT = 3;
/** Rooms booked of each of those room types (one stay per room). */
const ROOMS_PER_TYPE = 1;
/** Arrival = business date + ARRIVAL_OFFSET_DAYS (0 = arriving on the business date). */
const ARRIVAL_OFFSET_DAYS = 0;
const NIGHTS = 2;
/** Grid columns logged in the before/expected/actual table (business date … day after departure). */
const LOGGED_DAYS = ARRIVAL_OFFSET_DAYS + NIGHTS + 2;
const SUCCESS_MESSAGE = 'Details created/updated successfully.';

// Always run this suite in a headed, maximized window (ignores HEADED / MAXIMIZE_BROWSER)
test.use({ headless: false, viewport: null, launchOptions: { args: ['--start-maximized'] } });

// ── Shared LIVE browser session + state (serial mode) ───────────────────────
// The app rejects deep links / storageState restore, so the tests share one
// logged-in page in-process (same pattern as multi-night-reservation-availability.spec.ts).
let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

/** Handoff between the serial tests. */
interface MultiRoomTypeFlowState {
  stay: FutureStay;
  selections: RoomTypeSelection[];
  /** Availability per grid column (column 0 = business date) of EVERY room type before booking. */
  baseline: Record<string, number[]>;
  /** "Total Available" row before booking. */
  baselineTotal: number[];
  /** Guest last name, set before booking so a reservation whose conf no couldn't be read can still be found. */
  lastName: string | null;
  booking: MultiRoomTypeBookingResult | null;
  cancelled: boolean;
}
let state: MultiRoomTypeFlowState | null = null;

async function getSharedSession(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  if (!sharedContext || !sharedPage || sharedPage.isClosed()) {
    // viewport: null → the page takes the size of the maximized window
    sharedContext = await browser.newContext({ viewport: null });
    sharedPage = await sharedContext.newPage();
    logger.info('Created shared browser session for the serial multi-room-type reservation tests');
  }
  return { context: sharedContext, page: sharedPage };
}

/** Room type → availability per grid column. */
function gridByRoomType(grid: AvailabilityGridWithDays): Record<string, number[]> {
  return Object.fromEntries(grid.roomTypes.map(r => [r.roomType, [...r.availableRooms]]));
}

/** True when grid column `i` is one of the stay nights (the departure day is not a night). */
function isStayNight(i: number, stay: FutureStay): boolean {
  return i >= stay.offsetDays && i < stay.offsetDays + stay.nights;
}

/** Rooms booked per room type, scaled by `factor` (−1 after booking, 0 after cancelling). */
function roomDeltas(selections: RoomTypeSelection[], factor: number): Record<string, number> {
  return Object.fromEntries(selections.map(s => [s.roomType, factor * s.rooms]));
}

/**
 * Re-capture the grid and assert, for EVERY room type and per day: baseline + that type's delta on the
 * stay nights, baseline on every other day. Room types that weren't booked must not change at all.
 * Total Available = baseline + the sum of all deltas on the stay nights.
 */
async function verifyAvailability(roomTypePage: MultiRoomTypeReservationPage, deltaByType: Record<string, number>, label: string): Promise<void> {
  const s = state!;
  const grid = await roomTypePage.future.captureAvailability();
  const actualByType = gridByRoomType(grid);
  const days = Math.min(s.baselineTotal.length, grid.totalAvailable.length);
  const totalDelta = Object.values(deltaByType).reduce((sum, d) => sum + d, 0);

  const expected: Record<string, number[]> = {};
  const actual: Record<string, number[]> = {};
  for (const [roomType, base] of Object.entries(s.baseline)) {
    const delta = deltaByType[roomType] ?? 0;
    expected[roomType] = base.slice(0, days).map((v, i) => (isStayNight(i, s.stay) ? v + delta : v));
    actual[roomType] = (actualByType[roomType] ?? []).slice(0, days);
  }
  const expectedTotal = s.baselineTotal.slice(0, days).map((v, i) => (isStayNight(i, s.stay) ? v + totalDelta : v));
  const actualTotal = grid.totalAvailable.slice(0, days);

  logger.info('═══════════════════════════════════════════════');
  logger.info(
    `${label}: stay ${s.stay.arrivalDate} → ${s.stay.departureDate} (${s.stay.nights} nights, business date ${grid.businessDate}); ` +
      `deltas per night ${JSON.stringify(deltaByType)}, Total Available ${totalDelta >= 0 ? '+' : ''}${totalDelta}`
  );
  for (const roomType of [...Object.keys(s.baseline), 'Total Available']) {
    const isTotal = roomType === 'Total Available';
    const base = isTotal ? s.baselineTotal : s.baseline[roomType];
    const exp = isTotal ? expectedTotal : expected[roomType];
    const act = isTotal ? actualTotal : actual[roomType];
    const booked = isTotal ? '' : deltaByType[roomType] !== undefined ? ' [booked]' : ' [not booked]';
    const cells = Array.from({ length: Math.min(days, LOGGED_DAYS) }, (_, i) =>
      `d${i}(${grid.headerDays[i]})${isStayNight(i, s.stay) ? '*' : ''} ${base[i]}→${exp[i]}/${act[i]}`
    );
    logger.info(`  ${roomType}${booked}: ${cells.join(' | ')}`);
  }
  logger.info('  (base→expected/actual, * = stay night)');
  logger.info('═══════════════════════════════════════════════');

  expect(actual, 'Availability per room type per day (booked and not-booked types)').toEqual(expected);
  expect(actualTotal, 'Total Available per day').toEqual(expectedTotal);
}

/**
 * Create a reservation with multiple room types.
 *
 * MULTI_RT_001  capture the baseline of every room type and choose ROOM_TYPE_COUNT room types with headroom
 * MULTI_RT_002  book ROOMS_PER_TYPE room(s) of each chosen type in ONE reservation for NIGHTS nights:
 *               each booked type drops by its own count on the stay nights, other types don't change
 * MULTI_RT_003  Reservation Details: one CONFIRMED stay per room with the stay dates, a distinct room type
 *               per stay, and the Bill Summary lists every booked room type with its room count
 * MULTI_RT_004  cancel every stay: every room type and Total Available are back to the baseline
 */
test.describe.serial('Availability - Reservation with multiple room types', () => {
  test.afterAll(async () => {
    // Hooks get the 30 s default timeout; cancelling several stays takes much longer
    test.setTimeout(10 * 60 * 1000);
    // Cleanup: if a run fails between booking and cancelling, don't leave the rooms blocked on QC
    if (sharedPage && !sharedPage.isClosed() && state?.booking && !state.cancelled) {
      logger.warn(`Cleanup: cancelling reservation ${state.booking.confirmationNo} left by a failed run`);
      await new MultiRoomTypeReservationPage(sharedPage, sharedContext!).reservations
        .cancelReservation(state.booking.confirmationNo, state.booking.totalRooms)
        .catch(e => logger.error(`Cleanup cancel failed: ${(e as Error).message}`));
    } else if (state?.lastName && !state.booking) {
      logger.warn(
        `Booking for guest "${state.lastName}" failed before its confirmation number was read. If the reservation was ` +
          'created, cancel it manually (Guest Management → search the last name → cancel every stay).'
      );
    }
    if (process.env.KEEP_BROWSER_OPEN === 'true' && sharedPage && !sharedPage.isClosed()) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after the suite...');
      await sharedPage.pause();
    }
    await sharedContext?.close();
    sharedContext = null;
    sharedPage = null;
  });

  test('MULTI_RT_001: Capture availability of every room type before the booking', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    const { context, page } = await getSharedSession(browser);
    const roomTypePage = new MultiRoomTypeReservationPage(page, context);

    const user = getUserByIndexFromExcel(1);
    const property = getPropertyByIndexFromExcel(3);
    expect(user).toBeDefined();
    expect(property).toBeDefined();

    await test.step('Step 1: Login with user + property from Excel', async () => {
      await new LoginPage(page, context).loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    await test.step(`Step 2: Capture availability grid and choose ${ROOM_TYPE_COUNT} room types with headroom on every stay night`, async () => {
      const grid = await roomTypePage.future.captureAvailability();
      const stay = buildFutureStay(grid.businessDate, ARRIVAL_OFFSET_DAYS, NIGHTS);
      const nightColumns = Array.from({ length: NIGHTS }, (_, n) => ARRIVAL_OFFSET_DAYS + n);
      expect(grid.totalAvailable.length, 'Grid must cover the departure day').toBeGreaterThan(ARRIVAL_OFFSET_DAYS + NIGHTS);
      expect(grid.headerDays[ARRIVAL_OFFSET_DAYS], `Grid column ${ARRIVAL_OFFSET_DAYS} should be the arrival day`).toBe(
        Number(stay.arrivalDate.split('/')[0])
      );

      const candidates = grid.roomTypes.filter(r => nightColumns.every(c => r.availableRooms[c] >= ROOMS_PER_TYPE + 2));
      expect(
        candidates.length,
        `At least ${ROOM_TYPE_COUNT} room types with ${ROOMS_PER_TYPE + 2}+ rooms on every stay night ` +
          `(found: ${candidates.map(c => c.roomType).join(', ') || 'none'})`
      ).toBeGreaterThanOrEqual(ROOM_TYPE_COUNT);

      const selections = candidates.slice(0, ROOM_TYPE_COUNT).map(r => ({ roomType: r.roomType, rooms: ROOMS_PER_TYPE }));
      state = {
        stay,
        selections,
        baseline: gridByRoomType(grid),
        baselineTotal: [...grid.totalAvailable],
        lastName: null,
        booking: null,
        cancelled: false,
      };
      logger.info(`Business date ${grid.businessDate}; stay ${stay.arrivalDate} → ${stay.departureDate} (${NIGHTS} nights)`);
      for (const { roomType } of selections) {
        logger.info(`  chosen "${roomType}" per night ${nightColumns.map(c => state!.baseline[roomType][c]).join(', ')}`);
      }
    });
  });

  test(`MULTI_RT_002: Book ${ROOM_TYPE_COUNT} room types in one reservation and verify availability per room type`, async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state, 'MULTI_RT_001 must run first').not.toBeNull();
    const { context, page } = await getSharedSession(browser);
    const roomTypePage = new MultiRoomTypeReservationPage(page, context);
    const s = state!;

    await test.step(`Step 1: Book ${s.selections.map(x => `${x.rooms} × "${x.roomType}"`).join(' + ')} in one reservation`, async () => {
      // bookMultipleRoomTypes checks each row's "+ N −" counter after selecting; MULTI_RT_003 checks the stays
      s.lastName = `MultiRT${Date.now()}`;
      s.booking = await roomTypePage.bookMultipleRoomTypes(s.selections, s.lastName, s.stay);
      logger.info(`Reservation ${s.booking.confirmationNo} for guest ${s.booking.lastName} (${s.booking.totalRooms} stays)`);

      // The room selection page shows the same per-night numbers as the grid, for every chosen type
      for (const { roomType } of s.selections) {
        const gridNights = s.baseline[roomType].slice(s.stay.offsetDays, s.stay.offsetDays + s.stay.nights);
        expect(s.booking.selectionPageAvailability[roomType], `Room selection availability per night of "${roomType}" = grid baseline`).toEqual(
          gridNights
        );
      }
    });

    await test.step('Step 2: Verify each booked room type dropped by its rooms on the stay nights and other room types did not change', async () => {
      await verifyAvailability(roomTypePage, roomDeltas(s.selections, -1), 'MULTI_RT_002 After booking');
    });

    await page.screenshot({ path: 'screenshots/MULTI_RT_002.png', fullPage: true });
  });

  test('MULTI_RT_003: Reservation details show one stay per room and every booked room type', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    expect(state?.booking, 'MULTI_RT_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const roomTypePage = new MultiRoomTypeReservationPage(page, context);
    const { stay, booking } = { stay: state!.stay, booking: state!.booking! };

    await test.step(`Step 1: Open reservation ${booking.confirmationNo} and read its stays and Bill Summary`, async () => {
      const details = await roomTypePage.getReservationDetails(booking.confirmationNo, booking.totalRooms);

      expect(details.stays, 'One stay per booked room').toHaveLength(booking.totalRooms);
      for (const s of details.stays) {
        expect.soft(s.status, `Stay #${s.stayNo} status`).toBe('CONFIRMED');
        expect.soft(s.arrivalDate, `Stay #${s.stayNo} arrival`).toBe(stay.arrivalDate);
        expect.soft(s.departureDate, `Stay #${s.stayNo} departure`).toBe(stay.departureDate);
        expect.soft(s.nights, `Stay #${s.stayNo} nights`).toBe(NIGHTS);
        expect.soft(s.roomTypeCode, `Stay #${s.stayNo} room type code`).not.toBe('');
      }
      // Stay cards show room type CODES: there must be one distinct code per booked room type
      const codes = new Set(details.stays.map(s => s.roomTypeCode));
      expect.soft(codes.size, `Distinct room type codes on the stays (${[...codes].join(', ')})`).toBe(ROOM_TYPE_COUNT);

      // The Bill Summary lists room type NAMES with their room counts
      const byName = (list: { roomType: string; rooms: number }[]) => [...list].sort((a, b) => a.roomType.localeCompare(b.roomType));
      expect(byName(details.postings), 'Bill Summary Future Postings = booked room types and rooms').toEqual(
        byName(booking.selections.map(x => ({ roomType: x.roomType, rooms: x.rooms })))
      );
    });

    await page.screenshot({ path: 'screenshots/MULTI_RT_003.png', fullPage: true });
  });

  test('MULTI_RT_004: Cancel every stay and verify availability is restored for every room type', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    expect(state?.booking, 'MULTI_RT_002 must create the booking first').toBeTruthy();
    const { context, page } = await getSharedSession(browser);
    const roomTypePage = new MultiRoomTypeReservationPage(page, context);
    const booking = state!.booking!;

    await test.step(`Step 1: Cancel all ${booking.totalRooms} stays of reservation ${booking.confirmationNo}`, async () => {
      const result = await roomTypePage.reservations.cancelReservation(booking.confirmationNo, booking.totalRooms);
      state!.cancelled = result.statuses.every(s => s.status === 'CANCELLED');

      expect(result.staysCancelled).toBe(booking.totalRooms);
      for (const message of result.messages) expect(message).toBe(SUCCESS_MESSAGE);
      expect(result.statuses.map(s => s.status)).toEqual(Array(booking.totalRooms).fill('CANCELLED'));
    });

    await test.step('Step 2: Verify every room type and Total Available are back to the baseline', async () => {
      await verifyAvailability(roomTypePage, roomDeltas(state!.selections, 0), 'MULTI_RT_004 After cancellation');
    });

    await page.screenshot({ path: 'screenshots/MULTI_RT_004.png', fullPage: true });
  });
});
