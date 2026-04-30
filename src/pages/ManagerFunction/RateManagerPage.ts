import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export interface RateManagerData {
  rateCode: string;
  description: string;
}

export interface RateDetails {
  roomType: string;
  price1: string;
  price2: string;
  mealPlanIndex?: number;
}

export interface AdvanceConfigData {
  description: string;
  marketSegmentIndex: number;
  isFixedOccupancy: boolean;
}

export interface CopyRateData {
  fromDate: string;
  toDate: string;
  allDays?: boolean;
}

export interface DerivedRateData {
  baseRateIndex: number;
}

export interface RateStopSellData {
  startDate: string;
  endDate: string;
}

export interface RateSectionData {
  stopSellQuantity: string;
}

export class RateManagerPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly managerFunctionsLink: Locator;
  private readonly rateManagerLink: Locator;
  private readonly newRateButton: Locator;
  private readonly saveButton: Locator;
  private readonly okButton: Locator;
  private readonly closeButton: Locator;
  private readonly successMessage: Locator;
  private readonly validationErrorMessage: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    this.managerFunctionsLink = this.page.getByRole('link', { name: /Manager Functions/i });
    this.rateManagerLink = this.page.getByRole('link', { name: /Rate Manager/i });
    this.newRateButton = this.page.getByRole('button', { name: '󰐕 New Rate' });
    this.saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
    this.okButton = this.page.getByRole('button', { name: 'OK' });
    this.closeButton = this.page.getByRole('button', { name: 'Close' });
    this.successMessage = this.page.getByRole('paragraph');
    this.validationErrorMessage = this.page.getByRole('paragraph');
  }

  private getEyeSettingsButton(): Locator {
    return this.page.locator('.mdi.mdi-eye-settings').first();
  }

  private getSelectedLegendRow(): Locator {
    return this.page.locator('.rowdata.sscolor.SELECTED-legend').first();
  }

  private getCopyRatesArrowWrapper(): Locator {
    return this.page.locator('.ng-arrow-wrapper').first();
  }

  private getVisibleArrowWrapper(): Locator {
    return this.page.locator('.ng-arrow-wrapper:visible').last();
  }

  private getDeleteRateFromSelectedButton(): Locator {
    return this.page.getByRole('button', { name: /Delete Rate From Selected/i });
  }

  private getDeleteConfirmYesButton(): Locator {
    return this.page.getByRole('button', { name: 'Yes' });
  }

  private getDeleteFlowCloseButton(): Locator {
    return this.page.locator('.button-container > button:nth-child(2)');
  }

  private getRowdataSelectedLegend(): Locator {
    return this.page.locator('.rowdata.SELECTED-legend').first();
  }

  private getDayNameCenter(rowIndex: number, colIndex: number): Locator {
    return this.page.locator(`tr:nth-child(${rowIndex}) > td:nth-child(${colIndex}) > .day-name-center`);
  }

  private getSecondTextbox(): Locator {
    return this.page.getByRole('textbox').nth(1);
  }

  private getFirstTextbox(): Locator {
    return this.page.getByRole('textbox').first();
  }

  private applyButton(): Locator {
    return this.page.getByRole('button', { name: 'Apply' });
  }

  // ===== Basic Locators =====
  private rateCodeInput(): Locator {
    return this.page.locator('div').filter({ hasText: /^Rate Code\*$/ }).getByRole('textbox');
  }

  private publishedRackRateDropdown(): Locator {
    return this.page.locator('div').filter({ hasText: /^Published Rack Rate--select--$/ }).locator('span').first();
  }

  private publishedRackRateInput(): Locator {
    return this.page.locator('ng-select').filter({ hasText: '--select-- BARD best rate' }).getByRole('textbox');
  }

  private rateCategoryDropdown(): Locator {
    return this.page.locator('div').filter({ hasText: /^Rate Category\*--select--$/ }).locator('span').nth(1);
  }

  private rateCategoryInput(): Locator {
    return this.page.locator('ng-select').filter({ hasText: '--select-- CN Contracts PK' }).getByRole('textbox');
  }

  private descriptionInput(): Locator {
    return this.page.locator('div').filter({ hasText: /^Description\*$/ }).getByRole('textbox');
  }

  // ===== Room Type and Price Locators =====
  private getFirstRoundedCard(): Locator {
    return this.page.locator('.rounded.card-view-cell').first();
  }

  private getPriceInputs(): Locator {
    return this.page.locator('.form-control.form-control-sm');
  }

  private getPriceInputByIndex(index: number): Locator {
    return this.page.locator('.form-control.form-control-sm').nth(index);
  }

  private getUntouchedPriceInputs(): Locator {
    return this.page.locator('.form-control.form-control-sm.ng-untouched');
  }

  private getFirstPristineInput(): Locator {
    return this.page.locator('.form-control.form-control-sm.ng-untouched.ng-pristine').first();
  }

  // ===== Meal Plan & Grid Locators =====
  private getMealPlanSelectDropdown(): Locator {
    return this.page.locator('ng-select').filter({ hasText: '--select-- AP AMERICAN PLAN' });
  }

  private getRowByText(text: string): Locator {
    return this.page.getByRole('row', { name: text });
  }

  private getTableCell(rowIndex: number, cellIndex: number): Locator {
    return this.page.locator(`.bordergrid > tbody > tr:nth-child(${rowIndex}) > td:nth-child(${cellIndex})`);
  }

  // ===== Configuration Section Locators =====
  private getSectionsButton(): Locator {
    return this.page.getByRole('button', { name: /Sections/i }).first();
  }

  private getAdvanceConfigLink(): Locator {
    return this.page.getByText('Advance Configuration');
  }

  private getCopyRatesLink(): Locator {
    return this.page.getByText('Copy Rates');
  }

  private getDerivedRateLink(): Locator {
    return this.page.getByText(/Drived Rate Configuration|Derived Rate Configuration/i);
  }

  private getRateStopSellLink(): Locator {
    return this.page.getByText('Set Up Rate Stop Sell');
  }

  private getIsFixedOccupancySwitch(): Locator {
    return this.page.getByRole('switch', { name: 'Is fixed occupancy based rate' });
  }

  private getTextArea(): Locator {
    return this.page.locator('textarea');
  }

  private getMarketSegmentDropdown(): Locator {
    return this.page.locator('div').filter({ hasText: /^Market Segment--select--$/ }).locator('span').first();
  }

  private getMarketSegmentInput(): Locator {
    return this.page.locator('ng-select').filter({ hasText: '--select-- OPER Agents/' }).getByRole('textbox');
  }

  // ===== Copy Rates Locators =====
  private getCopyRatesDialogCloseButton(): Locator {
    return this.page.getByRole('dialog').locator('span').nth(1);
  }

  private getCopyRatesCombobox(): Locator {
    return this.page.getByRole('combobox').getByRole('textbox');
  }

  private getPrimaryComboboxTextbox(): Locator {
    return this.page.getByRole('combobox').first().getByRole('textbox').first();
  }

  private getLastComboboxTextbox(): Locator {
    return this.page.getByRole('combobox').last().getByRole('textbox').first();
  }

  private getPercentageRadio(): Locator {
    return this.page.locator('radio-control').filter({ hasText: 'Percentage' }).getByRole('radio');
  }

  private getValueInput(): Locator {
    return this.page.locator('div').filter({ hasText: /^Value$/ }).getByRole('textbox');
  }

  // ===== Derived Rate Locators =====
  private getDerivedRateNgSelect(): Locator {
    return this.page.locator('ng-select span').first();
  }

  private getAmountControl(): Locator {
    return this.page.locator('.hstack > amount-control > .form-control');
  }

  // ===== Stop Sell Locators =====
  private getAddStopSellButton(): Locator {
    return this.page.getByRole('button', { name: '󰐗' });
  }

  private getStartDateInput(): Locator {
    return this.page.locator('div').filter({ hasText: /^Start Date$/ }).getByRole('textbox');
  }

  private getEndDateInput(): Locator {
    return this.page.locator('div').filter({ hasText: /^End Date$/ }).getByRole('textbox');
  }

  private getYearSpinButton(): Locator {
    return this.page.getByRole('spinbutton', { name: 'Year' });
  }

  private getArrowUp(): Locator {
    return this.page.locator('.arrowUp').first();
  }

  private getArrowDown(): Locator {
    return this.page.locator('.arrowDown').first();
  }

  private getFlatpickrArrowUp(): Locator {
    return this.page.locator('.flatpickr-calendar.animate.arrowTop.arrowLeft.open > .flatpickr-months > .flatpickr-month > .flatpickr-current-month > .numInputWrapper > .arrowUp');
  }

  private getDateMonthSelect(): Locator {
    return this.page.getByRole('combobox');
  }

  // ===== Stop Sell Quantity Locator =====
  private getStopSellQuantityInput(): Locator {
    return this.page.locator('webwish-input').getByRole('textbox');
  }

  // ===== Helper Methods =====
  private async selectByArrowDown(input: Locator, arrowDownCount: number, fieldName: string): Promise<void> {
    await this.elementActions.click(input, `${fieldName} input`);

    for (let i = 0; i < arrowDownCount; i++) {
      await input.press('ArrowDown');
    }

    await input.press('Enter');
  }

  private async fillFormInput(locator: Locator, value: string, fieldName: string): Promise<void> {
    await this.elementActions.click(locator, `${fieldName} field`);
    await this.elementActions.sendKeys(locator, value, fieldName);
  }

  private async openSectionsMenu(context: string): Promise<void> {
    try {
      await this.elementActions.click(this.getSectionsButton(), `Sections button (${context})`);
    } catch {
      await this.page.getByText('Sections', { exact: true }).first().click();
    }
  }

  // ===== Navigation Methods =====
  async openRateManagerFromManagerFunctions(): Promise<void> {
    logger.info('Opening Rate Manager from Manager Functions module');

    const x = 0;
    const y = 800 / 2;
    console.log(`Moving mouse to left-center: (${x}, ${y})`);
    await this.page.mouse.move(x, y);

    await this.elementActions.click(this.managerFunctionsLink, 'Manager Functions link');
    await this.elementActions.click(this.rateManagerLink, 'Rate Manager link');
  }

  // ===== Rate Management Methods =====
  async clickExistingRate(index: number = 0): Promise<void> {
    logger.info(`Clicking existing rate at index ${index}`);
    await this.elementActions.click(this.getFirstRoundedCard(), 'Existing rate card');
  }

  async fillRoomTypePrices(rooomTypeDetails: RateDetails[]): Promise<void> {
    logger.info('Filling room type prices');

    for (let i = 0; i < rooomTypeDetails.length; i++) {
      const detail = rooomTypeDetails[i];
      
      // Fill first price
      const price1Locator = i === 0 
        ? this.getPriceInputs().first()
        : this.getPriceInputByIndex(i * 2);

      await this.elementActions.click(price1Locator, `Price 1 for room type ${i}`);
      await this.elementActions.sendKeys(price1Locator, 'ControlOrMeta+a', 'select all');
      await this.elementActions.sendKeys(price1Locator, detail.price1, `Price 1 - ${detail.price1}`);

      // Fill second price
      const price2Locator = i === 0
        ? this.getFirstPristineInput()
        : this.getPriceInputByIndex(i * 2 + 1);

      await this.elementActions.click(price2Locator, `Price 2 for room type ${i}`);
      await this.elementActions.sendKeys(price2Locator, 'ControlOrMeta+a', 'select all');
      await this.elementActions.sendKeys(price2Locator, detail.price2, `Price 2 - ${detail.price2}`);
    }
  }

  async addMealPlanConfiguration(mealPlanDetails: RateDetails[]): Promise<void> {
    logger.info('Adding meal plan configuration');

    for (let i = 0; i < mealPlanDetails.length; i++) {
      const detail = mealPlanDetails[i];
      const rowText = detail.roomType;

      // Click on the meal plan select dropdown
      const row = this.getRowByText(rowText);
      await this.elementActions.click(row.locator('span').first(), `Row ${i} meal plan select`);

      // Select meal plan option using arrow keys
      const dropdown = this.getMealPlanSelectDropdown();
      await this.selectByArrowDown(dropdown.getByRole('textbox'), detail.mealPlanIndex || 0, `Meal Plan ${i}`);
    }
  }

  async configureAdvanceSettings(config: AdvanceConfigData): Promise<void> {
    logger.info('Configuring advance settings');

    await this.openSectionsMenu('advance configuration');
    await this.elementActions.click(this.getAdvanceConfigLink(), 'Advance Configuration link');

    if (config.isFixedOccupancy) {
      await this.getIsFixedOccupancySwitch().check();
    }

    await this.elementActions.click(this.getTextArea(), 'Long description field');
    await this.elementActions.sendKeys(this.getTextArea(), config.description, 'Long description');

    await this.elementActions.click(this.getMarketSegmentDropdown(), 'Market Segment dropdown');
    await this.selectByArrowDown(this.getMarketSegmentInput(), config.marketSegmentIndex, 'Market Segment');

    await this.elementActions.click(this.saveButton, 'Save button');
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Success dialog OK button');
  }

  async copyratesConfiguration(copyData: CopyRateData): Promise<void> {
    logger.info('Configuring copy rates with dates: ' + copyData.fromDate + ' to ' + copyData.toDate);

    // Click Copy Rates button
    await this.elementActions.click(this.page.getByRole('button', { name: 'Copy Rates' }), 'Copy Rates button');

    // Fill from date in first Select textbox
    const fromDateInput = this.page.getByRole('textbox', { name: 'Select' }).first();
    await this.elementActions.click(fromDateInput, 'From date input');
    await this.elementActions.sendKeys(fromDateInput, copyData.fromDate, 'From date');

    // Fill to date in second Select textbox
    const toDateInput = this.page.getByRole('textbox', { name: 'Select' }).nth(1);
    await this.elementActions.click(toDateInput, 'To date input');
    await this.elementActions.sendKeys(toDateInput, copyData.toDate, 'To date');

    // Check All Days checkbox if specified
    if (copyData.allDays !== false) {
      await this.page.getByRole('checkbox', { name: 'All Days' }).check();
      logger.info('All Days checkbox checked');
    }

    // Click Save button
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save' }), 'Save button');
    
    // Verify success message
    //getByText('Details created/updated')
    await expect(this.page.getByText('Details created/updated')).toBeVisible();
    //await expect(this.successMessage).toContainText('Details created/updated.');
    logger.info('Copy rates success message verified');
    
    // Click OK button
    await this.elementActions.click(this.okButton, 'Success dialog OK button');
    logger.info('Copy rates dialog closed');
  }

  async configureDerivedRate(derivedData: DerivedRateData): Promise<void> {
    logger.info('Configuring derived rate');

    await this.elementActions.click(this.getSectionsButton(), 'Sections button');
    await this.elementActions.click(this.getDerivedRateLink(), 'Derived Rate Configuration link');

    await this.elementActions.click(this.getDerivedRateNgSelect(), 'Derived rate ng-select');

    const comboboxInput = this.getCopyRatesCombobox();
    for (let i = 0; i < derivedData.baseRateIndex; i++) {
      await comboboxInput.press('ArrowDown');
    }
    await comboboxInput.press('Enter');

    await this.elementActions.click(this.saveButton, 'Save button');
    await this.elementActions.click(this.okButton, 'OK button');

    // Fill amount control
    await this.elementActions.click(this.getAmountControl(), 'Amount control');
    await this.elementActions.sendKeys(this.getAmountControl(), '20', 'Amount value');

    await this.elementActions.click(this.saveButton, 'Save button');
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Success dialog OK button');
  }

  async configureRateStopSell(stopSellData: RateStopSellData): Promise<void> {
    logger.info('Configuring rate stop sell');

    await this.elementActions.click(this.getSectionsButton(), 'Sections button');
    await this.elementActions.click(this.getRateStopSellLink(), 'Rate Stop Sell link');

    await this.elementActions.click(this.getAddStopSellButton(), 'Add Stop Sell button');

    // Fill start date
    await this.fillFormInput(this.getStartDateInput(), stopSellData.startDate, 'Start Date');
    await this.elementActions.click(this.saveButton, 'Save button');

    // Handle validation error if dates are invalid
    try {
      await expect(this.validationErrorMessage).toContainText('One or more validation errors occurred.');
      await this.elementActions.click(this.okButton, 'Validation error OK button');

      // Clear start date and use date picker instead
      await this.elementActions.click(this.getStartDateInput(), 'Start Date field');
      await this.elementActions.sendKeys(this.getStartDateInput(), 'ControlOrMeta+a', 'select all');
      await this.elementActions.sendKeys(this.getStartDateInput(), '', 'clear field');

      // Use calendar picker
      await this.elementActions.click(this.getYearSpinButton(), 'Year spinner');
      await this.elementActions.click(this.getArrowUp(), 'Arrow up');
      await this.elementActions.click(this.getArrowDown(), 'Arrow down');

      // Select from calendar
      await this.page.getByLabel('November 5,').click();
    } catch (error) {
      logger.info('No validation error encountered');
    }

    // Fill end date
    await this.elementActions.click(this.getEndDateInput(), 'End Date field');
    const endDateLabel = await this.page.getByLabel(/June \d+,/).first();
    if (endDateLabel) {
      await this.elementActions.click(endDateLabel, 'End Date calendar selection');
    }

    // Handle multiple date selections
    await this.elementActions.click(this.getFlatpickrArrowUp(), 'Flatpickr year up');
    const junLabel = await this.page.getByLabel(/June \d+,/).first();
    if (junLabel) {
      await this.elementActions.click(junLabel, 'June date selection');
    }

    // Handle month select
    const monthSelect = this.getDateMonthSelect();
    try {
      await monthSelect.selectOption('11');
    } catch (error) {
      logger.info('Month select not available');
    }

    // Select end date
    const decLabel = await this.page.getByLabel(/December \d+,/).first();
    if (decLabel) {
      await this.elementActions.click(decLabel, 'December date selection');
    }

    await this.elementActions.click(this.saveButton, 'Save button');
    await this.elementActions.click(this.okButton, 'OK button');
  }

  async fillRateStopSellQuantity(quantity: string): Promise<void> {
    logger.info(`Filling rate stop sell quantity: ${quantity}`);

    await this.elementActions.click(this.getStopSellQuantityInput(), 'Stop Sell Quantity input');
    await this.elementActions.sendKeys(this.getStopSellQuantityInput(), quantity, 'Quantity value');

    await this.elementActions.click(this.saveButton, 'Save button');
    await this.elementActions.click(this.okButton, 'OK button');
  }

  async selectRateDates(): Promise<void> {
    logger.info('Selecting rate dates for final save');

    await this.elementActions.click(this.getSectionsButton(), 'Sections button');

    // Select specific cells in grid
    const cell1 = this.getTableCell(2, 2);
    const cell2 = this.getTableCell(7, 3);
    const cell3 = this.getTableCell(7, 4);

    await this.elementActions.click(cell1, 'Cell 1 selection');
    await this.elementActions.click(cell2, 'Cell 2 selection');
    await this.elementActions.click(cell3, 'Cell 3 selection');

    await this.elementActions.click(this.saveButton, 'Final Save button');

    // Handle confirmation dialog
    try {
      await this.page.getByRole('button', { name: 'Yes' }).click();
    } catch (error) {
      logger.info('No confirmation dialog found');
    }

    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Final success OK button');
  }

  async closeRate(): Promise<void> {
    logger.info('Closing rate manager');

    await this.elementActions.click(this.closeButton, 'Close button');
  }

  // ===== Complete Flow =====
  async runCompleteRateManagerFlow(
    rateDetails: RateDetails[],
    mealPlanConfig: RateDetails[],
    advanceConfig: AdvanceConfigData,
    copyRateData: CopyRateData,
    derivedRateData: DerivedRateData,
    stopSellData: RateStopSellData,
    stopSellQuantity: string
  ): Promise<void> {
    logger.info('Running complete rate manager flow');

    await this.clickExistingRate();
    await this.fillRoomTypePrices(rateDetails);
    await this.addMealPlanConfiguration(mealPlanConfig);
    await this.configureAdvanceSettings(advanceConfig);
    await this.copyratesConfiguration(copyRateData);
    await this.configureDerivedRate(derivedRateData);
    await this.configureRateStopSell(stopSellData);
    await this.fillRateStopSellQuantity(stopSellQuantity);
    await this.selectRateDates();
    await this.closeRate();
  }

  async createNewRate(data: RateManagerData): Promise<void> {
    await this.elementActions.click(this.newRateButton, 'New Rate button');

    await this.elementActions.sendKeys(this.rateCodeInput(), data.rateCode, 'Rate Code input');

    await this.elementActions.click(this.publishedRackRateDropdown(), 'Published Rack Rate dropdown');
    await this.selectByArrowDown(this.publishedRackRateInput(), 3, 'Published Rack Rate');

    await this.elementActions.click(this.rateCategoryDropdown(), 'Rate Category dropdown');
    await this.selectByArrowDown(this.rateCategoryInput(), 2, 'Rate Category');

    await this.elementActions.sendKeys(this.descriptionInput(), data.description, 'Description input');

    await this.elementActions.click(this.saveButton, 'Save button');
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Success dialog OK button');
  }

  async runRateManagerCreateFlow(data: RateManagerData): Promise<void> {
    await this.openRateManagerFromManagerFunctions();
    await this.createNewRate(data);
  }

  async runManagerRateFlowStep1(): Promise<void> {
    logger.info('Running manager rate flow step 1');

    await this.openRateManagerFromManagerFunctions();
    await this.elementActions.click(this.getFirstRoundedCard(), 'First rate card');
    await this.elementActions.click(this.getEyeSettingsButton(), 'Eye settings button');
    await this.elementActions.click(this.getTableCell(8, 9), 'Grid cell row 8 col 9');
    try {
      await this.getSelectedLegendRow().click({ timeout: 2000 });
    } catch {
      logger.info('Selected legend row is not clickable in current state; continuing flow');
    }

    await this.elementActions.click(this.getSectionsButton(), 'Sections button');
    await this.elementActions.click(this.getAdvanceConfigLink(), 'Advance Configuration link');

    const descriptionArea = this.getTextArea();
    await this.elementActions.click(descriptionArea, 'Advance description textarea');
    await descriptionArea.press('ControlOrMeta+a');
    await descriptionArea.fill('Long Desc');

    await this.elementActions.click(this.saveButton, 'Save button');
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Success OK button');

    await this.page.getByText('Sections', { exact: true }).click();
    await this.elementActions.click(this.getCopyRatesLink(), 'Copy Rates link');

    await this.elementActions.click(this.getCopyRatesArrowWrapper(), 'Copy rates dropdown arrow');
    const copyRatesCombo = this.getCopyRatesCombobox();
    for (let i = 0; i < 5; i++) {
      await copyRatesCombo.press('ArrowDown');
    }
    await copyRatesCombo.press('Enter');

    await this.getPercentageRadio().check();
    await this.elementActions.click(this.getSecondTextbox(), 'Copy rate percentage textbox');
    await this.getSecondTextbox().fill('50');

    await this.elementActions.click(this.applyButton(), 'Apply button');
    await this.elementActions.click(this.okButton, 'Copy rates OK button');

    await this.page.getByText('Sections', { exact: true }).click();
    /// 
    //await this.elementActions.click(this.getSectionsButton(), 'Sections button');
    await this.page.getByText('Drived Rate Configuration').click();

    await this.elementActions.click(this.getFirstTextbox(), 'Derived rate amount textbox');
    await this.getFirstTextbox().fill('50');
    await this.elementActions.click(this.saveButton, 'Save derived amount button');
    await this.elementActions.click(this.okButton, 'Derived rate amount OK button');

    // try {
    //   await this.getVisibleArrowWrapper().click({ timeout: 3000 });
    // } catch {
    //   await this.getLastComboboxTextbox().click({ timeout: 3000 });
    // }

    const derivedCombo = this.getLastComboboxTextbox();
    await derivedCombo.press('ArrowDown');
    await derivedCombo.press('ArrowDown');
    await derivedCombo.press('Enter');

    // await this.elementActions.click(this.saveButton, 'Save derived rate configuration');
    // await expect(this.successMessage).toContainText('Details created/updated successfully.');
    // await this.elementActions.click(this.okButton, 'Derived rate success OK button');

    await this.page.getByText('Sections', { exact: true }).click();
  }

  async runDeleteRateFromSelectedDatesFlow(): Promise<void> {
    logger.info('Running delete rate from selected dates flow');

    await this.openRateManagerFromManagerFunctions();
    await this.elementActions.click(this.getFirstRoundedCard(), 'First rate card');
    await this.elementActions.click(this.getEyeSettingsButton(), 'Eye settings button');

    await this.elementActions.click(this.getTableCell(7, 2), 'Grid cell row 7 col 2');
    await this.elementActions.click(this.getTableCell(12, 29), 'Grid cell row 12 col 29');

    await this.elementActions.click(this.getDayNameCenter(7, 2), 'Day name center row 7 col 2');
    await this.elementActions.click(this.getTableCell(7, 2), 'Grid cell row 7 col 2 reselect');

    try {
      await this.getRowdataSelectedLegend().click({ timeout: 2000 });
    } catch {
      logger.info('Selected legend row not clickable; continuing');
    }

    await this.elementActions.click(this.getTableCell(7, 2), 'Grid cell row 7 col 2 final select');

    await this.elementActions.click(this.getDeleteRateFromSelectedButton(), 'Delete Rate From Selected button');
    await expect(this.successMessage).toContainText('Do you want to delete the selected record?');

    await this.elementActions.click(this.getDeleteConfirmYesButton(), 'Delete confirmation Yes button');
    await expect(this.successMessage).toContainText('Data Deleted Successfully.');

    await this.elementActions.click(this.okButton, 'Delete success OK button');
    await this.elementActions.click(this.getDeleteFlowCloseButton(), 'Delete flow close button');
  }

  /**
   * Helper method to calculate offset date from a base date
   * @param sourceDate - Base date in DD/MM/YYYY format
   * @param offsetDays - Number of days to add/subtract
   * @returns Date in DD/MM/YYYY format
   */
  getOffsetDate(sourceDate: string, offsetDays: number): string {
    const [day, month, year] = sourceDate.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);
    dateObj.setDate(dateObj.getDate() + offsetDays);

    return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
  }

  /**
   * Helper method to get today's date in DD/MM/YYYY format
   */
  getTodayDate(): string {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  }
}
