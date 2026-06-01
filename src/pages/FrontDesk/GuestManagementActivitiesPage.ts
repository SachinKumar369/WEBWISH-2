import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export interface ActivityScheduleData {
  activityName: string;
  firstLookupArrowDowns: number;
  secondLookupArrowDowns: number;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  amount: string;
  longDescription: string;
  secondaryAmount: string;
}

export class GuestManagementActivitiesPage extends BasePage {
  private readonly elementActions: ElementActions;
  private businessDateCache?: string;

  private readonly frontDeskLink = this.page.getByRole('link', { name: ' Front Desk' });
  private readonly guestManagementLink = this.page.getByRole('link', { name: ' Guest Management' });
  private readonly dismissPopupButton = this.page.locator('.btn.btn-close');
  private readonly openHeading = this.page.getByRole('heading', { name: 'Open' }).nth(2);
  private readonly sectionsButton = this.page.getByRole('button', { name: 'Sections 󰅀' });
  private readonly activitiesOption = this.page.getByText('Activities', { exact: true });

  private readonly addButton = this.page.getByRole('button').first();
  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
  private readonly closeButton = this.page.getByRole('button', { name: 'Close', exact: true });
  private readonly okButton = this.page.getByRole('button', { name: 'OK', exact: true });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes', exact: true });
  private readonly deleteSelectedButton = this.page.getByRole('button').nth(1);

  private readonly swalMessage = this.page.locator('#swal2-html-container');
  private readonly toastMessage = this.page.getByRole('paragraph');
  private readonly checkAll = this.page.locator('#checkAll');

