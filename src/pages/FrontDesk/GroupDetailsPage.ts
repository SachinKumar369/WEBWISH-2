import { Page, BrowserContext, expect, Locator } from '@playwright/test';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export interface GroupDetails {
  groupName: string;
  arrivalDeparture: string;
  releaseBlockOn: string;
  rate: string;
  contactNumber: string;
  emailId: string;
  businessSource: string;
  marketSegment: string;
  domicile: string;
  groupClass: string;
  currency: string;
  bookedThru: string;
}

export interface BillSummary {
  dueAmount: string;
  total: string;
  payment: string;
}

export interface RoomingListEntry {
  lastName: string;
  firstName: string;
  arrival: string;
  departure: string;
  roomType: string;
  rateCode: string;
}

export class GroupDetailsPage {
  page: Page;
  context: BrowserContext;
  private elementActions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
    this.elementActions = new ElementActions(page);
  }

  // ============================================
  // LOCATORS - Header & Navigation
  // ============================================

  private get groupDetailsHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Group Details' }).first();
  }

  private get groupDetailsNumberHeading(): Locator {
    return this.page.getByRole('heading', { name: /Group Details -/ });
  }

  private get sectionsDropdown(): Locator {
    return this.page.getByRole('button', { name: /Sections/ })
    .or(this.page.getByText('Sections'));
  }

  private get searchButton(): Locator {
    return this.page.locator('button').filter({ has: this.page.locator('.mdi-magnify, .mdi-printer, .mdi-email, .mdi-dots-vertical') }).first();
  }

  private get printButton(): Locator {
    // The header toolbar has multiple icon buttons; print is typically the second one after sections
    return this.page.locator('.group-details-header button, .page-header button').nth(2);
  }

  // ============================================
  // LOCATORS - Group Info Display
  // ============================================

  private get groupNameDisplay(): Locator {
    // Structure: div(div('Group Name') + h6(value))
    return this.page.getByText('Group Name', { exact: true }).locator('..').getByRole('heading', { level: 6 }).first();
  }

  private get arrivalDepartureDisplay(): Locator {
    return this.page.getByText('Arrival/Departure', { exact: true }).locator('..').getByRole('heading', { level: 6 }).first();
  }

  private get releaseBlockOnDisplay(): Locator {
    return this.page.getByText('Release Block On', { exact: true }).locator('..').getByRole('heading', { level: 6 }).first();
  }

  private get rateDisplay(): Locator {
    // Use the parent container pattern: find div with label "Rate" then get sibling heading
    return this.page.getByText('Rate', { exact: true }).locator('..').getByRole('heading', { level: 6 }).first();
  }

  private get contactNumberDisplay(): Locator {
    return this.page.getByText('Contact Number', { exact: true }).locator('..').getByRole('heading', { level: 6 }).first();
  }

  private get businessSourceDisplay(): Locator {
    return this.page.getByText('Business Source', { exact: true }).locator('..').getByRole('heading', { level: 6 }).first();
  }

  private get marketSegmentDisplay(): Locator {
    return this.page.getByText('Market Segment', { exact: true }).locator('..').getByRole('heading', { level: 6 }).first();
  }

  private get domicileDisplay(): Locator {
    return this.page.getByText('Domicile', { exact: true }).locator('..').getByRole('heading', { level: 6 }).first();
  }

  private get groupClassDisplay(): Locator {
    return this.page.getByText('Group Class', { exact: true }).locator('..').getByRole('heading', { level: 6 }).first();
  }

  private get currencyDisplay(): Locator {
    return this.page.getByText('Currency', { exact: true }).locator('..').getByRole('heading', { level: 6 }).first();
  }

  private get bookedThruDisplay(): Locator {
    return this.page.getByText('Booked Thru', { exact: true }).locator('..').getByRole('heading', { level: 6 }).first();
  }

  private get statusBadge(): Locator {
    return this.page.locator('div').filter({ hasText: /^CONFIRMED$/ }).or(
      this.page.locator('div').filter({ hasText: /^RESERVED$/ })
    ).first();
  }

  private get groupNumberDisplay(): Locator {
    // The group number appears near the status badge
    return this.page.locator('div').filter({ hasText: /^\d{10,}$/ }).first();
  }

  // ============================================
  // LOCATORS - Edit Dialog
  // ============================================

  private get editButton(): Locator {
    return this.page.locator('button').filter({ has: this.page.locator('.mdi-pencil') }).first();
  }

  private get editDialogTitle(): Locator {
    return this.page.getByRole('heading', { name: /Group Details/ }).last();
  }

  private get groupNameInput(): Locator {
    return this.page.getByRole('dialog').locator('div').filter({ hasText: /^Group Name\*$/ }).getByRole('textbox').first();
  }

  private get contactNumberInput(): Locator {
    return this.page.getByRole('dialog').locator('div').filter({ hasText: /^Contact Number$/ }).getByRole('textbox').first();
  }

  private get emailIdInput(): Locator {
    return this.page.getByRole('dialog').locator('div').filter({ hasText: /^Email Id$/ }).getByRole('textbox').first();
  }

  private get externalReferenceInput(): Locator {
    return this.page.getByRole('dialog').locator('div').filter({ hasText: /^External Reference$/ }).getByRole('textbox').first();
  }

  private get coordinatorInput(): Locator {
    return this.page.getByRole('dialog').locator('div').filter({ hasText: /^Co-Ordinator$/ }).getByRole('textbox').first();
  }

  private get commentsInput(): Locator {
    return this.page.getByRole('dialog').locator('div').filter({ hasText: /^Comments$/ }).getByRole('textbox').first();
  }

  private get saveButton(): Locator {
    return this.page.getByRole('button', { name: 'Save' });
  }

  private get closeButton(): Locator {
    return this.page.getByRole('button', { name: 'Close' });
  }

  private get okButton(): Locator {
    return this.page.getByRole('button', { name: 'OK' });
  }

  private get dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  // ============================================
  // LOCATORS - Group Block
  // ============================================

  private get groupBlockHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Group Block' });
  }

  private get addRoomTypeButton(): Locator {
    // The "+" button in Group Block header
    return this.page.getByRole('heading', { name: 'Group Block' })
      .locator('..')
      .locator('button')
      .first();
  }

  private get refreshBlockButton(): Locator {
    return this.page.getByRole('heading', { name: 'Group Block' })
      .locator('..')
      .locator('button')
      .last();
  }

  // ============================================
  // LOCATORS - Rooming List
  // ============================================

  private get roomingListHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Rooming List' });
  }

  private get addRoomingListButton(): Locator {
    return this.page.getByRole('button', { name: '+ Rooming List' });
  }

  private get importExcelButton(): Locator {
    return this.page.getByRole('button', { name: 'Import Excel' });
  }

  private get showCxNsCheckbox(): Locator {
    return this.page.getByText('Show CX/NS also');
  }

  private get roomingListTable(): Locator {
    return this.page.locator('table').filter({ has: this.page.getByRole('columnheader', { name: 'Last Name' }) }).first();
  }

  // ============================================
  // LOCATORS - Bill Summary
  // ============================================

  private get billSummaryHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Bill Summary' });
  }

  private get applyDiscountsLink(): Locator {
    return this.page.getByText('Apply Discounts');
  }

  private get includeMemberPostingsCheckbox(): Locator {
    return this.page.getByText('Include Member Postings');
  }

  private get dueAmountDisplay(): Locator {
    return this.page.getByText('Due Amount', { exact: true }).locator('..').getByRole('heading', { level: 5 }).first();
  }

  // ============================================
  // LOCATORS - Block Summary
  // ============================================

  private get blockSummaryHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Group Block' });
  }

  // ============================================
  // LOCATORS - Additional Services
  // ============================================

  private get additionalServicesTab(): Locator {
    return this.page.getByRole('button', { name: /Additional Services/ });
  }

  private get addServicesText(): Locator {
    return this.page.getByText('+ Add Services');
  }

  // ============================================
  // LOCATORS - Change Captain
  // ============================================

  private get changeCaptainButton(): Locator {
    return this.page.getByRole('button', { name: '+ Change Captain' });
  }

  // ============================================
  // LOCATORS - Section Dialog Items
  // ============================================

  private get billRoutingMenuItem(): Locator {
    return this.page.getByText('Bill Routing', { exact: true });
  }

  private get billingDetailsMenuItem(): Locator {
    return this.page.getByText('Billing Details', { exact: true });
  }

  private get downloadDetailsMenuItem(): Locator {
    return this.page.getByText('Download Details', { exact: true });
  }

  private get memberBillRoutingMenuItem(): Locator {
    return this.page.getByText('Member Bill Routing Details', { exact: true });
  }

  private get movementMenuItem(): Locator {
    return this.page.getByText('Movement', { exact: true });
  }

  private get notesMenuItem(): Locator {
    return this.page.getByText('Notes', { exact: true });
  }

  private get preferencesDepositMenuItem(): Locator {
    return this.page.getByText('Preferences and Deposit Details', { exact: true });
  }

  private get taskDetailsMenuItem(): Locator {
    return this.page.getByText('Task Details', { exact: true });
  }

  private get viewPrintDocumentMenuItem(): Locator {
    return this.page.getByText('View/Print Document', { exact: true });
  }

  // Notes dialog locators
  private get reservationNotesRadio(): Locator {
    return this.page.getByRole('radio', { name: 'Reservation Notes' });
  }

  private get inhouseNotesRadio(): Locator {
    return this.page.getByRole('radio', { name: 'Inhouse Notes' });
  }

  private get notesAddButton(): Locator {
    // The "+" button in the Notes section
    return this.page.getByRole('heading', { name: 'Notes' })
      .locator('..')
      .locator('button')
      .first();
  }

  // ============================================
  // NAVIGATION & VERIFICATION METHODS
  // ============================================

  /**
   * Verify we are on the Group Details page
   */
  async isGroupDetailsPageVisible(): Promise<boolean> {
    const heading = this.page.getByRole('heading', { name: 'Group Details' });
    return (await heading.count()) > 0;
  }

  /**
   * Get the group number from the page
   */
  async getGroupNumber(): Promise<string> {
    const heading = await this.groupDetailsNumberHeading.textContent();
    const match = heading?.match(/Group Details - (\d+)/);
    return match ? match[1] : '';
  }

  /**
   * Open a group from the Group Management list
   */
  async openGroup(searchName: string): Promise<void> {
    logger.info(`Opening group: ${searchName}`);

    // Search for the group
    // const searchInput = this.page
    //   .locator('div')
    //   .filter({ has: this.page.getByRole('button', { name: /Total:/ }) })
    //   .getByPlaceholder('Search...')
    //   .first();

    const searchInput = this.page.locator('app-group-search').getByRole('textbox', { name: 'Search...' });

    await this.elementActions.click(searchInput, 'Group search input');
    await this.elementActions.sendKeys(searchInput, searchName, 'Group search input');
    await this.page.waitForTimeout(1000);

    // Click Open on the matched card
    const matchedCard = this.page
      .locator('.card-mode-2-card')
      .filter({ hasText: searchName })
      .first();

    const openButtonInCard = matchedCard.getByRole('heading', { name: 'Open' });
    await this.elementActions.click(openButtonInCard, `Open button for group: ${searchName}`);
    await this.page.waitForTimeout(2000);

    // Verify we're on the group details page
    const isVisible = await this.isGroupDetailsPageVisible();
    if (!isVisible) {
      throw new Error(`Failed to open group details for: ${searchName}`);
    }

    logger.info(`✅ Opened group details for: ${searchName}`);
  }

  // ============================================
  // GROUP INFO DISPLAY METHODS
  // ============================================

  /**
   * Get all displayed group details
   */
  async getGroupDetailsFromDisplay(): Promise<GroupDetails> {
    logger.info('Getting group details from display');

    const details: GroupDetails = {
      groupName: (await this.groupNameDisplay.textContent()) ?? '',
      arrivalDeparture: (await this.arrivalDepartureDisplay.textContent()) ?? '',
      releaseBlockOn: (await this.releaseBlockOnDisplay.textContent()) ?? '',
      rate: (await this.rateDisplay.textContent()) ?? '',
      contactNumber: (await this.contactNumberDisplay.textContent()) ?? '',
      emailId: '',
      businessSource: (await this.businessSourceDisplay.textContent()) ?? '',
      marketSegment: (await this.marketSegmentDisplay.textContent()) ?? '',
      domicile: (await this.domicileDisplay.textContent()) ?? '',
      groupClass: (await this.groupClassDisplay.textContent()) ?? '',
      currency: (await this.currencyDisplay.textContent()) ?? '',
      bookedThru: (await this.bookedThruDisplay.textContent()) ?? ''
    };

    logger.info(`Group details: ${JSON.stringify(details)}`);
    return details;
  }

  /**
   * Verify a specific field value in the group display
   */
  async verifyFieldValue(fieldName: string, expectedValue: string): Promise<boolean> {
    const fieldLocator = this.page.getByText(fieldName, { exact: true }).locator('..').getByRole('heading', { level: 6 }).first();
    const actualValue = (await fieldLocator.textContent())?.trim();
    const matches = actualValue === expectedValue;
    logger.info(`Verify ${fieldName}: expected="${expectedValue}", actual="${actualValue}", matches=${matches}`);
    return matches;
  }

  // ============================================
  // EDIT GROUP METHODS
  // ============================================

  /**
   * Click the Edit button to open the edit group dialog
   */
  async openEditDialog(): Promise<void> {
    logger.info('Opening Edit Group dialog');

    // The edit button is the pencil icon near the status badge
    const pencilButton = this.page.locator('button').filter({ has: this.page.locator('.mdi-pencil') }).first();
    if (await pencilButton.count() === 0) {
      // Try finding the button near CONFIRMED badge
      const statusArea = this.page.locator('div').filter({ hasText: /^CONFIRMED$/ }).first().locator('..');
      const editBtn = statusArea.locator('button').first();
      await this.elementActions.click(editBtn, 'Edit button');
    } else {
      await this.elementActions.click(pencilButton, 'Edit button');
    }
    await this.page.waitForTimeout(1000);

    // Verify dialog opened
    const dialogTitle = this.page.getByRole('heading', { name: 'Group Details' }).last();
    const isDialogVisible = await dialogTitle.count() > 0;
    if (!isDialogVisible) {
      throw new Error('Edit dialog did not open');
    }

    logger.info('✅ Edit Group dialog opened');
  }

  /**
   * Update the Group Name in the edit dialog
   */
  async updateGroupName(newName: string): Promise<void> {
    logger.info(`Updating Group Name to: ${newName}`);
    const groupNameField = this.page.getByRole('dialog').getByRole('textbox').first();
    await this.elementActions.click(groupNameField, 'Group Name textbox');
    await groupNameField.press('ControlOrMeta+a');
    await this.elementActions.sendKeys(groupNameField, newName, 'Updated Group Name');
    logger.info('✅ Group Name updated');
  }

  /**
   * Update Contact Number in the edit dialog
   */
  async updateContactNumber(newNumber: string): Promise<void> {
    logger.info(`Updating Contact Number to: ${newNumber}`);
    await this.elementActions.click(this.contactNumberInput, 'Contact Number input');
    await this.contactNumberInput.press('ControlOrMeta+a');
    await this.elementActions.sendKeys(this.contactNumberInput, newNumber, 'Contact Number');
    logger.info('✅ Contact Number updated');
  }

  /**
   * Update Email Id in the edit dialog
   */
  async updateEmailId(newEmail: string): Promise<void> {
    logger.info(`Updating Email Id to: ${newEmail}`);
    await this.elementActions.click(this.emailIdInput, 'Email Id input');
    await this.emailIdInput.press('ControlOrMeta+a');
    await this.elementActions.sendKeys(this.emailIdInput, newEmail, 'Email Id');
    logger.info('✅ Email Id updated');
  }

  /**
   * Update External Reference in the edit dialog
   */
  async updateExternalReference(ref: string): Promise<void> {
    logger.info(`Updating External Reference to: ${ref}`);
    await this.elementActions.click(this.externalReferenceInput, 'External Reference input');
    await this.elementActions.sendKeys(this.externalReferenceInput, ref, 'External Reference');
    logger.info('✅ External Reference updated');
  }

  /**
   * Update Coordinator in the edit dialog
   */
  async updateCoordinator(coordinator: string): Promise<void> {
    logger.info(`Updating Coordinator to: ${coordinator}`);
    await this.elementActions.click(this.coordinatorInput, 'Coordinator input');
    await this.elementActions.sendKeys(this.coordinatorInput, coordinator, 'Coordinator');
    logger.info('✅ Coordinator updated');
  }

  /**
   * Update Comments in the edit dialog
   */
  async updateComments(comments: string): Promise<void> {
    logger.info(`Updating Comments to: ${comments}`);
    await this.elementActions.click(this.commentsInput, 'Comments input');
    await this.elementActions.sendKeys(this.commentsInput, comments, 'Comments');
    logger.info('✅ Comments updated');
  }

  /**
   * Save the edit dialog
   */
  async saveEditDialog(): Promise<void> {
    logger.info('Saving edit dialog');
    await this.elementActions.click(this.saveButton, 'Save button');
    await this.page.waitForTimeout(500);
    logger.info('✅ Save clicked');
  }

  /**
   * Close the edit dialog
   */
  async closeEditDialog(): Promise<void> {
    logger.info('Closing edit dialog');
    await this.elementActions.click(this.closeButton, 'Close button');
    await this.page.waitForTimeout(500);
    logger.info('✅ Edit dialog closed');
  }

  /**
   * Verify success message and dismiss
   */
  async verifySuccessAndDismiss(): Promise<void> {
    logger.info('Verifying success message');
    const successMsg = this.page.getByRole('paragraph').filter({
      hasText: 'Details created/updated successfully.'
    });
    await expect(successMsg).toBeVisible({ timeout: 10000 });
    logger.info('✅ Success message displayed');

    await this.elementActions.click(this.okButton, 'OK button');
    await this.page.waitForTimeout(500);
    logger.info('✅ Success dialog dismissed');
  }

  /**
   * Modify group name and save (full edit flow)
   */
  async modifyGroupName(newName: string): Promise<void> {
    logger.info(`Modifying group name to: ${newName}`);
    await this.openEditDialog();
    await this.updateGroupName(newName);
    await this.saveEditDialog();
    await this.verifySuccessAndDismiss();

    // Close the edit dialog if still open
    try {
      const closeBtn = this.closeButton;
      if (await closeBtn.count() > 0 && await closeBtn.isVisible()) {
        await this.elementActions.click(closeBtn, 'Close button');
        await this.page.waitForTimeout(500);
      }
    } catch {
      logger.info('Dialog already closed');
    }

    logger.info(`✅ Group name modified to: ${newName}`);
  }

  // ============================================
  // SECTIONS NAVIGATION METHODS
  // ============================================

  /**
   * Open the Sections dropdown
   */
  async openSectionsDropdown(): Promise<void> {
    logger.info('Opening Sections dropdown');
    await this.elementActions.click(this.sectionsDropdown, 'Sections dropdown');
    await this.page.waitForTimeout(500);
    logger.info('✅ Sections dropdown opened');
  }

  /**
   * Navigate to a section from the Sections dropdown
   */
  async navigateToSection(sectionName: string): Promise<void> {
    logger.info(`Navigating to section: ${sectionName}`);
    await this.openSectionsDropdown();

    const menuItem = this.page.getByText(sectionName, { exact: true });
    await this.elementActions.click(menuItem, `${sectionName} menu item`);
    await this.page.waitForTimeout(1500);

    logger.info(`✅ Navigated to section: ${sectionName}`);
  }

  /**
   * Navigate to Notes section
   */
  async navigateToNotes(): Promise<void> {
    await this.navigateToSection('Notes');
  }

  /**
   * Navigate to Bill Routing section
   */
  async navigateToBillRouting(): Promise<void> {
    await this.navigateToSection('Bill Routing');
  }

  /**
   * Navigate to Billing Details section
   */
  async navigateToBillingDetails(): Promise<void> {
    await this.navigateToSection('Billing Details');
  }

  /**
   * Navigate to Movement section
   */
  async navigateToMovement(): Promise<void> {
    await this.navigateToSection('Movement');
  }

  /**
   * Navigate to Task Details section
   */
  async navigateToTaskDetails(): Promise<void> {
    await this.navigateToSection('Task Details');
  }

  /**
   * Navigate to Preferences and Deposit Details section
   */
  async navigateToPreferencesAndDeposit(): Promise<void> {
    await this.navigateToSection('Preferences and Deposit Details');
  }

  /**
   * Navigate to Download Details section
   */
  async navigateToDownloadDetails(): Promise<void> {
    await this.navigateToSection('Download Details');
  }

  /**
   * Navigate to Member Bill Routing Details section
   */
  async navigateToMemberBillRouting(): Promise<void> {
    await this.navigateToSection('Member Bill Routing Details');
  }

  /**
   * Navigate to View/Print Document section
   */
  async navigateToViewPrintDocument(): Promise<void> {
    await this.navigateToSection('View/Print Document');
  }

  /**
   * Close any open section dialog
   */
  async closeSectionDialog(): Promise<void> {
    logger.info('Closing section dialog');
    // Try Close button first - wait for it to be visible
    try {
      const closeBtn = this.page.getByRole('button', { name: 'Close' });
      await closeBtn.waitFor({ state: 'visible', timeout: 10000 });
      await this.elementActions.click(closeBtn, 'Close button');
      await this.page.waitForTimeout(1000);
      logger.info('✅ Section dialog closed via Close button');
      // Wait for main page to be ready
      //await this.waitForMainPageReady();
      return;
    } catch { 
      logger.warn('Close button not found or not visible, trying Escape key');
    }

    // Fallback: Escape key
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(1000);
    logger.info('✅ Section dialog closed via Escape');
    // Wait for main page to be ready
    await this.waitForMainPageReady();
  }

  /**
   * Wait for the main group details page to be ready after closing a section dialog
   */
  async waitForMainPageReady(): Promise<void> {
    logger.info('Waiting for main page to be ready...');
    // Wait for the Group Details heading to be visible - this indicates the main page is loaded
    await this.groupDetailsHeading.waitFor({ state: 'visible', timeout: 20000 });
    // Also wait for the Sections dropdown button to be visible
    await this.sectionsDropdown.waitFor({ state: 'visible', timeout: 10000 });
    // Additional wait for any animations
    await this.page.waitForTimeout(500);
    logger.info('✅ Main page is ready');
  }

  // ============================================
  // NOTES SECTION METHODS
  // ============================================

  /**
   * Check if the Notes dialog is visible
   */
  async isNotesDialogVisible(): Promise<boolean> {
    const notesHeading = this.page.getByRole('heading', { name: 'Notes' });
    return (await notesHeading.count()) > 0;
  }

  /**
   * Check if Reservation Notes radio is selected
   */
  async isReservationNotesSelected(): Promise<boolean> {
    const radio = this.page.getByRole('radio', { name: 'Reservation Notes' });
    return await radio.isChecked();
  }

  // ============================================
  // BILL ROUTING SECTION METHODS
  // ============================================

  /**
   * Click Apply Template on the first billing template tab
   */
  async clickApplyTemplate(): Promise<void> {
    logger.info('Clicking Apply Template on first billing tab');
    const applyBtn = this.page.getByText('Apply Template').first();
    await this.elementActions.click(applyBtn, 'Apply Template button');
    await this.page.waitForTimeout(2000);
    logger.info('✅ Apply Template clicked');
  }

  /**
   * Check if Inhouse Notes radio is enabled
   */
  async isInhouseNotesEnabled(): Promise<boolean> {
    const radio = this.page.getByRole('radio', { name: 'Inhouse Notes' });
    const isDisabled = await radio.isDisabled();
    return !isDisabled;
  }

  // ============================================
  // ROOMING LIST METHODS
  // ============================================

  /**
   * Click the Add Rooming List button
   */
  async clickAddRoomingList(): Promise<void> {
    logger.info('Clicking + Rooming List button');
    await this.elementActions.click(this.addRoomingListButton, '+ Rooming List button');
    await this.page.waitForTimeout(1000);
    logger.info('✅ Add Rooming List clicked');
  }

  /**
   * Check if the Rooming List table is visible (scrolls into view first)
   */
  async isRoomingListVisible(): Promise<boolean> {
    // Scroll the rooming list heading into view first
    try {
      await this.roomingListHeading.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(500);
    } catch { /* heading may not exist */ }
    return (await this.roomingListTable.count()) > 0;
  }

  /**
   * Get the count of rows in the Rooming List table
   */
  async getRoomingListRowCount(): Promise<number> {
    const rows = this.roomingListTable.locator('tbody tr');
    const count = await rows.count();
    logger.info(`Rooming List rows: ${count}`);
    return count;
  }

  /**
   * Toggle the Show CX/NS checkbox
   */
  async toggleShowCxNs(): Promise<void> {
    logger.info('Toggling Show CX/NS checkbox');
    await this.elementActions.click(this.showCxNsCheckbox, 'Show CX/NS checkbox');
    await this.page.waitForTimeout(500);
    logger.info('✅ Show CX/NS toggled');
  }

  /**
   * Click Import Excel button
   */
  async clickImportExcel(): Promise<void> {
    logger.info('Clicking Import Excel button');
    await this.elementActions.click(this.importExcelButton, 'Import Excel button');
    await this.page.waitForTimeout(1000);
    logger.info('✅ Import Excel clicked');
  }

  // ============================================
  // GROUP BLOCK METHODS
  // ============================================

  /**
   * Check if Group Block heading is visible
   */
  async isGroupBlockVisible(): Promise<boolean> {
    return (await this.groupBlockHeading.count()) > 0;
  }

  /**
   * Click Add Room Type button in Group Block
   */
  async clickAddRoomType(): Promise<void> {
    logger.info('Clicking Add Room Type button');
    // Try multiple locators for the Add Room Type button
    let addButton = this.page.getByRole('button', { name: /Add Room Type/i });
    
    if (await addButton.count() === 0) {
      // Fallback: look for button near Group Block heading
      const blockHeader = this.page.getByRole('heading', { name: 'Group Block' });
      addButton = blockHeader.locator('..').locator('button').first();
    }
    
    if (await addButton.count() === 0) {
      // Another fallback: look for button with mdi-plus icon
      addButton = this.page.locator('button').filter({ has: this.page.locator('.mdi-plus, .mdi-plus-circle') }).first();
    }
    
    await this.elementActions.click(addButton, 'Add Room Type button');
    await this.page.waitForTimeout(1000);
    logger.info('✅ Add Room Type clicked');
  }

  /**
   * Click Refresh button in Group Block
   */
  async clickRefreshBlock(): Promise<void> {
    logger.info('Clicking Refresh Block button');
    const blockHeader = this.page.getByRole('heading', { name: 'Group Block' });
    const refreshBtn = blockHeader.locator('..').locator('button').last();
    await this.elementActions.click(refreshBtn, 'Refresh Block button');
    await this.page.waitForTimeout(1000);
    logger.info('✅ Refresh Block clicked');
  }

  /**
   * Get the room type tab names
   */
  async getRoomTypeTabs(): Promise<string[]> {
    const tabs = this.page.locator('[role="tab"]').locator('.tab-title, [class*="tab"]').allTextContents();
    return tabs;
  }

  // ============================================
  // BILL SUMMARY METHODS
  // ============================================

  /**
   * Check if Bill Summary is visible
   */
  async isBillSummaryVisible(): Promise<boolean> {
    return (await this.billSummaryHeading.count()) > 0;
  }

  /**
   * Get the Due Amount value
   */
  async getDueAmount(): Promise<string> {
    const amount = await this.dueAmountDisplay.textContent();
    return amount?.trim() ?? '';
  }

  /**
   * Click Apply Discounts
   */
  async clickApplyDiscounts(): Promise<void> {
    logger.info('Clicking Apply Discounts');
    await this.elementActions.click(this.applyDiscountsLink, 'Apply Discounts link');
    await this.page.waitForTimeout(1000);
    logger.info('✅ Apply Discounts clicked');
  }

  /**
   * Toggle Include Member Postings checkbox
   */
  async toggleIncludeMemberPostings(): Promise<void> {
    logger.info('Toggling Include Member Postings checkbox');
    await this.elementActions.click(this.includeMemberPostingsCheckbox, 'Include Member Postings checkbox');
    await this.page.waitForTimeout(500);
    logger.info('✅ Include Member Postings toggled');
  }

  // ============================================
  // ADDITIONAL SERVICES METHODS
  // ============================================

  /**
   * Click Additional Services tab
   */
  async clickAdditionalServicesTab(): Promise<void> {
    logger.info('Clicking Additional Services tab');
    await this.elementActions.click(this.additionalServicesTab, 'Additional Services tab');
    await this.page.waitForTimeout(1000);
    logger.info('✅ Additional Services tab clicked');
  }

  /**
   * Check if Add Services text is visible
   */
  async isAddServicesVisible(): Promise<boolean> {
    return (await this.addServicesText.count()) > 0;
  }

  // ============================================
  // CHANGE CAPTAIN METHODS
  // ============================================

  /**
   * Click Change Captain button
   */
  async clickChangeCaptain(): Promise<void> {
    logger.info('Clicking Change Captain button');
    await this.elementActions.click(this.changeCaptainButton, 'Change Captain button');
    await this.page.waitForTimeout(1000);
    logger.info('✅ Change Captain clicked');
  }

  /**
   * Check if Change Captain button is visible
   */
  async isChangeCaptainVisible(): Promise<boolean> {
    return (await this.changeCaptainButton.count()) > 0;
  }

  // ============================================
  // SECTION DIALOG VERIFICATION
  // ============================================

  /**
   * Verify a section dialog has opened by checking for specific heading or content
   */
  async isSectionDialogOpen(sectionName: string): Promise<boolean> {
    const heading = this.page.getByRole('heading', { name: sectionName });
    const dialogCount = await this.page.getByRole('dialog').count();
    const headingCount = await heading.count();
    const isOpen = dialogCount > 0 || headingCount > 0;
    logger.info(`Section "${sectionName}" dialog open: ${isOpen}`);
    return isOpen;
  }

  // ============================================
  // BILLING DETAILS FORM METHODS
  // ============================================

  /**
   * Fill Billing Instructions
   */
  async fillBillingInstructions(instructions: string): Promise<void> {
    logger.info('Filling Billing Instructions');
    const textbox = this.page.getByRole('textbox', { name: 'Enter Billing Instructions' });
    await this.elementActions.click(textbox, 'Billing Instructions textbox');
    await textbox.fill(instructions);
    logger.info('✅ Billing Instructions filled');
  }

  /**
   * Fill Bill To
   */
  async fillBillTo(billTo: string): Promise<void> {
    logger.info('Filling Bill To');
    const textbox = this.page.getByRole('textbox', { name: 'Enter Bill To' });
    await this.elementActions.click(textbox, 'Bill To textbox');
    await textbox.fill(billTo);
    logger.info('✅ Bill To filled');
  }

  /**
   * Fill Address1
   */
  async fillAddress1(address: string): Promise<void> {
    logger.info('Filling Address1');
    const textbox = this.page.getByRole('textbox', { name: 'Enter Address1' });
    await this.elementActions.click(textbox, 'Address1 textbox');
    await textbox.fill(address);
    logger.info('✅ Address1 filled');
  }

  /**
   * Select Country by pressing ArrowDown multiple times
   */
  async selectCountry(arrowDownCount: number = 5): Promise<void> {
    logger.info('Selecting Country');
    await this.page.locator('.ng-arrow-wrapper').first().click();
    const countryInput = this.page.locator('#country').getByRole('textbox');
    for (let i = 0; i < arrowDownCount; i++) {
      await countryInput.press('ArrowDown');
    }
    await countryInput.press('Enter');
    logger.info('✅ Country selected');
  }

  /**
   * Select State by pressing ArrowDown multiple times
   */
  async selectState(arrowDownCount: number = 5): Promise<void> {
    logger.info('Selecting State');
    await this.page.locator('#state').getByRole('combobox').click();
    const stateInput = this.page.locator('.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-untouched > .ng-select-container > .ng-value-container > .ng-input > input').first();
    for (let i = 0; i < arrowDownCount; i++) {
      await stateInput.press('ArrowDown');
    }
    await stateInput.press('Enter');
    logger.info('✅ State selected');
  }

  /**
   * Select City by pressing Enter
   */
  async selectCity(): Promise<void> {
    logger.info('Selecting City');
    await this.page.locator('#city').getByRole('combobox').click();
    const cityInput = this.page.locator('.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-untouched > .ng-select-container > .ng-value-container > .ng-input > input').first();
    await cityInput.press('Enter');
    logger.info('✅ City selected');
  }

  /**
   * Click Update button in Billing Details
   */
  async clickUpdateButton(): Promise<void> {
    logger.info('Clicking Update button');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update button');
    await this.page.waitForTimeout(1000);
    logger.info('✅ Update button clicked');
  }

  /**
   * Fill complete Billing Details form
   */
  async fillBillingDetailsForm(data: {
    billingInstructions: string;
    billTo: string;
    address1: string;
    countryArrowDowns?: number;
    stateArrowDowns?: number;
  }): Promise<void> {
    logger.info('Filling complete Billing Details form');
    await this.fillBillingInstructions(data.billingInstructions);
    await this.fillBillTo(data.billTo);
    await this.fillAddress1(data.address1);
    await this.selectCountry(data.countryArrowDowns ?? 5);
    await this.selectState(data.stateArrowDowns ?? 5);
    await this.selectCity();
    await this.clickUpdateButton();
    logger.info('✅ Billing Details form filled completely');
  }
}
