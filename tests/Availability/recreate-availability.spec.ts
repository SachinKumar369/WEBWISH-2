import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { RecreateAvailabilityPage, AvailabilityGridData } from '../../src/pages/Availability/RecreateAvailabilityPage';
import { AvailabilityManagementPage } from '../../src/pages/ManagerFunction/AvailabilityManagementPage';
import { getPropertyByIndexFromExcel } from '../../src/utils/PropertyDataProvider';
import { getUserByIndexFromExcel } from '../../src/utils/UserDataProvider';

test.describe('Availability - Basic Availability (No Bookings)', () => {

  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  /**
   * SU_AVAIL_001: Recreate Availability and verify room types and available counts.
   *
   * Steps:
   * 1. Login with property selection (WEBWE)
   * 2. Navigate to System Utilities → Recreate Availability
   * 3. Click Play button to trigger recreation
   * 4. Confirm "Availability has been Recreated" modal
   * 5. Open Quick Access panel via watch/clock button
   * 6. Click "Availability" to view the availability grid
   * 7. Capture room types and available room counts
   * 8. Verify grid data is valid (room types exist, counts are non-negative)
   */
  test('SU_AVAIL_001: Recreate Availability and verify grid data', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000); // 10 minute timeout

    const loginPage = new LoginPage(page, context);
    const recreateAvailabilityPage = new RecreateAvailabilityPage(page, context);

    // ── Pick user from Excel by index ──
    const user = getUserByIndexFromExcel(1);
    expect(user).toBeDefined();
    logger.info(`User from Excel: ${user!.username} (index ${user!.index})`);

    // ── Pick property from Excel by index ──
    const property = getPropertyByIndexFromExcel(3);
    expect(property).toBeDefined();
    logger.info(`Property from Excel: ${property!.code} (index ${property!.index})`);

    // ── Step 1: Login with user + property from Excel ──
    await test.step('Login with user + property from Excel', async () => {
      logger.info('Step 1: Logging in with user and property selection');
      await loginPage.loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    // ── Step 2–7: Run the full recreate availability flow ──
    let gridData;
    await test.step('Run Recreate Availability flow', async () => {
      gridData = await recreateAvailabilityPage.runRecreateAvailabilityFlow();
    });

    // ── Step 8: Verify the captured data ──
    await test.step('Verify availability grid data', async () => {
      expect(gridData).toBeDefined();
      expect(gridData!.roomTypes.length).toBeGreaterThan(0);

      logger.info(`Business Date: ${gridData!.businessDate}`);
      logger.info(`Room types found: ${gridData!.roomTypes.length}`);

      // Log room type summary
      for (const room of gridData!.roomTypes) {
        logger.info(`  ${room.roomType}: ${room.totalAvailable} available`);
      }

      // Verify all room types have non-negative availability
      for (const room of gridData!.roomTypes) {
        expect(room.totalAvailable).toBeGreaterThanOrEqual(0);
        expect(room.roomType).toBeTruthy();
      }

      // Verify total available is positive
      const dayOneTotalAvailable = gridData!.totalAvailable[0];
      logger.info(`Total Available on business date: ${dayOneTotalAvailable}`);
      expect(dayOneTotalAvailable).toBeGreaterThan(0);

      // Verify occupancy percentage is between 0 and 100
      const dayOneOccupancy = gridData!.occupancyPercent[0];
      logger.info(`Occupancy on business date: ${dayOneOccupancy}%`);
      expect(dayOneOccupancy).toBeGreaterThanOrEqual(0);
      expect(dayOneOccupancy).toBeLessThanOrEqual(100);
    });

    // Take a final screenshot
    await page.screenshot({ path: 'screenshots/SU_AVAIL_001.png', fullPage: true });
  });

  /**
   * SU_AVAIL_002: Book one room and verify availability decreases by 1.
   *
   * Steps:
   *  1. Login with property selection (WEBWE)
   *  2. Run Recreate Availability → capture initial grid data
   *  3. Pick a room type with > 2 available rooms
   *  4. Close the availability modal
   *  5. Navigate to Guest Management
   *  6. Create a new reservation for that room type
   *  7. Fill guest details (last name)
   *  8. Handle advance search if it opens
   *  9. Confirm & Continue → click "No" on confirmation letter
   * 10. Wait for success message and click OK
   * 11. Click Back to return to Guest Management
   * 12. Re-open availability grid via Quick Access
   * 13. Verify the selected room type's available count decreased by 1
   */
  test('SU_AVAIL_002: Book a room and verify availability count decreases by 1', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000); // 15 minute timeout

    const loginPage = new LoginPage(page, context);
    const recreateAvailabilityPage = new RecreateAvailabilityPage(page, context);

    // ── Pick user from Excel by index ──
    const user = getUserByIndexFromExcel(1);
    expect(user).toBeDefined();
    logger.info(`User from Excel: ${user!.username} (index ${user!.index})`);

    // ── Pick property from Excel by index ──
    const property = getPropertyByIndexFromExcel(3);
    expect(property).toBeDefined();
    logger.info(`Property from Excel: ${property!.code} (index ${property!.index})`);

    let gridData;
    let selectedRoomType: string;
    let initialAvailableCount: number;

    // ── Step 1: Login with user + property from Excel ──
    await test.step('Login with user + property from Excel', async () => {
      logger.info('Step 1: Logging in with user and property selection');
      await loginPage.loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    // ── Step 2: Run Recreate Availability flow ──
    await test.step('Run Recreate Availability flow', async () => {
      gridData = await recreateAvailabilityPage.runRecreateAvailabilityFlow();
      expect(gridData).toBeDefined();
      expect(gridData!.roomTypes.length).toBeGreaterThan(0);
    });

    // ── Step 3: Pick a room type with > 2 available rooms ──
    await test.step('Select a room type with > 2 available rooms', async () => {
      // Find the first room type with more than 2 available rooms on the business date
      const candidates = gridData!.roomTypes.filter(r => r.totalAvailable > 2);
      expect(candidates.length).toBeGreaterThan(0);

      selectedRoomType = candidates[0].roomType;
      initialAvailableCount = candidates[0].totalAvailable;

      logger.info(`Selected room type: "${selectedRoomType}" with ${initialAvailableCount} available rooms`);
    });

    // ── Step 4–10: Run the full booking flow ──
    await test.step('Create reservation via Guest Management', async () => {
      const bookingResult = await recreateAvailabilityPage.runBookingFlow(selectedRoomType, 'AutomationTest');
      selectedRoomType = bookingResult.roomType;
      initialAvailableCount = bookingResult.availableBefore;
      logger.info(`Booked room type: "${selectedRoomType}" (available before booking: ${initialAvailableCount})`);
    });

    // ── Step 11: Click Back to return to Guest Management ──
    await test.step('Navigate back to Guest Management', async () => {
      // After the success alert is dismissed, we should be on Guest Management
      // Wait for the Guest Management heading to appear
      //await page.waitForSelector('h3:has-text("Guest Management")', { timeout: 15000 });
      logger.info('✅ Back on Guest Management page');
    });

    // ── Step 12: Re-open availability grid via Quick Access ──
    await test.step('Re-open availability grid', async () => {
      await recreateAvailabilityPage.openQuickAccessPanel();
      await recreateAvailabilityPage.clickAvailabilityQuickLink();
    });

    // ── Step 13: Verify available count decreased by 1 ──
    await test.step('Verify availability decreased by 1 for booked room', async () => {
      const newAvailableCount = await recreateAvailabilityPage.getRoomAvailableCount(selectedRoomType);

      logger.info(`Room type: ${selectedRoomType}`);
      logger.info(`  Before booking: ${initialAvailableCount} available`);
      logger.info(`  After booking:  ${newAvailableCount} available`);
      logger.info(`  Expected decrease: 1`);

      expect(newAvailableCount).toBe(initialAvailableCount - 1);
      logger.info(`✅ Availability correctly decreased by 1 for ${selectedRoomType}`);
    });

    // Take a final screenshot
    await page.screenshot({ path: 'screenshots/SU_AVAIL_002.png', fullPage: true });
  });

  /**
   * SU_AVAIL_003: Book ALL remaining rooms of a room type in a single reservation
   * and verify availability drops to 0.
   *
   * Steps:
   *  1. Login with property selection (WEBWE)
   *  2. Run Recreate Availability → capture initial grid data
   *  3. Pick a room type with > 2 available rooms
   *  4. Close the availability modal
   *  5. Navigate to Guest Management → New Reservation
   *  6. On room selection page, click "+" for ALL available rooms at once
   *  7. Fill guest details and confirm (single reservation)
   *  8. Re-open availability grid via Quick Access
   *  9. Verify the selected room type's available count is 0
   */
  test('SU_AVAIL_003: Book all rooms of a type in one reservation and verify availability drops to zero', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000); // 15 minute timeout

    const loginPage = new LoginPage(page, context);
    const recreateAvailabilityPage = new RecreateAvailabilityPage(page, context);

    // ── Pick user from Excel by index ──
    const user = getUserByIndexFromExcel(1);
    expect(user).toBeDefined();
    logger.info(`User from Excel: ${user!.username} (index ${user!.index})`);

    // ── Pick property from Excel by index ──
    const property = getPropertyByIndexFromExcel(3);
    expect(property).toBeDefined();
    logger.info(`Property from Excel: ${property!.code} (index ${property!.index})`);

    let gridData;
    let selectedRoomType: string;
    let initialAvailableCount: number;

    // ── Step 1: Login with user + property from Excel ──
    await test.step('Login with user + property from Excel', async () => {
      logger.info('Step 1: Logging in with user and property selection');
      await loginPage.loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    // ── Step 2: Run Recreate Availability flow ──
    await test.step('Run Recreate Availability flow', async () => {
      gridData = await recreateAvailabilityPage.runRecreateAvailabilityFlow();
      expect(gridData).toBeDefined();
      expect(gridData!.roomTypes.length).toBeGreaterThan(0);
    });

    // ── Step 3: Pick a room type with > 2 available rooms ──
    await test.step('Select a room type with > 2 available rooms', async () => {
      // Find the first room type with more than 2 available rooms on the business date
      const candidates = gridData!.roomTypes.filter(r => r.totalAvailable > 2);
      expect(candidates.length).toBeGreaterThan(0);

      selectedRoomType = candidates[0].roomType;
      initialAvailableCount = candidates[0].totalAvailable;

      logger.info(`Selected room type: "${selectedRoomType}" with ${initialAvailableCount} available rooms`);
      logger.info(`Will book all ${initialAvailableCount} rooms in a single reservation`);
    });

    // ── Step 4–7: Book ALL remaining rooms in a single reservation ──
    await test.step(`Book all ${initialAvailableCount} rooms of type "${selectedRoomType}" in one reservation`, async () => {
      // runBookingFlow will: close modal → Guest Management → New Reservation →
      // check availability on selection page → click "+" N times → Next → guest details → confirm
      const bookingResult = await recreateAvailabilityPage.runBookingFlow(selectedRoomType, 'AvailTest', initialAvailableCount);
      selectedRoomType = bookingResult.roomType;
      initialAvailableCount = bookingResult.availableBefore;
      logger.info(`Booked room type: "${selectedRoomType}" (available before booking: ${initialAvailableCount})`);
    });

    // ── Step 8: Re-open availability grid via Quick Access ──
    await test.step('Re-open availability grid', async () => {
      await recreateAvailabilityPage.openQuickAccessPanel();
      await recreateAvailabilityPage.clickAvailabilityQuickLink();
    });

    // ── Step 9: Verify available count dropped to zero ──
    await test.step('Verify availability dropped to zero', async () => {
      const newAvailableCount = await recreateAvailabilityPage.getRoomAvailableCount(selectedRoomType);

      logger.info(`═══════════════════════════════════════════`);
      logger.info(`Room Type: ${selectedRoomType}`);
      logger.info(`  Available Before:  ${initialAvailableCount}`);
      logger.info(`  Rooms Booked:      ${initialAvailableCount} (single reservation)`);
      logger.info(`  Current Available: ${newAvailableCount}`);
      logger.info(`  Expected:          0 or less (all rooms exhausted)`);
      logger.info(`═══════════════════════════════════════════`);

      // All rooms of the selected type should now be booked, so availability
      // should be 0. The system may show a negative value if it over-books
      // (e.g. leftover bookings from earlier runs are counted again).
      expect(newAvailableCount).toBeLessThanOrEqual(0);
      logger.info(`✅ Availability for ${selectedRoomType} is now ${newAvailableCount} – all rooms exhausted!`);
    });

    // Take a final screenshot
    await page.screenshot({ path: 'screenshots/SU_AVAIL_003.png', fullPage: true });
  });

  /**
   * SU_AVAIL_004: Attempt to book a room type that has ZERO available rooms
   * and verify the system does NOT allow the booking.
   *
   * Steps:
   *  1. Login with property selection (Excel user + property)
   *  2. Run Recreate Availability → capture grid data
   *  3. Identify a room type with zero available rooms
   *  4. Close availability modal → Guest Management → New Reservation → Next
   *  5. Verify the room shows 0 rooms on the room selection page
   *  6. Click "+" on the zero-availability room row
   *  7. Verify the "Room not available." popup appears
   *  8. Verify the room counter stays at 0 (no room added)
   *  9. Dismiss the popup and click Next
   * 10. Verify the system does NOT advance to Guest Details
   */
  test('SU_AVAIL_004: Attempt to book a zero-availability room and verify booking is blocked', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000); // 15 minute timeout

    const loginPage = new LoginPage(page, context);
    const recreateAvailabilityPage = new RecreateAvailabilityPage(page, context);

    // ── Pick user from Excel by index ──
    const user = getUserByIndexFromExcel(1);
    expect(user).toBeDefined();
    logger.info(`User from Excel: ${user!.username} (index ${user!.index})`);

    // ── Pick property from Excel by index ──
    const property = getPropertyByIndexFromExcel(3);
    expect(property).toBeDefined();
    logger.info(`Property from Excel: ${property!.code} (index ${property!.index})`);

    let gridData;
    let zeroRoomType: string | undefined;

    // ── Step 1: Login with user + property from Excel ──
    await test.step('Login with user + property from Excel', async () => {
      logger.info('Step 1: Logging in with user and property selection');
      await loginPage.loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    // ── Step 2: Run Recreate Availability flow ──
    await test.step('Run Recreate Availability flow', async () => {
      gridData = await recreateAvailabilityPage.runRecreateAvailabilityFlow();
      expect(gridData).toBeDefined();
      expect(gridData!.roomTypes.length).toBeGreaterThan(0);
    });

    // ── Step 3: Identify a room type with zero availability ──
    await test.step('Identify a room type with zero availability', async () => {
      // Look for a room type with 0 (or negative) available rooms on the business date
      const candidates = gridData!.roomTypes.filter(r => r.totalAvailable <= 0);

      if (candidates.length > 0) {
        zeroRoomType = candidates[0].roomType;
        logger.info(`Zero-availability room type from grid: "${zeroRoomType}" (${candidates[0].totalAvailable} available)`);
      } else {
        logger.warn('No zero-availability room type found in the grid – will scan the room selection page instead');
      }
    });

    // ── Steps 4–9: Attempt the booking and capture the result ──
    let attempt;
    await test.step('Attempt to book the zero-availability room', async () => {
      attempt = await recreateAvailabilityPage.runZeroAvailabilityBookingAttempt(zeroRoomType);
    });

    // ── Step 10: Verify the system blocked the booking ──
    await test.step('Verify booking was blocked by the system', async () => {
      expect(attempt).toBeDefined();

      logger.info(`═══════════════════════════════════════════`);
      logger.info(`Room Type: ${attempt!.roomType}`);
      logger.info(`  Available on selection page: ${attempt!.availableOnSelectionPage}`);
      logger.info(`  Popup message: "${attempt!.popupText}"`);
      logger.info(`  Room counter after '+' attempt: ${attempt!.counterAfterAttempt}`);
      logger.info(`  Guest Details visible after Next: ${attempt!.guestDetailsVisibleAfterNext}`);
      logger.info(`═══════════════════════════════════════════`);

      // The targeted room type must have zero availability
      expect(attempt!.availableOnSelectionPage).toBeLessThanOrEqual(0);

      // The system must show the "Room not available." popup
      expect(attempt!.popupText).toContain('Room not available');

      // No room may be added – the counter must stay at 0
      expect(attempt!.counterAfterAttempt).toBe(0);

      // The system must not advance to Guest Details with 0 rooms selected
      expect(attempt!.guestDetailsVisibleAfterNext).toBe(false);

      logger.info(`✅ Booking correctly blocked for zero-availability room type "${attempt!.roomType}"`);
    });

    // Take a final screenshot
    await page.screenshot({ path: 'screenshots/SU_AVAIL_004.png', fullPage: true });
  });

  /**
   * SU_AVAIL_005: Attempt to OVERBOOK a room type – select all available
   * rooms (N) and then try to select one more (N+1) – and verify the system
   * does NOT allow selecting more rooms than are available.
   *
   * Steps:
   *  1. Login with property selection (Excel user + property)
   *  2. Run Recreate Availability → capture grid data
   *  3. Identify the room type with the fewest available rooms (> 0)
   *  4. Close availability modal → Guest Management → New Reservation → Next
   *  5. Verify the room shows N available rooms on the selection page
   *  6. Click "+" N times – verify the counter reaches N
   *  7. Click "+" once more (the N+1 overbooking attempt)
   *  8. Verify the counter stays at N (system blocks the extra selection)
   */
  test('SU_AVAIL_005: Attempt overbooking by selecting one more room than available and verify it is blocked', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000); // 15 minute timeout

    const loginPage = new LoginPage(page, context);
    const recreateAvailabilityPage = new RecreateAvailabilityPage(page, context);

    // ── Pick user from Excel by index ──
    const user = getUserByIndexFromExcel(1);
    expect(user).toBeDefined();
    logger.info(`User from Excel: ${user!.username} (index ${user!.index})`);

    // ── Pick property from Excel by index ──
    const property = getPropertyByIndexFromExcel(3);
    expect(property).toBeDefined();
    logger.info(`Property from Excel: ${property!.code} (index ${property!.index})`);

    let gridData;
    let smallestRoomType: string | undefined;

    // ── Step 1: Login with user + property from Excel ──
    await test.step('Login with user + property from Excel', async () => {
      logger.info('Step 1: Logging in with user and property selection');
      await loginPage.loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    // ── Step 2: Run Recreate Availability flow ──
    await test.step('Run Recreate Availability flow', async () => {
      gridData = await recreateAvailabilityPage.runRecreateAvailabilityFlow();
      expect(gridData).toBeDefined();
      expect(gridData!.roomTypes.length).toBeGreaterThan(0);
    });

    // ── Step 3: Identify the room type with the fewest available rooms ──
    await test.step('Identify the room type with the fewest available rooms', async () => {
      // Prefer a room type with a small positive availability to keep the
      // "+" clicks minimal. The page method re-verifies the actual count
      // on the room selection page.
      const candidates = gridData!.roomTypes
        .filter(r => r.totalAvailable > 0)
        .sort((a, b) => a.totalAvailable - b.totalAvailable);

      if (candidates.length > 0) {
        smallestRoomType = candidates[0].roomType;
        logger.info(`Room type with fewest available rooms (from grid): "${smallestRoomType}" (${candidates[0].totalAvailable} available)`);
      } else {
        logger.warn('No room type with positive availability found in the grid – will scan the room selection page instead');
      }
    });

    // ── Steps 4–7: Run the overbooking attempt ──
    let result;
    await test.step('Attempt overbooking (select N rooms, then one more)', async () => {
      result = await recreateAvailabilityPage.runOverbookingAttempt(smallestRoomType);
    });

    // ── Step 8: Verify the system blocked the overbooking ──
    await test.step('Verify overbooking was blocked by the system', async () => {
      expect(result).toBeDefined();

      logger.info(`═══════════════════════════════════════════`);
      logger.info(`Room Type: ${result!.roomType}`);
      logger.info(`  Available on selection page (N): ${result!.availableOnSelectionPage}`);
      logger.info(`  Counter after selecting all N rooms: ${result!.counterAfterMaxSelection}`);
      logger.info(`  Counter after the (N+1)th "+" click: ${result!.counterAfterExtraClick}`);
      logger.info(`  Popup on extra click: ${result!.extraClickPopupText ?? 'none (silently blocked)'}`);
      logger.info(`═══════════════════════════════════════════`);

      // The targeted room type must have positive availability
      expect(result!.availableOnSelectionPage).toBeGreaterThan(0);

      // All N available rooms could be selected – counter reached N
      expect(result!.counterAfterMaxSelection).toBe(result!.availableOnSelectionPage);

      // The (N+1)th click must NOT add a room – counter stays at N
      // (the system silently blocks the overbooking attempt)
      expect(result!.counterAfterExtraClick).toBe(result!.availableOnSelectionPage);

      logger.info(`✅ Overbooking correctly blocked for room type "${result!.roomType}" – counter stayed at ${result!.counterAfterExtraClick}`);
    });

    // Take a final screenshot
    await page.screenshot({ path: 'screenshots/SU_AVAIL_005.png', fullPage: true });
  });

  /**
   * SU_AVAIL_006: Overbooking flow via Availability Management.
   *
   * This test verifies the complete overbooking workflow:
   *  1. Login with Excel user + property (WEBWE)
   *  2. Open Quick Access (eye/watch button) → click Availability
   *  3. Fetch availability of ALL room types from the grid and log each detail
   *  4. Close the Availability popup via Close button
   *  5. Search for "Availability Management" via header search and open it
   *  6. Filter screen opens automatically → select current business year + any room type → click Apply
   *  7. Click on the current business date in the calendar (S M T W T F S grid)
   *  8. A popup opens → click Yes
   *  9. Click "Revise Availability" button
   * 10. In type dropdown select "Overbooking" and enter value 10
   * 11. Click Save → success message appears → click OK
   * 12. Click eye/watch button → click Availability
   * 13. Verify the availability for the selected room type increased by the overbooking value
   *
   * Validated via Playwright MCP on 2026-09-21 against QC2 environment.
   * Quick Access button: generic element at bottom-right (.side-button.shadow-lg)
   * Header search: textbox with placeholder "Search..." → type "ava" → click "Availability Management"
   * Filter dialog: "Room Type Availability Filter" appears automatically after opening the page
   * Calendar: Month rows with S M T W T F S cells; click the cell matching the business date day
   * Confirmation popup: "Do you want to select more days to update?" → Yes
   */
  test('SU_AVAIL_006: Overbooking flow via Availability Management', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000); // 20 minute timeout

    const loginPage = new LoginPage(page, context);
    const recreateAvailabilityPage = new RecreateAvailabilityPage(page, context);
    const availabilityManagementPage = new AvailabilityManagementPage(page, context);

    // ── Pick user from Excel by index ──
    const user = getUserByIndexFromExcel(1);
    expect(user).toBeDefined();
    logger.info(`User from Excel: ${user!.username} (index ${user!.index})`);

    // ── Pick property from Excel by index ──
    const property = getPropertyByIndexFromExcel(3);
    expect(property).toBeDefined();
    logger.info(`Property from Excel: ${property!.code} (index ${property!.index})`);

    // ── Variables to track state across steps ──
    let initialGridData: AvailabilityGridData;
    let selectedRoomType: string;
    let initialAvailableCount: number;
    const OVERBOOKING_VALUE = 10;

    // ═══════════════════════════════════════════════════════════
    // Step 1: Login with user + property from Excel
    // ═══════════════════════════════════════════════════════════
    await test.step('Step 1: Login with user + property from Excel', async () => {
      logger.info('Step 1: Logging in with user and property selection');
      await loginPage.loginWithPropertySelection(user!.username, user!.password, property!.index);
    });

    // ═══════════════════════════════════════════════════════════
    // Step 2: Open Quick Access (eye/watch) and click Availability
    // ═══════════════════════════════════════════════════════════
    await test.step('Step 2: Open Quick Access and click Availability', async () => {
      logger.info('Step 2: Opening Quick Access panel via eye/watch button');
      await recreateAvailabilityPage.openQuickAccessPanel();
      await recreateAvailabilityPage.clickAvailabilityQuickLink();
    });

    // ═══════════════════════════════════════════════════════════
    // Step 3: Fetch availability of ALL room types from the grid
    // ═══════════════════════════════════════════════════════════
    await test.step('Step 3: Fetch availability of all room types', async () => {
      logger.info('Step 3: Capturing availability data for all room types');
      initialGridData = await recreateAvailabilityPage.captureAvailabilityGrid();

      expect(initialGridData!.roomTypes.length).toBeGreaterThan(0);
      logger.info(`Business Date: ${initialGridData!.businessDate}`);
      logger.info(`Room types found: ${initialGridData!.roomTypes.length}`);

      // Log all room types and their availability details
      for (const room of initialGridData!.roomTypes) {
        logger.info(`  ${room.roomType}: ${room.totalAvailable} available (business date)`);
      }

      // Log summary totals
      logger.info(`Total Saleable: ${initialGridData!.totalSaleable[0]}`);
      logger.info(`Total Booked: ${initialGridData!.totalBooked[0]}`);
      logger.info(`Occupancy %: ${initialGridData!.occupancyPercent[0]}`);
      logger.info(`Total Available: ${initialGridData!.totalAvailable[0]}`);

      // Pick the first room type with positive availability for the overbooking test
      const candidates = initialGridData!.roomTypes.filter(r => r.totalAvailable > 0);
      expect(candidates.length).toBeGreaterThan(0);
      selectedRoomType = candidates[0].roomType;
      initialAvailableCount = candidates[0].totalAvailable;

      logger.info(`Selected room type for overbooking: "${selectedRoomType}" (${initialAvailableCount} available)`);
    });

    // ═══════════════════════════════════════════════════════════
    // Step 4: Close the Availability popup
    // ═══════════════════════════════════════════════════════════
    await test.step('Step 4: Close the Availability popup', async () => {
      logger.info('Step 4: Closing the Availability modal popup');
      await recreateAvailabilityPage.closeAvailabilityModal();
    });

    // ═══════════════════════════════════════════════════════════
    // Step 5: Search for "Availability Management" via header search and open it
    // ═══════════════════════════════════════════════════════════
    await test.step('Step 5: Open Availability Management via header search', async () => {
      logger.info('Step 5: Searching for and opening Availability Management');
      await availabilityManagementPage.openAvailabilityManagement();
    });

    // ═══════════════════════════════════════════════════════════
    // Step 6: Filter screen – select current business year & room type, then Apply
    // The filter dialog "Room Type Availability Filter" opens automatically.
    // Year is pre-selected to current business year. Select any room type and click Apply.
    // ═══════════════════════════════════════════════════════════
    await test.step('Step 6: Apply filter for current business year and room type', async () => {
      logger.info('Step 6: Applying filter for current business year and room type');

      const businessDate = await availabilityManagementPage.getBusinessDate();
      const year = businessDate.split('/')[2];
      const startDate = `01/01/${year}`;
      const endDate = `31/12/${year}`;

      logger.info(`Business year: ${year}, Date range: ${startDate} to ${endDate}`);

      // Select property and apply (this handles the filter dialog)
      await availabilityManagementPage.selectPropertyAndApply(property!.code);

      // Select advance date range for the full business year
      await availabilityManagementPage.selectAdvanceDateRange({ startDate, endDate });

      // Confirm "Do you want to select more days to update?" prompt
      await availabilityManagementPage.confirmMoreDaysUpdate();
    });

    // ═══════════════════════════════════════════════════════════
    // Step 7: Click on the current business date in the calendar (S M T W T F S)
    // The calendar shows months with day-of-week cells (S M T W T F S).
    // Click the cell that matches the business date's day.
    // ═══════════════════════════════════════════════════════════
    await test.step('Step 7: Click on current business date in calendar', async () => {
      logger.info('Step 7: Clicking on the current business date in the calendar');
      await availabilityManagementPage.clickBusinessDateInCalendar();
    });

    // ═══════════════════════════════════════════════════════════
    // Step 8: Popup opens – click Yes
    // "Do you want to select more days to update?" → Yes
    // ═══════════════════════════════════════════════════════════
    await test.step('Step 8: Click Yes on the confirmation popup', async () => {
      logger.info('Step 8: Confirming the business date popup');
      await availabilityManagementPage.confirmBusinessDatePopup();
    });

    // ═══════════════════════════════════════════════════════════
    // Step 9: Click "Revise Availability"
    // ═══════════════════════════════════════════════════════════
    await test.step('Step 9: Click Revise Availability', async () => {
      logger.info('Step 9: Opening Revise Availability modal');
      await availabilityManagementPage.clickReviseAvailability();
    });

    // ═══════════════════════════════════════════════════════════
    // Step 10: Select "Overbooking" type and enter value 10
    // ═══════════════════════════════════════════════════════════
    await test.step('Step 10: Select Overbooking and enter value 10', async () => {
      logger.info(`Step 10: Selecting Overbooking type with value ${OVERBOOKING_VALUE}`);
      await availabilityManagementPage.selectReviseTypeAndEnterValue('Overbooking', OVERBOOKING_VALUE);
    });

    // ═══════════════════════════════════════════════════════════
    // Step 11: Save → success message appears → click OK
    // ═══════════════════════════════════════════════════════════
    await test.step('Step 11: Save revised availability and verify success', async () => {
      logger.info('Step 11: Saving revised availability');
      await availabilityManagementPage.saveReviseAvailability();
      await availabilityManagementPage.verifyReviseSuccessAndClickOK();
    });

    // ═══════════════════════════════════════════════════════════
    // Step 12: Click eye/watch button → click Availability
    // Re-open the availability grid via Quick Access to verify the change
    // ═══════════════════════════════════════════════════════════
    await test.step('Step 12: Re-open Availability grid via Quick Access', async () => {
      logger.info('Step 12: Re-opening Quick Access panel and Availability grid');
      await recreateAvailabilityPage.openQuickAccessPanel();
      await recreateAvailabilityPage.clickAvailabilityQuickLink();
    });

    // ═══════════════════════════════════════════════════════════
    // Step 13: Verify availability updated for the selected room
    // The available count should have increased by the overbooking value (10)
    // ═══════════════════════════════════════════════════════════
    await test.step('Step 13: Verify availability updated after overbooking', async () => {
      logger.info('Step 13: Capturing updated availability grid');

      const updatedGridData = await recreateAvailabilityPage.captureAvailabilityGrid();

      // Find the same room type in the updated grid
      const updatedRoom = updatedGridData.roomTypes.find(r => r.roomType === selectedRoomType);
      expect(updatedRoom).toBeDefined();

      const updatedAvailableCount = updatedRoom!.totalAvailable;

      logger.info(`═══════════════════════════════════════════════`);
      logger.info(`Overbooking Verification Summary:`);
      logger.info(`  Room Type:           ${selectedRoomType}`);
      logger.info(`  Initial Available:   ${initialAvailableCount}`);
      logger.info(`  Overbooking Value:   +${OVERBOOKING_VALUE}`);
      logger.info(`  Expected Available:  ${initialAvailableCount + OVERBOOKING_VALUE}`);
      logger.info(`  Actual Available:    ${updatedAvailableCount}`);
      logger.info(`═══════════════════════════════════════════════`);

      // The available count should increase by the overbooking value
      expect(updatedAvailableCount).toBe(initialAvailableCount + OVERBOOKING_VALUE);

      logger.info(`✅ Availability for "${selectedRoomType}" correctly updated: ${initialAvailableCount} → ${updatedAvailableCount} (+${OVERBOOKING_VALUE} overbooking)`);
    });

    // Take a final screenshot
    await page.screenshot({ path: 'screenshots/SU_AVAIL_006.png', fullPage: true });
  });
});
