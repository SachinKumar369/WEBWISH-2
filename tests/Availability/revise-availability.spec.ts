import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { RecreateAvailabilityPage, AvailabilityGridData } from '../../src/pages/Availability/RecreateAvailabilityPage';
import {
  ReviseAvailabilityPage,
  ReviseAvailabilityType,
  RevisionByDate,
  addDays,
  toIsoDate,
} from '../../src/pages/Availability/ReviseAvailabilityPage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

const REVISE_BY = 10;
const SUCCESS_MESSAGE = 'Details created/updated successfully.';

// ── Shared LIVE browser session + state (serial mode) ───────────────────────
// The app rejects deep links / storageState restore, so the three tests share
// one logged-in page in-process (same pattern as agent-allotment.spec.ts).
let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

/** Handoff from REV_AVAIL_001 to the following tests. */
interface ReviseState {
  roomType: string;
  businessDate: Date;
  yearEnd: Date;
  /** ISO dates of the availability-grid columns that fall inside the revised range. */
  comparedDates: string[];
  /** Availability per compared date with NO revision applied. */
  baseAvailability: number[];
}
let state: ReviseState | null = null;

async function getSharedSession(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  if (!sharedContext || !sharedPage || sharedPage.isClosed()) {
    // The year calendar only renders on a wide window (narrow ones get month cards),
    // and --start-maximized has no effect headless → use a fixed full-HD viewport there.
    const headed = process.env.HEADED !== 'false';
    sharedContext = await browser.newContext({ viewport: headed ? null : { width: 1920, height: 1080 } });
    sharedPage = await sharedContext.newPage();
    logger.info('Created shared browser session for the serial revise-availability tests');
  }
  return { context: sharedContext, page: sharedPage };
}

/** Availability-grid columns start at the business date: column i = business date + i. */
function gridDates(businessDate: Date, columns: number): string[] {
  return Array.from({ length: columns }, (_, i) => toIsoDate(addDays(businessDate, i)));
}

/** Open the watch/eye Quick Access → Availability grid, capture it, and close it. */
async function captureAvailability(availabilityGrid: RecreateAvailabilityPage): Promise<AvailabilityGridData> {
  await availabilityGrid.openQuickAccessPanel();
  await availabilityGrid.clickAvailabilityQuickLink();
  const grid = await availabilityGrid.captureAvailabilityGrid();
  await availabilityGrid.closeAvailabilityModal();
  return grid;
}

/** Availability of `roomType` on each compared date. */
function availabilityFor(grid: AvailabilityGridData, roomType: string, comparedCount: number): number[] {
  const row = grid.roomTypes.find(r => r.roomType === roomType);
  expect(row, `Room type "${roomType}" should be present in the availability grid`).toBeDefined();
  return row!.availableRooms.slice(0, comparedCount);
}

/**
 * Re-open the availability grid and assert the room type's availability equals
 * base + delta on every compared day.
 */
async function verifyAvailability(page: Page, context: BrowserContext, delta: number, label: string): Promise<void> {
  const s = state!;
  const after = availabilityFor(await captureAvailability(new RecreateAvailabilityPage(page, context)), s.roomType, s.comparedDates.length);
  const expected = s.baseAvailability.map(v => v + delta);

  logger.info('═══════════════════════════════════════════════');
  logger.info(`${label} — ${s.roomType} (${delta >= 0 ? '+' : ''}${delta})`);
  s.comparedDates.forEach((d, i) => logger.info(`  ${d}: base ${s.baseAvailability[i]} → expected ${expected[i]}, actual ${after[i]}`));
  logger.info('═══════════════════════════════════════════════');

  expect(after, `${s.roomType} availability should be base ${delta >= 0 ? '+' : ''}${delta} on every day`).toEqual(expected);
}

/** Open Availability Management for the room type and apply a revision over business date → 31 Dec. */
async function applyRevision(
  page: Page,
  context: BrowserContext,
  type: ReviseAvailabilityType,
  value: number,
): Promise<void> {
  const s = state!;
  const revisePage = new ReviseAvailabilityPage(page, context);
  await revisePage.ensureRoomTypeCalendar(s.roomType);
  const { message, selectedDays } = await revisePage.reviseAvailabilityForRange(s.businessDate, s.yearEnd, type, value);
  expect(selectedDays).toBe(Math.round((s.yearEnd.getTime() - s.businessDate.getTime()) / 86_400_000) + 1);
  expect(message).toBe(SUCCESS_MESSAGE);
}

/**
 * Availability – Revise Availability (increase / decrease saleable rooms)
 * via Manager Functions → Availability Management → Set Restrictions.
 *
 * REV_AVAIL_001 — INCREASE by Over Booking 10:
 *   1. Login with user + property from Excel.
 *   2. Watch/eye Quick Access → Availability: capture availability of all room types, close.
 *   3. Header search → Availability Management → filter: select a room type → Apply.
 *   4. Read any existing Over/Underbooking from the calendar to derive the base availability.
 *   5. Drag-select business date → 31 Dec → "select more days?" → No.
 *   6. Set Restrictions → Revise Availability → Type "Over Booking", By 10 → Save → OK.
 *   7. Re-open the availability grid → room type availability = base + 10 on every day.
 *
 * REV_AVAIL_002 — DECREASE by Under Booking 10 (same session):
 *   Same range → Type "Under Booking", By 10 → availability = base − 10.
 *   (The revision value is absolute, so this replaces the +10.)
 *
 * REV_AVAIL_003 — RESET to 0 (same session, also cleans up QC data):
 *   Same range → clear Type, By 0 → availability back to base.
 */
