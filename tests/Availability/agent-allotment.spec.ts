import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { AgentMaintenancePage } from '../../src/pages/Availability/AgentMaintenancePage';
import {
  AgentAllotmentPage,
  AvailabilitySnapshot,
  addDays,
  daysBetween,
  resolveSnapshotRoomTypeForOption,
} from '../../src/pages/Availability/AgentAllotmentPage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

// ── Shared LIVE browser session + agent state (serial mode) ─────────────────
// AGENT_MODIFY_002 continues AGENT_ALLLOT_001's LIVE browser session — it must
// NOT log in again. test.describe.serial runs both tests in the SAME worker, so
// module-level state persists between them. Test 1 populates these; test 2 reuses
// them. (A file backup of the agent state is also written for debugging.)
//
// NOTE: the earlier file-based approach (storageState.json restore) did NOT work —
// the app's login URL always shows the login form and direct /pms/ navigation is
// rejected ("Invalid Login Url!"), so the live session must be shared in-process.
const STATE_FILE = 'agent-allotment-state.json';

let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;
let sharedAgentName = '';
let sharedRoomTypeOption = '';
// Running Blocked count of the allotment — updated by each test so the next one
// knows the current value (5 → 10 in AGENT_MODIFY_002, 10 → 5 in AGENT_DECREASE_003).
let sharedBlocked = 5;

/**
 * Return the ONE shared browser context/page used by both serial tests.
 * Created lazily on first use; reused by the second test (same worker).
 */
async function getSharedSession(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  if (!sharedContext || sharedPage?.isClosed()) {
    // viewport: null → use the (maximized) browser window size, matching the config.
    sharedContext = await browser.newContext({ viewport: null });
    sharedPage = await sharedContext.newPage();
    logger.info('Created shared browser session for the serial agent-allotment tests');
  }
  return { context: sharedContext, page: sharedPage };
}

/** What AGENT_ALLLOT_001 hands off to AGENT_MODIFY_002. */
interface AllotmentState {
  agentName: string;
  roomTypeOption: string;
  blocked: number;
}

function saveState(state: AllotmentState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  logger.info(`Saved allotment state to ${STATE_FILE}: ${JSON.stringify(state)}`);
}

/** Read the agent state — in-memory first (serial handoff), file as fallback. */
function loadState(): AllotmentState {
  if (sharedAgentName && sharedRoomTypeOption) {
    const state: AllotmentState = { agentName: sharedAgentName, roomTypeOption: sharedRoomTypeOption, blocked: sharedBlocked };
    logger.info(`Using in-memory agent state: ${JSON.stringify(state)}`);
    return state;
  }
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error(`No agent state in memory or file "${STATE_FILE}" — AGENT_ALLLOT_001 must run first.`);
  }
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as AllotmentState;
  logger.info(`Loaded allotment state from ${STATE_FILE}: ${JSON.stringify(state)}`);
  return state;
}

/**
 * Availability – Agent Allotment (allocate rooms to an agent).
 *
 * Three SERIAL tests that share ONE live browser session (see getSharedSession):
 *
 * AGENT_ALLLOT_001 — create agent + allot 5 rooms:
 *   1. Login with user + property from Excel.
 *   2. Create a fresh agent via Marketing → Agent Maintenance (reuses AgentMaintenancePage).
 *   3. Open that agent (search by NAME → Card actions → Open).
 *   4. Capture availability of ALL room types via the watch/eye icon — the "before" snapshot.
 *   5. Sections → Allotment → "+" → fill Date From / Date To / Room Type / Blocked → Save.
 *      Allocates 5 rooms over a 5-day range; the room type is auto-picked from the
 *      "before" snapshot (one with enough availability on EVERY day of the range).
 *   6. Verify the allotment row appears; hand off state to the next test.
 *   7. Re-capture availability and ASSERT it decreased by the blocked count.
 *
 * AGENT_MODIFY_002 — continue the session, INCREASE the allotment 5 → 10 rooms:
 *   1. (No login — same shared page as test 1.)
 *   2. Ensure on the agent detail page (re-open the agent if needed).
 *   3. Sections → Allotment → pencil/edit icon → change Blocked 5 → 10 → Update.
 *   4. Verify the allotment row now shows Blocked=10.
 *   5. Re-capture availability and ASSERT it DECREASED by the 5 ADDITIONAL rooms.
 *
 * AGENT_DECREASE_003 — continue the session, REDUCE the allotment 10 → 5 rooms:
 *   1. (No login — same shared page as test 2.)
 *   2. Ensure on the agent detail page (re-open the agent if needed).
 *   3. Sections → Allotment → pencil/edit icon → change Blocked 10 → 5 → Update.
 *   4. Verify the allotment row now shows Blocked=5.
 *   5. Re-capture availability and ASSERT it INCREASED by the 5 RELEASED rooms.
 *
 * BUG VALIDATION: allotting/increasing MUST reduce availability; reducing an allotment
 * MUST increase availability — by the exact room delta on every day of the range. A
 * known application bug can leave availability unchanged — each test asserts the
 * correct behaviour and FAILS until the bug is fixed.
 */
