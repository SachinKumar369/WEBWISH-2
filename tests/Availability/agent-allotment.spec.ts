import { test, expect } from '@playwright/test';
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

/**
 * Availability – Agent Allotment (allocate rooms to an agent).
 *
 * Flow (verified on QC / WEBWE):
 *   1. Login with user + property from Excel.
 *   2. Create a fresh agent via Marketing → Agent Maintenance (reuses AgentMaintenancePage).
 *   3. Open that agent (search by NAME → Card actions → Open).
 *   4. Capture availability of ALL room types via the watch/eye icon
 *      (Quick Access → Availability) — the "before" snapshot.
 *   5. Sections → Allotment → "+" → fill Date From / Date To / Room Type / Blocked → Save.
 *      Allocates 5 rooms over a 5-day range; the room type is auto-picked from the
 *      "before" snapshot (one with enough availability on EVERY day of the range).
 *   6. Verify the allotment row appears in the Allotment grid.
 *   7. Re-capture availability (the "after" snapshot) and ASSERT it decreased by the
 *      allotted room count on every day of the range.
 *
 * BUG VALIDATION: allotting rooms MUST reduce availability by the blocked count on every
 * day of the allotment range. A known application bug currently leaves availability
 * unchanged after an allotment — Step 7 asserts the correct behaviour and will FAIL until
 * the bug is fixed.
 */
test.describe.serial('Availability - Agent Allotment (Allocate Rooms)', () => {

  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('AGENT_ALLOT_001: Allocate rooms to an agent via Allotment and check availability', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000); // 15 minute timeout

    const loginPage = new LoginPage(page, context);
    const agentMaintPage = new AgentMaintenancePage(page, context);
    const allotPage = new AgentAllotmentPage(page, context);

    // ── Pick user + property from Excel ──
    const user = getUserByIndexFromExcel(0);
    expect(user).toBeDefined();
    logger.info(`User from Excel: ${user!.username} (index ${user!.index})`);

    const property = getPropertyByIndexFromExcel(3); // WEBWE / Webwish Hotel
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

    logger.info(`AGENT_ALLOT_001 completed: allotment created for ${agentName} (${agentCode})`);
  });
});
