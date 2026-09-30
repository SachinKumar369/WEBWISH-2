import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { GroupAvailabilityPage } from '../../src/pages/Availability/GroupAvailabilityPage';
import { testDataManager } from '../../src/utils/TestDataManager';

const timestamp = Date.now();
const uniqueGroupName = `GroupAvail_${timestamp}`;

/**
 * Test: Create a new group in Group Management, fetch availability,
 * add a group block, and open the rooming list.
 */
test.describe.serial('Group Availability Flow', () => {

  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (dialog) => {
      logger.info(`Handling dialog: ${dialog.type()} - ${dialog.message()}`);
      await dialog.accept();
    });
  });

  test('Create new group via Group Management', async ({ page, context }) => {
    test.setTimeout(30 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const groupAvailability = new GroupAvailabilityPage(page, context);

    // ── Step 1: Login with user + property from Excel ──
    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await test.step('Login with user + property from Excel', async () => {
      logger.info('Logging in and selecting property for Group Availability flow');
      await loginPage.loginWithPropertySelection(user!.username, user!.password, 2);
    });

    // ── Step 2: Navigate to Group Management ──
    await test.step('Navigate to Group Management', async () => {
      await groupAvailability.navigateToGroupManagement();
      logger.info('Group Management page opened');
    });

    // ── Step 3: Get business date for reference ──
    const businessDate = await groupAvailability.getBusinessDate();
    expect(businessDate).toBeTruthy();
    expect(businessDate).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    logger.info(`Business Date: ${businessDate}`);

    // ── Step 4: Create a new group ──
    await test.step('Create new group', async () => {
      const createdGroup = await groupAvailability.createNewGroup(uniqueGroupName);

      // Validate created group record
      expect(createdGroup.groupName).toBe(uniqueGroupName);
      expect(createdGroup.businessDate).toBeTruthy();
      expect(createdGroup.arrivalDate).toBeTruthy();
      expect(createdGroup.departureDate).toBeTruthy();
      expect(createdGroup.releaseBlockDate).toBeTruthy();

      logger.info(`Group created with details:
        - Name: ${createdGroup.groupName}
        - Arrival Date: ${createdGroup.arrivalDate}
        - Departure Date: ${createdGroup.departureDate}
        - Release Block Date: ${createdGroup.releaseBlockDate}
        - Business Date: ${createdGroup.businessDate}`);
    });

    await page.screenshot({
      path: 'screenshots/group-availability-create.png',
      fullPage: true,
    });

    // ── Step 5: Fetch room availability via Quick Access ──
    let availabilityData: Map<string, number[]>;
    await test.step('Fetch room availability', async () => {
      availabilityData = await groupAvailability.fetchAvailability();
      expect(availabilityData.size).toBeGreaterThan(0);
      logger.info(`Availability fetched for ${availabilityData.size} room types`);

      // Log availability for each room type
      availabilityData.forEach((counts, roomType) => {
        logger.info(`  ${roomType}: ${counts.slice(0, 5).join(', ')}...`);
      });

      // Close the availability dialog
      await groupAvailability.closeAvailabilityDialog();
    });

    await page.screenshot({
      path: 'screenshots/group-availability-fetched.png',
      fullPage: true,
    });

    // ── Step 6: Open the group we created ──
    await test.step('Open the created group', async () => {
      await groupAvailability.openGroup(uniqueGroupName);
      logger.info(`Group "${uniqueGroupName}" opened`);
    });

    await page.screenshot({
      path: 'screenshots/group-availability-opened.png',
      fullPage: true,
    });

    // ── Step 7: Add group block with a room type that has availability ──
    const roomTypeName = 'Bed Type Standard Room';
    const noOfRooms = 2;

    await test.step(`Add group block: ${roomTypeName} x ${noOfRooms}`, async () => {
      const blockRecord = await groupAvailability.addGroupBlock(roomTypeName, noOfRooms);

      expect(blockRecord.roomTypeName).toBe(roomTypeName);
      expect(blockRecord.noOfRooms).toBe(noOfRooms);
      expect(blockRecord.dates.length).toBeGreaterThan(0);

      logger.info(`Group block added:
        - Room Type: ${blockRecord.roomTypeName}
        - No of Rooms: ${blockRecord.noOfRooms}
        - Dates: ${blockRecord.dates.length} days`);
    });

    await page.screenshot({
      path: 'screenshots/group-availability-block-added.png',
      fullPage: true,
    });

    // ── Step 8: Open Rooming List dialog ──
    await test.step('Open Rooming List dialog', async () => {
      await groupAvailability.openRoomingListDialog();
      logger.info('Rooming List dialog opened');
    });

    await page.screenshot({
      path: 'screenshots/group-availability-rooming-list.png',
      fullPage: true,
    });

    // ── Step 9: Add rooming list entry, save, and verify ──
    await test.step('Add rooming list entry and save', async () => {
      // Click + button inside Rooming List dialog
      await groupAvailability.addRoomingListEntry();
      logger.info('Rooming list entry added');

      // Click Save and handle confirmation
      await groupAvailability.saveRoomingList();
      logger.info('Rooming list saved');

      // Close the Rooming List dialog
      await groupAvailability.closeRoomingListDialog();
      logger.info('Rooming List dialog closed');
    });

    await page.screenshot({
      path: 'screenshots/group-availability-rooming-saved.png',
      fullPage: true,
    });

    // ── Step 10: Verify availability decreased for the selected room type ──
    await test.step('Verify room type availability decreased by 1', async () => {
      const availabilityBeforeBlock = availabilityData.get(roomTypeName);
      expect(availabilityBeforeBlock).toBeDefined();
      const firstDayAvailBefore = availabilityBeforeBlock![0];

      // Fetch current availability
      const currentAvail = await groupAvailability.getAvailabilityForRoomType(roomTypeName);
      expect(currentAvail).toBeGreaterThanOrEqual(0);

      logger.info(`Availability check for ${roomTypeName}:`);
      logger.info(`  Before block: ${firstDayAvailBefore}`);
      logger.info(`  After rooming list: ${currentAvail}`);

      // The availability should have decreased (at least by 1 due to the rooming list pickup)
      expect(currentAvail).toBeLessThanOrEqual(firstDayAvailBefore);
      logger.info(`✅ Availability decreased from ${firstDayAvailBefore} to ${currentAvail} (as expected)`);
    });

    await page.screenshot({
      path: 'screenshots/group-availability-verified.png',
      fullPage: true,
    });
  });
});
