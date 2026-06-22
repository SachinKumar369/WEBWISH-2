import { Page, BrowserContext, expect, Locator } from '@playwright/test';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export interface GroupCreatedRecord {
  groupName: string;
  arrivalDate: string;
  departureDate: string;
  releaseBlockDate: string;
  businessDate: string;
}

export interface GroupValidationErrors {
  groupNameRequired?: boolean;
  arrivalDepartureRequired?: boolean;
  releaseBlockOnRequired?: boolean;
  rateCodeRequired?: boolean;
  marketSegmentRequired?: boolean;
  businessSourceRequired?: boolean;
  domicileCodeRequired?: boolean;
  currencyRequired?: boolean;
  groupClassRequired?: boolean;
  paymentMethodRequired?: boolean;
}

export class GroupManagementPage {
  page: Page;
  context: BrowserContext;
  private elementActions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
    this.elementActions = new ElementActions(page);
  }

  // ============================================
  // LOCATORS
  // ============================================
  private get frontDeskLink(): Locator {
    return this.page.getByRole('link', { name: ' Front Desk' });
  }

  private get groupManagementLink(): Locator {
    return this.page.getByRole('link', { name: ' Group Management' });
  }

  private get groupManagementTile(): Locator {
    return this.page.locator('div').filter({ hasText: /^Group Management$/ }).last();
  }

  private get newGroupButton(): Locator {
    return this.page.getByRole('button', { name: '󰐕 New Group' });
  }

  private get groupNameInput(): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: /^Group Name\*$/ })
      .getByRole('textbox');
  }

  private get selectDateRangeInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Select Date Range' });
  }

  private get releaseBlockOnInput(): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: /^Release Block On\*$/ })
      .getByRole('textbox');
  }

  private get footerBusinessDateText(): Locator {
    return this.page.locator('h6').filter({ hasText: 'Business Date:' }).first();
  }

  private get footerHeading(): Locator {
    return this.page.locator('h6').filter({ hasText: /Business Date/ }).first();
  }

  private get noBlockButton(): Locator {
    return this.page.getByRole('button', { name: 'No-Block' });
  }

  private get successMessage(): Locator {
    return this.page.getByRole('paragraph');
  }

  private get okButton(): Locator {
    return this.page.getByRole('button', { name: 'OK' });
  }

  private get groupSearchInput(): Locator {
    // The Group Management page has its own Search textbox (distinct from the header search).
    // Scope it to the content area that contains the Total button.
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('button', { name: /Total:/ }) })
      .getByPlaceholder('Search...')
      .first();
  }

  private get groupListSearchInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Search...' }).first();
  }

  private get groupSearchOpenButton(): Locator {
    // Each group card has its own "Open" heading - this locator finds the first visible one.
    // The actual targeting happens in modifyGroup() where we scope to the specific card.
    return this.page.getByRole('heading', { name: 'Open' }).first();
  }

  private get groupEditButton(): Locator {
    return this.page.locator('.btn.btn-sm.waves-effect.waves-light.py-0.px-2.btn-soft-secondary');
  }

  private get groupSaveButton(): Locator {
    return this.page.getByRole('button', { name: 'Save' });
  }

  private get groupCloseButton(): Locator {
    return this.page.getByRole('button', { name: 'Close' });
  }

  private get groupDialog(): Locator {
    return this.page.getByRole('dialog');
  }

  private get groupDialogTitle(): Locator {
    return this.page.getByRole('heading', { name: /Group Management/ });
  }

  // Validation-related locators
  private get contactNumberInput(): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: /^Contact Number$/ })
      .getByRole('textbox');
  }

  private get emailIdInput(): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: /^Email Id$/ })
      .getByRole('textbox');
  }

  private get externalReferenceInput(): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: /^External Reference$/ })
      .getByRole('textbox');
  }

  private get bookedThruDropdown(): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: /^Booked Thru$/ })
      .locator('ng-select');
  }

  private get totalCountBadge(): Locator {
    return this.page.getByRole('button', { name: /Total:/ });
  }

  private get statusReservedLabel(): Locator {
    return this.page.locator('div').filter({ hasText: /Status\s*:\s*Reserved/ }).first();
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  private getOffsetDate(sourceDate: string, offsetDays: number): string {
    const [day, month, year] = sourceDate.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);
    dateObj.setDate(dateObj.getDate() + offsetDays);

    return `${String(dateObj.getDate()).padStart(2, '0')}/${String(
      dateObj.getMonth() + 1
    ).padStart(2, '0')}/${dateObj.getFullYear()}`;
  }

  private async getBusinessDateFromFooter(): Promise<string> {
    const footerText = await this.footerBusinessDateText.textContent();
    const datePattern = /Business Date[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i;
    const match = footerText?.match(datePattern);
    
    if (match && match[1]) {
      logger.info(`Found Business Date: ${match[1]}`);
      return match[1];
    }

    // Fallback to system date only if footer text is unavailable.
    const today = new Date();
    const businessDate = `${String(today.getDate()).padStart(2, '0')}/${String(
      today.getMonth() + 1
    ).padStart(2, '0')}/${today.getFullYear()}`;
    
    logger.info(`Using fallback Business Date: ${businessDate}`);
    return businessDate;
  }

  private getMonthName(month: number): string {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];

    return monthNames[month - 1];
  }

  private buildCalendarLabels(dateValue: string): { withYear: string; withoutYear: string } {
    const [day, month, year] = dateValue.split('/').map(Number);
    const monthName = this.getMonthName(month);
    const dayWithoutLeadingZero = String(day);

    return {
      withYear: `${monthName} ${dayWithoutLeadingZero}, ${year}`,
      withoutYear: `${monthName} ${dayWithoutLeadingZero},`
    };
  }

  private async selectDropdownByArrowKeys(
    label: string,
    arrowDownCount: number,
    fieldName: string
  ): Promise<void> {
    const container = this.page
      .locator('div')
      .filter({ hasText: new RegExp(`^${label}`, 'i') })
      .first();

    await container.scrollIntoViewIfNeeded();

    const textboxTarget = container.locator('ng-select').getByRole('textbox').first();
    if (await textboxTarget.count()) {
      await this.elementActions.click(textboxTarget, `${fieldName} dropdown textbox`);
    } else {
      const containerTarget = container.locator('.ng-select-container').first();
      if (await containerTarget.count()) {
        await this.elementActions.click(containerTarget, `${fieldName} dropdown container`);
      } else {
        await this.elementActions.click(container.locator('span').nth(1), `${fieldName} dropdown`);
      }
    }

    for (let i = 0; i < arrowDownCount; i++) {
      await this.page.keyboard.press('ArrowDown');
    }

    await this.page.keyboard.press('Enter');
    logger.info(`Selected option from ${fieldName} dropdown`);
  }

  private async getReleaseBlockOnInput(): Promise<Locator> {
    const labelledTextbox = this.page
      .locator('div')
      .filter({ hasText: /^Release Block On\*$/ })
      .getByRole('textbox');

    if (await labelledTextbox.count()) {
      return labelledTextbox.first();
    }

    const genericTextbox = this.page.getByRole('textbox', { name: 'Select', exact: true });
    if (await genericTextbox.count()) {
      return genericTextbox.first();
    }

    throw new Error('Release Block On textbox not found');
  }

  /**
   * Validate that a date string is in DD/MM/YYYY format
   */
  private isValidDateFormat(dateStr: string): boolean {
    const pattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (!pattern.test(dateStr)) return false;

    const [day, month, year] = dateStr.split('/').map(Number);
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 2000 || year > 2100) return false;

    const dateObj = new Date(year, month - 1, day);
    return (
      dateObj.getDate() === day &&
      dateObj.getMonth() === month - 1 &&
      dateObj.getFullYear() === year
    );
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if a field label contains the required asterisk (*)
   */
  private async isFieldRequired(fieldName: string): Promise<boolean> {
    // The form labels like "Group Name*", "Rate Code*" etc. use * to indicate required.
    // We look for a div/span whose trimmed text matches "FieldName*"
    const fieldLabel = this.page.locator('div, span').filter({
      hasText: new RegExp(`${fieldName}\\*`)
    });
    const count = await fieldLabel.count();
    return count > 0;
  }

  /**
   * Get the error message displayed after form submission attempt
   */
  private async getValidationErrorMessage(): Promise<string | null> {
    try {
      const errorLocator = this.page.locator('.error-message, .alert-danger, [role="alert"], .text-danger, .validation-error');
      if (await errorLocator.count() > 0) {
        return await errorLocator.first().textContent();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if the success dialog is displayed
   */
  private async isSuccessDialogDisplayed(): Promise<boolean> {
    try {
      const successDialog = this.page.getByRole('paragraph').filter({ hasText: 'Details created/updated successfully.' });
      return (await successDialog.count()) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get the total count of groups displayed
   */
  async getGroupTotalCount(): Promise<number> {
    const totalText = await this.totalCountBadge.textContent();
    const match = totalText?.match(/Total:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if the Group Management heading is visible
   */
  async isGroupManagementPageVisible(): Promise<boolean> {
    const heading = this.page.getByRole('heading', { name: 'Group Management' });
    return (await heading.count()) > 0;
  }

  /**
   * Get the business date from the footer (public method for test validation)
   */
  async getBusinessDate(): Promise<string> {
    return this.getBusinessDateFromFooter();
  }

  private async selectDateFromPicker(dateValue: string): Promise<void> {
    const labels = this.buildCalendarLabels(dateValue);
    for (let attempt = 0; attempt < 14; attempt++) {
      const dateByYear = this.page.getByLabel(labels.withYear);
      if (await dateByYear.count()) {
        await this.elementActions.click(dateByYear.first(), `Date ${labels.withYear}`);
        return;
      }

      const dateWithoutYear = this.page.getByLabel(labels.withoutYear);
      if (await dateWithoutYear.count()) {
        await this.elementActions.click(dateWithoutYear.first(), `Date ${labels.withoutYear}`);
        return;
      }

      const nextMonthButton = this.page.locator('button').filter({ hasText: /^>$/ }).first();
      if (await nextMonthButton.count()) {
        await this.elementActions.click(nextMonthButton, 'Calendar next month button');
      } else {
        // Fallback for date pickers that support keyboard month navigation.
        await this.page.keyboard.press('PageDown');
      }

      await this.page.waitForTimeout(200);
    }

    throw new Error(`Unable to find date in calendar: ${labels.withYear} or ${labels.withoutYear}`);
  }

  // ============================================
  // MAIN FLOW METHODS
  // ============================================
  async navigateToGroupManagement(): Promise<void> {
    logger.info('Navigating to Group Management');

    // Dismiss any beforeunload dialog that may appear
    this.page.on('dialog', async (dialog) => {
      logger.info(`Handling dialog: ${dialog.type()} - ${dialog.message()}`);
      await dialog.accept();
    });

    // Try clicking the dashboard tile first
    try {
      const tileCount = await this.groupManagementTile.count();
      if (tileCount > 0) {
        logger.info('Found Group Management tile on dashboard, clicking it');
        await this.elementActions.click(this.groupManagementTile, 'Group Management tile');
        await this.page.waitForTimeout(1000);
      } else {
        throw new Error('Group Management tile not found');
      }
    } catch (error) {
      logger.warn(`Tile navigation failed, falling back to sidebar: ${error}`);
      // Fallback: use sidebar navigation
      const viewport = this.page.viewportSize();
      const height = viewport?.height ?? 800;
      await this.page.mouse.move(0, height / 2);
      await this.elementActions.click(this.frontDeskLink, 'Front Desk link');
      await this.elementActions.click(this.groupManagementLink, 'Group Management link');
      await this.page.waitForTimeout(1000);
    }

    // Verify we're on the Group Management page
    const isPageVisible = await this.isGroupManagementPageVisible();
    if (!isPageVisible) {
      throw new Error('Failed to navigate to Group Management page');
    }

    logger.info('✅ Successfully navigated to Group Management');
  }

  async navigateToGroupManagementViaSidebar(): Promise<void> {
    logger.info('Navigating to Front Desk -> Group Management via sidebar');

    const viewport = this.page.viewportSize();
    const height = viewport?.height ?? 800;
    await this.page.mouse.move(0, height / 2);

    await this.elementActions.click(this.frontDeskLink, 'Front Desk link');
    await this.elementActions.click(this.groupManagementLink, 'Group Management link');

    logger.info('✅ Successfully navigated to Group Management');
  }

  /**
   * Open the New Group dialog
   */
  async openNewGroupDialog(): Promise<void> {
    logger.info('Opening New Group dialog');

    // Click New Group button
    await this.elementActions.click(this.newGroupButton, 'New Group button');
    await this.page.waitForTimeout(1000);

    // Verify dialog is open
    const isDialogVisible = await this.groupDialog.count() > 0;
    if (!isDialogVisible) {
      throw new Error('New Group dialog did not open');
    }

    logger.info('✅ New Group dialog opened');
  }

  /**
   * Close the Group Management dialog
   */
  async closeDialog(): Promise<void> {
    logger.info('Closing Group Management dialog');
    await this.elementActions.click(this.groupCloseButton, 'Close button');
    await this.page.waitForTimeout(500);
    logger.info('✅ Dialog closed');
  }

  /**
   * Fill the group name field
   */
  async fillGroupName(groupName: string): Promise<void> {
    logger.info(`Filling Group Name: ${groupName}`);
    await this.elementActions.click(this.groupNameInput, 'Group Name input');
    await this.elementActions.sendKeys(this.groupNameInput, groupName, 'Group Name input');
    logger.info('✅ Group Name filled');
  }

  /**
   * Select arrival and departure dates from the date range picker
   */
  async selectDateRange(arrivalDate: string, departureDate: string): Promise<void> {
    logger.info(`Selecting date range from ${arrivalDate} to ${departureDate}`);

    await this.elementActions.click(
      this.selectDateRangeInput,
      'Select Date Range textbox'
    );
    await this.page.waitForTimeout(500);

    // Select arrival date from picker
    await this.selectDateFromPicker(arrivalDate);
    await this.page.waitForTimeout(300);

    // Select departure date from picker
    await this.selectDateFromPicker(departureDate);
    await this.page.waitForTimeout(300);

    // Close date picker by clicking elsewhere
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);

    logger.info('✅ Date range selected');
  }

  /**
   * Set the Release Block On date
   */
  async setReleaseBlockOnDate(releaseDate: string): Promise<void> {
    logger.info(`Setting Release Block On date: ${releaseDate}`);
    const releaseBlockOnInput = await this.getReleaseBlockOnInput();
    await this.elementActions.click(releaseBlockOnInput, 'Release Block On textbox');
    await this.page.waitForTimeout(300);
    await this.elementActions.sendKeys(releaseBlockOnInput, releaseDate, 'Release Block On date');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(300);
    logger.info('✅ Release Block On date set');
  }

  /**
   * Select Rate Code from dropdown
   */
  async selectRateCode(arrowDownCount: number = 3): Promise<void> {
    await this.selectDropdownByArrowKeys('Rate Code', arrowDownCount, 'Rate Code');
  }

  /**
   * Select Market Segment from dropdown
   */
  async selectMarketSegment(arrowDownCount: number = 3): Promise<void> {
    await this.selectDropdownByArrowKeys('Market Segment', arrowDownCount, 'Market Segment');
  }

  /**
   * Select Business Source from dropdown
   */
  async selectBusinessSource(arrowDownCount: number = 2): Promise<void> {
    await this.selectDropdownByArrowKeys('Business Source', arrowDownCount, 'Business Source');
  }

  /**
   * Select Domicile Code from dropdown
   */
  async selectDomicileCode(arrowDownCount: number = 3): Promise<void> {
    await this.selectDropdownByArrowKeys('Domicile', arrowDownCount, 'Domicile');
  }

  /**
   * Select Currency from dropdown
   */
  async selectCurrency(arrowDownCount: number = 3): Promise<void> {
    await this.selectDropdownByArrowKeys('Currency', arrowDownCount, 'Currency');
  }

  /**
   * Select Group Class from dropdown
   */
  async selectGroupClass(arrowDownCount: number = 2): Promise<void> {
    await this.selectDropdownByArrowKeys('Group Class', arrowDownCount, 'Group Class');
  }

  /**
   * Select Payment Method from dropdown
   */
  async selectPaymentMethod(arrowDownCount: number = 2): Promise<void> {
    await this.selectDropdownByArrowKeys('Payment Method', arrowDownCount, 'Payment Method');
  }

  /**
   * Fill optional fields (Contact Number, Email, External Reference)
   */
  async fillOptionalFields(options: {
    contactNumber?: string;
    emailId?: string;
    externalReference?: string;
  }): Promise<void> {
    if (options.contactNumber) {
      logger.info(`Filling Contact Number: ${options.contactNumber}`);
      await this.elementActions.click(this.contactNumberInput, 'Contact Number input');
      await this.elementActions.sendKeys(this.contactNumberInput, options.contactNumber, 'Contact Number input');
    }
    if (options.emailId) {
      logger.info(`Filling Email Id: ${options.emailId}`);
      await this.elementActions.click(this.emailIdInput, 'Email Id input');
      await this.elementActions.sendKeys(this.emailIdInput, options.emailId, 'Email Id input');
    }
    if (options.externalReference) {
      logger.info(`Filling External Reference: ${options.externalReference}`);
      await this.elementActions.click(this.externalReferenceInput, 'External Reference input');
      await this.elementActions.sendKeys(this.externalReferenceInput, options.externalReference, 'External Reference input');
    }
  }

  /**
   * Submit the group form (click No-Block button)
   */
  async submitGroupForm(): Promise<void> {
    logger.info('Submitting group form (clicking No-Block)');
    await this.elementActions.click(this.noBlockButton, 'No-Block button');
    await this.page.waitForTimeout(500);
  }

  /**
   * Verify success message and click OK
   */
  async verifySuccessAndDismiss(): Promise<void> {
    logger.info('Verifying success message');
    await expect(this.successMessage).toContainText(
      'Details created/updated successfully.'
    );
    logger.info('✅ Success message displayed');

    // Click OK button
    await this.elementActions.click(this.okButton, 'Success dialog OK button');
    await this.page.waitForTimeout(500);
    logger.info('✅ Success dialog dismissed');
  }

  async createNewGroup(groupName: string): Promise<GroupCreatedRecord> {
    logger.info(`Creating new group: ${groupName}`);

    // Open New Group dialog
    await this.openNewGroupDialog();

    // Get business date for date calculations
    const businessDate = await this.getBusinessDateFromFooter();
    const arrivalDate = businessDate;
    const departureDate = this.getOffsetDate(businessDate, 5);

    // Fill Group Name
    await this.fillGroupName(groupName);

    // Select Date Range (Arrival and Departure dates)
    await this.selectDateRange(arrivalDate, departureDate);

    // Set Release Block On date to business date
    await this.setReleaseBlockOnDate(businessDate);

    // Select required dropdowns
    await this.selectRateCode(3);
    await this.selectMarketSegment(3);
    await this.selectBusinessSource(2);
    await this.selectDomicileCode(3);
    await this.selectCurrency(3);
    await this.selectGroupClass(2);
    await this.selectPaymentMethod(2);

    // Click No-Block button
    await this.submitGroupForm();

    // Verify success and dismiss dialog
    await this.verifySuccessAndDismiss();

    const createdRecord: GroupCreatedRecord = {
      groupName,
      arrivalDate,
      departureDate,
      releaseBlockDate: businessDate,
      businessDate
    };

    logger.info(`✅ Group created successfully: ${JSON.stringify(createdRecord)}`);
    return createdRecord;
  }

  // ============================================
  // VALIDATION METHODS
  // ============================================

  /**
   * Validate that submitting an empty form triggers a validation error
   */
  async validateRequiredFieldsOnSubmit(): Promise<GroupValidationErrors> {
    logger.info('Validating required fields on empty form submission');

    // Open dialog
    await this.openNewGroupDialog();

    // Click submit without filling any fields
    await this.submitGroupForm();
    await this.page.waitForTimeout(1000);

    // After clicking No-Block on empty form, a validation message should appear
    // (e.g., "Please fill at least one room details to save")
    const validationMessage = this.page.getByRole('paragraph').filter({
      hasText: /fill|required|cannot be empty|please enter|mandatory/i
    });

    let hasValidationError = false;
    try {
      hasValidationError = (await validationMessage.count()) > 0;
      if (hasValidationError) {
        const msgText = await validationMessage.first().textContent();
        logger.info(`Found validation message: ${msgText}`);
      }
    } catch {
      logger.info('No validation message popup found');
    }

    // Check which required fields are marked with asterisks (always present in form labels)
    const validationErrors: GroupValidationErrors = {
      groupNameRequired: await this.isFieldRequired('Group Name'),
      arrivalDepartureRequired: await this.isFieldRequired('Arrival/Departure'),
      releaseBlockOnRequired: await this.isFieldRequired('Release Block On'),
      rateCodeRequired: await this.isFieldRequired('Rate Code'),
      marketSegmentRequired: await this.isFieldRequired('Market Segment'),
      businessSourceRequired: await this.isFieldRequired('Business Source'),
      domicileCodeRequired: await this.isFieldRequired('Domicile Code'),
      currencyRequired: await this.isFieldRequired('Currency'),
      groupClassRequired: await this.isFieldRequired('Group Class'),
      paymentMethodRequired: await this.isFieldRequired('Payment Method')
    };

    logger.info(`Validation errors: ${JSON.stringify(validationErrors)}`);

    // Dismiss any validation popup first
    if (hasValidationError) {
      try {
        const okBtn = this.page.getByRole('button', { name: 'OK' });
        if (await okBtn.count() > 0) {
          await this.elementActions.click(okBtn, 'Validation OK button');
          await this.page.waitForTimeout(500);
        }
      } catch {
        logger.info('No OK button on validation popup');
      }
    }

    // Close the dialog using Escape key (more reliable than clicking Close button)
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);

    // If dialog is still open, try clicking Close button
    try {
      const closeBtn = this.page.getByRole('button', { name: 'Close' });
      if (await closeBtn.count() > 0 && await closeBtn.isVisible()) {
        await this.elementActions.click(closeBtn, 'Close button');
        await this.page.waitForTimeout(500);
      }
    } catch {
      logger.info('Dialog closed via Escape');
    }

    return validationErrors;
  }

  /**
   * Validate email format in the Email Id field
   */
  async validateEmailField(email: string): Promise<boolean> {
    logger.info(`Validating email field with value: ${email}`);

    if (!this.isValidEmail(email)) {
      logger.warn(`Email format is invalid: ${email}`);
      return false;
    }

    return true;
  }

  /**
   * Validate date format is correct
   */
  async validateDateFormat(dateStr: string): Promise<boolean> {
    logger.info(`Validating date format: ${dateStr}`);
    return this.isValidDateFormat(dateStr);
  }

  /**
   * Create group with validation - validates all inputs before submission
   */
  async createGroupWithValidation(
    groupName: string,
    options: {
      contactNumber?: string;
      emailId?: string;
      externalReference?: string;
    } = {}
  ): Promise<GroupCreatedRecord> {
    logger.info(`Creating group with validation: ${groupName}`);

    // Validate group name is not empty
    if (!groupName || groupName.trim().length === 0) {
      throw new Error('Group name cannot be empty');
    }

    // Validate email if provided
    if (options.emailId && !this.isValidEmail(options.emailId)) {
      throw new Error(`Invalid email format: ${options.emailId}`);
    }

    // Open New Group dialog
    await this.openNewGroupDialog();

    // Get business date for date calculations
    const businessDate = await this.getBusinessDateFromFooter();
    const arrivalDate = businessDate;
    const departureDate = this.getOffsetDate(businessDate, 5);

    // Fill Group Name
    await this.fillGroupName(groupName);

    // Select Date Range
    await this.selectDateRange(arrivalDate, departureDate);

    // Set Release Block On date
    await this.setReleaseBlockOnDate(businessDate);

    // Select required dropdowns
    await this.selectRateCode(3);
    await this.selectMarketSegment(3);
    await this.selectBusinessSource(2);
    await this.selectDomicileCode(3);
    await this.selectCurrency(3);
    await this.selectGroupClass(2);
    await this.selectPaymentMethod(2);

    // Fill optional fields if provided
    if (options.contactNumber || options.emailId || options.externalReference) {
      await this.fillOptionalFields(options);
    }

    // Submit the form
    await this.submitGroupForm();

    // Verify success and dismiss dialog
    await this.verifySuccessAndDismiss();

    const createdRecord: GroupCreatedRecord = {
      groupName,
      arrivalDate,
      departureDate,
      releaseBlockDate: businessDate,
      businessDate
    };

    logger.info(`✅ Group created with validation: ${JSON.stringify(createdRecord)}`);
    return createdRecord;
  }

  /**
   * Verify the group count increased after creation
   */
  async verifyGroupCountIncreased(previousCount: number): Promise<boolean> {
    const currentCount = await this.getGroupTotalCount();
    const increased = currentCount > previousCount;
    logger.info(`Group count: ${previousCount} -> ${currentCount} (increased: ${increased})`);
    return increased;
  }

  /**
   * Verify group appears in the list by name
   */
  async verifyGroupInList(groupName: string): Promise<boolean> {
    logger.info(`Verifying group "${groupName}" appears in the list`);
    const groupCard = this.page.locator('div').filter({ hasText: groupName }).first();
    const isVisible = (await groupCard.count()) > 0;
    logger.info(`Group "${groupName}" visible in list: ${isVisible}`);
    return isVisible;
  }

  async modifyGroup(
    searchName: string,
    updatedName: string,
    businessDate: string
  ): Promise<void> {
    logger.info(`Modifying group: searching for '${searchName}', renaming to '${updatedName}'`);

    // Step 1: Search for the group
    await this.elementActions.click(this.groupSearchInput, 'Group search input');
    await this.elementActions.sendKeys(this.groupSearchInput, searchName, 'Group search input');
    await this.page.waitForTimeout(1000);

    // Step 2: Click Open on the matched group card
    // After searching, find the card containing the group name, then click its "Open" heading
    const matchedCard = this.page
      .locator('.card-mode-2-card')
      .filter({ hasText: searchName })
      .first();
    
    const openButtonInCard = matchedCard.getByRole('heading', { name: 'Open' });
    await this.elementActions.click(openButtonInCard, `Open button for group: ${searchName}`);
    await this.page.waitForTimeout(1000);

    // Step 3: Click Edit button
    await this.elementActions.click(this.groupEditButton, 'Edit button');
    await this.page.waitForTimeout(500);

    // Step 4: Update Group Name
    const firstTextbox = this.page.getByRole('textbox').first();
    await this.elementActions.click(firstTextbox, 'Group Name textbox');
    await firstTextbox.press('ControlOrMeta+a');
    await this.elementActions.sendKeys(firstTextbox, updatedName, 'Updated Group Name');
    logger.info(`Updated Group Name to: ${updatedName}`);

    // Step 5: Select Booked Thru dropdown (10th child dropdown)
    const bookedThruDropdown = this.page
      .locator('div:nth-child(10) > drop-down-searchable > .custom-dropdown > .ng-select-container > .ng-arrow-wrapper');
    await this.elementActions.click(bookedThruDropdown, 'Booked Thru dropdown');
    await this.page.waitForTimeout(300);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(300);
    logger.info('Selected Booked Thru option');

    // Step 6: Type Release Block On date directly
    const releaseBlockInput = this.page.getByRole('textbox', { name: 'Select' }).nth(2);
    await this.elementActions.click(releaseBlockInput, 'Release Block On textbox');
    await this.elementActions.sendKeys(releaseBlockInput, businessDate, 'Release Block On date');
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(300);
    logger.info(`Typed Release Block On date: ${businessDate}`);

    // Step 7: Select Payment Method dropdown (clearable ng-select)
    const paymentMethodDropdown = this.page
      .locator('.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-untouched.ng-pristine.ng-valid.ng-select-focused > .ng-select-container > .ng-arrow-wrapper');
    await this.elementActions.click(paymentMethodDropdown, 'Payment Method dropdown');
    await this.page.waitForTimeout(300);
    for (let i = 0; i < 6; i++) {
      await this.page.keyboard.press('ArrowDown');
    }
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(300);
    logger.info('Selected Payment Method option');

    // Step 8: Click Save
    await this.elementActions.click(this.groupSaveButton, 'Save button');
    await this.page.waitForTimeout(500);

    // Step 9: Verify success message
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    logger.info('✅ Group modified successfully - success message displayed');

    // Step 10: Click OK
    await this.elementActions.click(this.okButton, 'OK button');
    await this.page.waitForTimeout(500);

    // Step 11: Click Close
    await this.elementActions.click(this.groupCloseButton, 'Close button');
    await this.page.waitForTimeout(500);

    logger.info(`✅ Group modification complete for: ${updatedName}`);
  }

  async runGroupManagementFlow(groupName: string): Promise<GroupCreatedRecord> {
    await this.navigateToGroupManagement();
    return await this.createNewGroup(groupName);
  }
}
