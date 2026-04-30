import { expect, BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export class AgentMaintenancePage extends BasePage {
  private readonly elementActions: ElementActions;
  private businessDateCache?: string;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  private async expectSuccessAndConfirm(message: string = 'Details created/updated successfully.'): Promise<void> {
    logger.info(`Waiting for success confirmation`);
    
    // Wait for OK button (which appears in success modal) and click it
    try {
      await this.page.waitForTimeout(500); // Small delay for modal to appear
      const okBtn = this.page.getByRole('button', { name: 'OK' });
      await expect(okBtn).toBeVisible({ timeout: 5000 });
      await this.elementActions.click(okBtn, 'Success OK button');
    } catch (e) {
      logger.warn(`OK button not found, continuing...`);
    }
  }

  private async getBusinessDate(): Promise<string> {
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

  private getNextDate(dateValue: string): string {
    const [day, month, year] = dateValue.split('/').map((part) => Number(part));
    const nextDate = new Date(year, month - 1, day);
    nextDate.setDate(nextDate.getDate() + 2);

    const nextDay = String(nextDate.getDate()).padStart(2, '0');
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
    const nextYear = String(nextDate.getFullYear());
    return `${nextDay}/${nextMonth}/${nextYear}`;
  }

  async openAgentMaintenance(): Promise<void> {
    logger.info('Opening Marketing > Agent Maintenance');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Marketing' }), 'Marketing link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Agent Maintenance' }), 'Agent Maintenance link');
  }

  async createNewAgent(agentCode: string, agentName: string, city: string = 'DUBAI'): Promise<void> {
    logger.info(`Creating new agent: ${agentCode}`);
    await this.elementActions.click(this.page.getByRole('button', { name: /󰐕 New Travel Agent/i }), 'New Travel Agent button');
    await this.elementActions.click(this.page.getByRole('radio', { name: 'Is Channel', exact: true }), 'Is Channel radio');

    const agentCodeInput = this.page.getByRole('textbox').first();
    await this.elementActions.click(agentCodeInput, 'Agent Code input');
    await this.elementActions.sendKeys(agentCodeInput, agentCode, 'Agent Code');

    const agentNameInput = this.page.getByRole('textbox').nth(1);
    await this.elementActions.click(agentNameInput, 'Agent Name input');
    await this.elementActions.sendKeys(agentNameInput, agentName, 'Agent Name');

    const cityInput = this.page.getByRole('textbox').nth(2);
    await this.elementActions.click(cityInput, 'City input');
    await this.elementActions.sendKeys(cityInput, city, 'City');

    const countryInput = this.page.locator('div:nth-child(3) > div > input-control > .text-capitalize').first();
    await this.elementActions.click(countryInput, 'Country input');
    await this.elementActions.sendKeys(countryInput, 'UAE', 'Country');

    const countryCombo = this.page.getByRole('combobox').first();
    await this.elementActions.click(countryCombo, 'Country combobox');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    const stateCombo = this.page.getByRole('combobox').nth(1);
    await this.elementActions.click(stateCombo, 'State combobox');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save' }), 'Save agent');
    await this.expectSuccessAndConfirm();
  }

  async searchAndOpenAgent(agentCode: string): Promise<void> {
    logger.info(`Searching and opening agent: ${agentCode}`);
    
    // Wait for page to refresh/stabilize after agent creation
    await this.page.waitForTimeout(1000);
    
    // Close the profile details modal if still open
    try {
      const closeBtn = this.page.getByRole('button', { name: 'Close' });
      if (await closeBtn.isVisible()) {
        await this.elementActions.click(closeBtn, 'Close profile details');
      }
    } catch (e) {
      // Modal already closed
    }
    
    // Wait for search input to be available
    await this.page.waitForSelector('input[placeholder="Search..."], .search-input', { timeout: 5000 });
    
    const searchInput = this.page.getByRole('textbox', { name: 'Search...' });
    await this.elementActions.click(searchInput, 'Search input');
    await this.elementActions.sendKeys(searchInput, agentCode, 'Search input');
    
    // Wait for search results
    await this.page.waitForTimeout(500);
    
    const editOption = this.page.getByRole('heading', { name: 'Edit' });
    await this.elementActions.click(editOption, 'Edit option');
  }

  async performAllotmentOperations(): Promise<void> {
    logger.info('Running Allotment operations');
    const businessDate = await this.getBusinessDate();
    const nextDate = this.getNextDate(businessDate);

    await this.elementActions.click(this.page.locator('.dropdown-toggle.btn.btn-sm'), 'Section dropdown');
    await this.elementActions.click(this.page.getByText('Allotment'), 'Allotment option');

    await this.elementActions.click(this.page.getByRole('button').first(), 'Add allotment button');

    const startDateInput = this.page.getByRole('textbox', { name: 'Select' }).first();
    await this.elementActions.click(startDateInput, 'Allotment start date');
    await this.elementActions.sendKeys(startDateInput, businessDate, 'Allotment start date value');

    const endDateInput = this.page.getByRole('textbox', { name: 'Select' }).nth(1);
    await this.elementActions.click(endDateInput, 'Allotment end date');
    await this.elementActions.sendKeys(endDateInput, nextDate, 'Allotment end date value');

    const roomTypeCombo = this.page.getByRole('combobox').first();
    await this.elementActions.click(roomTypeCombo, 'Room type combobox');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save allotment');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(this.page.locator('.bx.bx-edit-alt').first(), 'Edit allotment');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close edit allotment');

    await this.elementActions.click(this.page.locator('.icon-size.bx.bx-block'), 'Block allotment');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close block');

    await this.elementActions.click(this.page.locator('.icon-size.bx.bx-cut'), 'Cut allotment');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close cut');

    await this.elementActions.click(this.page.getByRole('button').first(), 'Add second allotment');

    await this.elementActions.click(startDateInput, 'Allotment start date second');
    await this.elementActions.sendKeys(startDateInput, businessDate, 'Allotment start date second value');

    await this.elementActions.click(endDateInput, 'Allotment end date second');
    await this.elementActions.sendKeys(endDateInput, nextDate, 'Allotment end date second value');

    const roomTypeComboSecond = this.page.getByRole('combobox').first();
    await this.elementActions.click(roomTypeComboSecond, 'Room type combobox second');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save second allotment');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(this.page.locator('#checkAll'), 'Check all allotments');
    await this.elementActions.click(this.page.getByRole('button').nth(1), 'Delete allotment button');
    await expect(this.page.getByRole('paragraph')).toContainText('Do you want to delete the selected record?');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Yes' }), 'Confirm delete');
    await expect(this.page.getByText('Data Deleted Successfully.')).toBeVisible();
    await this.expectSuccessAndConfirm('Data Deleted Successfully.');
  }

  async performReservationDetailsOperations(): Promise<void> {
    logger.info('Running Reservation Details operations');
    await this.elementActions.click(this.page.locator('.dropdown-toggle.btn.btn-sm'), 'Section dropdown');
    await this.elementActions.click(this.page.getByText('Reservation Details'), 'Reservation Details option');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close Reservation Details');
  }

  async performContactDetailsOperations(): Promise<void> {
    logger.info('Running Contact Details operations');
    await this.elementActions.click(this.page.locator('.dropdown-toggle.btn.btn-sm'), 'Section dropdown');
    await this.elementActions.click(this.page.locator('dropdown-button').getByText('Contact Details'), 'Contact Details option');

    await this.elementActions.click(this.page.getByRole('button').first(), 'Add contact button');

    const firstNameInput = this.page.getByRole('textbox').first();
    await this.elementActions.click(firstNameInput, 'First name input');
    await this.elementActions.sendKeys(firstNameInput, 'KUMAR', 'First name');

    const lastNameInput = this.page.getByRole('textbox').nth(1);
    await this.elementActions.click(lastNameInput, 'Last name input');
    await this.elementActions.sendKeys(lastNameInput, 'SAHNE', 'Last name');

    const cityInputContact = this.page.locator('.ng-untouched.ng-pristine.ng-invalid > .text-capitalize');
    await this.elementActions.click(cityInputContact, 'City input contact');
    await this.elementActions.sendKeys(cityInputContact, 'KATAR', 'City contact');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save & Add New' }), 'Save and add new contact');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(this.page.locator('.form-check.form-switch'), 'Toggle contact');

    const firstNameInput2 = this.page.getByRole('textbox').first();
    await this.elementActions.click(firstNameInput2, 'First name input second');
    await this.elementActions.sendKeys(firstNameInput2, 'RAJ', 'First name second');

    const lastNameInput2 = this.page.getByRole('textbox').nth(1);
    await this.elementActions.click(lastNameInput2, 'Last name input second');
    await this.elementActions.sendKeys(lastNameInput2, 'SINHA', 'Last name second');

    const cityInputContact2 = this.page.locator('.ng-untouched.ng-dirty.ng-invalid > .text-capitalize');
    await this.elementActions.click(cityInputContact2, 'City input contact second');
    await this.elementActions.sendKeys(cityInputContact2, 'KERALA', 'City contact second');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save contact');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(this.page.locator('tr:nth-child(2) > .stickyActions > .d-flex > div > .bx').first(), 'Edit contact row');
    await this.elementActions.click(this.page.getByRole('switch', { name: 'Active' }), 'Toggle active');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update contact');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close contact details');
    await expect(this.page.locator('.icon-color').first()).toBeVisible();
    await expect(this.page.locator('tr:nth-child(2) > td:nth-child(6) > span > .icon-color')).toBeVisible();

    await this.elementActions.click(this.page.locator('#checkAll'), 'Check all contacts');
    await this.elementActions.click(this.page.locator('#checkAll'), 'Uncheck all contacts');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close contact section');
  }

  async performContractsOperations(): Promise<void> {
    logger.info('Running Contracts operations');
    const businessDate = await this.getBusinessDate();
    const nextDate = this.getNextDate(businessDate);

    await this.elementActions.click(this.page.locator('.dropdown-toggle.btn.btn-sm'), 'Section dropdown');
    await this.elementActions.click(this.page.getByText('Contracts', { exact: true }), 'Contracts option');

    await this.elementActions.click(this.page.getByRole('button').first(), 'Add contract button');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save contract empty');
    await expect(this.page.locator('#swal2-html-container')).toContainText('Please Fill All *Mandatory Fields');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK mandatory fields');

    const contractStartDate = this.page.getByRole('textbox', { name: 'Select' }).first();
    await this.elementActions.click(contractStartDate, 'Contract start date');
    await this.elementActions.sendKeys(contractStartDate, businessDate, 'Contract start date value');

    const contractEndDate = this.page.getByRole('textbox', { name: 'Select' }).nth(1);
    await this.elementActions.click(contractEndDate, 'Contract end date');
    await this.elementActions.sendKeys(contractEndDate, businessDate, 'Contract end date value');

    await this.elementActions.click(this.page.getByRole('button').first(), 'Add contract detail');
    await this.elementActions.click(this.page.locator('.col-md-4 > toggle-control > .form-check'), 'Toggle commission');

    const rateCombo = this.page.getByRole('combobox').first();
    await this.elementActions.click(rateCombo, 'Rate combobox');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save contract detail');
    await this.elementActions.click(this.page.getByRole('button').nth(2), 'Edit contract');
    await this.elementActions.click(this.page.getByRole('button').nth(2), 'Edit contract again');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close contract');

    await this.elementActions.click(this.page.getByRole('button').nth(1), 'Delete contract');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close contracts');
  }

  async performCallLogsOperations(): Promise<void> {
    logger.info('Running Call Logs operations');
    const businessDate = await this.getBusinessDate();

    await this.elementActions.click(this.page.locator('.dropdown-toggle.btn.btn-sm'), 'Section dropdown');
    await this.elementActions.click(this.page.getByText('Call Logs'), 'Call Logs option');

    await this.elementActions.click(this.page.getByRole('button').first(), 'Add call log');

    const callDate = this.page.getByRole('textbox', { name: 'Select' }).first();
    await this.elementActions.click(callDate, 'Call date');
    await this.elementActions.sendKeys(callDate, businessDate, 'Call date value');

    const timeInput = this.page.locator('input[type="time"]');
    await this.elementActions.click(timeInput, 'Call time');
    await this.elementActions.sendKeys(timeInput, '11:11', 'Time value');

    const callTypeCombo = this.page.getByRole('textbox').nth(2);
    await this.elementActions.click(callTypeCombo, 'Call type combobox');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    const nameInput = this.page.locator('input-control').getByRole('textbox');
    await this.elementActions.click(nameInput, 'Name input');
    await this.elementActions.sendKeys(nameInput, 'SACHIN', 'Name value');

    const personCombo = this.page.getByRole('textbox').nth(4);
    await this.elementActions.click(personCombo, 'Person combobox');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    await this.elementActions.click(this.page.getByRole('switch'), 'Toggle follow up');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save' }).first(), 'Save call log');

    const purposeInput = this.page.getByRole('textbox').nth(5);
    await this.elementActions.click(purposeInput, 'Purpose input');
    await this.elementActions.sendKeys(purposeInput, 'PURPOSE', 'Purpose value');

    const followUpNotes = this.page.locator('textarea').nth(1);
    await this.elementActions.click(followUpNotes, 'Follow up notes');
    await this.elementActions.sendKeys(followUpNotes, 'FOLLOW UP', 'Follow up notes value');

    const followUpDate = this.page.getByRole('textbox', { name: 'Select' }).nth(1);
    await this.elementActions.click(followUpDate, 'Follow up date');
    await this.elementActions.sendKeys(followUpDate, businessDate, 'Follow up date value');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save' }).nth(1), 'Save follow up');
    await this.expectSuccessAndConfirm();

    await expect(this.page.getByText('SACHIN', { exact: true })).toBeVisible();
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close call logs');
  }

  async performLanguageSetupOperations(): Promise<void> {
    logger.info('Running Language Setup operations');
    await this.elementActions.click(this.page.locator('.dropdown-toggle.btn.btn-sm'), 'Section dropdown');
    await this.elementActions.click(this.page.getByText('Language Setup'), 'Language Setup option');

    const languageCombo = this.page.locator('.custom-dropdown.ng-select-searchable.ng-select.ng-select-single.ng-untouched.ng-pristine.ng-valid.ng-select-focused > .ng-select-container > .ng-arrow-wrapper');
    await this.elementActions.click(languageCombo, 'Language combobox');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    const proficiencyInput = this.page.getByRole('blockquote').filter({ hasText: 'Uae' }).getByRole('textbox');
    await this.elementActions.click(proficiencyInput, 'Proficiency input');
    await this.elementActions.sendKeys(proficiencyInput, 'HINDI', 'Proficiency value');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save' }), 'Save language');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close language setup');
  }

  async performDiscountMaskOperations(): Promise<void> {
    logger.info('Running Discount Mask operations');
    await this.elementActions.click(this.page.locator('.dropdown-toggle.btn.btn-sm'), 'Section dropdown');
    await this.elementActions.click(this.page.getByText('Discount Mask'), 'Discount Mask option');

    await this.elementActions.click(this.page.getByRole('textbox', { name: 'Search...' }), 'Discount search');
    await this.page.getByRole('textbox', { name: 'Search...' }).fill('');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Next' }), 'Next button');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK next');

    await this.elementActions.click(this.page.getByRole('checkbox', { name: 'Banquet' }), 'Check Banquet');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Next' }), 'Next button second');

    const discountTypeInput = this.page.getByRole('textbox').first();
    await this.elementActions.click(discountTypeInput, 'Discount type input');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save' }), 'Save discount mask');
    await this.expectSuccessAndConfirm();
  }

  async runCompleteAgentMaintenanceFlow(agentCode: string, agentName: string): Promise<void> {
    await this.openAgentMaintenance();
    await this.createNewAgent(agentCode, agentName);
    // Agent is already in edit mode after creation, search not needed
    // await this.searchAndOpenAgent(agentCode);

    await this.performAllotmentOperations();
    await this.performReservationDetailsOperations();
    await this.performContactDetailsOperations();
    await this.performContractsOperations();
    await this.performCallLogsOperations();
    await this.performLanguageSetupOperations();
    await this.performDiscountMaskOperations();
  }
}
