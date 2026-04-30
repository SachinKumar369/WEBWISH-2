import { expect, BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export class SpecialAccountsPage extends BasePage {
  private readonly elementActions: ElementActions;
  private businessDateCache?: string;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
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

  /**
   * Navigate to Special Accounts section using Global Search
   */
  async openSpecialAccounts(): Promise<void> {
    logger.info('Opening Special Accounts section via Global Search');

    // Use global search to navigate
    const globalSearch = this.page.locator('input[placeholder="Search..."]');
    await globalSearch.fill('');
    await globalSearch.type('Special Accounts');
    await this.page.waitForTimeout(1000);

    const results = this.page.locator('//li[@tabindex="0"]');
    const count = await results.count();
    logger.info(`Found ${count} search result items`);
    
    for (let i = 0; i < count; i++) {
      const item = results.nth(i);
      const text = (await item.innerText()).trim().toLowerCase();
      if (text.includes('special') && text.includes('account')) {
        await item.click();
        break;
      }
    }

    // Wait for page to load
    await this.page.waitForTimeout(2000);
    logger.info('Special Accounts section opened via Global Search');
  }

  /**
   * Search for and open a special account by name (assumes already on Special Accounts page)
   */
  async searchAndSelectSpecialAccount(accountName: string = 'special accounts'): Promise<void> {
    logger.info(`Searching for special account: ${accountName}`);
    
    const searchInput = this.page.locator('app-special-account-list').getByRole('textbox', { name: 'Search...' });
    await this.elementActions.click(searchInput, 'Special account search input');
    await this.elementActions.sendKeys(searchInput, accountName, 'Search value');

    // Wait for search results
    await this.page.waitForTimeout(1000);
    
    // Click on the first result
    await this.elementActions.click(this.page.locator('app-special-account-list .text-primary.cur-pointer').first(), 'Open special account');

    // Wait for account to load
    await this.page.waitForTimeout(2000);
    logger.info(`Special account '${accountName}' opened successfully`);
  }

  async searchAndOpenSpecialAccount(accountName: string = 'special accounts'): Promise<void> {
    logger.info(`Searching for special account: ${accountName}`);
    
    await this.elementActions.click(this.page.getByRole('textbox', { name: 'Search', exact: true }), 'Search input');
    await this.elementActions.sendKeys(this.page.getByRole('textbox', { name: 'Search', exact: true }), accountName, 'Search value');
    await this.elementActions.click(this.page.getByText('Special Accounts'), 'Special Accounts option');
    
    // Open the first special account
    await this.elementActions.click(this.page.locator('.text-primary.cur-pointer').first(), 'Open special account');
  }

  async performBillRoutingOperations(): Promise<void> {
    logger.info('Running Bill Routing operations');
    
    await this.elementActions.click(this.page.getByRole('button', { name: 'Sections 󰅀' }), 'Sections button');
    await this.elementActions.click(this.page.getByText('Bill Routing'), 'Bill Routing option');

    // Add first bill routing record
    await this.elementActions.click(this.page.getByRole('button', { name: '󰐗' }), 'Add button');

    // Select Department
        //await this.elementActions.click(this.page.getByText('Department*--select--'), 'Department field');
    //locator('div').filter({ hasText: /^--select--$/ }).nth(1)
    await this.elementActions.click(this.page.locator('div').filter({ hasText: /^--select--$/ }).nth(1), 'Department field');
    //await this.elementActions.click(this.page.locator('div').filter({ hasText: /^Department\*--select--$/ }).locator('div').first(), 'Department field');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    // Select Account
    await this.elementActions.click(this.page.getByText('Account*--select--'), 'Account field');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    // Select value
    await this.page.waitForTimeout(1000);
    // Use dialog-scoped selector to avoid strict mode issues with multiple "1" matches
    const valueButton = this.page.getByRole('dialog').getByText('1', { exact: true });
    await this.elementActions.click(valueButton, 'Value 1');

    // Save
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save button');
    await expect(this.page.getByRole('paragraph')).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK button');

    // Delete the first record
    await this.elementActions.click(this.page.locator('#checkAll'), 'Check all checkbox');
    await this.elementActions.click(this.page.getByRole('button', { name: '󰚃' }), 'Delete button');
    await expect(this.page.getByRole('paragraph')).toContainText('Do you want to delete the selected record?');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Yes' }), 'Confirm delete');
    await expect(this.page.getByRole('paragraph')).toContainText('Data Deleted Successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK after delete');

    // Add second bill routing record
    await this.elementActions.click(this.page.getByRole('button', { name: '󰐗' }), 'Add button second');

    // Select Department
    await this.elementActions.click(this.page.getByText('Department*--select--'), 'Department field second');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    // Select Account (arrow down 3 times for second option)
    await this.elementActions.click(this.page.getByText('Account*--select--'), 'Account field second');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    // Select value
    const valueButtonSecond = this.page.getByRole('dialog').getByText('1', { exact: true });
    await this.elementActions.click(valueButtonSecond, 'Value 1 second');

    // Save
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save button second');
    await expect(this.page.getByRole('paragraph')).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK button second');
  }

  async performSpecificChargeOperations(): Promise<void> {
    logger.info('Running Specific Charge operations');
    
    // Click Specific Charge section
    await this.elementActions.click(this.page.getByText('Specific Charge'), 'Specific Charge first click');
    await this.elementActions.click(this.page.getByText('Specific Charge'), 'Specific Charge second click');
    
    // Click the checkbox label
    await this.elementActions.click(this.page.locator('label').filter({ hasText: 'Specific Charge' }), 'Specific Charge checkbox');

    // Add a template
    await this.elementActions.click(this.page.getByRole('button', { name: 'Select Template' }), 'Select Template button');

    // Fill Template ID
    const templateIdInput = this.page.locator('div').filter({ hasText: /^Template Id\*$/ }).getByRole('textbox');
    await this.elementActions.click(templateIdInput, 'Template ID input');
    await this.elementActions.sendKeys(templateIdInput, '11', 'Template ID value');

    // Fill Description
    const descriptionInput = this.page.locator('div').filter({ hasText: /^Description\*$/ }).getByRole('textbox');
    await this.elementActions.click(descriptionInput, 'Description input');
    await this.elementActions.sendKeys(descriptionInput, 'dexcription', 'Description value');

    // Save
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save' }), 'Save specific charge');
    await expect(this.page.getByRole('paragraph')).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK specific charge');

    // Edit the charge
    await this.elementActions.click(this.page.getByRole('cell', { name: '' }).locator('i').first(), 'Edit charge icon');
    
    // Wait for edit modal to open
    await this.page.waitForTimeout(1500);
    
    // Try to find and interact with Department field within the modal context
    // Look for the dialog/modal first
    const modalDialog = this.page.locator('[role="dialog"], .modal, .swal2-container').first();
    
    // Within modal, look for Department input field or button
    const departmentButton = modalDialog.getByText(/Department.*--select--/i);
    if (await departmentButton.count() > 0) {
      await this.elementActions.click(departmentButton, 'Department field in modal');
    } else {
      // Fallback: try to find any input/select element that might be Department
      const inputs = modalDialog.locator('input[type="text"], .ng-select, .custom-dropdown');
      if (await inputs.count() > 0) {
        await this.elementActions.click(inputs.first(), 'First input/select in modal');
      }
    }
    
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    // Update
    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update button');
    await expect(this.page.getByRole('paragraph')).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK after update');

    // Delete the charge
    await this.elementActions.click(this.page.getByRole('button', { name: 'Delete' }), 'Delete button');
    await expect(this.page.getByRole('paragraph')).toContainText('Do you want to delete the selected record?');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Yes' }), 'Confirm delete charge');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close specific charge');
  }

  async performCashieringOperations(): Promise<void> {
    logger.info('Running Cashiering operations');
    
    await this.elementActions.click(this.page.getByRole('button', { name: 'Sections 󰅀' }), 'Sections button cashiering');
    await this.elementActions.click(this.page.getByText('View Cashiering'), 'View Cashiering option');

    // Add Charge
    logger.info('Performing Add Charge operation');
    await this.elementActions.click(this.page.getByRole('button', { name: '󰇙' }), 'Add charge menu button');
    await this.elementActions.click(this.page.getByText('Add Charge'), 'Add Charge option');
    await this.elementActions.click(this.page.locator('.p-2.user-select-none').first(), 'Select charge type');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Next' }), 'Next button charge');
    
    const chargeAmountInput = this.page.locator('amount-control').getByRole('textbox');
    await this.elementActions.click(chargeAmountInput, 'Charge amount input');
    await this.elementActions.sendKeys(chargeAmountInput, '100', 'Charge amount');
    
    // Should fail mandatory check first time
    await this.elementActions.click(this.page.getByRole('button', { name: 'Post' }), 'Post charge button first');
    await expect(this.page.locator('#swal2-html-container')).toContainText('Please Fill All *Mandatory Fields..!');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK mandatory fields');

    // Fill reference and post again
    const referenceInput = this.page.locator('input-control').getByRole('textbox');
    await this.elementActions.click(referenceInput, 'Reference input charge');
    await this.elementActions.sendKeys(referenceInput, 'reference', 'Reference value charge');
    
    await this.elementActions.click(this.page.getByRole('button', { name: 'Post' }), 'Post charge button');
    await expect(this.page.getByRole('paragraph')).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK charge posted');

    // Collect Payment
    logger.info('Performing Collect Payment operation');
    await this.elementActions.click(this.page.getByRole('button', { name: '󰇙' }), 'Add payment menu button');
    await this.elementActions.click(this.page.getByText('Collect Payment'), 'Collect Payment option');
    await this.elementActions.click(this.page.locator('.main-div').first(), 'Select payment method');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Next' }), 'Next button payment');
    
    const paymentAmountInput = this.page.locator('amount-control').getByRole('textbox');
    await this.elementActions.click(paymentAmountInput, 'Payment amount input');
    await this.elementActions.sendKeys(paymentAmountInput, '100', 'Payment amount');
    
    const cardNumberInput = this.page.getByRole('textbox', { name: 'xxxx xxxx xxxx xxxx xxxx' });
    await this.elementActions.click(cardNumberInput, 'Card number input');
    await this.elementActions.sendKeys(cardNumberInput, '1234 5678 9012 3456 78124', 'Card number');
    
    const expiryInput = this.page.getByRole('textbox', { name: 'MM/YYYY' });
    await this.elementActions.click(expiryInput, 'Expiry input');
    await this.elementActions.sendKeys(expiryInput, '11/2099', 'Expiry date');
    
    const paymentReferenceInput = this.page.locator('input-control').getByRole('textbox');
    await this.elementActions.click(paymentReferenceInput, 'Reference input payment');
    await this.elementActions.sendKeys(paymentReferenceInput, 'reference', 'Reference value payment');
    
    await this.elementActions.click(this.page.getByRole('button', { name: 'Post' }), 'Post payment button');
    await expect(this.page.getByRole('paragraph')).toContainText('Do you want to Print Voucher');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Yes' }), 'Print voucher yes');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK voucher printed');
    
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close payment');

    // Currency Exchange
    logger.info('Performing Currency Exchange operation');
    await this.elementActions.click(this.page.getByRole('button', { name: '󰇙' }), 'Add exchange menu button');
    await this.elementActions.click(this.page.getByText('Currency Exchange'), 'Currency Exchange option');
    
    const amountInput = this.page.locator('div').filter({ hasText: /^Amount\*$/ }).getByRole('textbox');
    await this.elementActions.click(amountInput, 'Exchange amount input');
    await this.elementActions.sendKeys(amountInput, '110.00', 'Exchange amount');
    
    const nameInput = this.page.locator('div').filter({ hasText: /^Name\*$/ }).getByRole('textbox');
    await this.elementActions.click(nameInput, 'Name input');
    
    // Select Nationality
    await this.elementActions.click(this.page.getByText('Nationality*--select--'), 'Nationality field');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');
    
    const passportInput = this.page.locator('div').filter({ hasText: /^Passport\*$/ }).getByRole('textbox');
    await this.elementActions.click(passportInput, 'Passport input');
    await this.elementActions.sendKeys(passportInput, 'india', 'Passport value');
    
    const dateInput = this.page.getByRole('textbox', { name: 'Select' });
    await this.elementActions.click(dateInput, 'Date input');
    const businessDate = await this.getBusinessDate();
    await this.elementActions.sendKeys(dateInput, businessDate, 'Date value');
    await this.elementActions.pressKey('Tab');
    
    // Select cash/cheque type
    await this.elementActions.click(this.page.locator('app-fx-exchange div').filter({ hasText: 'Cash T/Cheque Amount*Local' }).first(), 'Cash/Cheque type');
    
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save' }), 'Save exchange');
    await expect(this.page.getByRole('paragraph')).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK exchange saved');
    
    await this.elementActions.click(this.page.getByRole('button', { name: 'Next' }), 'Next exchange');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save' }), 'Save after next');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK final');
    
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close exchange');

    // Invoice/Credit Voucher
    logger.info('Performing Invoice/Credit Voucher operation');
    await this.elementActions.click(this.page.getByRole('button', { name: '󰇙' }), 'Add invoice menu button');
    await this.elementActions.click(this.page.getByText('Invoice/Credit Voucher'), 'Invoice/Credit Voucher option');
  }

  async performOpenReservation(): Promise<void> {
    logger.info('Running Open Reservation operation');
    
    await this.elementActions.click(this.page.getByRole('button', { name: '󰇙' }), 'Open reservation menu');
    await this.elementActions.click(this.page.getByText('Open Reservation'), 'Open Reservation option');
  }

  async performPaidOutOperation(): Promise<void> {
    logger.info('Running Paid Out operation');
    
    await this.elementActions.click(this.page.getByRole('button', { name: 'Sections 󰅀' }), 'Sections button paidout');
    await this.elementActions.click(this.page.getByText('View Cashiering'), 'View Cashiering paidout');
    
    await this.elementActions.click(this.page.getByRole('button', { name: '󰇙' }), 'Paid out menu button');
    await this.elementActions.click(this.page.getByText('Paid Out'), 'Paid Out option');
    
    await this.elementActions.click(this.page.getByText('A', { exact: true }).first(), 'Select account A');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Next' }), 'Next paidout');
    
    const paidOutAmountInput = this.page.locator('amount-control').getByRole('textbox');
    await this.elementActions.click(paidOutAmountInput, 'Paid out amount input');
    await this.elementActions.sendKeys(paidOutAmountInput, '110.00', 'Paid out amount');
    
    const paidOutRefInput = this.page.locator('input-control').getByRole('textbox');
    await this.elementActions.click(paidOutRefInput, 'Paid out ref input');
    await this.elementActions.sendKeys(paidOutRefInput, 'reference', 'Paid out reference');
    
    await this.elementActions.click(this.page.getByRole('button', { name: 'Post' }), 'Post paid out');
    await expect(this.page.getByRole('paragraph')).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK paid out');
  }

  async performPostRefundOperation(): Promise<void> {
    logger.info('Running Post Refund operation');
    
    await this.elementActions.click(this.page.getByRole('button', { name: '󰇙' }), 'Refund menu button');
    await this.elementActions.click(this.page.getByText('Post Refund'), 'Post Refund option');
    
    await this.elementActions.click(this.page.getByText('A', { exact: true }).first(), 'Select account A refund');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Next' }), 'Next refund');
    
    const refundAmountInput = this.page.locator('amount-control').getByRole('textbox');
    await this.elementActions.click(refundAmountInput, 'Refund amount input');
    await this.elementActions.sendKeys(refundAmountInput, '200.00', 'Refund amount');
    
    const refundRefInput = this.page.locator('input-control').getByRole('textbox');
    await this.elementActions.click(refundRefInput, 'Refund ref input');
    await this.elementActions.sendKeys(refundRefInput, 'reference', 'Refund reference');
    
    await this.elementActions.click(this.page.getByRole('button', { name: 'Post' }), 'Post refund');
    await expect(this.page.getByRole('paragraph')).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK refund');
  }

  async performSettlementOperation(): Promise<void> {
    logger.info('Running Settlement operation');
    
    await this.elementActions.click(this.page.getByRole('button', { name: '󰇙' }), 'Settlement menu button');
    await this.elementActions.click(this.page.getByText('Settlement'), 'Settlement option');
    
    await this.elementActions.click(this.page.getByText('C', { exact: true }), 'Select account C');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Next' }), 'Next settlement');
    
    const settlementRefInput = this.page.locator('div').filter({ hasText: /^Reference\*$/ }).getByRole('textbox');
    await this.elementActions.click(settlementRefInput, 'Settlement ref input');
    await this.elementActions.sendKeys(settlementRefInput, 'description', 'Settlement reference');
    
    await this.elementActions.click(this.page.getByRole('button', { name: 'Settle' }), 'Settle button');
    await expect(this.page.getByRole('paragraph')).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'OK settlement');
    
    // Verify settlement completed and amount summary is visible
    await expect(this.page.locator('amount-summary-card')).toBeVisible();
    logger.info('Settlement operation completed successfully');
  }

  async runCompleteSpecialAccountFlow(): Promise<void> {
    await this.openSpecialAccounts();
    await this.searchAndSelectSpecialAccount('special');
    await this.performBillRoutingOperations();
    await this.performSpecificChargeOperations();
    await this.performCashieringOperations();
    await this.performOpenReservation();
    await this.performPaidOutOperation();
    await this.performPostRefundOperation();
    await this.performSettlementOperation();
  }
}
