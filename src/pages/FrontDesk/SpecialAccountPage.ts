import { Page, BrowserContext, Locator } from '@playwright/test';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export interface SpecialAccountData {
  name: string;
  billTo: string;
  fxCode: string;
  rateCode: string;
  marketSegment: string;
  businessSource: string;
  domicile: string;
  corporateId: string;
}

export class SpecialAccountPage {
  page: Page;
  context: BrowserContext;
  private elementActions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
    this.elementActions = new ElementActions(page);
  }

  get heading(): Locator {
    return this.page.locator('h3').filter({ hasText: 'Special Accounts' });
  }

  get newButton(): Locator {
    return this.page.getByRole('button', { name: '󰐕 New Special Account' });
  }

  get successMessage(): Locator {
    return this.page.getByRole('paragraph');
  }

  get okButton(): Locator {
    return this.page.getByRole('button', { name: 'OK' });
  }

  get searchInput(): Locator {
    return this.page.locator('app-special-account-list').getByRole('textbox', { name: 'Search...' });
  }

  get listContainer(): Locator {
    return this.page.locator('app-special-account-list');
  }

  private async selectDropdown(label: string, optionText: string) {
    // click the dropdown arrow next to the label
    // note: escape star correctly for RegExp constructor
    const regex = new RegExp(`^${label}\\*--select--$`);
    await this.page
      .locator('div')
      .filter({ hasText: regex })
      .locator('span')
      .nth(1)
      .click();

    const dropdown = this.page.locator('ng-select').filter({ hasText: optionText });
    await dropdown.getByRole('textbox').press('ArrowDown');
    await dropdown.getByRole('textbox').press('Enter');
  }

  async searchAndOpenSpecialAccounts(searchText: string): Promise<boolean> {
    logger.info(`Searching for: ${searchText}`);
    const globalSearch = this.page.locator('input[placeholder="Search..."]');
    await globalSearch.fill('');
    await globalSearch.type(searchText);
    await this.page.waitForTimeout(1000);

    const results = this.page.locator('//li[@tabindex="0"]');
    const count = await results.count();
    logger.info(`Found ${count} search result items`);
    for (let i = 0; i < count; i++) {
      const item = results.nth(i);
      const text = (await item.innerText()).trim().toLowerCase();
      if (text.includes('special') && text.includes('account')) {
        await item.click();
        return true;
      }
    }
    logger.warn('Special Accounts not found in search results');
    return false;
  }

  async waitForPageLoad(timeout = 5000): Promise<void> {
    await this.heading.waitFor({ state: 'visible', timeout });
  }

  async createSpecialAccount(data: SpecialAccountData): Promise<void> {
    logger.info('Creating new special account');

    await this.newButton.click();

    // fill fields sequentially
    await this.page
      .locator('div')
      .filter({ hasText: /^Name\*$/ })
      .getByRole('textbox')
      .click();
    await this.page
      .locator('div')
      .filter({ hasText: /^Name\*$/ })
      .getByRole('textbox')
      .fill(data.name);
    await this.page
      .locator('div')
      .filter({ hasText: /^Name\*$/ })
      .getByRole('textbox')
      .press('Tab');

    await this.page
      .locator('div')
      .filter({ hasText: /^Bill To\*$/ })
      .getByRole('textbox')
      .fill(data.billTo);
    await this.page
      .locator('div')
      .filter({ hasText: /^Bill To\*$/ })
      .getByRole('textbox')
      .press('Tab');

    await this.selectDropdown('FX Code', data.fxCode);
    await this.selectDropdown('Rate Code', data.rateCode);
    await this.selectDropdown('Market Segment', data.marketSegment);
    await this.selectDropdown('Business Source', data.businessSource);
    await this.selectDropdown('Domicile Code', data.domicile);
   // await this.selectDropdown('Corporate', data.corporateId);

    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  async confirmDialog(): Promise<void> {
    await this.okButton.click();
  }

  async searchAccount(term: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill(term);
  }

  // Methods for modifying special account details

  /**
   * Click the first special account to open its details
   */
  async clickFirstSpecialAccount(): Promise<void> {
    logger.info('Clicking first special account');
    await this.page.locator('.text-primary.cur-pointer').first().click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Modify Header Details section
   */
  async modifyHeaderDetails(accountName: string): Promise<void> {
    logger.info(`Modifying header details with account name: ${accountName}`);

    // Click the header details edit button
    await this.page
      .locator('card-control')
      .filter({ hasText: 'Header DetailsId &' })
      .getByRole('button')
      .click();

    // Wait for the form to be visible
    await this.page.waitForTimeout(500);

    // Get the textbox for account name (usually the second one in the form)
    const accountNameInput = this.page.getByRole('textbox').nth(1);
    await accountNameInput.click();
    await accountNameInput.press('ControlOrMeta+A');
    await accountNameInput.fill(accountName);

    // Click Save
    await this.page.getByRole('button', { name: 'Save' }).click();

    // Wait for OK button and click it
    await this.page.waitForTimeout(500);
    await this.okButton.click();

    logger.info('Header details saved successfully');
  }

  /**
   * Modify Billing Details section
   */
  async modifyBillingDetails(billTo: string, phone: string = '', city: string = ''): Promise<void> {
    logger.info(`Modifying billing details with bill to: ${billTo}`);

    // Click the billing details edit button
    await this.page
      .locator('card-control')
      .filter({ hasText: 'Billing DetailsBill ToaPhone' })
      .getByRole('button')
      .click();

    await this.page.waitForTimeout(500);

    // Fill Bill To field
    const billToInput = this.page
      .locator('div')
      .filter({ hasText: /^Bill To\*$/ })
      .getByRole('textbox');
    await billToInput.click();
    await billToInput.fill('');
    await billToInput.press('ControlOrMeta+A');
    await billToInput.fill(billTo);

    // Fill Phone field if provided
    if (phone) {
      const phoneInput = this.page
        .getByRole('dialog')
        .locator('div')
        .filter({ hasText: /^Phone$/ })
        .getByRole('textbox');
      await phoneInput.click();
      await phoneInput.fill(phone);
    }

    // Click Save
    await this.page.getByRole('button', { name: 'Save' }).click();
    await this.page.waitForTimeout(500);

    // Fill City field if provided
    if (city) {
      const cityInput = this.page.locator('.ng-untouched.ng-pristine.ng-invalid > .text-capitalize');
      await cityInput.click();
      await cityInput.fill(city);
    }

    // Click Save again
    await this.page.getByRole('button', { name: 'Save' }).click();

    // Wait for success message and click OK
    await this.page.waitForTimeout(500);
    await this.okButton.click();

    logger.info('Billing details saved successfully');
  }

  /**
   * Modify Membership Details section
   */
  async modifyMembershipDetails(): Promise<void> {
    logger.info('Modifying membership details');

    // Click the membership details edit button
    await this.page
      .locator('card-control')
      .filter({ hasText: 'Membership DetailsMembership' })
      .getByRole('button')
      .click();

    await this.page.waitForTimeout(500);

    // Modify first membership card
    await this.modifyMembershipCard(0, 'BUSS', '1234 5678 9098 7766 54333', '12/32');

    // Modify second membership card
    await this.modifyMembershipCard(1, 'EDUI', '1122 3344 5566 7788 99877', '11/32');

    // Click Save
    await this.page.getByRole('button', { name: 'Save' }).click();

    // Wait for success message and click OK
    await this.page.waitForTimeout(500);
    await this.okButton.click();

    logger.info('Membership details saved successfully');
  }

  /**
   * Helper method to modify a membership card
   */
  private async modifyMembershipCard(cardIndex: number, cardType: string, cardNumber: string, expiry: string): Promise<void> {
    const cardNumber1 = '1234 5678 9098 7766 54333';
    const cardNumber2 = '1122 3344 5566 7788 99877';
    const filterText = cardIndex === 0 ? 'Membership Card 1Business' : 'Membership Card 2Business';

    // Select card type
    await this.page
      .locator('app-membership-card')
      .filter({ hasText: filterText })
      .locator('#card-type-input')
      .selectOption(cardType);

    // Fill card number
    await this.page
      .locator('app-membership-card')
      .filter({ hasText: filterText })
      .getByPlaceholder('xxxx xxxx xxxx xxxx xxxx')
      .click();

    const currentCardNumber = cardIndex === 0 ? cardNumber1 : cardNumber2;
    await this.page
      .locator('app-membership-card')
      .filter({ hasText: filterText })
      .getByPlaceholder('xxxx xxxx xxxx xxxx xxxx')
      .fill(currentCardNumber);

    // Fill expiry
    const expiryInput = this.page
      .locator('app-membership-card')
      .filter({ hasText: filterText })
      .getByPlaceholder('MM/YY');

    await expiryInput.click();
    await expiryInput.fill(expiry);

    // Handle navigation if needed for second card
    if (cardIndex === 1) {
      await expiryInput.press('ArrowLeft');
      await expiryInput.fill('11/3');
      await expiryInput.press('ArrowRight');
      await expiryInput.press('ArrowRight');
      await expiryInput.fill('11/32');
    }
  }

  /**
   * Verify that the account name was updated in the header details
   */
  async verifyHeaderDetailsUpdated(expectedAccountName: string): Promise<boolean> {
    logger.info(`Verifying header details contain: ${expectedAccountName}`);
    const accountDetails = this.page.locator('app-special-account-details');
    const text = await accountDetails.innerText();
    return text.includes(expectedAccountName);
  }

  /**
   * Verify that billing details were updated
   */
  async verifyBillingDetailsUpdated(expectedBillTo: string): Promise<boolean> {
    logger.info(`Verifying billing details contain: ${expectedBillTo}`);
    const accountDetails = this.page.locator('app-special-account-details');
    const text = await accountDetails.innerText();
    return text.includes(expectedBillTo);
  }
}