test.describe.serial('Availability - Revise Availability (Over/Under Booking)', () => {

  test.afterAll(async () => {
    if (process.env.KEEP_BROWSER_OPEN === 'true' && sharedPage && !sharedPage.isClosed()) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after the suite...');
      await sharedPage.pause();
    }
    await sharedContext?.close();
  });

  test('REV_AVAIL_001: Increase saleable rooms by Over Booking 10 and verify availability', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    const { context, page } = await getSharedSession(browser);

    const loginPage = new LoginPage(page, context);
    const availabilityGrid = new RecreateAvailabilityPage(page, context);
    const revisePage = new ReviseAvailabilityPage(page, context);

    const user = getUserByIndexFromExcel(1);
    expect(user).toBeDefined();
    const property = getPropertyByIndexFromExcel(3);
    expect(property).toBeDefined();
    logger.info(`User ${user!.username} (index ${user!.index}), property ${property!.code} (index ${property!.index})`);

    await test.step('Step 1: Login with user + property from Excel', async () => {
      await loginPage.loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    let before!: AvailabilityGridData;
    let businessDate!: Date;
    let yearEnd!: Date;
    let comparedDates!: string[];
    let roomType!: string;

    await test.step('Step 2: Capture availability of all room types via the watch/eye button', async () => {
      before = await captureAvailability(availabilityGrid);
      expect(before.roomTypes.length).toBeGreaterThan(0);
      before.roomTypes.forEach(r => logger.info(`  ${r.roomType}: ${r.availableRooms.slice(0, 7).join(', ')} ...`));

      businessDate = await revisePage.getBusinessDate();
      yearEnd = new Date(businessDate.getFullYear(), 11, 31);
      // Only grid columns up to 31 Dec are inside the revised range
      const columns = before.roomTypes[0].availableRooms.length;
      comparedDates = gridDates(businessDate, columns).filter(d => d <= toIsoDate(yearEnd));
      expect(comparedDates.length).toBeGreaterThan(0);

      // A room type that stays positive after Under Booking (REV_AVAIL_002)
      const candidate = before.roomTypes.find(r => Math.min(...r.availableRooms.slice(0, comparedDates.length)) > 2 * REVISE_BY)
        ?? before.roomTypes[0];
      roomType = candidate.roomType;
      logger.info(`Selected room type "${roomType}"; comparing ${comparedDates.length} day(s) from ${comparedDates[0]}`);
    });

    let existing!: RevisionByDate;

    await test.step('Step 3: Open Availability Management, select the room type and Apply', async () => {
      await revisePage.openAvailabilityManagement();
      await revisePage.selectRoomTypeAndApply(roomType);
      existing = await revisePage.getRevisionByDate();
    });

    // Base = what the grid would show with no revision (a previous run may have left one)
    const beforeValues = availabilityFor(before, roomType, comparedDates.length);
    const baseAvailability = beforeValues.map((v, i) => v - (existing.get(comparedDates[i]) ?? 0));
    state = { roomType, businessDate, yearEnd, comparedDates, baseAvailability };

    await test.step('Step 4: Drag-select business date → 31 Dec and answer No', async () => {
      const selectedDays = await revisePage.selectDateRangeByDrag(businessDate, yearEnd);
      expect(selectedDays).toBe(Math.round((yearEnd.getTime() - businessDate.getTime()) / 86_400_000) + 1);
      expect(await revisePage.getMoreDaysPromptText()).toContain('Do you want to select more days to update?');
      await revisePage.answerMoreDaysPrompt(false);
    });

    await test.step(`Step 5: Revise Availability → Over Booking by ${REVISE_BY} → Save`, async () => {
      const message = await revisePage.reviseAvailability('Over Booking', REVISE_BY);
      expect(message).toBe(SUCCESS_MESSAGE);
      await revisePage.confirmResultPopup();

      const revisions = await revisePage.getRevisionByDate();
      expect(revisions.get(toIsoDate(businessDate))).toBe(REVISE_BY);
      expect(revisions.get(toIsoDate(yearEnd))).toBe(REVISE_BY);
    });

    await test.step(`Step 6: Verify availability increased by ${REVISE_BY}`, async () => {
      await verifyAvailability(page, context, REVISE_BY, 'REV_AVAIL_001 Over Booking');
    });

    await page.screenshot({ path: 'screenshots/REV_AVAIL_001.png', fullPage: true });
  });

  test('REV_AVAIL_002: Decrease saleable rooms by Under Booking 10 and verify availability', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    expect(state, 'REV_AVAIL_001 must run first').not.toBeNull();
    const { context, page } = await getSharedSession(browser);

    await test.step(`Revise Availability → Under Booking by ${REVISE_BY} for business date → 31 Dec`, async () => {
      await applyRevision(page, context, 'Under Booking', REVISE_BY);
    });

    await test.step(`Verify availability decreased to base − ${REVISE_BY}`, async () => {
      await verifyAvailability(page, context, -REVISE_BY, 'REV_AVAIL_002 Under Booking');
    });

    await page.screenshot({ path: 'screenshots/REV_AVAIL_002.png', fullPage: true });
  });

  test('REV_AVAIL_003: Reset Revise Availability to 0 and verify availability returns to base', async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    expect(state, 'REV_AVAIL_001 must run first').not.toBeNull();
    const { context, page } = await getSharedSession(browser);

    await test.step('Revise Availability → reset to 0 for business date → 31 Dec', async () => {
      await applyRevision(page, context, 'Over Booking', 0);
    });

    await test.step('Verify availability is back to base', async () => {
      await verifyAvailability(page, context, 0, 'REV_AVAIL_003 Reset');
    });
  });
});
