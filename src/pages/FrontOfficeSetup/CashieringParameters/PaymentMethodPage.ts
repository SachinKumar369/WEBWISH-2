import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class PaymentMethodPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: ' Parameter Setup' });
  private readonly cashieringParametersLink = this.page.getByRole('link', { name: ' Cashiering Parameters' });
  private readonly paymentMethodLink = this.page.getByRole('link', { name: ' Payment Method' });

  private readonly addButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
  private readonly codeInput = this.page.getByRole('textbox').first();
  private readonly descriptionInput = this.page.getByRole('textbox').nth(1);
  private readonly amountInput = this.page.locator('amount-control').getByRole('textbox').first();
  private readonly creditCardRadio = this.page.getByRole('radio', { name: 'Credit Card' }).first();

  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
  private readonly saveAndAddNewButton = this.page.getByRole('button', { name: 'Save & Add New' });
  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });

  private readonly activeCheckbox = this.page.locator('#actv');

  private readonly popupMessage = this.page.locator('#swal2-html-container');
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });

  private readonly firstPageButton = this.page.locator('a[aria-label="First"]');
  private readonly nextPageButton = this.page.locator('a[aria-label="Next"]');

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  private async expectAndConfirmPopup(expectedText: string, button: 'OK' | 'Yes'): Promise<void> {
    await expect(this.popupMessage).toContainText(expectedText);

    if (button === 'OK') {
      await this.elementActions.click(this.okButton, 'Popup OK button');
    } else {
      await this.elementActions.click(this.yesButton, 'Popup Yes button');
    }
  }

  private async clickAdd(): Promise<void> {
    await this.elementActions.click(this.addButton, 'Add Payment Method button');
  }

  private async fillPaymentMethodDetails(code: string, description: string, amount?: string): Promise<void> {
    await this.elementActions.click(this.codeInput, 'Code input');
    await this.elementActions.sendKeys(this.codeInput, code, 'Code');

    await this.elementActions.click(this.descriptionInput, 'Description input');
    await this.elementActions.sendKeys(this.descriptionInput, description, 'Description');

    if (amount) {
      await this.elementActions.click(this.amountInput, 'Amount input');
      await this.amountInput.press('ControlOrMeta+a');
      await this.amountInput.fill(amount);
    }
  }

  private getSearchInputCandidates(): Locator[] {
    return [
      this.page.locator('#customerList').getByPlaceholder('Search').first(),
      this.page.getByPlaceholder('Search').first(),
      this.page.locator('#customerList').getByRole('textbox', { name: 'Search', exact: true }).first(),
      this.page.locator("#customerList input[placeholder='Search']").first(),
      this.page.locator('#customerList input').first()
    ];
  }

  private async resolveSearchInput(): Promise<Locator> {
    for (const candidate of this.getSearchInputCandidates()) {
      if ((await candidate.count()) === 0) continue;
      await candidate.waitFor({ state: 'visible', timeout: 10000 });
      return candidate;
    }
    throw new Error('Search input not found');
  }

  private async saveWithSuccess(button: Locator, desc: string): Promise<void> {
    await this.elementActions.click(button, desc);
    await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');
  }

  // ✅ Active toggle fix
  private async ensureActiveOff(): Promise<void> {
    if (await this.activeCheckbox.count() > 0) {
      if (await this.activeCheckbox.isChecked()) {
        logger.info('Active ON → turning OFF');
        await this.elementActions.click(this.activeCheckbox, 'Active off');
      }
      return;
    }
  }

  // ✅ DELETE ONE (used in loop)
  private async deleteOneIfExists(searchText: string): Promise<boolean> {
    const searchInput = await this.resolveSearchInput();

    await this.elementActions.click(searchInput, 'Search input');
    await searchInput.fill('');
    await searchInput.type(searchText, { delay: 100 });
    await searchInput.press('Enter');

    await Promise.race([
      this.page.waitForSelector('#customerList tbody tr'),
      this.page.waitForSelector('h5:has-text("No Record Found")')
    ]);

    const row = this.page.locator('#customerList tbody tr').filter({ hasText: searchText }).first();

    if ((await row.count()) === 0) {
      logger.info('No more records found');
      return false;
    }

    await row.locator('.bx-edit-alt').first().click();

    await this.ensureActiveOff();

    await this.elementActions.click(this.updateButton, 'Update');
    await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');

    await this.elementActions.click(this.deleteButton, 'Delete');
    await this.expectAndConfirmPopup('Do you want to delete the selected record?', 'Yes');
    await this.expectAndConfirmPopup('Data Deleted Successfully.', 'OK');

    await this.page.waitForLoadState('networkidle');

    return true;
  }

  async openPaymentMethodPage(): Promise<void> {
    await this.page.mouse.move(0, 300);

    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup');
    await this.elementActions.click(this.cashieringParametersLink, 'Cashiering Parameters');
    await this.elementActions.click(this.paymentMethodLink, 'Payment Method');
  }

  // ✅ Pagination-based collection
  private async getAllCodes(): Promise<Set<string>> {
    const set = new Set<string>();
    const searchInput = await this.resolveSearchInput();

    await this.elementActions.click(searchInput, 'Search input');
    await searchInput.fill('');
    await searchInput.press('Enter');

    if (await this.firstPageButton.count() > 0) {
      const cls = await this.firstPageButton.locator('xpath=ancestor::li').getAttribute('class');
      if (!cls?.includes('disabled')) {
        await this.elementActions.click(this.firstPageButton, 'First page');
        await this.page.waitForLoadState('networkidle');
      }
    }

    while (true) {
      const rows = this.page.locator('#customerList tbody tr');
      const count = await rows.count();

      for (let i = 0; i < count; i++) {
        const text = await rows.nth(i).locator('td').nth(1).innerText();
        set.add(text.trim());
      }

      const nextCls = await this.nextPageButton.locator('xpath=ancestor::li').getAttribute('class');
      if (nextCls?.includes('disabled')) break;

      await this.elementActions.click(this.nextPageButton, 'Next page');
      await this.page.waitForLoadState('networkidle');
    }

    return set;
  }

  private generateCode(existing: Set<string>): string {
    let max = 0;

    existing.forEach(code => {
      const match = code.match(/^A(\d+)$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > max) max = num;
      }
    });

    return `A${max + 1}`;
  }

  async runPaymentMethodCreateDeleteFlow(): Promise<void> {
    await this.openPaymentMethodPage();

    const existing = await this.getAllCodes();

    const code1 = this.generateCode(existing);
    existing.add(code1);

    const code2 = this.generateCode(existing);
    existing.add(code2);

    const code3 = this.generateCode(existing);

    await this.clickAdd();
    await this.fillPaymentMethodDetails(code1, 'automation', '100000');
    await this.saveWithSuccess(this.saveButton, 'Save');

    await this.clickAdd();
    await this.fillPaymentMethodDetails(code2, 'automation');
    await this.saveWithSuccess(this.saveAndAddNewButton, 'Save & Add New');

    await this.fillPaymentMethodDetails(code3, 'automation');
    await this.elementActions.click(this.saveButton, 'Save');
    await this.expectAndConfirmPopup('Invalid Code Class (23577)', 'OK');

    await this.elementActions.click(this.creditCardRadio, 'Credit Card');
    await this.saveWithSuccess(this.saveButton, 'Save');

    // ✅ DELETE ALL automation records
    let totalDeleted = 0;
    while (true) {
      const deleted = await this.deleteOneIfExists('automation');
      if (!deleted) break;
      totalDeleted++;
    }

    logger.info(`Total automation records deleted: ${totalDeleted}`);
  }
}