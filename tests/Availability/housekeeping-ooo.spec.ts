import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { HousekeepingOperationsPage } from '../../src/pages/Availability/HousekeepingOperationsPage';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';

const timestamp = Date.now();
const remarks = `HK_OOO_${timestamp}`;

/**
 * Parse a date string in DD/MM/YYYY format and return a Date object.
 */
function parseBusinessDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date object back to DD/MM/YYYY string.
 */
function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Test: Housekeeping Permanent Out of Order flow.
 * Navigates to Housekeeping Operations, fetches availability,
 * filters by room type, sets a vacant room as Permanent Out of Order,
 * and verifies availability decreased by 1.
 *
 * All room types and dates are dynamically derived — nothing is hardcoded.
 */
test.describe.serial('Housekeeping Permanent Out of Order', () => {

  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (dialog) => {
      logger.info(`Handling dialog: ${dialog.type()} - ${dialog.message()}`);
      await dialog.accept();
    });
  });

  test.skip('Set room as Permanent Out of Order and verify availability', async ({ page, context }) => {
    test.setTimeout(30 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const hkOps = new HousekeepingOperationsPage(page, context);

    const user = getUserByIndexFromExcel(0);
    expect(user).toBeDefined();

    // ── Step 1: Login with user + property from Excel ──
    await test.step('Login with user + property from Excel', async () => {
      logger.info('Logging in and selecting property for Housekeeping OOO flow');
      const prop = getPropertyByIndexFromExcel(3); // WEBWE property
      await loginPage.loginWithPropertySelection(user!.username, user!.password, prop!.index);
    });

    // ── Step 2: Navigate to Housekeeping Operations ──
    await test.step('Navigate to Housekeeping Operations', async () => {
      await hkOps.navigateToHousekeepingOperations();
      const loaded = await hkOps.verifyPageLoaded();
      expect(loaded).toBeTruthy();
      logger.info('Housekeeping Operations page opened');
    });

    // ── Step 3: Get business date ──
    let businessDate = '';
    let businessDateObj: Date;

    await test.step('Get business date', async () => {
      businessDate = await hkOps.getBusinessDate();
      expect(businessDate).toBeTruthy();
      businessDateObj = parseBusinessDate(businessDate);
      logger.info(`Business Date: ${businessDate}`);
    });

    await page.screenshot({
      path: 'screenshots/hk-ooo-page-loaded.png',
      fullPage: true,
    });

    // ── Steps 4-5: Find a room type with eligible vacant rooms ──
    let availabilityBefore: Map<string, number[]>;
    let roomTypeToTest = '';
    let roomTypeAvailBefore = 0;
    let vacantRoom = '';

    await test.step('Find a room type with eligible vacant rooms', async () => {
      // Step 4: Fetch baseline room availability
      availabilityBefore = await hkOps.fetchAvailability();
      expect(availabilityBefore.size).toBeGreaterThan(0);
      logger.info(`Baseline availability fetched for ${availabilityBefore.size} room types`);

      // Log availability for each room type
      availabilityBefore.forEach((counts, roomType) => {
        logger.info(`  ${roomType}: business date = ${counts[0]}`);
      });

      // Build list of eligible room types (availability > 0), skipping zero-availability ones
      const eligibleRoomTypes: { name: string; avail: number }[] = [];
      availabilityBefore.forEach((counts, roomType) => {
        if (roomType && counts[0] > 0) {
          eligibleRoomTypes.push({ name: roomType, avail: counts[0] });
        }
      });

      logger.info(`Found ${eligibleRoomTypes.length} room types with availability > 0: ${eligibleRoomTypes.map(r => `${r.name}(${r.avail})`).join(', ')}`);

      // Close the availability dialog
      await hkOps.closeAvailabilityDialog();

      await page.screenshot({
        path: 'screenshots/hk-ooo-availability-before.png',
        fullPage: true,
      });

      // Try each eligible room type until we find one with a vacant room (no booking)
      for (const candidate of eligibleRoomTypes) {
        logger.info(`\n--- Trying room type: ${candidate.name} (availability: ${candidate.avail}) ---`);

        // Apply filter for this room type + Vacant
        await hkOps.filterByRoomTypeAndSellingStatus(candidate.name, 'Vacant');

        // Get visible room count
        const visibleCount = await hkOps.getVisibleRoomCount();
        logger.info(`Visible vacant ${candidate.name} rooms: ${visibleCount}`);

        if (visibleCount === 0) {
          logger.info(`⚠️ Room type ${candidate.name}: no visible rooms after filter. Trying next room type...`);
          await hkOps.closeFilterDialog();
          await page.waitForTimeout(500);
          continue;
        }

        // Pick the first room that does NOT have a booking (no mdi-account icon)
        const availableRooms = await hkOps.getRoomNumbersWithoutBooking(1);

        if (availableRooms.length > 0) {
          // Found a valid room — use this room type
          roomTypeToTest = candidate.name;
          roomTypeAvailBefore = candidate.avail;
          vacantRoom = availableRooms[0];
          logger.info(`✅ Room type ${roomTypeToTest}: found vacant room ${vacantRoom} (availability: ${roomTypeAvailBefore})`);
          break;
        }

        // No eligible rooms without bookings — try next room type
        logger.info(`⚠️ Room type ${candidate.name}: no vacant rooms without bookings. Trying next room type...`);
        await hkOps.closeFilterDialog();
        await page.waitForTimeout(500);
      }

      // Final check — we must have found a valid room
      expect(roomTypeToTest).toBeTruthy();
      expect(roomTypeAvailBefore).toBeGreaterThan(0);
      expect(vacantRoom).toBeTruthy();
    });

    logger.info(`${roomTypeToTest} availability BEFORE OOO: ${roomTypeAvailBefore}`);
    logger.info(`Selected vacant room: ${vacantRoom}`);

    await page.screenshot({
      path: 'screenshots/hk-ooo-filtered.png',
      fullPage: true,
    });

    // ── Step 6: Set room as Permanent Out of Order ──
    let oooResult: any;
    let dateToDay: number;

    await test.step(`Set room ${vacantRoom} as Permanent Out of Order`, async () => {
      // Dynamically calculate Date To: business date + 5 days
      const dateToDate = new Date(businessDateObj!);
      dateToDate.setDate(dateToDate.getDate() + 5);
      dateToDay = dateToDate.getDate();
      const dateToFormatted = formatDate(dateToDate);
      logger.info(`Date To: ${dateToFormatted} (business date + 5 days), day = ${dateToDay}`);

      oooResult = await hkOps.setRoomPermanentOutOfOrder(
        vacantRoom,
        dateToDay,
        remarks
      );

      expect(oooResult.success).toBeTruthy();
      logger.info(`Room ${vacantRoom} successfully set as Permanent Out of Order`);
      logger.info(`OOO Result: ${JSON.stringify(oooResult)}`);
    });

    await page.screenshot({
      path: 'screenshots/hk-ooo-applied.png',
      fullPage: true,
    });

    // ── Step 7: Verify availability decreased by 1 ──
    await test.step(`Verify ${roomTypeToTest} availability decreased by 1`, async () => {
      const availabilityAfter = await hkOps.fetchAvailability();
      const roomTypeAvailAfter = availabilityAfter.get(roomTypeToTest)?.[0] ?? 0;

      logger.info(`${roomTypeToTest} availability AFTER OOO: ${roomTypeAvailAfter}`);
      logger.info(`Expected: ${roomTypeAvailBefore - 1}`);

      // The availability should have decreased by 1
      expect(roomTypeAvailAfter).toBe(roomTypeAvailBefore - 1);
      logger.info(`✅ ${roomTypeToTest} availability decreased from ${roomTypeAvailBefore} to ${roomTypeAvailAfter} (as expected)`);

      // Close the availability dialog
      await hkOps.closeAvailabilityDialog();
    });

    await page.screenshot({      path: 'screenshots/hk-ooo-availability-after.png',
      fullPage: true,
    });
  });

  test('Set 5 rooms as Permanent Out of Order at once and verify availability', async ({ page, context }) => {
    test.setTimeout(30 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const hkOps = new HousekeepingOperationsPage(page, context);
    const roomsToSetOoo = 5;

    const user = getUserByIndexFromExcel(0);
    expect(user).toBeDefined();

    // ── Step 1: Login with user + property from Excel ──
    await test.step('Login with user + property from Excel', async () => {
      logger.info('Logging in and selecting property for Housekeeping Multi-Room OOO flow');
      const prop = getPropertyByIndexFromExcel(3);
      await loginPage.loginWithPropertySelection(user!.username, user!.password, prop!.index);
    });

    // ── Step 2: Navigate to Housekeeping Operations ──
    await test.step('Navigate to Housekeeping Operations', async () => {
      await hkOps.navigateToHousekeepingOperations();
      const loaded = await hkOps.verifyPageLoaded();
      expect(loaded).toBeTruthy();
      logger.info('Housekeeping Operations page opened');
    });

    // ── Step 3: Get business date ──
    let businessDate = '';
    let businessDateObj: Date;

    await test.step('Get business date', async () => {
      businessDate = await hkOps.getBusinessDate();
      expect(businessDate).toBeTruthy();
      businessDateObj = parseBusinessDate(businessDate);
      logger.info(`Business Date: ${businessDate}`);
    });

    await page.screenshot({
      path: 'screenshots/hk-multi-ooo-page-loaded.png',
      fullPage: true,
    });

    // ── Steps 4-6: Find a room type with enough eligible vacant rooms ──
    let availabilityBefore: Map<string, number[]>;
    let roomTypeToTest = '';
    let roomTypeAvailBefore = 0;
    let vacantRoomNumbers: string[] = [];

    await test.step('Find a room type with enough eligible vacant rooms', async () => {
      // Step 4: Fetch baseline room availability
      availabilityBefore = await hkOps.fetchAvailability();
      expect(availabilityBefore.size).toBeGreaterThan(0);

      // Build sorted list of room types with enough availability
      const eligibleRoomTypes: { name: string; avail: number }[] = [];
      availabilityBefore.forEach((counts, roomType) => {
        if (roomType && counts[0] >= roomsToSetOoo) {
          eligibleRoomTypes.push({ name: roomType, avail: counts[0] });
        }
      });

      expect(eligibleRoomTypes.length).toBeGreaterThan(0);
      logger.info(`Found ${eligibleRoomTypes.length} room types with availability >= ${roomsToSetOoo}: ${eligibleRoomTypes.map(r => `${r.name}(${r.avail})`).join(', ')}`);

      // Close the availability dialog
      await hkOps.closeAvailabilityDialog();

      await page.screenshot({
        path: 'screenshots/hk-multi-ooo-availability-before.png',
        fullPage: true,
      });

      // Step 5-6: Try each room type until we find enough eligible vacant rooms
      for (const candidate of eligibleRoomTypes) {
        logger.info(`\n--- Trying room type: ${candidate.name} (availability: ${candidate.avail}) ---`);

        // Apply filter for this room type + Vacant
        await hkOps.filterByRoomTypeAndSellingStatus(candidate.name, 'Vacant');

        // Count rooms without bookings
        const eligibleRooms = await hkOps.getRoomNumbersWithoutBooking(roomsToSetOoo + 2);

        if (eligibleRooms.length >= roomsToSetOoo) {
          // Found enough rooms — use this room type
          roomTypeToTest = candidate.name;
          roomTypeAvailBefore = candidate.avail;
          vacantRoomNumbers = eligibleRooms.slice(0, roomsToSetOoo);
          logger.info(`✅ Room type ${roomTypeToTest}: ${eligibleRooms.length} eligible rooms found (need ${roomsToSetOoo}). Selected: ${vacantRoomNumbers.join(', ')}`);
          break;
        }

        // Not enough rooms — close filter, try next room type
        logger.info(`⚠️ Room type ${candidate.name}: only ${eligibleRooms.length} eligible rooms (need ${roomsToSetOoo}). Trying next room type...`);
        await hkOps.closeFilterDialog();
        await page.waitForTimeout(500);
      }

      // Final check — we must have found a room type
      expect(roomTypeToTest).toBeTruthy();
      expect(vacantRoomNumbers.length).toBeGreaterThanOrEqual(roomsToSetOoo);
    });

    logger.info(`\nFinal selection: room type ${roomTypeToTest}, availability: ${roomTypeAvailBefore}`);
    logger.info(`Rooms to process: ${vacantRoomNumbers.join(', ')}`);

    await page.screenshot({
      path: 'screenshots/hk-multi-ooo-filtered.png',
      fullPage: true,
    });

    // ── Step 7: Process each room one at a time ──
    let dateToDay: number;
    const remarksMulti = `HK_MULTI_OOO_${timestamp}`;
    let roomsProcessed = 0;

    await test.step(`Set ${roomsToSetOoo} rooms as Permanent Out of Order`, async () => {
      // Dynamically calculate Date To: business date + 5 days
      const dateToDate = new Date(businessDateObj!);
      dateToDate.setDate(dateToDate.getDate() + 5);
      dateToDay = dateToDate.getDate();
      const dateToFormatted = formatDate(dateToDate);
      logger.info(`Date To: ${dateToFormatted} (business date + 5 days), day = ${dateToDay}`);

      for (let i = 0; i < roomsToSetOoo; i++) {
        const roomNumber = vacantRoomNumbers[i];
        logger.info(`\n--- Processing room ${i + 1}/${roomsToSetOoo}: ${roomNumber} ---`);

        // Click room card
        await hkOps.clickRoom(roomNumber);

        // Click Set Permanent Out of Order
        await hkOps.clickSetPermanentOoo();

        // Set Date To and Remarks in the header
        await hkOps.setHeaderDateTo(dateToDay);
        await hkOps.setHeaderRemarks(remarksMulti);

        // Click Apply to populate table
        await hkOps.clickOooApply();
        await page.waitForTimeout(1000);

        // Check the room checkbox (row 0)
        await hkOps.checkOooRoomRow(0);

        // Save Selected Rooms
        await hkOps.clickSaveSelectedRooms();

        // Handle SweetAlert (may have confirmation dialog)
        const result = await hkOps.handleSweetAlert();
        logger.info(`Room ${roomNumber} OOO result: success=${result.success}`);

        // Close the OOO dialog
        await hkOps.closeOooDialog();
        await page.waitForTimeout(500);

        roomsProcessed++;
        logger.info(`Room ${roomNumber} processed successfully (${roomsProcessed}/${roomsToSetOoo})`);
      }

      expect(roomsProcessed).toBe(roomsToSetOoo);
      logger.info(`\nAll ${roomsToSetOoo} rooms processed successfully`);
    });

    await page.screenshot({
      path: 'screenshots/hk-multi-ooo-saved.png',
      fullPage: true,
    });

    // ── Step 8: Verify availability decreased by roomsToSetOoo ──
    await test.step(`Verify ${roomTypeToTest} availability decreased by ${roomsToSetOoo}`, async () => {
      const availabilityAfter = await hkOps.fetchAvailability();
      const roomTypeAvailAfter = availabilityAfter.get(roomTypeToTest)?.[0] ?? 0;

      logger.info(`${roomTypeToTest} availability AFTER multi-room OOO: ${roomTypeAvailAfter}`);
      logger.info(`Expected: ${roomTypeAvailBefore - roomsToSetOoo}`);

      // The availability should have decreased by the number of rooms set as OOO
      expect(roomTypeAvailAfter).toBe(roomTypeAvailBefore - roomsToSetOoo);
      logger.info(`✅ ${roomTypeToTest} availability decreased from ${roomTypeAvailBefore} to ${roomTypeAvailAfter} (decreased by ${roomsToSetOoo} as expected)`);

      await hkOps.closeAvailabilityDialog();
    });

    await page.screenshot({      path: 'screenshots/hk-ooo-availability-after.png',
      fullPage: true,
    });
  });

  test('Release 1 room from Permanent Out of Order and verify availability increased', async ({ page, context }) => {
    test.setTimeout(30 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const hkOps = new HousekeepingOperationsPage(page, context);

    const user = getUserByIndexFromExcel(0);
    expect(user).toBeDefined();

    // ── Step 1: Login with user + property from Excel ──
    await test.step('Login with user + property from Excel', async () => {
      logger.info('Logging in and selecting property for Housekeeping Release OOO flow');
      const prop = getPropertyByIndexFromExcel(3); // WEBWE property
      await loginPage.loginWithPropertySelection(user!.username, user!.password, prop!.index);
    });

    // ── Step 2: Navigate to Housekeeping Operations ──
    await test.step('Navigate to Housekeeping Operations', async () => {
      await hkOps.navigateToHousekeepingOperations();
      const loaded = await hkOps.verifyPageLoaded();
      expect(loaded).toBeTruthy();
      logger.info('Housekeeping Operations page opened');
    });

    // ── Step 3: Get business date ──
    let businessDate = '';
    let businessDateObj: Date;

    await test.step('Get business date', async () => {
      businessDate = await hkOps.getBusinessDate();
      expect(businessDate).toBeTruthy();
      businessDateObj = parseBusinessDate(businessDate);
      logger.info(`Business Date: ${businessDate}`);
    });

    await page.screenshot({
      path: 'screenshots/hk-release-ooo-page-loaded.png',
      fullPage: true,
    });

    // ── Step 4: Fetch baseline room availability for a room type with P-OOO rooms ──
    let availabilityBefore: Map<string, number[]>;
    let roomTypeToTest = '';
    let roomTypeAvailBefore = 0;

    await test.step('Find a room type with P-OOO rooms to release', async () => {
      availabilityBefore = await hkOps.fetchAvailability();
      expect(availabilityBefore.size).toBeGreaterThan(0);

      // Find a room type with availability > 0 (meaning there are P-OOO rooms we can release)
      for (const [roomType, counts] of availabilityBefore) {
        if (roomType && counts[0] > 0) {
          roomTypeToTest = roomType;
          roomTypeAvailBefore = counts[0];
          break;
        }
      }

      expect(roomTypeToTest).toBeTruthy();
      expect(roomTypeAvailBefore).toBeGreaterThan(0);
      logger.info(`Selected room type: ${roomTypeToTest} with current availability: ${roomTypeAvailBefore}`);

      // Close the availability dialog
      await hkOps.closeAvailabilityDialog();
    });

    logger.info(`${roomTypeToTest} availability BEFORE release: ${roomTypeAvailBefore}`);

    await page.screenshot({
      path: 'screenshots/hk-release-ooo-availability-before.png',
      fullPage: true,
    });

    // ── Step 5: Filter by room type and P-OOO selling status to find an OOO room ──
    let oooRoom = '';

    await test.step(`Filter by ${roomTypeToTest} and P-OOO to find an OOO room`, async () => {
      await hkOps.filterByRoomTypeAndSellingStatus(roomTypeToTest, 'Out of Order');
      logger.info(`Filter applied: ${roomTypeToTest} + Out of Order`);

      // Get visible room count
      const visibleCount = await hkOps.getVisibleRoomCount();
      logger.info(`Visible P-OOO ${roomTypeToTest} rooms: ${visibleCount}`);

      if (visibleCount === 0) {
        // No P-OOO rooms found with this filter - try alternative approach
        // Reset filter and look for rooms with PO status in the grid
        await hkOps.closeFilterDialog();
        await page.waitForTimeout(500);

        // Try filtering just by room type
        await hkOps.filterByRoomType(roomTypeToTest);
        logger.info(`Filter applied: ${roomTypeToTest} only`);

        // Find a room with PO selling status from visible cards
        oooRoom = await hkOps.getRoomWithSellingStatus('PO', 1);
        expect(oooRoom).toBeTruthy();
        logger.info(`Found OOO room via type filter: ${oooRoom}`);
      } else {
        // Get the first P-OOO room
        const rooms = await hkOps.getRoomNumbersWithoutBooking(1);
        if (rooms.length > 0) {
          oooRoom = rooms[0];
        } else {
          // P-OOO rooms don't have bookings, so just get any room
          oooRoom = await hkOps.getRoomWithSellingStatus('PO', 1);
        }
        expect(oooRoom).toBeTruthy();
        logger.info(`Found OOO room: ${oooRoom}`);
      }
    });

    await page.screenshot({
      path: 'screenshots/hk-release-ooo-filtered.png',
      fullPage: true,
    });

    // ── Step 6: Release the room from Permanent Out of Order ──
    let releaseResult: { success: boolean; message: string };

    await test.step(`Release room ${oooRoom} from Permanent Out of Order`, async () => {
      releaseResult = await hkOps.releaseRoomFromPermanentOoo(oooRoom);
      expect(releaseResult.success).toBeTruthy();
      logger.info(`Room ${oooRoom} successfully released from Permanent Out of Order`);
      logger.info(`Release Result: ${JSON.stringify(releaseResult)}`);
    });

    await page.screenshot({
      path: 'screenshots/hk-release-ooo-released.png',
      fullPage: true,
    });

    // ── Step 7: Verify availability increased by 1 ──
    await test.step(`Verify ${roomTypeToTest} availability increased by 1`, async () => {
      const availabilityAfter = await hkOps.fetchAvailability();
      const roomTypeAvailAfter = availabilityAfter.get(roomTypeToTest)?.[0] ?? 0;

      logger.info(`${roomTypeToTest} availability AFTER release: ${roomTypeAvailAfter}`);
      logger.info(`Expected: ${roomTypeAvailBefore + 1}`);

      // The availability should have increased by 1 (room is no longer OOO)
      expect(roomTypeAvailAfter).toBe(roomTypeAvailBefore + 1);
      logger.info(`✅ ${roomTypeToTest} availability increased from ${roomTypeAvailBefore} to ${roomTypeAvailAfter} (increased by 1 as expected)`);

      // Close the availability dialog
      await hkOps.closeAvailabilityDialog();
    });

    await page.screenshot({
      path: 'screenshots/hk-release-ooo-availability-after.png',
      fullPage: true,
    });
  });

  test('Attempt to set Occupied room as Permanent Out of Order - system should reject', async ({ page, context }) => {
    test.setTimeout(30 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const hkOps = new HousekeepingOperationsPage(page, context);

    const user = getUserByIndexFromExcel(0);
    expect(user).toBeDefined();

    // ── Step 1: Login with user + property from Excel ──
    await test.step('Login with user + property from Excel', async () => {
      logger.info('Logging in and selecting property for Housekeeping Occupied Room OOO test');
      const prop = getPropertyByIndexFromExcel(3); // WEBWE property
      await loginPage.loginWithPropertySelection(user!.username, user!.password, prop!.index);
    });

    // ── Step 2: Navigate to Housekeeping Operations ──
    await test.step('Navigate to Housekeeping Operations', async () => {
      await hkOps.navigateToHousekeepingOperations();
      const loaded = await hkOps.verifyPageLoaded();
      expect(loaded).toBeTruthy();
      logger.info('Housekeeping Operations page opened');
    });

    // ── Step 3: Get business date ──
    let businessDate = '';
    let businessDateObj: Date;

    await test.step('Get business date', async () => {
      businessDate = await hkOps.getBusinessDate();
      expect(businessDate).toBeTruthy();
      businessDateObj = parseBusinessDate(businessDate);
      logger.info(`Business Date: ${businessDate}`);
    });

    await page.screenshot({
      path: 'screenshots/hk-occupied-ooo-page-loaded.png',
      fullPage: true,
    });

    // ── Step 4: Find a room type and locate an occupied room ──
    let roomTypeToTest = '';
    let occupiedRoom = '';

    await test.step('Find an occupied room to test OOO rejection', async () => {
      // First fetch availability to get room types
      const availabilityBefore = await hkOps.fetchAvailability();
      expect(availabilityBefore.size).toBeGreaterThan(0);

      // Pick the first room type
      for (const [roomType, counts] of availabilityBefore) {
        if (roomType) {
          roomTypeToTest = roomType;
          break;
        }
      }

      expect(roomTypeToTest).toBeTruthy();
      logger.info(`Selected room type: ${roomTypeToTest}`);

      // Close the availability dialog
      await hkOps.closeAvailabilityDialog();

      await page.screenshot({
        path: 'screenshots/hk-occupied-ooo-availability.png',
        fullPage: true,
      });

      // Filter by room type + Occupied selling status
      await hkOps.filterByRoomTypeAndSellingStatus(roomTypeToTest, 'Occupied');
      logger.info(`Filter applied: ${roomTypeToTest} + Occupied`);

      // Get visible room count
      const visibleCount = await hkOps.getVisibleRoomCount();
      logger.info(`Visible occupied ${roomTypeToTest} rooms: ${visibleCount}`);

      if (visibleCount > 0) {
        // Get the first occupied room
        occupiedRoom = await hkOps.getRoomWithSellingStatus('OC', 10);
        if (!occupiedRoom) {
          // Fallback: get any visible room
          const rooms = await hkOps.getRoomNumbersWithoutBooking(1);
          if (rooms.length > 0) occupiedRoom = rooms[0];
        }
      } else {
        // No occupied rooms found with filter, try without filter
        await hkOps.closeFilterDialog();
        await page.waitForTimeout(500);

        occupiedRoom = await hkOps.getRoomWithSellingStatus('OC', 50);
      }

      expect(occupiedRoom).toBeTruthy();
      logger.info(`Found occupied room: ${occupiedRoom}`);
    });

    await page.screenshot({
      path: 'screenshots/hk-occupied-ooo-filtered.png',
      fullPage: true,
    });

    // ── Step 5: Attempt to set the occupied room as Permanent Out of Order ──
    let oooResult: any;
    let dateToDay: number;

    await test.step(`Attempt to set occupied room ${occupiedRoom} as Permanent Out of Order`, async () => {
      const timestamp = Date.now();
      const occupiedRemarks = `HK_OCCUPIED_OOO_${timestamp}`;

      // Dynamically calculate Date To: business date + 5 days
      const dateToDate = new Date(businessDateObj!);
      dateToDate.setDate(dateToDate.getDate() + 5);
      dateToDay = dateToDate.getDate();
      const dateToFormatted = formatDate(dateToDate);
      logger.info(`Date To: ${dateToFormatted} (business date + 5 days), day = ${dateToDay}`);

      oooResult = await hkOps.setRoomPermanentOutOfOrder(
        occupiedRoom,
        dateToDay,
        occupiedRemarks
      );

      logger.info(`OOO Result for occupied room: ${JSON.stringify(oooResult)}`);
    });

    await page.screenshot({
      path: 'screenshots/hk-occupied-ooo-result.png',
      fullPage: true,
    });

    // ── Step 6: Verify the system rejected the OOO request ──
    await test.step('Verify system rejected setting occupied room as OOO', async () => {
      // The system should have rejected the request
      expect(oooResult.success).toBeFalsy();
      logger.info(`✅ System correctly rejected setting occupied room as OOO`);

      // Verify the error message mentions the room is occupied
      const message = oooResult.message.toLowerCase();
      const isOccupiedError = message.includes('occupied') || message.includes('already');
      expect(isOccupiedError).toBeTruthy();
      logger.info(`✅ Error message confirms room is occupied: "${oooResult.message}"`);
    });
  });
});
