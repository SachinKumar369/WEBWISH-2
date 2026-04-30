import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class DebtorAccountsPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: ' Parameter Setup' });
  private readonly cashieringParametersLink = this.page.getByRole('link', { name: ' Cashiering Parameters' });
  private readonly debtorAccountsLink = this.page.getByRole('link', { name: ' Debtor Accounts' });

  private readonly addButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
  private readonly codeInput = this.page.getByRole('textbox', { name: 'Enter Code' });
  private readonly descriptionInput = this.page.getByRole('textbox', { name: 'Enter Description' });
  private readonly address1Input = this.page.getByRole('textbox', { name: 'Enter Address1' });

  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
  private readonly saveAndAddNewButton = this.page.getByRole('button', { name: 'Save & Add New' });
  private readonly closeButton = this.page.getByRole('button', { name: 'Close' });

  private readonly searchInput = this.page.getByRole('textbox', { name: 'Search', exact: true });
  private readonly checkAll = this.page.locator('#checkAll');
  private readonly deleteSelectedButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light.py-0.px-2.btn-soft-danger');

  private readonly popupMessage = this.page.locator('#swal2-html-container');
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  private buildCode(seed: string, suffix: number): string {
    const normalized = seed.slice(0, 7);
    return `A${normalized}${suffix}`.slice(0, 8);
  }

  private async expectAndConfirmPopup(expectedText: string, button: 'OK' | 'Yes'): Promise<void> {
    await expect(this.popupMessage).toContainText(expectedText);

    if (button === 'OK') {
      await this.elementActions.click(this.okButton, 'Popup OK button');
      return;
    }

    await this.elementActions.click(this.yesButton, 'Popup Yes button');
  }

  private async fillDebtorForm(code: string, description: string, address1: string): Promise<void> {
    await this.elementActions.click(this.codeInput, 'Debtor code input');
    await this.elementActions.sendKeys(this.codeInput, code, 'Debtor code value');

    await this.elementActions.click(this.descriptionInput, 'Debtor description input');
    await this.elementActions.sendKeys(this.descriptionInput, description, 'Debtor description value');

    await this.elementActions.click(this.address1Input, 'Debtor address1 input');
    await this.elementActions.sendKeys(this.address1Input, address1, 'Debtor address1 value');
  }

  private async saveWithSuccessPopup(button: Locator, buttonDescription: string): Promise<void> {
    await this.elementActions.click(button, buttonDescription);

    try {
      await expect(this.popupMessage).toContainText('Details created/updated successfully.', { timeout: 5000 });
    } catch {
      // Some runs need a second save click before success popup appears.
      await this.elementActions.click(button, `${buttonDescription} retry`);
      await expect(this.popupMessage).toContainText('Details created/updated successfully.');
    }

    await this.elementActions.click(this.okButton, 'Popup OK button');
  }

  async openDebtorAccountsPage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Cashiering Parameters > Debtor Accounts');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup link');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup link');
    await this.elementActions.click(this.cashieringParametersLink, 'Cashiering Parameters link');
    await this.elementActions.click(this.debtorAccountsLink, 'Debtor Accounts link');
  }

  private generateUniqueCode(): string {
  const timestamp = Date.now().toString().slice(-5); // last 5 digits
  const random = Math.floor(Math.random() * 1000);   // 0–999

  return `A${timestamp}${random}`.slice(0, 8);
}

  async createDebtorAccountsAndDeleteFlow(): Promise<void> {
    await this.openDebtorAccountsPage();


    const code1 = this.generateUniqueCode();
const code2 = this.generateUniqueCode();
const code3 = this.generateUniqueCode();


    // const seed = String(Date.now()).slice(-7);
    // const code1 = this.buildCode(seed, 1);
    // const code2 = this.buildCode(seed, 2);
    // const code3 = this.buildCode(seed, 3);

    const descriptionToken = `AUTOMATION${String(Date.now()).slice(-4)}`;

    await this.elementActions.click(this.addButton, 'Add Debtor Account button');

    await this.fillDebtorForm(code1, descriptionToken.toLowerCase(), 'delhi');
    await this.saveWithSuccessPopup(this.saveButton, 'Save Debtor Account');

    await this.elementActions.click(this.addButton, 'Add Debtor Account button');

    await this.fillDebtorForm(code2, descriptionToken, 'NEW DELHI');
    await this.saveWithSuccessPopup(this.saveAndAddNewButton, 'Save & Add New Debtor Account');

    await this.fillDebtorForm(code3, `${descriptionToken} 123`, 'NEW DELHI');
    await this.saveWithSuccessPopup(this.saveButton, 'Save Debtor Account');

    await this.elementActions.click(this.closeButton, 'Close Debtor Account popup');

    await this.elementActions.click(this.searchInput, 'Debtor Account search input');
    await this.searchInput.fill('');
    await this.elementActions.sendKeys(this.searchInput, descriptionToken, 'Debtor Account search token');

    await expect(this.checkAll).toBeVisible();
    await this.checkAll.check();

    await this.elementActions.click(this.deleteSelectedButton, 'Delete selected Debtor Accounts button');
    await this.expectAndConfirmPopup('Do you want to delete the selected record?', 'Yes');
    await this.expectAndConfirmPopup('Data Deleted Successfully.', 'OK');
  }
}
