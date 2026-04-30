import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';
import { WaitUtils } from '../../utils/WaitUtils';

export interface CorporateMaintenanceData {
  id: string;
  name: string;
  legalName: string;
  modifiedLegalName: string;
  address1: string;
  contactFirstName: string;
  contactLastName: string;
  contactAddress: string;
  callLogPurpose: string;
}

export class CorporateMaintenancePage extends BasePage {
  private elementActions: ElementActions;
  private waitUtils: WaitUtils;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.waitUtils = new WaitUtils(page);
  }

  private get globalSearchInput(): Locator {
    return this.page
      .locator('#search-options, input[placeholder="Search..."], input[placeholder="Search"], input[aria-label="Search"]')
      .first();
  }

  private get successMessage(): Locator {
    return this.page.getByRole('paragraph');
  }

  private get okButton(): Locator {
    return this.page.getByRole('button', { name: 'OK' });
  }

  private get overflowMenuButton(): Locator {
    return this.page.getByRole('button', { name: '󰇙' });
  }

  private get addIconButton(): Locator {
    return this.page.getByRole('button', { name: '󰐗' });
  }

  private get editIconButton(): Locator {
    return this.page.getByRole('button', { name: '󰲶' });
  }

  private get deleteIconButton(): Locator {
    return this.page.getByRole('button', { name: '󰚃' });
  }

  private async fillRequiredField(label: string, value: string): Promise<void> {
    const field = this.page.locator('div').filter({ hasText: new RegExp(`^${label}\\*$`) }).getByRole('textbox');
    await this.elementActions.click(field, `${label} input`);
    await this.elementActions.sendKeys(field, value, `${label} input`);
  }

  private async selectFromNgSelect(containerText: string, arrowDownCount: number): Promise<void> {
    const dropdown = this.page.locator('ng-select').filter({ hasText: containerText });
    const input = dropdown.getByRole('textbox');
    await this.elementActions.click(input, `Dropdown input: ${containerText}`);

    for (let i = 0; i < arrowDownCount; i++) {
      await input.press('ArrowDown');
    }

    await input.press('Enter');
  }

  private async expectAndConfirmSuccess(): Promise<void> {
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Success dialog OK button');
  }

  async searchAndOpenCorporateMaintenance(searchText: string = 'corporate maintenance'): Promise<void> {
    logger.info(`Opening Corporate Maintenance from search: ${searchText}`);

    await this.elementActions.waitForElement(this.globalSearchInput, 20000, 'Global search input');
    await this.elementActions.click(this.globalSearchInput, 'Global search input');
    await this.elementActions.sendKeys(this.globalSearchInput, searchText, 'Global search input');

    const searchResults = this.page.locator('//li[@tabindex="0"]');
    const resultCount = await searchResults.count();

    let openedFromSearch = false;
    for (let i = 0; i < resultCount; i++) {
      const item = searchResults.nth(i);
      const text = ((await item.textContent()) || '').trim().toLowerCase();
      if (text.includes('corporate') && text.includes('maintenance')) {
        await this.elementActions.click(item, 'Corporate Maintenance search result');
        openedFromSearch = true;
        break;
      }
    }

    if (!openedFromSearch) {
      await this.elementActions.click(
        this.page.locator('#page-topbar').getByText('Corporate Maintenance'),
        'Corporate Maintenance topbar item'
      );
    }

    await this.waitUtils.sleep(1000);
  }

  async createCorporate(data: CorporateMaintenanceData): Promise<void> {
    await this.elementActions.click(this.page.getByRole('button', { name: /New Corporate/i }), 'New Corporate button');

    await this.fillRequiredField('Id', data.id);
    await this.fillRequiredField('Name', data.name);
    await this.fillRequiredField('Legal Name', data.legalName);
    await this.fillRequiredField('Address 1', data.address1);

    const countryInput = this.page.locator('#country').getByRole('textbox');
    await this.elementActions.click(countryInput, 'Country dropdown');
    await countryInput.press('ArrowDown');
    await countryInput.press('ArrowDown');
    await countryInput.press('ArrowDown');
    await countryInput.press('Enter');

    await this.elementActions.click(
      this.page.locator('div').filter({ hasText: /^Main Head\*--select--$/ }).locator('span').nth(1),
      'Main Head dropdown'
    );
    await this.selectFromNgSelect('--select-- CO Corporate OT', 2);

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save' }), 'Save corporate button');
    await this.expectAndConfirmSuccess();
  }

  async updateProfileAndDefaults(data: CorporateMaintenanceData): Promise<void> {
    await this.elementActions.click(this.page.getByRole('heading', { name: 'Edit' }).first(), 'First edit heading');

    await this.elementActions.click(
      this.page.locator('app-ta-profile-details').getByRole('button', { name: '󰲶' }),
      'Profile Details edit button'
    );

    const legalNameField = this.page.locator('div').filter({ hasText: /^Legal Name\*$/ }).getByRole('textbox');
    await this.elementActions.click(legalNameField, 'Legal Name field');
    await legalNameField.press('ControlOrMeta+a');
    await this.elementActions.sendKeys(legalNameField, data.modifiedLegalName, 'Legal Name field');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update profile button');
    await this.expectAndConfirmSuccess();

    await this.elementActions.click(
      this.page.locator('app-ta-defaults').getByRole('button', { name: '󰲶' }),
      'Defaults edit button'
    );
    // await this.elementActions.click(
    //   this.page.locator('div').filter({ hasText: /^Currency--select--$/ }).locator('span').first(),
    //   'Currency dropdown'
    // );
    // await this.selectFromNgSelect('--select-- AFN Afghanistan', 3);

    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update defaults button');
    await this.expectAndConfirmSuccess();

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close edit drawer');
  }

  async manageAllotment(): Promise<void> {
    await this.elementActions.click(this.overflowMenuButton, 'Open section menu');
    await this.elementActions.click(this.page.getByText('Allotment'), 'Allotment menu item');

    await this.elementActions.click(this.addIconButton, 'Add allotment button');

    await this.elementActions.click(this.page.locator('div').filter({ hasText: /^Date From\*$/ }).getByRole('textbox'), 'Allotment date from');
    await this.elementActions.sendKeys(this.page.locator('div').filter({ hasText: /^Date From\*$/ }).getByRole('textbox'), '06/06/2025', 'Allotment date from input');
    //await this.elementActions.click(this.page.getByLabedl('June 06,').first(), 'Allotment from date');

    await this.elementActions.click(this.page.locator('div').filter({ hasText: /^Date To\*$/ }).getByRole('textbox'), 'Allotment date to');
    await this.elementActions.sendKeys(this.page.locator('div').filter({ hasText: /^Date To\*$/ }).getByRole('textbox'), '09/06/2025', 'Allotment date to input');
    //await this.elementActions.click(this.page.getByLabel('May 31,').nth(1), 'Allotment to date');

    await this.elementActions.click(this.page.locator('div').filter({ hasText: /^--select--$/ }).first(), 'Allotment select dropdown');
    const allotmentSelect = this.page.getByRole('combobox').getByRole('textbox');
    await allotmentSelect.press('ArrowDown');
    await allotmentSelect.press('ArrowDown');
    await allotmentSelect.press('ArrowDown');
    await allotmentSelect.press('Enter');

    const allotmentQty = this.page.locator('webwish-input').getByRole('textbox');
    await this.elementActions.click(allotmentQty, 'Allotment quantity input');
    await this.elementActions.sendKeys(allotmentQty, '4', 'Allotment quantity input');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save & Add New' }), 'Save and Add New allotment button');
    await this.elementActions.click(this.okButton, 'Allotment first save dialog OK');

    await this.elementActions.click(allotmentQty, 'Allotment quantity input second row');
    await allotmentQty.press('ControlOrMeta+a');
    await this.elementActions.sendKeys(allotmentQty, '1', 'Allotment quantity input second row');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save & Add New' }), 'Save and Add New allotment second button');
    await this.expectAndConfirmSuccess();

    await this.elementActions.click(this.page.locator('div').filter({ hasText: /^Date From\*$/ }).getByRole('textbox'), 'Allotment second date from');
    await this.elementActions.click(this.page.getByLabel('May 31,').first(), 'Allotment second from date');

    await this.elementActions.click(this.page.locator('div').filter({ hasText: /^Date To\*$/ }).getByRole('textbox'), 'Allotment second date to');
    await this.elementActions.click(this.page.getByLabel('May 31,').nth(1), 'Allotment second to date');

    await this.elementActions.click(this.page.locator('ng-select span').first(), 'Allotment second dropdown');
    await allotmentSelect.press('ArrowDown');
    await allotmentSelect.press('ArrowDown');
    await allotmentSelect.press('ArrowDown');
    await allotmentSelect.press('ArrowDown');
    await allotmentSelect.press('Enter');

    await this.elementActions.click(allotmentQty, 'Allotment quantity final row');
    await this.elementActions.sendKeys(allotmentQty, '01', 'Allotment quantity final row');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Allotment final save button');
    await this.elementActions.click(this.okButton, 'Allotment final save OK');

    await this.page.locator('#checkAll').check();
    await this.elementActions.click(this.deleteIconButton, 'Delete selected allotment button');
    await expect(this.successMessage).toContainText('Do you want to delete the selected record?');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Yes' }), 'Confirm delete button');
    await expect(this.successMessage).toContainText('Data Deleted Successfully.');
    await this.elementActions.click(this.okButton, 'Delete success OK button');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close allotment dialog');
  }

  async maintainContactDetails(data: CorporateMaintenanceData): Promise<void> {
    await this.elementActions.click(this.overflowMenuButton, 'Open section menu for contact details');
    await this.elementActions.click(this.page.locator('a').filter({ hasText: 'Contact Details' }), 'Contact Details menu item');

    await this.elementActions.click(this.addIconButton, 'Add contact details button');
    await this.fillRequiredField('Last Name', data.contactLastName);
    await this.fillRequiredField('First Name', data.contactFirstName);
    await this.fillRequiredField('Address', data.contactAddress);

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save contact details button');
    await this.expectAndConfirmSuccess();

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close contact details dialog');
  }

  async maintainContracts(): Promise<void> {
    await this.elementActions.click(this.overflowMenuButton, 'Open section menu for contracts');
    await this.elementActions.click(this.page.getByText('Contracts', { exact: true }), 'Contracts menu item');

    await this.elementActions.click(this.addIconButton, 'Add contract button');
    await this.elementActions.click(this.page.locator('div').filter({ hasText: /^Date From$/ }).getByRole('textbox'), 'Contract date from');
    await this.elementActions.click(this.page.getByLabel('May 31,').first(), 'Contract from date');

    await this.elementActions.click(this.addIconButton, 'Add contract detail button');
    await this.elementActions.click(
      this.page.locator('div').filter({ hasText: /^Rate Code\*--select--$/ }).locator('span').nth(1),
      'Rate code dropdown'
    );
    await this.selectFromNgSelect('--select-- BARD best rate', 2);

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save & Add New' }), 'Save and Add New contract detail');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save & Add New' }), 'Save and Add New contract detail second click');
    await this.elementActions.click(this.okButton, 'Contract detail success OK');

    await this.elementActions.click(
      this.page.locator('.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-valid.ng-select-bottom > .ng-select-container > .ng-arrow-wrapper'),
      'Contract second rate code dropdown'
    );
    await this.selectFromNgSelect('--select--× DRAT Double Rate', 3);

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save contract detail');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save contract detail second click');
    await this.elementActions.click(this.okButton, 'Contract detail second success OK');

    await this.elementActions.click(this.page.getByRole('textbox', { name: 'Select' }).nth(1), 'Contract end date input');
    await this.elementActions.click(this.page.getByLabel('May 31,').nth(1), 'Contract end date selection');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save contracts header');
    await this.elementActions.click(this.okButton, 'Contract header success OK');

    await this.elementActions.click(this.page.locator('div').filter({ hasText: /^Date From$/ }).getByRole('textbox'), 'Contract update date from');
    
    await this.elementActions.click(this.page.getByLabel('May 29,').first(), 'Contract update from date');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Final save contracts button');
    await this.expectAndConfirmSuccess();

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close contracts dialog');
  }

  async maintainCallLogs(data: CorporateMaintenanceData): Promise<void> {
    await this.elementActions.click(this.overflowMenuButton, 'Open section menu for call logs');
    await this.elementActions.click(this.page.getByText('Call Logs'), 'Call Logs menu item');

    await this.elementActions.click(this.addIconButton, 'Add call log button');
    await this.elementActions.click(this.page.locator('div').filter({ hasText: /^Contact Date\*$/ }).getByRole('textbox'), 'Contact date input');
    await this.elementActions.click(this.page.getByLabel('May 29,').first(), 'Contact date selection');

    const timeInput = this.page.locator('input[type="time"]');
    await this.elementActions.click(timeInput, 'Contact time input');
    await this.elementActions.sendKeys(timeInput, '11:11', 'Contact time input');

    await this.elementActions.click(
      this.page.locator('div').filter({ hasText: /^Mode\*--select--$/ }).locator('span').nth(1),
      'Mode dropdown'
    );
    await this.selectFromNgSelect('--select-- FAX FAX LTR LETTER', 2);

    const followUpInput = this.page.locator('input-control').getByRole('textbox');
    await this.elementActions.click(followUpInput, 'Follow-up input');
    await this.elementActions.sendKeys(followUpInput, 'call', 'Follow-up input');

    await this.elementActions.click(this.page.locator('ng-select').filter({ hasText: /^--select--$/ }).locator('span').first(), 'Contact person dropdown');
    await this.selectFromNgSelect('--select-- 123456789 Sachin', 1);

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save' }), 'Save call log button');

    const purposeTextArea = this.page.locator('textarea').first();
    await this.elementActions.click(purposeTextArea, 'Call log purpose textarea');
    await this.elementActions.sendKeys(purposeTextArea, data.callLogPurpose, 'Call log purpose textarea');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save' }), 'Final save call log button');
    await this.expectAndConfirmSuccess();

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close call log dialog');
  }

  async updateLanguageSetup(): Promise<void> {
    await this.elementActions.click(this.overflowMenuButton, 'Open section menu for language setup');
    await this.elementActions.click(this.page.getByText('Language Setup'), 'Language Setup menu item');

    await this.elementActions.click(this.page.locator('ng-select span').nth(2), 'Language dropdown');
    await this.elementActions.click(
      this.page.locator('app-common-language-setup div').filter({ hasText: 'Language*--select--×EN ARB' }).nth(2),
      'Language selection row'
    );

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close language setup dialog');
  }

  async updateDiscountMask(): Promise<void> {
    await this.elementActions.click(this.overflowMenuButton, 'Open section menu for discount mask');
    await this.elementActions.click(this.page.getByText('Discount Mask'), 'Discount Mask menu item');

    await this.page.getByRole('checkbox', { name: 'Banquet' }).check();
    await this.elementActions.click(this.page.getByRole('button', { name: 'Next' }), 'Discount mask next button');

    await this.elementActions.click(
      this.page.getByRole('tabpanel', { name: 'Banquet' }).locator('span').nth(2),
      'Banquet discount dropdown'
    );

    const discountInput = this.page.getByRole('textbox').first();
    await discountInput.press('ArrowDown');
    await discountInput.press('Enter');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save' }), 'Save discount mask button');
    await this.expectAndConfirmSuccess();
  }

  async runCorporateMaintenanceFlow(data: CorporateMaintenanceData): Promise<void> {
    await this.searchAndOpenCorporateMaintenance('corporate maintenance');
    await this.createCorporate(data);
    await this.updateProfileAndDefaults(data);
    await this.manageAllotment();

    await this.elementActions.click(this.overflowMenuButton, 'Open section menu for reservation details');
    await this.elementActions.click(this.page.getByText('Reservation Details'), 'Reservation Details menu item');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close reservation details dialog');

    await this.maintainContactDetails(data);
    await this.maintainContracts();
    await this.maintainCallLogs(data);
    await this.updateLanguageSetup();
    await this.updateDiscountMask();
  }
}

