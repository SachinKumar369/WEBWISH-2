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

  private get footerBusinessDateText(): Locator {
    return this.page.locator('h6').filter({ hasText: 'Business Date:' }).first();
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
      //.filter({ hasText: new RegExp(`^${label}\\*`) })
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
    logger.info('Navigating to Front Desk -> Group Management');

    const viewport = this.page.viewportSize();
    const height = viewport?.height ?? 800;
    await this.page.mouse.move(0, height / 2);

    await this.elementActions.click(this.frontDeskLink, 'Front Desk link');
    await this.elementActions.click(this.groupManagementLink, 'Group Management link');

    logger.info('✅ Successfully navigated to Group Management');
  }

  async createNewGroup(groupName: string): Promise<GroupCreatedRecord> {
    logger.info(`Creating new group: ${groupName}`);

    // Click New Group button
    await this.elementActions.click(this.newGroupButton, 'New Group button');
    await this.page.waitForTimeout(1000);

    // Get business date for date calculations
    const businessDate = await this.getBusinessDateFromFooter();
    const arrivalDate = businessDate;
    const departureDate = this.getOffsetDate(businessDate, 5);

    // Fill Group Name
    await this.elementActions.click(this.groupNameInput, 'Group Name input');
    await this.elementActions.sendKeys(this.groupNameInput, groupName, 'Group Name input');
    logger.info(`Filled Group Name: ${groupName}`);

    // Select Date Range (Arrival and Departure dates)
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

    // Release Block On should be set to business date.
    const releaseBlockOnInput = await this.getReleaseBlockOnInput();
    await this.elementActions.click(releaseBlockOnInput, 'Release Block On textbox');
    await this.page.waitForTimeout(300);
    await this.selectDateFromPicker(businessDate);
    await this.page.waitForTimeout(300);
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);

    // Select Rate Code (3 ArrowDown presses based on test data)
    await this.selectDropdownByArrowKeys('Rate Code', 3, 'Rate Code');

    // Select Market Segment (3 ArrowDown presses)
    await this.selectDropdownByArrowKeys('Market Segment', 3, 'Market Segment');

    // Select Business Source (2 ArrowDown presses)
    await this.selectDropdownByArrowKeys('Business Source', 2, 'Business Source');

    // Select Domicile Code (3 ArrowDown presses)
    await this.selectDropdownByArrowKeys('Domicile', 3, 'Domicile');

    // Select Currency (3 ArrowDown presses)
    await this.selectDropdownByArrowKeys('Currency', 3, 'Currency');

    // Select Group Class (2 ArrowDown presses)
    await this.selectDropdownByArrowKeys('Group Class', 2, 'Group Class');

    // Select Payment Method (2 ArrowDown presses)
    await this.selectDropdownByArrowKeys('Payment Method', 2, 'Payment Method');

    // Click No-Block button
    await this.elementActions.click(this.noBlockButton, 'No-Block button');
    await this.page.waitForTimeout(500);

    // Verify success message
    await expect(this.successMessage).toContainText(
      'Details created/updated successfully.'
    );
    logger.info('✅ Success message displayed');

    // Click OK button
    await this.elementActions.click(this.okButton, 'Success dialog OK button');
    await this.page.waitForTimeout(500);

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

  async runGroupManagementFlow(groupName: string): Promise<GroupCreatedRecord> {
    await this.navigateToGroupManagement();
    return await this.createNewGroup(groupName);
  }
}
