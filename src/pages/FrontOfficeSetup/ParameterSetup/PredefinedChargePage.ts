import { expect, BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class PredefinedChargePage extends BasePage {
  private readonly elementActions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  private async clickFirstMatchingLocator(candidates: string[], description: string): Promise<void> {
    let lastError: Error | null = null;

    for (const selector of candidates) {
      const candidate = this.page.locator(selector).first();
      if ((await candidate.count()) === 0) {
        continue;
      }

      try {
        await this.elementActions.click(candidate, `${description} (${selector})`);
        return;
      } catch (error) {
        lastError = error as Error;
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error(`${description} locator not found.`);
  }

  private async clickToolbarAddButton(): Promise<void> {
    await this.clickFirstMatchingLocator(
      [
        "//button[.//i[contains(@class,'add') or contains(@class,'plus') or contains(@class,'create')]]",
        "//button[.//i[contains(@class,'mdi-plus') or contains(@class,'fa-plus')]]",
        "(//h3[contains(normalize-space(),'Predefined Charge')]/following::button)[1]",
        "(//input[@placeholder='Search']/ancestor::div[1]/preceding::button)[1]",
        "//button[.//text()[normalize-space()='󰐗']]"
      ],
      'Add Predefined Charge button'
    );
  }

  private getListSearchInput() {
    return this.page.locator('input[placeholder="Search"]').first();
  }

  private getCodeInput() {
    return this.page
      .locator('div')
      .filter({ hasText: /^Charge Code\*--select--$/ })
      .getByRole('combobox')
      .first();
  }

  private async enterChargeCode(code: string): Promise<void> {
    const codeComboBox = this.getCodeInput();
    await this.elementActions.click(codeComboBox, 'Predefined Charge code combobox');
    await this.page.keyboard.type(code);
    await this.page.keyboard.press('Enter');
  }

  private getAmountInput() {
    const modal = this.page.locator('ngb-modal-window').last();
    return modal
      .locator(
        "input[appnumberonly], input[maxlength='10'][style*='text-align: right'], input[placeholder='Enter Amount'], input[placeholder='Enter amount'], input[placeholder*='Amount'], input[name='amount'], input[formcontrolname*='amount' i]"
      )
      .first();
  }

  private async enterAmount(amount: string): Promise<void> {
    const amountInput = this.getAmountInput();
    await this.elementActions.click(amountInput, 'Predefined Charge amount input');
    await amountInput.clear();
    await this.page.keyboard.type(amount);
  }

  private getRows() {
    return this.page.locator('tbody tr');
  }

  private getRowsByText(text: string) {
    return this.page.locator('tbody tr').filter({ hasText: new RegExp(text, 'i') });
  }

  private async getFirstAvailablePredefinedChargeCode(): Promise<string> {
    const firstRow = this.getRows().first();
    await expect(firstRow).toBeVisible();

    const cells = (await firstRow.locator('td').allTextContents()).map((value) => value.trim()).filter(Boolean);
    const likelyCode = cells.find((value) => /[A-Za-z]/.test(value));

    if (!likelyCode) {
      throw new Error('Unable to find existing Predefined Charge code from first row.');
    }

    return likelyCode;
  }

  private async clickRowEditButton(rowLocator: ReturnType<Page['locator']>): Promise<void> {
    const editCandidates = [
      rowLocator.locator("xpath=.//i[contains(@class,'edit') or contains(@class,'pencil') or contains(@class,'bx-edit-alt')]").first(),
      rowLocator.locator("xpath=.//button[.//i[contains(@class,'edit') or contains(@class,'pencil') or contains(@class,'bx-edit-alt')]]").first(),
      rowLocator.locator("xpath=.//a[.//i[contains(@class,'edit') or contains(@class,'pencil') or contains(@class,'bx-edit-alt')]]").first(),
      rowLocator.locator('i').first()
    ];

    for (const candidate of editCandidates) {
      if ((await candidate.count()) === 0) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded();
      await this.elementActions.click(candidate, 'Edit Predefined Charge row button');
      return;
    }

    throw new Error('Edit Predefined Charge row button not found for matching row');
  }

  private async ensureActiveOff(): Promise<void> {
    const modal = this.page.locator('ngb-modal-window').last();

    const activeCheckbox = modal
      .locator(
        "input#actv[type='checkbox'], input[type='checkbox'][role='switch'], input[type='checkbox'][formcontrolname*='active' i], input[type='checkbox'][name*='active' i]"
      )
      .first();
    if (await activeCheckbox.count()) {
      if (await activeCheckbox.isChecked()) {
        await activeCheckbox.uncheck();
      } else {
        await activeCheckbox.click();
        await activeCheckbox.uncheck();
      }
      return;
    }

    const activeSwitch = modal.getByRole('switch', { name: /Active/i }).first();
    if (await activeSwitch.count()) {
      const isChecked = await activeSwitch.getAttribute('aria-checked');
      if (isChecked === 'true') {
        await this.elementActions.click(activeSwitch, 'Active switch off');
        await expect(activeSwitch).toHaveAttribute('aria-checked', 'false');
      }
    }
  }

  private async expectPopupAndConfirm(expectedText: string, confirmLabel: 'OK' | 'Yes' | 'Close'): Promise<void> {
    if (confirmLabel === 'Close') {
      await this.elementActions.click(this.page.getByRole('button', { name: confirmLabel }), `Popup ${confirmLabel} button`);
    } else {
      await expect(this.page.locator('#swal2-html-container')).toContainText(expectedText);
      await this.elementActions.click(this.page.getByRole('button', { name: confirmLabel }), `Popup ${confirmLabel} button`);
    }
  }

  async openPredefinedChargePage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Predefined Charge');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.page.getByRole('link', { name: ' FrontOffice Setup' }), 'FrontOffice Setup link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Parameter Setup' }), 'Parameter Setup link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Predefined Charge' }), 'Predefined Charge link');
  }

  async validateDuplicatePredefinedCharge(code: string): Promise<void> {
    logger.info(`Validating duplicate Predefined Charge code: ${code}`);

    await this.clickToolbarAddButton();
    await this.enterChargeCode(code);
    await this.page.keyboard.press('Tab');


    await expect(this.page.locator('#swal2-html-container')).toContainText('Code Already Exists');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Duplicate charge code OK button');
    await this.expectPopupAndConfirm('', 'Close');
  }

  async createPredefinedChargeAndVerify(code: string, amount: string): Promise<void> {
    logger.info(`Creating new Predefined Charge with code ${code} and amount ${amount}`);
    await this.clickToolbarAddButton();
    await this.enterChargeCode(code);

    await this.enterAmount(amount);

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save Predefined Charge button');
    await expect(this.page.locator('#swal2-html-container')).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Save Predefined Charge OK button');
  }

  async searchPredefinedCharge(searchText: string): Promise<void> {
    const searchInput = this.getListSearchInput();
    await this.elementActions.click(searchInput, 'Predefined Charge search input');
    await searchInput.fill('');
    await searchInput.fill(searchText);

    const rows = this.getRowsByText(searchText);
    await expect(rows.first()).toBeVisible();
  }

  async deactivateAndDeleteFirstMatch(searchText: string): Promise<void> {
    logger.info(`Deactivating and deleting Predefined Charge for search: ${searchText}`);

    await this.searchPredefinedCharge(searchText);
    const row = this.getRowsByText(searchText).first();
    await this.clickRowEditButton(row);

    await this.ensureActiveOff();
    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update Predefined Charge button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Delete' }), 'Delete Predefined Charge button');
    await this.expectPopupAndConfirm('Do you want to delete the selected record?', 'Yes');
    await this.expectPopupAndConfirm('Reuqested data has been deleted successfully.', 'OK');
  }

  async runPredefinedChargeDuplicateThenCreateFlow(chargeAmount: string): Promise<void> {
    await this.openPredefinedChargePage();

    const chargeCode = await this.getFirstAvailablePredefinedChargeCode();
    logger.info(`Using existing Predefined Charge code for duplicate-delete-recreate flow: ${chargeCode}`);

    await this.validateDuplicatePredefinedCharge(chargeCode);
    await this.deactivateAndDeleteFirstMatch(chargeCode);
    await this.createPredefinedChargeAndVerify(chargeCode, chargeAmount);
  }
}
