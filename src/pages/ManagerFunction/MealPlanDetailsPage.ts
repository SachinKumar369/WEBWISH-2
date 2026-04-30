import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export interface MealPlanCreatedRecord {
  dateFrom: string;
  dateTo: string;
  searchToken: string;
}

export class MealPlanDetailsPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly managerFunctionsLink: Locator;
  private readonly mealPlanDetailsLink: Locator;
  private readonly addButton: Locator;
  private readonly saveButton: Locator;
  private readonly okButton: Locator;
  private readonly successMessage: Locator;
  private readonly businessDateText: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    this.managerFunctionsLink = this.page.getByRole('link', { name: ' Manager Functions' });
    this.mealPlanDetailsLink = this.page.getByRole('link', { name: ' Meal Plan Details' });
    this.addButton = this.page.getByRole('button', { name: '󰐗' });
    this.saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
    this.okButton = this.page.getByRole('button', { name: 'OK' });
    this.successMessage = this.page.getByRole('paragraph');
    this.businessDateText = this.page.locator('h6:has-text("Business Date")');
  }

  private mealPlanDropdown(): Locator {
    return this.page.locator('div').filter({ hasText: /^Meal Plan\*--select--$/ }).locator('span').nth(1);
  }

  private mealTypeDropdown(): Locator {
    return this.page.locator('div').filter({ hasText: /^Meal Type\*--select--$/ }).locator('span').nth(1);
  }

  private chargeCodeDropdown(): Locator {
    return this.page.locator('div').filter({ hasText: /^Charge Code\*--select--$/ }).locator('span').nth(1);
  }

  private fxCodeDropdown1(): Locator {
    return this.page.locator('div').filter({ hasText: /^FX Code\*--select--$/ }).locator('span').nth(1);
  }


  private fxCodeDropdown(): Locator {
  return this.page.locator('[formcontrolname="fx_Code"] .ng-select-container');
}

  private dateField(label: 'Date From' | 'Date To'): Locator {
    return this.page.locator('div').filter({ hasText: new RegExp(`^${label}\\*$`) }).getByRole('textbox');
  }

  private async selectByArrowDownFromDropdown(dropdown: Locator, arrowDownCount: number, fieldName: string): Promise<void> {
    await this.elementActions.click(dropdown, `${fieldName} dropdown`);

    for (let i = 0; i < arrowDownCount; i++) {
      await this.page.keyboard.press('ArrowDown');
    }

    await this.page.keyboard.press('Enter');
  }

  private async getBusinessDate(): Promise<string> {
    const footerText = await this.elementActions.getText(this.businessDateText, 'Business Date text');
    const match = footerText.match(/\d{2}\/\d{2}\/\d{4}/);
    const businessDate = match ? match[0] : undefined;

    logger.info(`Business Date: ${businessDate || 'Not found'}`);

    if (!businessDate) {
      throw new Error('Business Date not found on Meal Plan Details page');
    }

    return businessDate;
  }

  private getOffsetDate(sourceDate: string, offsetDays: number): string {
    const [day, month, year] = sourceDate.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);
    dateObj.setDate(dateObj.getDate() + offsetDays);

    return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
  }

  private async fillDateRangeFromBusinessDate(baseOffsetDays: number): Promise<MealPlanCreatedRecord> {
    const businessDate = await this.getBusinessDate();
    const dateFrom = this.getOffsetDate(businessDate, baseOffsetDays);
    const dateTo = this.getOffsetDate(dateFrom, 2);

    await this.elementActions.click(this.dateField('Date From'), 'Date From field');
    await this.elementActions.sendKeys(this.dateField('Date From'), dateFrom, 'Date From field');

    await this.elementActions.click(this.dateField('Date To'), 'Date To field');
    await this.elementActions.sendKeys(this.dateField('Date To'), dateTo, 'Date To field');

    return {
      dateFrom,
      dateTo,
      searchToken: dateFrom
    };
  }

  async openMealPlanDetailsFromManagerFunctions(): Promise<void> {
    logger.info('Opening Meal Plan Details from Manager Functions module');

    const viewport = this.page.viewportSize();
    if (viewport) {
      await this.page.mouse.move(0, viewport.height / 2);
    }

    await this.elementActions.click(this.managerFunctionsLink, 'Manager Functions link');
    await this.elementActions.click(this.mealPlanDetailsLink, 'Meal Plan Details link');
  }

  async createMealPlanDetails(): Promise<MealPlanCreatedRecord> {
    await this.elementActions.click(this.addButton, 'Add Meal Plan Details button');

    await this.selectByArrowDownFromDropdown(this.mealPlanDropdown(), 3, 'Meal Plan');

    await this.selectByArrowDownFromDropdown(this.mealTypeDropdown(), 3, 'Meal Type');

    // Use business-date based logic with a run-specific offset so delete can target only this run's record.
    const uniqueBaseOffsetDays = (Date.now() % 300) + 1;
    const createdRecord = await this.fillDateRangeFromBusinessDate(uniqueBaseOffsetDays);

    await this.selectByArrowDownFromDropdown(this.chargeCodeDropdown(), 2, 'Charge Code');

    await this.selectByArrowDownFromDropdown(this.fxCodeDropdown(), 6, 'FX Code');

    await this.elementActions.click(this.saveButton, 'Save button');
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Success dialog OK button');

    logger.info(`Created Meal Plan record with date range ${createdRecord.dateFrom} to ${createdRecord.dateTo}`);
    return createdRecord;
  }

  async runMealPlanDetailsFlow(): Promise<MealPlanCreatedRecord> {
    await this.openMealPlanDetailsFromManagerFunctions();
    return await this.createMealPlanDetails();
  }
}