test.describe.serial('Availability - Agent Allotment (Allocate Rooms)', () => {

  test.afterEach(async () => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen && sharedPage) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await sharedPage.pause();
    }
  });

  test('AGENT_ALLLOT_001: Allocate rooms to an agent via Allotment and check availability', async ({ browser }) => {
    const { context, page } = await getSharedSession(browser);
    test.setTimeout(15 * 60 * 1000); // 15 minute timeout

    const loginPage = new LoginPage(page, context);
    const agentMaintPage = new AgentMaintenancePage(page, context);
    const allotPage = new AgentAllotmentPage(page, context);

    // ── Pick user + property from Excel ──
    const user = getUserByIndexFromExcel(2);
    expect(user).toBeDefined();
    logger.info(`User from Excel: ${user!.username} (index ${user!.index})`);

    const property = getPropertyByIndexFromExcel(0); // WEBWE / Webwish Hotel
    expect(property).toBeDefined();
    logger.info(`Property from Excel: ${property!.code} (index ${property!.index})`);

    // ── Step 1: Login with user + property from Excel ──
    await test.step('Login with user + property from Excel', async () => {
      logger.info('Step 1: Logging in with user and property selection');
      await loginPage.loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    // ── Step 2: Create a fresh agent (unique name) to allot rooms to ──
    const timestamp = Date.now().toString().slice(-6);
    const agentCode = `AGT${timestamp}`;
    const agentName = `Agent_${timestamp}`;
    const legalName = `${agentName} Legal`;

    await test.step('Create a new agent to allot rooms to', async () => {
      logger.info(`Step 2: Creating agent ${agentCode} (${agentName})`);
      await agentMaintPage.navigateToAgentMaintenance();
      await agentMaintPage.verifyPageLoaded();
      await agentMaintPage.createAgentAndConfirm({
        agentCode,
        agentName,
        legalName,
        address: '123 Test Street',
        country: 'United Arab Emirates',
        mainHeadOption: 'OT Others',
      });
    });

    // ── Step 3: Open the newly created agent ──
    await test.step('Open the created agent', async () => {
      logger.info(`Step 3: Opening agent ${agentName}`);
      await allotPage.openAgent(agentName);
    });

    // ── Step 4: Capture availability BEFORE allotting (watch/eye icon) ──
    let beforeSnap: AvailabilitySnapshot;
    await test.step('Capture availability before allotment', async () => {
      logger.info('Step 4: Capturing availability before allotment');
      beforeSnap = await allotPage.captureAvailability();
      expect(beforeSnap.roomTypes.size, 'Availability snapshot should contain room types').toBeGreaterThan(0);
      logger.info(`Room types in availability: ${Array.from(beforeSnap.roomTypes.keys()).join(', ')}`);
    });

    // ── Step 5: Create the allotment (5-day range, 5 rooms, room type auto-picked) ──
    const businessDate = beforeSnap!.businessDate;
    const dateFrom = businessDate;
    // 5-day range: business date .. business date + 4 days (inclusive).
    const dateTo = addDays(businessDate, 4);
    const blocked = 5;

    let allottedOption = '';
    await test.step('Create allotment via Sections → Allotment → +', async () => {
      logger.info(`Step 5: Creating allotment ${dateFrom} → ${dateTo}, blocked ${blocked}`);
      await allotPage.openAllotmentSection();
      allottedOption = await allotPage.addAllotment(
        { dateFrom, dateTo, blocked },
        beforeSnap!,
      );
      logger.info(`Allotted room type option: "${allottedOption}"`);
    });

    // Hand off to the next serial test: in-memory + file backup.
    sharedAgentName = agentName;
    sharedRoomTypeOption = allottedOption;
    sharedBlocked = blocked;
    saveState({ agentName, roomTypeOption: allottedOption, blocked });

    await page.screenshot({
      path: `screenshots/agent-allotment-created-${agentCode}.png`,
      fullPage: true,
    });

    // ── Step 6: Verify the allotment row appears in the grid ──
    await test.step('Verify allotment row in grid', async () => {
      logger.info('Step 6: Verifying allotment row in the grid');
      const rowVisible = await allotPage.verifyAllotmentRow(dateFrom, dateTo, blocked);
      expect(rowVisible, 'Allotment row should be visible in the Allotment grid').toBeTruthy();
    });

    // ── Step 7: Capture availability AFTER and assert it decreased (bug validation) ──
    await test.step('Capture availability after allotment and assert decrease', async () => {
      logger.info('Step 7: Capturing availability after allotment');
      await allotPage.closeAllotmentDialog();

      const afterSnap = await allotPage.captureAvailability();

      // Map the dropdown option (e.g. "DLXD  LPT") back to the snapshot name (e.g. "LPT").
      const roomType = resolveSnapshotRoomTypeForOption(allottedOption, beforeSnap!);
      expect(roomType, `Allotted option "${allottedOption}" should map to a known room type`).toBeDefined();

      const beforeValues = beforeSnap!.roomTypes.get(roomType!) ?? [];
      const afterValues = afterSnap.roomTypes.get(roomType!) ?? [];
      const rangeDays = daysBetween(dateFrom, dateTo) + 1;

      logger.info(`──────────────────────────────────────────────`);
      logger.info(`Allotted room type : ${roomType} (option "${allottedOption}")`);
      logger.info(`Allotment period   : ${dateFrom} → ${dateTo} (${rangeDays} days)`);
      logger.info(`Blocked rooms      : ${blocked}`);

      // ── BUG VALIDATION ─────────────────────────────────────────────────
      // Expected behaviour: allotting `blocked` rooms across a date range MUST reduce
      // availability by `blocked` on every day of that range. A known application bug
      // currently leaves availability unchanged after an allotment — the assertions
      // below are designed to FAIL until that bug is fixed.
      // ────────────────────────────────────────────────────────────────────
      for (let day = 0; day < rangeDays; day++) {
        const dateForDay = addDays(dateFrom, day);
        const beforeCount = beforeValues[day] ?? -1;
        const afterCount = afterValues[day] ?? -1;

        logger.info(`  ${dateForDay}: BEFORE=${beforeCount}  AFTER=${afterCount}`);

        // Both snapshots must have captured availability for this day.
        expect(beforeCount, `Availability before should be captured for ${roomType} on ${dateForDay}`).toBeGreaterThanOrEqual(0);
        expect(afterCount, `Availability after should be captured for ${roomType} on ${dateForDay}`).toBeGreaterThanOrEqual(0);

        // 1) BUG CHECK: availability MUST decrease after the allotment.
        expect(
          afterCount,
          `BUG: availability for ${roomType} on ${dateForDay} did NOT decrease after allotting ${blocked} rooms (before=${beforeCount}, after=${afterCount})`,
        ).toBeLessThan(beforeCount);

        // 2) It must decrease by EXACTLY the number of blocked rooms.
        expect(
          beforeCount - afterCount,
          `Availability for ${roomType} on ${dateForDay} should drop by exactly ${blocked} (the allotted room count), before=${beforeCount}, after=${afterCount}`,
        ).toBe(blocked);
      }

      logger.info(`──────────────────────────────────────────────`);
      logger.info(`Validated availability drop of ${blocked} for ${roomType} across ${rangeDays} days (${dateFrom} → ${dateTo})`);
      logger.info(`──────────────────────────────────────────────`);
    });

    await page.screenshot({
      path: `screenshots/agent-allotment-availability-${agentCode}.png`,
      fullPage: true,
    });

    logger.info(`AGENT_ALLLOT_001 completed: allotment created for ${agentName} (${agentCode})`);
  });

  /**
   * AGENT_MODIFY_002 — continues AGENT_ALLLOT_001's LIVE session (no re-login).
   *
   * Edits the allotment created in test 1: Sections → Allotment → pencil/edit icon →
   * change Blocked from 5 to 10 → Update. Then re-checks availability and ASSERTS it
   * decreased by the 5 ADDITIONAL rooms (the edit's effect) on every day of the range.
   *
   * BUG VALIDATION: the same application bug can affect the edit path too — this test
   * FAILS until availability correctly decreases after the allotment edit.
   */
  test('AGENT_MODIFY_002: Edit allotment Blocked from 5 to 10 and verify availability', async ({ browser }) => {
    const { context, page } = await getSharedSession(browser); // SAME session as test 1
    test.setTimeout(10 * 60 * 1000); // 10 minute timeout

    // Load what AGENT_ALLLOT_001 created (agent name, room type, blocked count).
    const state = loadState();
    // This test continues the shared session — no LoginPage / re-login needed.
    const allotPage = new AgentAllotmentPage(page, context);

    // ── Step 1: Ensure we are on the agent detail page (test 1 leaves us here) ──
    await test.step('Ensure we are on the agent detail page (session continues)', async () => {
      if (await allotPage.isOnAgentDetailPage()) {
        logger.info(`Step 1: Already on the agent detail page for ${state.agentName} (session continues — no login)`);
      } else {
        logger.info(`Step 1: Not on agent detail page — re-opening agent ${state.agentName} (no login)`);
        await allotPage.navigateToAgentMaintenance();
        await allotPage.openAgent(state.agentName);
      }
    });

    // ── Step 2: Capture availability BEFORE the edit (baseline for the edit delta) ──
    let beforeSnap: AvailabilitySnapshot;
    await test.step('Capture availability before editing the allotment', async () => {
      logger.info('Step 2: Capturing availability before the allotment edit');
      beforeSnap = await allotPage.captureAvailability();
      expect(beforeSnap.roomTypes.size, 'Availability snapshot should contain room types').toBeGreaterThan(0);
    });

    // ── Step 3: Edit the allotment — Blocked 5 → 10 via the pencil/edit icon ──
    const oldBlocked = 5;
    const newBlocked = 10;
    await test.step(`Edit allotment Blocked from ${oldBlocked} to ${newBlocked}`, async () => {
      logger.info(`Step 3: Editing allotment — Blocked ${oldBlocked} → ${newBlocked}`);
      await allotPage.openAllotmentSection();
      await allotPage.editAllotmentBlocked(newBlocked);
    });

    // Record the new blocked count for AGENT_DECREASE_003 (same worker).
    sharedBlocked = newBlocked;
    saveState({ agentName: state.agentName, roomTypeOption: state.roomTypeOption, blocked: newBlocked });

    await page.screenshot({
      path: `screenshots/agent-allotment-edited-${state.agentName}.png`,
      fullPage: true,
    });

    // ── Step 4: Verify the allotment row now shows the new Blocked value ──
    await test.step('Verify allotment row shows the updated Blocked count', async () => {
      logger.info('Step 4: Verifying the allotment row shows Blocked=10');
      const rowUpdated = await allotPage.verifyAllotmentBlocked(newBlocked);
      expect(rowUpdated, `Allotment row should show Blocked=${newBlocked}`).toBeTruthy();
    });

    // ── Step 5: Capture availability AFTER the edit and assert the decrease ──
    await test.step('Capture availability after edit and assert decrease', async () => {
      logger.info('Step 5: Capturing availability after the allotment edit');
      await allotPage.closeAllotmentDialog();

      const afterSnap = await allotPage.captureAvailability();

      // Map the dropdown option (e.g. "DELX  DGT") back to the snapshot name (e.g. "DGT").
      const roomType = resolveSnapshotRoomTypeForOption(state.roomTypeOption, beforeSnap!);
      expect(roomType, `Allotted option "${state.roomTypeOption}" should map to a known room type`).toBeDefined();

      const businessDate = beforeSnap!.businessDate;
      const dateFrom = businessDate;
      const dateTo = addDays(businessDate, 4);
      const rangeDays = daysBetween(dateFrom, dateTo) + 1;
      const additionalBlocked = newBlocked - oldBlocked; // the 5 extra rooms from the edit

      logger.info(`──────────────────────────────────────────────`);
      logger.info(`Allotted room type : ${roomType} (option "${state.roomTypeOption}")`);
      logger.info(`Allotment edited   : Blocked ${oldBlocked} → ${newBlocked}`);
      logger.info(`Allotment period   : ${dateFrom} → ${dateTo} (${rangeDays} days)`);
      logger.info(`Additional rooms   : ${additionalBlocked}`);

      // ── BUG VALIDATION ─────────────────────────────────────────────────
      // Editing the allotment from 5 → 10 MUST decrease availability by the 5 ADDITIONAL
      // rooms on every day of the range (the edit's effect). A known application bug
      // leaves availability unchanged — the assertions below FAIL until it is fixed.
      // ────────────────────────────────────────────────────────────────────
      for (let day = 0; day < rangeDays; day++) {
        const dateForDay = addDays(dateFrom, day);
        const beforeCount = beforeSnap!.roomTypes.get(roomType!)?.[day] ?? -1;
        const afterCount = afterSnap.roomTypes.get(roomType!)?.[day] ?? -1;

        logger.info(`  ${dateForDay}: BEFORE=${beforeCount}  AFTER=${afterCount}`);

        // Both snapshots must have captured availability for this day.
        expect(beforeCount, `Availability before should be captured for ${roomType} on ${dateForDay}`).toBeGreaterThanOrEqual(0);
        expect(afterCount, `Availability after should be captured for ${roomType} on ${dateForDay}`).toBeGreaterThanOrEqual(0);

        // 1) BUG CHECK: availability MUST decrease after the edit.
        expect(
          afterCount,
          `BUG: availability for ${roomType} on ${dateForDay} did NOT decrease after editing allotment to ${newBlocked} rooms (before=${beforeCount}, after=${afterCount})`,
        ).toBeLessThan(beforeCount);

        // 2) It must decrease by EXACTLY the additional rooms (5).
        expect(
          beforeCount - afterCount,
          `Availability for ${roomType} on ${dateForDay} should drop by exactly ${additionalBlocked} (the additional rooms from the edit), before=${beforeCount}, after=${afterCount}`,
        ).toBe(additionalBlocked);
      }

      logger.info(`──────────────────────────────────────────────`);
      logger.info(`Validated availability drop of ${additionalBlocked} for ${roomType} across ${rangeDays} days (${dateFrom} → ${dateTo})`);
      logger.info(`──────────────────────────────────────────────`);
    });

    await page.screenshot({
      path: `screenshots/agent-allotment-edited-availability-${state.agentName}.png`,
      fullPage: true,
    });

    logger.info(`AGENT_MODIFY_002 completed: allotment for ${state.agentName} edited to Blocked=${newBlocked}`);
  });

  /**
   * AGENT_DECREASE_003 — continues the session, REDUCE the allotment 10 → 5 rooms.
   *
   * The inverse of AGENT_MODIFY_002: lowering Blocked from 10 to 5 RELEASES 5 rooms,
   * so availability MUST INCREASE by the released count on every day of the range.
   *
   * BUG VALIDATION: reducing an allotment MUST increase availability by the released
   * rooms — this test FAILS until the app correctly releases the rooms.
   */
  test('AGENT_DECREASE_003: Reduce allotment Blocked from 10 to 5 and verify availability', async ({ browser }) => {
    const { context, page } = await getSharedSession(browser); // SAME session as tests 1-2
    test.setTimeout(10 * 60 * 1000); // 10 minute timeout

    // Load state — AGENT_MODIFY_002 left the allotment at Blocked=10.
    const state = loadState();
    // This test continues the shared session — no LoginPage / re-login needed.
    const allotPage = new AgentAllotmentPage(page, context);

    // ── Step 1: Ensure we are on the agent detail page (test 2 leaves us here) ──
    await test.step('Ensure we are on the agent detail page (session continues)', async () => {
      if (await allotPage.isOnAgentDetailPage()) {
        logger.info(`Step 1: Already on the agent detail page for ${state.agentName} (session continues — no login)`);
      } else {
        logger.info(`Step 1: Not on agent detail page — re-opening agent ${state.agentName} (no login)`);
        await allotPage.navigateToAgentMaintenance();
        await allotPage.openAgent(state.agentName);
      }
    });

    // ── Step 2: Capture availability BEFORE the reduction (baseline) ──
    let beforeSnap: AvailabilitySnapshot;
    await test.step('Capture availability before reducing the allotment', async () => {
      logger.info('Step 2: Capturing availability before the allotment reduction');
      beforeSnap = await allotPage.captureAvailability();
      expect(beforeSnap.roomTypes.size, 'Availability snapshot should contain room types').toBeGreaterThan(0);
    });

    // ── Step 3: Reduce the allotment — Blocked 10 → 5 via the pencil/edit icon ──
    const oldBlocked = state.blocked; // 10 (after AGENT_MODIFY_002)
    const newBlocked = 5;
    await test.step(`Reduce allotment Blocked from ${oldBlocked} to ${newBlocked}`, async () => {
      logger.info(`Step 3: Reducing allotment — Blocked ${oldBlocked} → ${newBlocked}`);
      await allotPage.openAllotmentSection();
      await allotPage.editAllotmentBlocked(newBlocked);
    });

    // Record the reduced blocked count for any further serial tests.
    sharedBlocked = newBlocked;
    saveState({ agentName: state.agentName, roomTypeOption: state.roomTypeOption, blocked: newBlocked });

    await page.screenshot({
      path: `screenshots/agent-allotment-reduced-${state.agentName}.png`,
      fullPage: true,
    });

    // ── Step 4: Verify the allotment row now shows Blocked=5 ──
    await test.step('Verify allotment row shows the reduced Blocked count', async () => {
      logger.info('Step 4: Verifying the allotment row shows Blocked=5');
      const rowUpdated = await allotPage.verifyAllotmentBlocked(newBlocked);
      expect(rowUpdated, `Allotment row should show Blocked=${newBlocked}`).toBeTruthy();
    });

    // ── Step 5: Capture availability AFTER and assert the INCREASE ──
    await test.step('Capture availability after reduction and assert increase', async () => {
      logger.info('Step 5: Capturing availability after the allotment reduction');
      await allotPage.closeAllotmentDialog();

      const afterSnap = await allotPage.captureAvailability();

      // Map the dropdown option back to the snapshot room-type name.
      const roomType = resolveSnapshotRoomTypeForOption(state.roomTypeOption, beforeSnap!);
      expect(roomType, `Allotted option "${state.roomTypeOption}" should map to a known room type`).toBeDefined();

      const businessDate = beforeSnap!.businessDate;
      const dateFrom = businessDate;
      const dateTo = addDays(businessDate, 4);
      const rangeDays = daysBetween(dateFrom, dateTo) + 1;
      const releasedRooms = oldBlocked - newBlocked; // the 5 rooms freed by the reduction

      logger.info(`──────────────────────────────────────────────`);
      logger.info(`Allotted room type : ${roomType} (option "${state.roomTypeOption}")`);
      logger.info(`Allotment reduced  : Blocked ${oldBlocked} → ${newBlocked}`);
      logger.info(`Allotment period   : ${dateFrom} → ${dateTo} (${rangeDays} days)`);
      logger.info(`Released rooms     : ${releasedRooms}`);

      // ── BUG VALIDATION ─────────────────────────────────────────────────
      // REDUCING the allotment from 10 → 5 MUST increase availability by the 5
      // RELEASED rooms on every day of the range. A known application bug can leave
      // availability unchanged — the assertions below FAIL until it is fixed.
      // ────────────────────────────────────────────────────────────────────
      for (let day = 0; day < rangeDays; day++) {
        const dateForDay = addDays(dateFrom, day);
        const beforeCount = beforeSnap!.roomTypes.get(roomType!)?.[day] ?? -1;
        const afterCount = afterSnap.roomTypes.get(roomType!)?.[day] ?? -1;

        logger.info(`  ${dateForDay}: BEFORE=${beforeCount}  AFTER=${afterCount}`);

        // Both snapshots must have captured availability for this day.
        expect(beforeCount, `Availability before should be captured for ${roomType} on ${dateForDay}`).toBeGreaterThanOrEqual(0);
        expect(afterCount, `Availability after should be captured for ${roomType} on ${dateForDay}`).toBeGreaterThanOrEqual(0);

        // 1) BUG CHECK: availability MUST increase after the reduction.
        expect(
          afterCount,
          `BUG: availability for ${roomType} on ${dateForDay} did NOT increase after reducing allotment to ${newBlocked} rooms (before=${beforeCount}, after=${afterCount})`,
        ).toBeGreaterThan(beforeCount);

        // 2) It must increase by EXACTLY the released rooms (5).
        expect(
          afterCount - beforeCount,
          `Availability for ${roomType} on ${dateForDay} should rise by exactly ${releasedRooms} (the released rooms), before=${beforeCount}, after=${afterCount}`,
        ).toBe(releasedRooms);
      }

      logger.info(`──────────────────────────────────────────────`);
      logger.info(`Validated availability rise of ${releasedRooms} for ${roomType} across ${rangeDays} days (${dateFrom} → ${dateTo})`);
      logger.info(`──────────────────────────────────────────────`);
    });

    await page.screenshot({
      path: `screenshots/agent-allotment-reduced-availability-${state.agentName}.png`,
      fullPage: true,
    });

    logger.info(`AGENT_DECREASE_003 completed: allotment for ${state.agentName} reduced to Blocked=${newBlocked}`);
  });

  

});
