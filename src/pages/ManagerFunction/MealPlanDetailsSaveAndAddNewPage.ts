import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export interface MealPlanBatchRecord {
  dateFrom: string;
  dateTo: string;
  mealPlanCode: string;
  mealTypeCode: string;
}

export class MealPlanDetailsSaveAndAddNewPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly managerFunctionsLink: Locator;
  private readonly mealPlanDetailsLink: Locator;
  private readonly addButton: Locator;
  private readonly saveButton: Locator;
  private readonly saveAndAddNewButton: Locator;
  private readonly okButton: Locator;
  private readonly successMessage: Locator;
  private readonly businessDateText: Locator;
  private readonly tableSearchTextbox: Locator;
  private readonly tableRows: Locator;

  // Current flow selects fixed options through keyboard navigation.
  private readonly selectedMealPlanCode = 'BRK';
  private readonly selectedMealTypeCode = 'DINR';

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    this.managerFunctionsLink = this.page.getByRole('link', { name: ' Manager Functions' });
    this.mealPlanDetailsLink = this.page.getByRole('link', { name: ' Meal Plan Details' });
    this.addButton = this.page.getByRole('button', { name: '󰐗' });
    this.saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
    this.saveAndAddNewButton = this.page.getByRole('button', { name: 'Save & Add New', exact: true });
    this.okButton = this.page.getByRole('button', { name: 'OK' });
    this.successMessage = this.page.getByRole('paragraph');
    this.businessDateText = this.page.locator('h6:has-text("Business Date")');
    this.tableSearchTextbox = this.page.getByPlaceholder('Search...').last();
    this.tableRows = this.page.locator('table tbody tr');
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

  private async fillDateRangeFromBusinessDate(baseOffsetDays: number): Promise<MealPlanBatchRecord> {
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
      mealPlanCode: this.selectedMealPlanCode,
      mealTypeCode: this.selectedMealTypeCode
    };
  }

  private async fillMealPlanForm(baseOffsetDays: number): Promise<MealPlanBatchRecord> {
    await this.selectByArrowDownFromDropdown(this.mealPlanDropdown(), 3, 'Meal Plan');
    await this.selectByArrowDownFromDropdown(this.mealTypeDropdown(), 3, 'Meal Type');
    const created = await this.fillDateRangeFromBusinessDate(baseOffsetDays);
    await this.selectByArrowDownFromDropdown(this.chargeCodeDropdown(), 2, 'Charge Code');
    await this.selectByArrowDownFromDropdown(this.fxCodeDropdown(), 6, 'FX Code');
    return created;
  }

  private async expectSuccessAndConfirm(context: string): Promise<void> {
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, `Success dialog OK button (${context})`);
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

  async createMealPlansWithSaveAndAddNew(totalMealPlans: number = 2): Promise<MealPlanBatchRecord[]> {
    if (totalMealPlans < 2) {
      throw new Error('Save & Add New flow requires at least 2 meal plans');
    }

    await this.elementActions.click(this.addButton, 'Add Meal Plan Details button');

    const createdRecords: MealPlanBatchRecord[] = [];
    const baseSeed = (Date.now() % 250) + 1;

    for (let i = 0; i < totalMealPlans; i++) {
      const baseOffsetDays = baseSeed + i * 4;
      const record = await this.fillMealPlanForm(baseOffsetDays);
      createdRecords.push(record);

      const sequence = i + 1;
      const isLast = i === totalMealPlans - 1;

      if (!isLast) {
        await this.elementActions.click(this.saveAndAddNewButton, `Save & Add New button (record ${sequence})`);
        await this.expectSuccessAndConfirm(`record ${sequence}`);
        logger.info(`Created meal plan ${sequence}/${totalMealPlans} via Save & Add New: ${record.dateFrom} to ${record.dateTo}`);
      } else {
        await this.elementActions.click(this.saveButton, `Save button (record ${sequence})`);
        await this.expectSuccessAndConfirm(`record ${sequence}`);
        logger.info(`Created final meal plan ${sequence}/${totalMealPlans} via Save: ${record.dateFrom} to ${record.dateTo}`);
      }
    }

    return createdRecords;
  }

  async verifyCreatedMealPlansInTable(records: MealPlanBatchRecord[]): Promise<void> {
    for (const [index, record] of records.entries()) {
      const hasTableSearch = await this.tableSearchTextbox.isVisible().catch(() => false);
      if (hasTableSearch) {
        await this.elementActions.click(this.tableSearchTextbox, `Table search textbox for record ${index + 1}`);
        await this.elementActions.sendKeys(this.tableSearchTextbox, record.mealPlanCode, `Table search textbox for record ${index + 1}`);
        await this.page.waitForTimeout(500);
      } else {
        logger.warn(`Table search textbox is not visible for record ${index + 1}; validating by direct table row scan`);
      }

      const createdRow = this.tableRows.filter({
        hasText: new RegExp(`${record.mealPlanCode}.*${record.mealTypeCode}`)
      }).first();

      await expect(createdRow).toBeVisible();
      logger.info(`Verified created meal plan ${index + 1} in table: ${record.mealPlanCode} / ${record.mealTypeCode}`);
    }
  }

  async runMealPlanSaveAndAddNewFlow(totalMealPlans: number = 2): Promise<MealPlanBatchRecord[]> {
    await this.openMealPlanDetailsFromManagerFunctions();
    return await this.createMealPlansWithSaveAndAddNew(totalMealPlans);
  }
}
