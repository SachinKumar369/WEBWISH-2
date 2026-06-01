import { test, expect, Page, BrowserContext } from '@playwright/test';
import { LoginPage } from '../../../src/pages/LoginPage';
import { SelectProperty } from '../../../src/pages/SelectProperty';
import { TemporaryOutOfOrderPage } from '../../../src/pages/Reports/HKReports/TemporaryOutOfOrderPage';
import { testDataManager } from '../../../src/utils/TestDataManager';
import logger from '../../../src/core/Logger';

test.describe('HouseKeeping Reports - Temporary Out of Order', () => {
  let page: Page;
  let context: BrowserContext;
  let loginPage: LoginPage;
  let selectProperty: SelectProperty;
  let temporaryOutOfOrderPage: TemporaryOutOfOrderPage;

  test.beforeEach(async ({ page: testPage, context: testContext }) => {
    page = testPage;
    context = testContext;
    loginPage = new LoginPage(page, context);
    selectProperty = new SelectProperty(page, context);
    temporaryOutOfOrderPage = new TemporaryOutOfOrderPage(page, context);

    logger.info(`Starting test: ${test.info().title}`);

    // Keep fixed viewport only when maximize mode is disabled
    if (process.env.MAXIMIZE_BROWSER !== 'true') {
      await page.setViewportSize({ width: 1280, height: 720 });
    }

    // Perform login with property selection
    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();
    expect(user.username).toBeTruthy();
    expect(user.password).toBeTruthy();

    logger.info(`Logging in with user: ${user.username}`);
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    logger.info('✅ Login and property selection completed');
  });

  test.afterEach(async () => {
    logger.info(`Test finished: ${test.info().title}`);

    // Take screenshot if test failed
    if (test.info().status === 'failed') {
      const screenshotPath = await temporaryOutOfOrderPage.takeScreenshot(`test_failure_${test.info().title}`);
      logger.error(`Test failed. Screenshot: ${screenshotPath}`);
    }

    // Check if browser should stay open
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';

    if (keepBrowserOpen) {
      logger.info('🔒 KEEP_BROWSER_OPEN is enabled. Browser will stay open. Press any key in console to continue...');
      await page.pause();
    } else {
      // Pause before closing browser so you can see the result
      const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '5000', 10);
      logger.info(`⏸️  Pausing for ${pauseDuration}ms before browser closes... You can inspect the page.`);
      await page.waitForTimeout(pauseDuration);
      logger.info('✅ Resuming - Browser will close now');
    }
  });

  test('TC_HK_TEMP_OOO_001: Set Temporary Out of Order for all rooms and verify success', async () => {
    try {
      logger.info('🔍 TC_HK_TEMP_OOO_001: Setting Temporary Out of Order for all rooms');
      
      // Search for HouseKeeping Operations
      logger.info('📝 Searching for HouseKeeping Operations');
      await temporaryOutOfOrderPage.searchForHouseKeepingOperations('house');
      
      // Select all rooms
      logger.info('✅ Selecting all rooms');
      await temporaryOutOfOrderPage.selectAllRooms();
      
      // Set Temporary Out of Order with time and notes
      logger.info('⏰ Setting Temporary Out of Order with time and notes');
      await temporaryOutOfOrderPage.setTemporaryOutOfOrder('1111P', 'automation');
      
      // Apply settings
      logger.info('🔧 Applying settings');
      await temporaryOutOfOrderPage.applySettings();
      
      // Check HK Status checkbox
      logger.info('☑️ Checking HK Status checkbox');
      await temporaryOutOfOrderPage.checkHKStatusCheckbox();
      await temporaryOutOfOrderPage.releaseSelectedRooms(); // Release rooms to reset state for next tests
      
      // Save selected rooms
      logger.info('💾 Saving selected rooms');
      await temporaryOutOfOrderPage.saveSelectedRooms();
      
      // Verify success message
      logger.info('✔️ Verifying success message');
      await temporaryOutOfOrderPage.verifySuccessAndCloseDialog();
      
      logger.info('✅ Test: TC_HK_TEMP_OOO_001 - PASSED');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_HK_TEMP_OOO_002: Toggle Temporary Out of Order status for individual rooms', async () => {
    try {
      logger.info('🔍 TC_HK_TEMP_OOO_002: Toggling Temporary Out of Order for specific rooms');
      
      // Search for HouseKeeping Operations
      logger.info('📝 Searching for HouseKeeping Operations');
      await temporaryOutOfOrderPage.searchForHouseKeepingOperations('house');
      
      // Click on T-OOO tag to filter
      logger.info('🏷️ Clicking on T-OOO tag to filter');
      await temporaryOutOfOrderPage.clickTemporaryOOOTag();
      
      // Select specific rooms (indices 0, 1, 2, 3, 4)
      logger.info('🎯 Selecting specific rooms');
      await temporaryOutOfOrderPage.selectSpecificRooms([0, 1, 2, 3, 4]);
      
      // Set Temporary Out of Order
      logger.info('⏰ Setting Temporary Out of Order');
      await temporaryOutOfOrderPage.setTemporaryOutOfOrder('1111P', 'automation');
      
      // Apply settings
      logger.info('🔧 Applying settings');
      await temporaryOutOfOrderPage.applySettings();
      
      // Check checkbox and save
      logger.info('☑️ Checking status and saving');
      await temporaryOutOfOrderPage.checkHKStatusCheckbox();
      await temporaryOutOfOrderPage.saveSelectedRooms();
      
      // Verify success
      logger.info('✔️ Verifying success');
      await temporaryOutOfOrderPage.verifySuccessAndCloseDialog();
      
      logger.info('✅ Test: TC_HK_TEMP_OOO_002 - PASSED');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_HK_TEMP_OOO_003: Release rooms from Temporary Out of Order', async () => {
    try {
      logger.info('🔍 TC_HK_TEMP_OOO_003: Releasing rooms from Temporary Out of Order');
      
      // Search for HouseKeeping Operations
      logger.info('📝 Searching for HouseKeeping Operations');
      await temporaryOutOfOrderPage.searchForHouseKeepingOperations('house');
      
      // Select specific rooms
      logger.info('🎯 Selecting specific rooms');
      await temporaryOutOfOrderPage.selectSpecificRooms([0, 1, 2, 3, 4]);
      
      // Release the selected rooms from Temporary Out of Order
      logger.info('🔓 Releasing selected rooms');
      await temporaryOutOfOrderPage.releaseSelectedRooms();
      
      // Verify success
      logger.info('✔️ Verifying success');
      await temporaryOutOfOrderPage.verifySuccessAndCloseDialog();
      
      logger.info('✅ Test: TC_HK_TEMP_OOO_003 - PASSED');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_HK_TEMP_OOO_004: View Temporary Out of Order report', async () => {
    try {
      logger.info('🔍 TC_HK_TEMP_OOO_004: Viewing Temporary Out of Order Report');
      
      // Navigate to Temporary Out of Order Report
      logger.info('📊 Navigating to report');
      await temporaryOutOfOrderPage.navigateToTemporaryOutOfOrderReport();
      
      // Verify the report page is loaded by checking if the list item button exists
      await temporaryOutOfOrderPage.waitForReportToLoad();
      logger.info('✔️ Report page loaded successfully');
      
      logger.info('✅ Test: TC_HK_TEMP_OOO_004 - PASSED');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_HK_TEMP_OOO_005: Open report details in popup', async () => {
    try {
      logger.info('🔍 TC_HK_TEMP_OOO_005: Opening report details in popup');
      
      // Navigate to Temporary Out of Order Report
      logger.info('📊 Navigating to report');
      await temporaryOutOfOrderPage.navigateToTemporaryOutOfOrderReport();
      
      // Wait for popup and click the list item button
      logger.info('🔓 Opening popup');
      const popupPage = await temporaryOutOfOrderPage.openFirstReportPopup();
      
      // Verify popup is opened
      expect(popupPage).toBeTruthy();
      logger.info('✔️ Popup opened successfully');
      
      // Wait a bit for popup to fully load
      await popupPage.waitForLoadState('domcontentloaded');
      logger.info('✔️ Popup loaded');
      
      logger.info('✅ Test: TC_HK_TEMP_OOO_005 - PASSED');
      
      // Close the popup
      await popupPage.close();
      logger.info('🔒 Popup closed');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_HK_TEMP_OOO_006: Complete flow - Set, verify, and release Temporary Out of Order', async () => {
    try {
      logger.info('🔍 TC_HK_TEMP_OOO_006: Complete flow test');
      
      // Step 1: Search for HouseKeeping Operations
      logger.info('📝 Step 1: Searching for HouseKeeping Operations');
      await temporaryOutOfOrderPage.searchForHouseKeepingOperations('house');
      
      // Step 2: Select all rooms and set temporary out of order
      logger.info('📋 Step 2: Setting Temporary Out of Order for all rooms');
      await temporaryOutOfOrderPage.selectFirstNRooms(5);
      await temporaryOutOfOrderPage.setTemporaryOutOfOrder('1111P', 'automation');
      await temporaryOutOfOrderPage.applySettings();
      await temporaryOutOfOrderPage.checkHKStatusCheckbox();
      await temporaryOutOfOrderPage.saveSelectedRooms();
      await temporaryOutOfOrderPage.verifySuccessAndCloseDialog();
      logger.info('✅ Step 2 completed');
      
      // Step 3: Click on T-OOO tag and select specific rooms
      logger.info('🏷️ Step 3: Filtering by T-OOO tag and selecting specific rooms');
      await temporaryOutOfOrderPage.clickTemporaryOOOTag();
      await temporaryOutOfOrderPage.selectSpecificRooms([0, 1, 2, 3, 4]);
      logger.info('✅ Step 3 completed');
      
      // Step 4: Set temporary out of order again
      logger.info('⏰ Step 4: Setting Temporary Out of Order again');
      await temporaryOutOfOrderPage.setTemporaryOutOfOrder('1111P', 'automation');
      await temporaryOutOfOrderPage.applySettings();
      await temporaryOutOfOrderPage.checkHKStatusCheckbox();
      await temporaryOutOfOrderPage.saveSelectedRooms();
      await temporaryOutOfOrderPage.verifySuccessAndCloseDialog();
      logger.info('✅ Step 4 completed');
      
      // Step 5: Release rooms from temporary out of order
      logger.info('🔓 Step 5: Releasing rooms from Temporary Out of Order');
      await temporaryOutOfOrderPage.releaseSelectedRooms();
      await temporaryOutOfOrderPage.verifySuccessAndCloseDialog();
      logger.info('✅ Step 5 completed');
      
      // Step 6: Navigate to report and verify
      logger.info('📊 Step 6: Navigating to report and verifying');
      await temporaryOutOfOrderPage.navigateToTemporaryOutOfOrderReport();
      await temporaryOutOfOrderPage.waitForReportToLoad();
      logger.info('✅ Step 6 completed');
      
      logger.info('✅ Test: TC_HK_TEMP_OOO_006 - PASSED');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });
});
