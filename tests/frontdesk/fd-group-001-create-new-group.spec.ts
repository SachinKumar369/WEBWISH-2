import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { GroupManagementPage } from '../../src/pages/FrontDesk/GroupManagementPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

/**
 * FD_GROUP_001 — Create new group with all required fields
 *
 * Flow:
 *   Login → navigate to Group Management → click New Group
 *   → fill Group Name, Date Range (arrival=business date, departure=business date + 5),
 *     Release Block On, Rate Code, Market Segment, Business Source,
 *     Domicile, Currency, Group Class, Payment Method
 *   → click No-Block → verify success message → verify group appears in list
 */

test.describe('FD_GROUP_001 - Create new group with all required fields', () => {
  let pageObj: GroupManagementPage;
  let groupName: string;

  test.beforeEach(async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    pageObj = new GroupManagementPage(page, context);
    groupName = `AutoGrp_${Date.now()}`;

    // Auto-dismiss unexpected dialogs
    page.on('dialog', async (dialog) => {
      logger.info(`Auto-dismissing dialog: ${dialog.type()} - ${dialog.message()}`);
      await dialog.accept();
    });
  });

  test.afterEach(async ({ page }) => {
    if (test.info().status === 'failed') {
      await page.screenshot({
        path: `screenshots/FD_GROUP_001_failure_${test.info().title}.png`,
        fullPage: true,
      });
    }
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      await page.pause();
    }
  });

  test('FD_GROUP_001: Create new group with all required fields and verify in list', async ({
    page,
    context,
  }) => {
    test.setTimeout(20 * 60 * 1000);

    // ── Step 1: Login & select property ──
    logger.info('Step 1: Logging in and selecting property');
    const loginPage = new LoginPage(page, context);
    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    logger.info('✅ Login successful');

    // ── Step 2: Navigate to Group Management ──
    logger.info('Step 2: Navigating to Group Management');
    await pageObj.navigateToGroupManagement();
    const isPageVisible = await pageObj.isGroupManagementPageVisible();
    expect(isPageVisible).toBeTruthy();
    logger.info('✅ Group Management page loaded');

    // ── Step 3: Capture initial group count ──
    const initialCount = await pageObj.getGroupTotalCount();
    logger.info(`Initial group count: ${initialCount}`);

    // ── Step 4: Create new group with all required fields ──
    // createNewGroup() performs:
    //   click New Group → fill Group Name
    //   → select Date Range (arrival = business date, departure = business date + 5)
    //   → set Release Block On = business date
    //   → select Rate Code, Market Segment, Business Source,
    //     Domicile, Currency, Group Class, Payment Method
    //   → click No-Block → verify success message → click OK
    logger.info('Step 4: Creating new group with all required fields');
    logger.info(`  Group Name: ${groupName}`);
    logger.info('  Date Range: business date → business date + 5');
    logger.info('  Release Block On: business date');
    logger.info('  Dropdowns: Rate Code, Market Segment, Business Source, Domicile, Currency, Group Class, Payment Method');

    const createdRecord = await pageObj.createNewGroup(groupName);

    // ── Step 5: Verify returned record fields ──
    logger.info('Step 5: Verifying created group record');
    expect(createdRecord.groupName).toBe(groupName);
    expect(createdRecord.businessDate).toBeTruthy();
    expect(createdRecord.arrivalDate).toBeTruthy();
    expect(createdRecord.departureDate).toBeTruthy();
    expect(createdRecord.releaseBlockDate).toBeTruthy();

    // Validate date formats (DD/MM/YYYY)
    expect(createdRecord.arrivalDate).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    expect(createdRecord.departureDate).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    expect(createdRecord.releaseBlockDate).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);

    logger.info(`  Arrival Date:     ${createdRecord.arrivalDate}`);
    logger.info(`  Departure Date:   ${createdRecord.departureDate}`);
    logger.info(`  Release Block On: ${createdRecord.releaseBlockDate}`);
    logger.info(`  Business Date:    ${createdRecord.businessDate}`);
    logger.info('✅ Group record validated');

    // ── Step 6: Verify group count increased ──
    logger.info('Step 6: Verifying group count increased');
    const countIncreased = await pageObj.verifyGroupCountIncreased(initialCount);
    expect(countIncreased).toBeTruthy();
    logger.info(`✅ Group count increased from ${initialCount}`);

    // ── Step 7: Verify group appears in the list ──
    logger.info('Step 7: Verifying group appears in the list');
    const groupVisible = await pageObj.verifyGroupInList(groupName);
    expect(groupVisible).toBeTruthy();
    logger.info(`✅ Group "${groupName}" is visible in the list`);

    // ── Screenshot ──
    await page.screenshot({
      path: 'screenshots/FD_GROUP_001_create_new_group.png',
      fullPage: true,
    });

    logger.info('✅ FD_GROUP_001: All assertions passed — group created with all required fields');
  });
});
