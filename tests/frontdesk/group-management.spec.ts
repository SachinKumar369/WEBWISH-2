import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { GroupManagementPage } from '../../src/pages/FrontDesk/GroupManagementPage';
import { testDataManager } from '../../src/utils/TestDataManager';

// Generate unique group name with timestamp
const timestamp = Date.now();
const uniqueGroupName = `Sachin_${timestamp}`;
const updatedGroupName = `Sachin Kumar_${timestamp}`;

let businessDateGlobal = '';

test.describe.serial('Front Desk - Group Management', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss any beforeunload or unexpected dialogs globally
    page.on('dialog', async (dialog) => {
      logger.info(`Handling dialog in test: ${dialog.type()} - ${dialog.message()}`);
      await dialog.accept();
    });
  });

  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'false';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  // ============================================
  // TEST: FD_GROUP_001 - Create new group with business date driven dates
  // ============================================
  test('FD_GROUP_001: Create new group with business date driven dates', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const groupManagementPage = new GroupManagementPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Group Management flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Verify business date is present in footer
    const businessDate = await groupManagementPage.getBusinessDate();
    expect(businessDate).toBeTruthy();
    expect(businessDate).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    logger.info(`Business Date from footer: ${businessDate}`);

    // Verify Group Management page is accessible
    await groupManagementPage.navigateToGroupManagement();
    const isPageVisible = await groupManagementPage.isGroupManagementPageVisible();
    expect(isPageVisible).toBeTruthy();

    // Get initial group count
    const initialCount = await groupManagementPage.getGroupTotalCount();
    logger.info(`Initial group count: ${initialCount}`);

    logger.info('Step 1: Creating new group with business date-driven dates');
    const createdGroup = await groupManagementPage.createNewGroup(uniqueGroupName);

    // Store business date for next test
    businessDateGlobal = createdGroup.businessDate;

    // Validate created group record
    expect(createdGroup.groupName).toBe(uniqueGroupName);
    expect(createdGroup.businessDate).toBeTruthy();
    expect(createdGroup.arrivalDate).toBeTruthy();
    expect(createdGroup.departureDate).toBeTruthy();
    expect(createdGroup.releaseBlockDate).toBeTruthy();

    // Validate date formats
    expect(createdGroup.arrivalDate).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    expect(createdGroup.departureDate).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    expect(createdGroup.releaseBlockDate).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);

    // Verify group count increased
    const countIncreased = await groupManagementPage.verifyGroupCountIncreased(initialCount);
    expect(countIncreased).toBeTruthy();

    logger.info(`Group created with details:
      - Name: ${createdGroup.groupName}
      - Arrival Date: ${createdGroup.arrivalDate}
      - Departure Date: ${createdGroup.departureDate}
      - Release Block Date: ${createdGroup.releaseBlockDate}
      - Business Date: ${createdGroup.businessDate}`);

    await page.screenshot({
      path: 'screenshots/FD_GROUP_001.png',
      fullPage: true
    });
  });

  // ============================================
  // TEST: FD_GROUP_002 - Modify existing group details
  // ============================================
  test('FD_GROUP_002: Modify existing group details', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const groupManagementPage = new GroupManagementPage(page, context);

    // Each test gets a fresh browser context, so we must re-login
    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Re-logging in for FD_GROUP_002 modify flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Navigate to Group Management
    await groupManagementPage.navigateToGroupManagement();

    logger.info('Step 2: Modifying the created group');

    await groupManagementPage.modifyGroup(
      uniqueGroupName,
      updatedGroupName,
      businessDateGlobal
    );

    await page.screenshot({
      path: 'screenshots/FD_GROUP_002.png',
      fullPage: true
    });
  });

  // ============================================
  // TEST: FD_GROUP_003 - Validate required fields on empty form submission
  // ============================================
  test('FD_GROUP_003: Validate required fields on empty form submission', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const groupManagementPage = new GroupManagementPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Navigate to Group Management
    await groupManagementPage.navigateToGroupManagement();

    // Validate required fields are marked
    const validationErrors = await groupManagementPage.validateRequiredFieldsOnSubmit();

    // All required fields should be marked with asterisks
    expect(validationErrors.groupNameRequired).toBeTruthy();
    expect(validationErrors.arrivalDepartureRequired).toBeTruthy();
    expect(validationErrors.releaseBlockOnRequired).toBeTruthy();
    expect(validationErrors.rateCodeRequired).toBeTruthy();
    expect(validationErrors.marketSegmentRequired).toBeTruthy();
    expect(validationErrors.businessSourceRequired).toBeTruthy();
    expect(validationErrors.domicileCodeRequired).toBeTruthy();
    expect(validationErrors.currencyRequired).toBeTruthy();
    expect(validationErrors.groupClassRequired).toBeTruthy();
    expect(validationErrors.paymentMethodRequired).toBeTruthy();

    logger.info('✅ All required field validations passed');
    await page.screenshot({
      path: 'screenshots/FD_GROUP_003_validation.png',
      fullPage: true
    });
  });

  // ============================================
  // TEST: FD_GROUP_004 - Create group with optional fields
  // ============================================
  test('FD_GROUP_004: Create group with optional fields (contact, email)', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const groupManagementPage = new GroupManagementPage(page, context);
    const optionalGroupName = `TestOpt_${Date.now()}`;

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Validate email format before proceeding
    const testEmail = 'test@example.com';
    const isEmailValid = await groupManagementPage.validateEmailField(testEmail);
    expect(isEmailValid).toBeTruthy();

    // Navigate to Group Management
    await groupManagementPage.navigateToGroupManagement();

    // Create group with optional fields
    const createdGroup = await groupManagementPage.createGroupWithValidation(
      optionalGroupName,
      {
        contactNumber: '9876543210',
        emailId: testEmail,
        externalReference: 'REF_001'
      }
    );

    // Validate created group
    expect(createdGroup.groupName).toBe(optionalGroupName);
    expect(createdGroup.businessDate).toBeTruthy();

    logger.info(`✅ Group with optional fields created: ${JSON.stringify(createdGroup)}`);
    await page.screenshot({
      path: 'screenshots/FD_GROUP_004_optional_fields.png',
      fullPage: true
    });
  });

  // ============================================
  // TEST: FD_GROUP_005 - Validate business date format from footer
  // ============================================
  test('FD_GROUP_005: Validate business date format from footer', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const groupManagementPage = new GroupManagementPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Get business date from footer
    const businessDate = await groupManagementPage.getBusinessDate();

    // Validate format DD/MM/YYYY
    expect(businessDate).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);

    // Validate date components
    const [day, month, year] = businessDate.split('/').map(Number);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(year).toBeGreaterThanOrEqual(2025);

    // Validate the date is actually valid
    const isDateValid = await groupManagementPage.validateDateFormat(businessDate);
    expect(isDateValid).toBeTruthy();

    logger.info(`✅ Business date validation passed: ${businessDate}`);
    await page.screenshot({
      path: 'screenshots/FD_GROUP_005_business_date.png',
      fullPage: true
    });
  });

  // ============================================
  // TEST: FD_GROUP_006 - Create group and verify it appears in list
  // ============================================
  test('FD_GROUP_006: Create group and verify it appears in list', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const groupManagementPage = new GroupManagementPage(page, context);
    const verifyGroupName = `Verify_${Date.now()}`;

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Navigate to Group Management
    await groupManagementPage.navigateToGroupManagement();

    // Get initial count
    const initialCount = await groupManagementPage.getGroupTotalCount();

    // Create group
    const createdGroup = await groupManagementPage.createNewGroup(verifyGroupName);

    // Verify group appears in the list
    const groupVisible = await groupManagementPage.verifyGroupInList(verifyGroupName);
    expect(groupVisible).toBeTruthy();

    // Verify count increased
    const countIncreased = await groupManagementPage.verifyGroupCountIncreased(initialCount);
    expect(countIncreased).toBeTruthy();

    logger.info(`✅ Group verified in list: ${verifyGroupName}`);
    await page.screenshot({
      path: 'screenshots/FD_GROUP_006_verify_in_list.png',
      fullPage: true
    });
  });
});
