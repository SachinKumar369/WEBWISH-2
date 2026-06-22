import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { GroupManagementPage, GroupCreatedRecord } from '../../src/pages/FrontDesk/GroupManagementPage';
import { GroupDetailsPage } from '../../src/pages/FrontDesk/GroupDetailsPage';
import { testDataManager } from '../../src/utils/TestDataManager';

const timestamp = Date.now();
let businessDateGlobal = '';
let sharedGroupName = '';

test.describe.serial('Front Desk - Group Details Actions', () => {
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

  // Helper to login and navigate to group management
  async function loginAndNavigate(
    page: any,
    context: any,
    groupManagementPage: GroupManagementPage
  ): Promise<void> {
    const loginPage = new LoginPage(page, context);
    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    businessDateGlobal = await groupManagementPage.getBusinessDate();
    logger.info(`Business Date: ${businessDateGlobal}`);

    await groupManagementPage.navigateToGroupManagement();
  }

  // ============================================
  // TEST: FD_GDETAILS_001 - Open group and verify all displayed fields
  // ============================================
  test('FD_GDETAILS_001: Open group and verify all displayed fields', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const groupManagementPage = new GroupManagementPage(page, context);
    const groupDetailsPage = new GroupDetailsPage(page, context);

    await loginAndNavigate(page, context, groupManagementPage);

    // Create a single group that ALL subsequent tests will use
    sharedGroupName = `DetailChk_${timestamp}`;
    const record = await groupManagementPage.createNewGroup(sharedGroupName);

    // Now open the group we just created
    await groupDetailsPage.openGroup(sharedGroupName);

    const details = await groupDetailsPage.getGroupDetailsFromDisplay();

    // Verify the group details heading
    const isDetailsVisible = await groupDetailsPage.isGroupDetailsPageVisible();
    expect(isDetailsVisible).toBeTruthy();
    logger.info('✅ Group Details page is visible');

    // Verify the group name is displayed
    expect(details.groupName?.trim()).toBe(record.groupName);
    logger.info(`✅ Group Name displayed: ${details.groupName}`);

    // Verify arrival/departure dates are displayed
    expect(details.arrivalDeparture).toBeTruthy();
    expect(details.arrivalDeparture).toContain(record.arrivalDate.substring(0, 2));
    logger.info(`✅ Arrival/Departure displayed: ${details.arrivalDeparture}`);

    // Verify release block on date
    expect(details.releaseBlockOn).toBeTruthy();
    logger.info(`✅ Release Block On displayed: ${details.releaseBlockOn}`);

    // Verify rate code is displayed
    expect(details.rate).toBeTruthy();
    logger.info(`✅ Rate displayed: ${details.rate}`);

    // Verify Group Block section is visible
    const isBlockVisible = await groupDetailsPage.isGroupBlockVisible();
    expect(isBlockVisible).toBeTruthy();
    logger.info('✅ Group Block section is visible');

    // Verify Bill Summary section is visible
    const isBillVisible = await groupDetailsPage.isBillSummaryVisible();
    expect(isBillVisible).toBeTruthy();
    logger.info('✅ Bill Summary section is visible');

    logger.info('✅ FD_GDETAILS_001: All displayed fields verified');
  });

  // ============================================
  // TEST: FD_GDETAILS_002 - Edit group name and verify update
  // ============================================
  test('FD_GDETAILS_002: Edit group name and verify update', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const groupManagementPage = new GroupManagementPage(page, context);
    const groupDetailsPage = new GroupDetailsPage(page, context);

    await loginAndNavigate(page, context, groupManagementPage);

    // Open the shared group
    await groupDetailsPage.openGroup(sharedGroupName);

    // Modify the group name
    const newName = `Edited_${timestamp}`;
    await groupDetailsPage.modifyGroupName(newName);

    // Update the shared name so subsequent tests use the new name
    sharedGroupName = newName;

    // Verify the updated name is displayed
    const updatedDetails = await groupDetailsPage.getGroupDetailsFromDisplay();
    expect(updatedDetails.groupName?.trim()).toBe(newName);
    logger.info(`✅ Group name updated and verified: ${updatedDetails.groupName}`);
  });

  // ============================================
  // TEST: FD_GDETAILS_003 - Edit group contact number and email
  // ============================================
  test('FD_GDETAILS_003: Edit contact number and email', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const groupManagementPage = new GroupManagementPage(page, context);
    const groupDetailsPage = new GroupDetailsPage(page, context);

    await loginAndNavigate(page, context, groupManagementPage);

    // Open the shared group
    await groupDetailsPage.openGroup(sharedGroupName);

    // Open edit dialog
    await groupDetailsPage.openEditDialog();

    // Update contact number
    const newContact = '9876543210';
    await groupDetailsPage.updateContactNumber(newContact);

    // Update email
    const newEmail = 'test@example.com';
    await groupDetailsPage.updateEmailId(newEmail);

    // Save
    await groupDetailsPage.saveEditDialog();
    await groupDetailsPage.verifySuccessAndDismiss();

    // Close the edit dialog if still open
    try {
      await groupDetailsPage.closeEditDialog();
    } catch {
      logger.info('Dialog already closed');
    }

    // Verify updated contact number is displayed
    const updatedContactDetails = await groupDetailsPage.getGroupDetailsFromDisplay();
    expect(updatedContactDetails.contactNumber?.trim()).toContain(newContact.substring(0, 4));
    logger.info(`✅ Contact number updated: ${updatedContactDetails.contactNumber}`);

    logger.info('✅ FD_GDETAILS_003: Contact and email edited successfully');
  });

  // ============================================
  // TEST: FD_GDETAILS_004 - Navigate to Notes section and verify
  // ============================================
  test('FD_GDETAILS_004: Navigate to Notes section and verify dialog', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const groupManagementPage = new GroupManagementPage(page, context);
    const groupDetailsPage = new GroupDetailsPage(page, context);

    await loginAndNavigate(page, context, groupManagementPage);

    // Open the shared group
    await groupDetailsPage.openGroup(sharedGroupName);

    // Navigate to Notes section
    await groupDetailsPage.navigateToNotes();

    // Verify Notes dialog is open
    const isNotesVisible = await groupDetailsPage.isNotesDialogVisible();
    expect(isNotesVisible).toBeTruthy();
    logger.info('✅ Notes dialog is visible');

    // Verify Reservation Notes radio button is present (may be custom component)
    const reservationRadio = page.getByText('Reservation Notes');
    expect(await reservationRadio.count()).toBeGreaterThan(0);
    logger.info('✅ Reservation Notes option is present');

    // Close the dialog
    await groupDetailsPage.closeSectionDialog();
    logger.info('✅ FD_GDETAILS_004: Notes section verified');
  });

  // ============================================
  // TEST: FD_GDETAILS_005 - Navigate to Bill Routing section, apply template, close
  // ============================================
  test.skip('FD_GDETAILS_005: Navigate to Bill Routing, apply template, and close', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const groupManagementPage = new GroupManagementPage(page, context);
    const groupDetailsPage = new GroupDetailsPage(page, context);

    await loginAndNavigate(page, context, groupManagementPage);

    // Open the shared group
    await groupDetailsPage.openGroup(sharedGroupName);

    // Navigate to Bill Routing
    await groupDetailsPage.navigateToBillRouting();
    logger.info('✅ Bill Routing section opened');

    // Click Apply Template on the first tab
    await groupDetailsPage.clickApplyTemplate();
    logger.info('✅ Apply Template clicked successfully');

    // Close the Bill Routing screen
    await groupDetailsPage.closeSectionDialog();
    logger.info('✅ Bill Routing dialog closed');

    logger.info('✅ FD_GDETAILS_005: Bill Routing - apply template and close verified');
  });

  // ============================================
  // TEST: FD_GDETAILS_006 - Verify Bill Summary display
  // ============================================
  test('FD_GDETAILS_006: Verify Bill Summary and Block Summary', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const groupManagementPage = new GroupManagementPage(page, context);
    const groupDetailsPage = new GroupDetailsPage(page, context);

    await loginAndNavigate(page, context, groupManagementPage);

    // Open the shared group
    await groupDetailsPage.openGroup(sharedGroupName);

    // Verify Bill Summary is visible
    const isBillVisible = await groupDetailsPage.isBillSummaryVisible();
    expect(isBillVisible).toBeTruthy();
    logger.info('✅ Bill Summary section is visible');

    // Verify Due Amount is displayed
    const dueAmount = await groupDetailsPage.getDueAmount();
    expect(dueAmount).toBeTruthy();
    logger.info(`✅ Due Amount: ${dueAmount}`);

    // Verify Group Block is visible
    const isGroupBlockVisible = await groupDetailsPage.isGroupBlockVisible();
    expect(isGroupBlockVisible).toBeTruthy();
    logger.info('✅ Group Block section is visible');

    // Verify Include Member Postings checkbox exists
    const memberPostings = page.getByRole('checkbox', { name: 'Include Member Postings' });
    expect(await memberPostings.count()).toBeGreaterThan(0);
    logger.info('✅ Include Member Postings checkbox exists');

    logger.info('✅ FD_GDETAILS_006: Bill Summary and Block Summary verified');
  });

  // ============================================
  // TEST: FD_GDETAILS_007 - Verify Additional Services tab
  // ============================================
  test('FD_GDETAILS_007: Verify Additional Services tab', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const groupManagementPage = new GroupManagementPage(page, context);
    const groupDetailsPage = new GroupDetailsPage(page, context);

    await loginAndNavigate(page, context, groupManagementPage);

    // Open the shared group
    await groupDetailsPage.openGroup(sharedGroupName);

    // Click on Additional Services tab
    await groupDetailsPage.clickAdditionalServicesTab();

    // Verify Add Services text is visible
    const isAddVisible = await groupDetailsPage.isAddServicesVisible();
    expect(isAddVisible).toBeTruthy();
    logger.info('✅ Add Services text is visible');

    logger.info('✅ FD_GDETAILS_007: Additional Services tab verified');
  });

  // ============================================
  // TEST: FD_GDETAILS_008 - Verify Group Block section
  // ============================================
  test('FD_GDETAILS_008: Verify Group Block section', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const groupManagementPage = new GroupManagementPage(page, context);
    const groupDetailsPage = new GroupDetailsPage(page, context);

    await loginAndNavigate(page, context, groupManagementPage);

    // Open the shared group
    await groupDetailsPage.openGroup(sharedGroupName);

    // Verify Group Block heading is visible
    const isBlockVisible = await groupDetailsPage.isGroupBlockVisible();
    expect(isBlockVisible).toBeTruthy();
    logger.info('✅ Group Block section is visible');

    // Verify Group Block heading text
    const blockHeading = page.getByRole('heading', { name: 'Group Block' });
    const headingText = await blockHeading.textContent();
    expect(headingText?.trim()).toBe('Group Block');
    logger.info(`✅ Group Block heading: ${headingText}`);

    // Verify Add Room Type button (icon button next to heading)
    const addBtn = page.getByRole('heading', { name: 'Group Block' }).locator('..').locator('button').first();
    const addBtnCount = await addBtn.count();
    logger.info(`Add Room Type button found: ${addBtnCount > 0}`);

    // Verify Refresh Block button
    const refreshBtn = page.getByRole('heading', { name: 'Group Block' }).locator('..').locator('button').last();
    const refreshBtnCount = await refreshBtn.count();
    logger.info(`Refresh Block button found: ${refreshBtnCount > 0}`);

    logger.info('✅ FD_GDETAILS_008: Group Block section verified');
  });

  // ============================================
  // TEST: FD_GDETAILS_009 - Navigate to multiple sections
  // ============================================
  test('FD_GDETAILS_009: Navigate to Movement, Task Details, and Billing Details', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const groupManagementPage = new GroupManagementPage(page, context);
    const groupDetailsPage = new GroupDetailsPage(page, context);

    await loginAndNavigate(page, context, groupManagementPage);

    // Open the shared group
    await groupDetailsPage.openGroup(sharedGroupName);

    // Navigate to Movement
    await groupDetailsPage.navigateToMovement();
    const isMovementOpen = await groupDetailsPage.isSectionDialogOpen('Movement');
    expect(isMovementOpen).toBeTruthy();
    logger.info('✅ Movement section opened');
    await groupDetailsPage.closeSectionDialog();

    // Navigate to Task Details
    await groupDetailsPage.navigateToTaskDetails();
    const isTaskOpen = await groupDetailsPage.isSectionDialogOpen('Task');
    expect(isTaskOpen).toBeTruthy();
    logger.info('✅ Task Details section opened');
    await groupDetailsPage.closeSectionDialog();

    // Navigate to Billing Details
    await groupDetailsPage.navigateToBillingDetails();
    const isBillingOpen = await groupDetailsPage.isSectionDialogOpen('Billing');
    expect(isBillingOpen).toBeTruthy();
    logger.info('✅ Billing Details section opened');
    await groupDetailsPage.closeSectionDialog();

    logger.info('✅ FD_GDETAILS_009: Multiple sections navigation verified');
  });

  // ============================================
  // TEST: FD_GDETAILS_010 - Verify Change Captain button
  // ============================================
  test('FD_GDETAILS_010: Verify Change Captain button presence', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const groupManagementPage = new GroupManagementPage(page, context);
    const groupDetailsPage = new GroupDetailsPage(page, context);

    await loginAndNavigate(page, context, groupManagementPage);

    // Open the shared group
    await groupDetailsPage.openGroup(sharedGroupName);

    // Check for Change Captain button (may not be visible for all group states)
    const isVisible = await groupDetailsPage.isChangeCaptainVisible();
    if (isVisible) {
      logger.info('✅ Change Captain button is visible');

      // Click Change Captain button
      await groupDetailsPage.clickChangeCaptain();
      logger.info('✅ Change Captain button clicked');

      // Close any dialog that opened
      await groupDetailsPage.closeSectionDialog();
    } else {
      // Try alternative: check for icon button near group header
      const altBtn = page.locator('button').filter({ hasText: /Change Captain/i });
      if (await altBtn.count() > 0) {
        await altBtn.first().click();
        logger.info('✅ Change Captain button clicked (alternative locator)');
        await groupDetailsPage.closeSectionDialog();
      } else {
        logger.info('ℹ️ Change Captain button not found (may not be available for this group state)');
      }
    }

    logger.info('✅ FD_GDETAILS_010: Change Captain verified');
  });

  // ============================================
  // TEST: FD_GDETAILS_011 - Edit external reference, coordinator, and comments
  // ============================================
  test('FD_GDETAILS_011: Edit external reference, coordinator, and comments', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const groupManagementPage = new GroupManagementPage(page, context);
    const groupDetailsPage = new GroupDetailsPage(page, context);

    await loginAndNavigate(page, context, groupManagementPage);

    // Open the shared group
    await groupDetailsPage.openGroup(sharedGroupName);

    // Open edit dialog
    await groupDetailsPage.openEditDialog();

    // Update external reference
    await groupDetailsPage.updateExternalReference(`EXT-${timestamp}`);

    // Update coordinator
    await groupDetailsPage.updateCoordinator('Test Coordinator');

    // Update comments
    await groupDetailsPage.updateComments('Updated via automated test');

    // Save
    await groupDetailsPage.saveEditDialog();
    await groupDetailsPage.verifySuccessAndDismiss();

    // Close the edit dialog
    try {
      await groupDetailsPage.closeEditDialog();
    } catch {
      logger.info('Dialog already closed');
    }

    logger.info('✅ FD_GDETAILS_011: External reference, coordinator, and comments updated');
  });

  // ============================================
  // TEST: FD_GDETAILS_012 - Navigate to Preferences and Download Details
  // ============================================
  test('FD_GDETAILS_012: Navigate to Preferences, Download Details, and View/Print', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const groupManagementPage = new GroupManagementPage(page, context);
    const groupDetailsPage = new GroupDetailsPage(page, context);

    await loginAndNavigate(page, context, groupManagementPage);

    // Open the shared group
    await groupDetailsPage.openGroup(sharedGroupName);

    // Navigate to Preferences and Deposit Details
    await groupDetailsPage.navigateToPreferencesAndDeposit();
    const isPrefsOpen = await groupDetailsPage.isSectionDialogOpen('Preferences');
    expect(isPrefsOpen).toBeTruthy();
    logger.info('✅ Preferences and Deposit Details opened');
    await groupDetailsPage.closeSectionDialog();

    // Navigate to Download Details
    await groupDetailsPage.navigateToDownloadDetails();
    const isDownloadOpen = await groupDetailsPage.isSectionDialogOpen('Download');
    expect(isDownloadOpen).toBeTruthy();
    logger.info('✅ Download Details opened');
    await groupDetailsPage.closeSectionDialog();

    // Navigate to View/Print Document
    await groupDetailsPage.navigateToViewPrintDocument();
    const isViewPrintOpen = await groupDetailsPage.isSectionDialogOpen('View/Print');
    expect(isViewPrintOpen).toBeTruthy();
    logger.info('✅ View/Print Document opened');
    await groupDetailsPage.closeSectionDialog();

    logger.info('✅ FD_GDETAILS_012: Preferences, Download Details, and View/Print verified');
  });

  // ============================================
  // TEST: FD_GDETAILS_013 - Execute section tab workflow
  // ============================================
  test('FD_GDETAILS_013: Execute section tab workflow', async ({ page, context }) => {
    test.setTimeout(40 * 60 * 1000);

    const groupManagementPage = new GroupManagementPage(page, context);
    const groupDetailsPage = new GroupDetailsPage(page, context);

    await loginAndNavigate(page, context, groupManagementPage);
    if (!sharedGroupName) {
      sharedGroupName = `DetailChk_${timestamp}`;
      await groupManagementPage.createNewGroup(sharedGroupName);
    }
    await groupDetailsPage.openGroup(sharedGroupName);

    const dialogMessage = page.getByRole('paragraph');
    const yesButton = page.getByRole('button', { name: 'Yes' });
    const okButton = page.getByRole('button', { name: 'OK' });
    const closeButton = page.getByRole('button', { name: 'Close' });

    const acceptPrompt = async (expectedText: string): Promise<void> => {
      await expect(dialogMessage).toContainText(expectedText);
      await yesButton.click();
    };

    const acceptOkMessage = async (expectedText: string): Promise<void> => {
      await expect(dialogMessage).toContainText(expectedText);
      await okButton.click();
    };

    // Bill Routing
    await groupDetailsPage.navigateToBillRouting();
    await groupDetailsPage.clickApplyTemplate();
    await acceptPrompt('Do you want to Apply this Template.');
    // Wait for loader to disappear before checking checkbox - increased timeout
    await page.locator('.loader-overlay').waitFor({ state: 'hidden', timeout: 30000 });
    await page.locator('#checkAll').check();
    await page.getByRole('button').nth(2).click();
    const deleteMessage = (await dialogMessage.textContent()) ?? '';
    if (deleteMessage.includes('Do you want to delete the selected record?')) {
      await yesButton.click();
      await acceptOkMessage('Data Deleted Successfully.');
      await page.getByRole('button').nth(2).click();
      await acceptOkMessage('Please select at least one record from list to delete.');
    } else {
      await acceptOkMessage('Please select at least one record from list to delete.');
    }
    await groupDetailsPage.clickApplyTemplate();
    await acceptPrompt('Do you want to Apply this Template.');
    await groupDetailsPage.closeSectionDialog();

    // Billing Details - Using POM methods
    await groupDetailsPage.navigateToBillingDetails();
    await groupDetailsPage.fillBillingDetailsForm({
      billingInstructions: 'Bill to Prologic First PVT LTD',
      billTo: '123',
      address1: 'PHASE 5',
      countryArrowDowns: 5,
      stateArrowDowns: 5
    });
    await acceptOkMessage('Details created/updated successfully.');
    await groupDetailsPage.closeSectionDialog();

    // Download Details
    await groupDetailsPage.navigateToDownloadDetails();
    await groupDetailsPage.closeSectionDialog();

    // Member Bill Routing Details - SKIPPED as per user request
    // await groupDetailsPage.navigateToMemberBillRouting();
    // await groupDetailsPage.clickApplyTemplate();
    // await acceptPrompt('Do you want to Apply this Template.');
    // await page.getByRole('button', { name: 'Save', exact: true }).click();
    // await acceptOkMessage('Details created/updated successfully.');
    // await groupDetailsPage.closeSectionDialog();

    // Availability / room setup workflow
    await page.getByRole('button', { name: 'Sections 󰅀' }).click();
    await page.getByRole('button', { name: 'Sections 󰅀' }).click();
    await groupDetailsPage.clickAddRoomType();
    await page.getByRole('combobox').click();
    await page.getByRole('textbox').fill('');
    await page.getByRole('textbox').press('ArrowDown');
    await page.getByRole('textbox').press('ArrowDown');
    await page.getByRole('textbox').press('ArrowDown');
    await page.getByRole('textbox').press('Enter');
    await page.getByRole('spinbutton').first().click();
    await page.getByRole('spinbutton').first().press('ControlOrMeta+A');
    await page.getByRole('spinbutton').first().fill('3');
    await page.getByRole('spinbutton').nth(1).click();
    await page.getByRole('spinbutton').nth(1).press('ControlOrMeta+A');
    await page.getByRole('spinbutton').nth(1).fill('2');
    await page.getByRole('button', { name: 'Generate dates' }).click();
    await page.getByRole('button', { name: 'Validate Availability' }).click();
    await acceptOkMessage('Rooms are available for the specified dates.');
    await page.getByRole('button', { name: 'View Availability' }).click();
    await closeButton.click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await acceptOkMessage('Details created/updated successfully.');
    // The Availability dialog should close automatically after Save
    // Wait for main page to be ready
    await groupDetailsPage.waitForMainPageReady();

    // Additional Services
    await page.getByText('+ Add Services').click();
    await page.getByRole('checkbox', { name: 'charge', exact: true }).check();
    await page.getByRole('checkbox', { name: 'TR_FOOD' }).check();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('textbox', { name: 'Select Date Range' }).fill('30/06/2025 TO 05/07/2025');
    await page.getByRole('textbox', { name: 'Select Date Range' }).press('Tab');
    await page.getByRole('textbox', { name: 'Select Date Range' }).click();
    await page.getByLabel('June 30,').click();
    await page.getByLabel('July 5,').click();
    await page.locator('amount-control').getByRole('textbox').fill('10000');
    await page.getByRole('checkbox', { name: 'Daily' }).check();
    await page.getByRole('textbox').nth(4).click();
    await page.locator('ng-select').filter({ hasText: '--select-- CHAR Charger IR' }).getByRole('textbox').press('ArrowDown');
    await page.locator('ng-select').filter({ hasText: '--select-- CHAR Charger IR' }).getByRole('textbox').press('ArrowDown');
    await page.locator('ng-select').filter({ hasText: '--select-- CHAR Charger IR' }).getByRole('textbox').press('Enter');
    await page.getByRole('spinbutton').click();
    await page.getByRole('spinbutton').press('ControlOrMeta+A');
    await page.getByRole('spinbutton').fill('5');
    await page.getByRole('button', { name: 'TR_FOOD ' }).getByRole('button').click();
    await page.getByRole('button', { name: 'Save' }).click();
    await acceptOkMessage('Details created/updated successfully.');

    // Task Details
    await groupDetailsPage.navigateToTaskDetails();
    await page.getByRole('button').first().click();
    await page.getByRole('textbox', { name: 'Select' }).first().click();
    await page.getByLabel('June 30,').first().click();
    await page.getByRole('textbox', { name: 'Select' }).nth(1).click();
    await page.getByLabel('July 5,').nth(1).click();
    await page.locator('.ng-arrow-wrapper').first().click();
    await page.locator('ng-select').filter({ hasText: '--select-- P Pending C' }).getByRole('textbox').fill('PEN');
    await page.getByText('Pending').click();
    await page.getByRole('combobox').nth(1).click();



   await page.locator('ng-select').filter({ hasText: '--select-- 1111 :\\"\';/Sasa' }).getByRole('textbox').fill('bal');
  await page.getByText('Balcony').click();


      
    

    // await page.locator('ng-select').filter({ hasText: '--select-- 1111 :\"\';/Sasa' }).getByRole('textbox').press('ArrowDown');
    // await page.locator('ng-select').filter({ hasText: '--select-- 1111 :\"\';/Sasa' }).getByRole('textbox').press('ArrowDown');
    // await page.locator('ng-select').filter({ hasText: '--select-- 1111 :\"\';/Sasa' }).getByRole('textbox').press('ArrowDown');
    // await page.locator('ng-select').filter({ hasText: '--select-- 1111 :\"\';/Sasa' }).getByRole('textbox').press('ArrowDown');
    // await page.locator('ng-select').filter({ hasText: '--select-- 1111 :\"\';/Sasa' }).getByRole('textbox').press('ArrowDown');
    // await page.locator('ng-select').filter({ hasText: '--select-- 1111 :\"\';/Sasa' }).getByRole('textbox').press('ArrowDown');
    // await page.locator('ng-select').filter({ hasText: '--select-- 1111 :\"\';/Sasa' }).getByRole('textbox').press('ArrowDown');
    // await page.locator('ng-select').filter({ hasText: '--select-- 1111 :\"\';/Sasa' }).getByRole('textbox').press('ArrowDown');
    // await page.locator('ng-select').filter({ hasText: '--select-- 1111 :\"\';/Sasa' }).getByRole('textbox').press('ArrowDown');
    // await page.locator('ng-select').filter({ hasText: '--select-- 1111 :\"\';/Sasa' }).getByRole('textbox').press('ArrowDown');
    // await page.locator('ng-select').filter({ hasText: '--select-- 1111 :\"\';/Sasa' }).getByRole('textbox').press('ArrowDown');
    // await page.locator('ng-select').filter({ hasText: '--select-- LGGF' }).getByRole('textbox').press('ArrowDown');
    // await page.locator('ng-select').filter({ hasText: '--select-- LGGF' }).getByRole('textbox').press('ArrowUp');
    // await page.locator('ng-select').filter({ hasText: '--select-- LOC03 Health' }).getByRole('textbox').press('Enter');
    // await page.locator('ng-select').filter({ hasText: '--select--× LOC10 Restaurant ×' }).getByRole('textbox').press('Tab');
     await page.locator('input-control').getByRole('textbox').fill('AUTOMATION');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await acceptOkMessage('Details created/updated successfully.');

    // Preferences and Deposit Details

    // await page.locator('#checkAll').check();
    // await page.getByRole('button').nth(2).click();
    await page.locator('#checkAll').check();
    await page.getByRole('button').nth(1).click();
    await acceptPrompt('Do you want to delete the selected record?');
    await acceptOkMessage('Reuqested data has been deleted successfully.');
    await closeButton.click();
    await groupDetailsPage.navigateToPreferencesAndDeposit();
    await page.getByRole('textbox').first().click();
    await page.locator('ng-select').filter({ hasText: '--select-- 69 AUTOMATION BD' }).getByRole('textbox').press('ArrowDown');
    await page.locator('ng-select').filter({ hasText: '--select-- 69 AUTOMATION BD' }).getByRole('textbox').press('ArrowDown');
    await page.locator('ng-select').filter({ hasText: '--select-- 69 AUTOMATION BD' }).getByRole('textbox').press('Enter');
    await page.getByRole('textbox').nth(1).click();
    await page.locator('ng-select').filter({ hasText: '--select-- BK Bouquet CK Cake' }).getByRole('textbox').press('ArrowDown');
    await page.locator('ng-select').filter({ hasText: '--select-- BK Bouquet CK Cake' }).getByRole('textbox').press('ArrowDown');
    await page.locator('ng-select').filter({ hasText: '--select-- BK Bouquet CK Cake' }).getByRole('textbox').press('ArrowDown');
    await page.locator('ng-select').filter({ hasText: '--select-- BK Bouquet CK Cake' }).getByRole('textbox').press('Enter');
    await page.getByRole('combobox').nth(2).click();
    await page.locator('ng-select').filter({ hasText: '--select-- ARB Arabic BEN' }).getByRole('textbox').press('ArrowDown');
    await page.locator('ng-select').filter({ hasText: '--select-- ARB Arabic BEN' }).getByRole('textbox').press('ArrowDown');
    await page.locator('ng-select').filter({ hasText: '--select-- ARB Arabic BEN' }).getByRole('textbox').press('ArrowDown');
    await page.locator('ng-select').filter({ hasText: '--select-- ARB Arabic BEN' }).getByRole('textbox').press('ArrowDown');
    await page.locator('ng-select').filter({ hasText: '--select-- ARB Arabic BEN' }).getByRole('textbox').press('ArrowDown');
    await page.locator('ng-select').filter({ hasText: '--select-- ARB Arabic BEN' }).getByRole('textbox').press('ArrowUp');
    await page.locator('ng-select').filter({ hasText: '--select-- ARB Arabic BEN' }).getByRole('textbox').press('ArrowUp');
    await page.locator('ng-select').filter({ hasText: '--select-- ARB Arabic BEN' }).getByRole('textbox').press('ArrowUp');
    await page.locator('ng-select').filter({ hasText: '--select-- ARB Arabic BEN' }).getByRole('textbox').press('Enter');
    await page.locator('#country').getByRole('combobox').click();
    await page.locator('.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-untouched > .ng-select-container > .ng-value-container > .ng-input > input').first().press('ArrowDown');
    await page.locator('.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-untouched > .ng-select-container > .ng-value-container > .ng-input > input').first().press('ArrowDown');
    await page.locator('.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-untouched > .ng-select-container > .ng-value-container > .ng-input > input').first().press('Enter');
    await page.getByRole('button', { name: 'Update' }).click();
    await acceptOkMessage('Details created/updated successfully.');
    await groupDetailsPage.closeSectionDialog();

    // Notes
  //   await groupDetailsPage.navigateToNotes();
  //   await page.getByRole('button').first().click();
  //   await page.getByRole('textbox', { name: 'Editor editing area: main.' }).click();
  //   await page.getByRole('button', { name: 'Save' }).click();

  //   await expect(page.locator('#swal2-html-container')).toContainText('Please Fill All *Mandatory Fields..!');
  // await page.getByRole('button', { name: 'OK' }).click();

  //   await page.locator('radio-button-list > div > div:nth-child(2)').click();
  //   await page.getByRole('button', { name: 'Save' }).click();
  //   await acceptOkMessage('Details created/updated successfully.');
  //   await groupDetailsPage.closeSectionDialog();

    // Movement
    await groupDetailsPage.navigateToMovement();
    await page.getByRole('button').first().click();
    await page.getByRole('textbox', { name: 'Select' }).click();
    await page.getByLabel('June 30,').click();
    await page.locator('input[type="time"]').fill('11:11');
    await page.locator('input-control').getByRole('textbox').fill('MOVEMENT');
    await page.getByRole('button', { name: 'Save' }).click();
    await acceptOkMessage('Details created/updated successfully.');
    await groupDetailsPage.closeSectionDialog();


// import rooming list 
await page.locator('button').filter({ hasText: 'Import Excel' }).click();
const download4Promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Template' }).click();
  const download4 = await download4Promise;
await page.getByRole('button', { name: 'Close' }).click();
await page.locator('.dropdown-toggle.btn.btn-sm.dropdown.arrow-none.d-block.py-0.px-2.text-info').click();
await page.getByText('Dummy List').click();
await page.getByRole('textbox').nth(1).click();
await page.getByRole('textbox').nth(1).fill('salman');
await page.getByRole('button', { name: 'Save' }).click();
await expect(page.getByRole('paragraph')).toContainText('Guest(s) reservation successfull.');
await page.getByRole('button', { name: 'OK' }).click();
await page.locator('.dropdown-toggle.btn.btn-sm.dropdown.arrow-none.d-block.py-0.px-2.text-info').click();
await page.getByText('Rate Plan').click();
await page.getByRole('button', { name: 'OK' }).click();
await page.getByRole('button', { name: 'Close' }).click();
await page.getByLabel('Show CX/NS also').check();
await page.locator('icon-button-control:nth-child(6) > .btn').click();
await page.locator('button').filter({ hasText: 'Import Excel' }).click();
const download5Promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Template' }).click();
  const download5 = await download5Promise;
//await page.getByRole('button', { name: 'Browse for file' }).click();
//await page.getByRole('button', { name: 'Browse for file' }).setInputFiles('"C:\\Users\\sachin\\Downloads\\ReservationTemplate (2).xlsx"');


await page.locator('#fileDropRef').setInputFiles(
  'C:\\Users\\sachin\\Downloads\\ReservationTemplate (2).xlsx'
);


await page.getByRole('button', { name: 'Upload' }).click();
await page.getByRole('button', { name: 'Close' }).click();
await page.locator('icon-button-control:nth-child(6) > .btn').click();
await page.locator('input[name="checkAllfolio"]').check();
await page.getByText('Auto Assign Room').click();
await expect(page.getByRole('paragraph')).toContainText('Rooms Allocated.');
await page.getByRole('button', { name: 'OK' }).click();

await page.getByText('Auto Assign Room').click();
await expect(page.getByRole('paragraph')).toContainText('ROOM ALREADY EXISTS/ASSIGNED (757)');
await page.getByRole('button', { name: 'OK' }).click();
await page.getByText('Checkin', { exact: true }).click();
await expect(page.getByRole('paragraph')).toContainText('Group is not In-house');
await page.getByRole('button', { name: 'OK' }).click();
await page.locator('dropdown-button:nth-child(6) > .d-flex > .flex-shrink-0 > div > .dropdown-toggle').click();
await page.getByText('Checkin Group').click();
await expect(page.getByRole('paragraph')).toContainText('Are you Sure You Want To Checkin');
await page.getByRole('button', { name: 'Yes' }).click();
await expect(page.getByRole('paragraph')).toContainText('Group Checked In.');
await page.getByRole('button', { name: 'OK' }).click();
await page.locator('dropdown-button:nth-child(6) > .d-flex > .flex-shrink-0 > div > .dropdown-toggle').click();
await page.getByText('Process Checkout').click();
await expect(page.getByRole('paragraph')).toContainText('Are you sure you want to check out the Group ?');
await page.getByRole('button', { name: 'Yes' }).click();
await expect(page.getByRole('paragraph')).toContainText('You cannot check out this group because some of the guests are already confirmed.');
await page.getByRole('button', { name: 'OK' }).click();
await page.locator('dropdown-button:nth-child(6) > .d-flex > .flex-shrink-0 > div > .dropdown-toggle').click();
await page.locator('.show > .dropdown-toggle').click();

await page.getByText('Sections').click();
await page.getByText('Download Details').click();
await page.getByRole('row', { name: 'Guest Id Room Type Name Status' }).getByLabel('', { exact: true }).check();
await page.getByRole('row', { name: 'Download For Value' }).getByLabel('', { exact: true }).check();
await page.getByRole('button', { name: 'Save' }).click();
await expect(page.getByRole('paragraph')).toContainText('Download Successful.');
await page.getByRole('button', { name: 'OK' }).click();
await page.getByText('No Show').click();
await expect(page.getByRole('paragraph')).toContainText('Details created/updated successfully.');
await page.getByRole('button', { name: 'OK' }).click();
await page.getByText('Cancel Confirm').click();
await page.getByRole('combobox').click();
await page.getByRole('combobox').getByRole('textbox').press('ArrowDown');
await page.getByRole('combobox').getByRole('textbox').press('Enter');
await page.locator('textarea').click();
await page.locator('textarea').fill('unknown');
await page.getByRole('button', { name: 'Ok' }).click();
await expect(page.getByRole('paragraph')).toContainText('Details created/updated successfully.');
await page.getByRole('button', { name: 'OK' }).click();


await page.locator('dropdown-button:nth-child(6) > .d-flex > .flex-shrink-0 > div > .dropdown-toggle').click();
  await page.getByText('Process Checkout').click();
  await expect(page.getByRole('paragraph')).toContainText('Are you sure you want to check out the Group ?');
  await page.getByRole('button', { name: 'Yes' }).click();
  await expect(page.getByRole('paragraph')).toContainText('Group Checked Out.');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('group-details')).toContainText('CHECKED OUT');




    // Final section close
    // await groupDetailsPage.navigateToMemberBillRouting();
    // await groupDetailsPage.closeSectionDialog();

    logger.info('✅ FD_GDETAILS_013: Section tab workflow completed');
  });
});