  private readonly activityNameInput = this.page.getByRole('textbox').first();
  private readonly firstLookupInput = this.page.getByRole('textbox').nth(1);
  private readonly secondLookupInput = this.page.getByRole('textbox').nth(2);
  private readonly descriptionInput = this.page.getByRole('textbox').nth(3);
  private readonly startDateInput = this.page.getByRole('textbox', { name: 'Select' }).first();
  private readonly startTimeInput = this.page.getByRole('textbox').nth(5);
  private readonly endDateInput = this.page.getByRole('textbox', { name: 'Select' }).nth(1);
  private readonly endTimeInput = this.page.locator('input[type="time"]').nth(1);
  private readonly amountInput = this.page.locator('amount-control > .form-control').first();
  private readonly longDescriptionInput = this.page.locator('textarea').nth(1);
  private readonly secondaryAmountInput = this.page.locator('div:nth-child(14) > amount-control > .form-control');

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  async getBusinessDateFromHeader(): Promise<string> {
    if (this.businessDateCache) {
      return this.businessDateCache;
    }

    const businessInfo = this.page.locator('h6').filter({ hasText: 'Business Date:' }).first();
    await expect(businessInfo).toBeVisible();

    const infoText = (await businessInfo.textContent()) ?? '';
    const dateMatch = infoText.match(/Business Date:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
    if (!dateMatch) {
      throw new Error(`Unable to extract Business Date from: ${infoText}`);
    }

    this.businessDateCache = dateMatch[1];
    logger.info(`Using business date from header: ${this.businessDateCache}`);
    return this.businessDateCache;
  }

  getNextBusinessDate(businessDate: string): string {
    const [day, month, year] = businessDate.split('/').map(Number);
    if (!day || !month || !year) {
      throw new Error(`Invalid business date format: ${businessDate}`);
    }

    const nextDate = new Date(year, month - 1, day + 1);
    const nextDay = String(nextDate.getDate()).padStart(2, '0');
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
    const nextYear = nextDate.getFullYear();
    return `${nextDay}/${nextMonth}/${nextYear}`;
  }

  async openActivitiesSection(): Promise<void> {
    logger.info('Opening Guest Management Activities section');

    await this.page.mouse.move(0, 400);
    //await this.elementActions.hover(this.frontDeskLink, 'Front Desk menu');
    await this.elementActions.click(this.frontDeskLink, 'Front Desk menu');
    await this.elementActions.click(this.guestManagementLink, 'Guest Management menu');

    await this.elementActions.click(this.dismissPopupButton, 'Dismiss popup');

    await this.elementActions.click(this.openHeading, 'Open guest record');
    await this.elementActions.click(this.sectionsButton, 'Sections menu');
    await this.elementActions.click(this.activitiesOption, 'Activities section');

    await expect(this.activityNameInput).toBeVisible();
    logger.info('Guest Management Activities section opened successfully');
  }

  async startNewActivity(): Promise<void> {
    logger.info('Starting a new activity record');
    await this.elementActions.click(this.addButton, 'Add activity button');
    await expect(this.activityNameInput).toBeVisible();
  }

  async fillActivityName(activityName: string): Promise<void> {
    await this.elementActions.click(this.activityNameInput, 'Activity name input');
    await this.elementActions.sendKeys(this.activityNameInput, activityName, 'Activity name input');
  }

  async selectFirstLookup(optionArrowDowns: number): Promise<void> {
    await this.selectFromLookup(this.firstLookupInput, optionArrowDowns, 'First lookup');
  }

  async selectSecondLookup(optionArrowDowns: number): Promise<void> {
    await this.selectFromLookup(this.secondLookupInput, optionArrowDowns, 'Second lookup');
  }

  async fillDescription(description: string): Promise<void> {
    await this.elementActions.click(this.descriptionInput, 'Description input');
    await this.elementActions.sendKeys(this.descriptionInput, description, 'Description input');
  }

  async fillSchedule(schedule: Pick<ActivityScheduleData, 'startDate' | 'startTime' | 'endDate' | 'endTime' | 'amount' | 'longDescription' | 'secondaryAmount'>): Promise<void> {
    await this.elementActions.click(this.startDateInput, 'Start date input');
    await this.elementActions.sendKeys(this.startDateInput, schedule.startDate, 'Start date input');
    await this.elementActions.pressKey('Tab');

    await this.elementActions.click(this.startTimeInput, 'Start time input');
    await this.elementActions.sendKeys(this.startTimeInput, schedule.startTime, 'Start time input');

    await this.elementActions.click(this.endDateInput, 'End date input');
    await this.elementActions.sendKeys(this.endDateInput, schedule.endDate, 'End date input');
    await this.elementActions.pressKey('Tab');

    await this.elementActions.click(this.endTimeInput, 'End time input');
    await this.elementActions.sendKeys(this.endTimeInput, schedule.endTime, 'End time input');

    await this.elementActions.click(this.amountInput, 'Amount input');
    await this.elementActions.sendKeys(this.amountInput, schedule.amount, 'Amount input');

    await this.elementActions.click(this.longDescriptionInput, 'Long description input');
    await this.elementActions.sendKeys(this.longDescriptionInput, schedule.longDescription, 'Long description input');

    await this.elementActions.click(this.secondaryAmountInput, 'Secondary amount input');
    await this.elementActions.sendKeys(this.secondaryAmountInput, schedule.secondaryAmount, 'Secondary amount input');
  }

  async saveExpectMandatoryMessage(): Promise<void> {
    await this.elementActions.click(this.saveButton, 'Save button');
    await expect(this.swalMessage).toContainText('Please Fill All *Mandatory Fields..!');
    await this.elementActions.click(this.okButton, 'OK button');
  }

  async saveExpectSuccess(): Promise<void> {
    await this.elementActions.click(this.saveButton, 'Save button');
    await expect(this.toastMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'OK button');
  }

  async closeActivityForm(): Promise<void> {
    if (await this.closeButton.isVisible().catch(() => true)) {
      await this.elementActions.click(this.closeButton, 'Close button');
    }
  }

  async deleteSelectedActivities(): Promise<void> {
    await this.checkAll.check();
    await this.elementActions.click(this.deleteSelectedButton, 'Delete selected button');
    await expect(this.toastMessage).toContainText('Do you want to delete the selected record?');
    await this.elementActions.click(this.yesButton, 'Yes button');
    await expect(this.toastMessage).toContainText('Data Deleted Successfully.');
    await this.elementActions.click(this.okButton, 'OK button');
  }

  async validateDeleteRequiresSelection(): Promise<void> {
    await this.checkAll.check();
    await this.checkAll.check();
    await this.elementActions.click(this.deleteSelectedButton, 'Delete selected button without records');
    await expect(this.toastMessage).toContainText('Please select at least one record from list to delete.');
    await this.elementActions.click(this.okButton, 'OK button');
  }

  async createActivityWithSchedule(schedule: ActivityScheduleData): Promise<void> {
    await this.startNewActivity();
    await this.fillActivityName(schedule.activityName);
    await this.selectFirstLookup(schedule.firstLookupArrowDowns);
    await this.selectSecondLookup(schedule.secondLookupArrowDowns);
    await this.fillDescription(schedule.description);
    await this.fillSchedule(schedule);
    await this.saveExpectSuccess();
  }

  private async selectFromLookup(locator: Locator, optionArrowDowns: number, label: string): Promise<void> {
    await this.elementActions.click(locator, `${label} input`);
    for (let index = 0; index < optionArrowDowns; index += 1) {
      await this.elementActions.pressKey('ArrowDown');
    }
    await this.elementActions.pressKey('Enter');
  }
}