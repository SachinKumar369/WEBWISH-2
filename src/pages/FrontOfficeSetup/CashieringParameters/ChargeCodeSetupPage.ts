import { expect, BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class ChargeCodeSetupPage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ================= PAGE FACTORY LOCATORS ================= */
  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: ' Parameter Setup' });
  private readonly cashieringParametersLink = this.page.getByRole('link', { name: ' Cashiering Parameters' });
  private readonly chargeCodeSetupLink = this.page.getByRole('link', { name: ' Charge Code Setup' });

  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });

  private readonly searchInput = this.page.locator('#customerList').getByRole('textbox', { name: 'Search', exact: true });
  private readonly popupMessage = this.page.locator('#swal2-html-container');

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  private getActiveModal() {
    return this.page.locator('ngb-modal-window').last();
  }

  private getRowsByText(text: string) {
    return this.page.locator('#customerList tbody tr').filter({ hasText: new RegExp(text, 'i') });
  }

  private async clickToolbarAddButton(): Promise<void> {
    const addCandidates = [
      this.page.locator('#customerList button:has(i.mdi-plus-circle)').first(),
      this.page.locator('#customerList list-header-button button.btn-soft-primary').first(),
      this.page.locator('#customerList .d-flex.gap-1 button').first()
    ];

    for (const candidate of addCandidates) {
      if ((await candidate.count()) === 0) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded();
      await this.elementActions.click(candidate, 'Add Charge Code button');
      return;
    }

    throw new Error('Add Charge Code button not found in #customerList toolbar');
  }

  private async expectPopupAndConfirm(expectedText: string, confirmLabel: 'OK' | 'Yes'): Promise<void> {
    await expect(this.popupMessage).toContainText(expectedText);
    if (confirmLabel === 'OK') {
      await this.elementActions.click(this.okButton, 'Popup OK button');
      return;
    }

    await this.elementActions.click(this.yesButton, 'Popup Yes button');
  }

  private async selectDropdownByArrowDown(formControlName: string, arrowDownCount: number): Promise<void> {
    const modal = this.getActiveModal();
    const input = modal.locator(`drop-down-searchable[formcontrolname='${formControlName}'] ng-select .ng-input input`).first();

    await this.elementActions.click(input, `${formControlName} dropdown input`);

    for (let i = 0; i < arrowDownCount; i++) {
      await this.elementActions.pressKey('ArrowDown');
    }

    await this.elementActions.pressKey('Enter');
  }

  private async clickRowEditButton(rowLocator: ReturnType<Page['locator']>): Promise<void> {
    const editCandidates = [
      rowLocator.locator("xpath=.//i[contains(@class,'edit') or contains(@class,'pencil') or contains(@class,'bx-edit-alt')]").first(),
      rowLocator.locator('.bx.bx-edit-alt').first(),
      rowLocator.locator('i').first()
    ];

    for (const candidate of editCandidates) {
      if ((await candidate.count()) === 0) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded();
      await this.elementActions.click(candidate, 'Edit Charge Code row button');
      return;
    }

    throw new Error('Edit Charge Code row button not found for matching row');
  }

  private async ensureActiveOff(): Promise<void> {
    const modal = this.getActiveModal();
    const activeToggle = modal.locator('#actv').first();

    if (await activeToggle.count()) {
      const isChecked = await activeToggle.isChecked();
      if (isChecked) {
        await this.elementActions.click(activeToggle, 'Active switch off');
      }
      return;
    }

    const activeSwitch = modal.getByRole('switch', { name: /Active/i }).first();
    if (await activeSwitch.count()) {
      const checked = await activeSwitch.getAttribute('aria-checked');
      if (checked === 'true') {
        await this.elementActions.click(activeSwitch, 'Active switch off');
      }
    }
  }

  async openChargeCodeSetupPage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Cashiering Parameters > Charge Code Setup');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup link');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup link');
    await this.elementActions.click(this.cashieringParametersLink, 'Cashiering Parameters link');
    await this.elementActions.click(this.chargeCodeSetupLink, 'Charge Code Setup link');
  }

  async createChargeCode(description: string): Promise<void> {
    logger.info(`Creating Charge Code Setup with description: ${description}`);

    await this.clickToolbarAddButton();
    await this.selectDropdownByArrowDown('department_Code', 3);
    await this.selectDropdownByArrowDown('account_Code', 3);

    const modal = this.getActiveModal();
    const descriptionInput = modal.locator("input-control[formcontrolname='description'] input").first();
    await this.elementActions.click(descriptionInput, 'Description input');
    await this.elementActions.sendKeys(descriptionInput, description, 'Description value');

    await this.elementActions.click(this.saveButton, 'Save Charge Code button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');
  }

  async searchChargeCode(searchText: string): Promise<void> {
    await this.elementActions.click(this.searchInput, 'Charge Code search input');
    await this.searchInput.fill('');
    await this.searchInput.fill(searchText);

    const rows = this.getRowsByText(searchText);
    await expect(rows.first()).toBeVisible();
  }

  async deactivateAndDeleteFirstMatch(searchText: string): Promise<void> {
    await this.searchChargeCode(searchText);

    const row = this.getRowsByText(searchText).first();
    await this.clickRowEditButton(row);

    await this.ensureActiveOff();
    await this.elementActions.click(this.updateButton, 'Update Charge Code button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');

    await this.elementActions.click(this.deleteButton, 'Delete Charge Code button');
    await this.expectPopupAndConfirm('Do you want to delete the selected record?', 'Yes');
    await this.expectPopupAndConfirm('Data Deleted Successfully.', 'OK');
  }

  async runChargeCodeSetupCreateDeleteFlow(): Promise<void> {
    const description = `Automation Description ${Date.now()}`;

    // wait for 2 second
    await this.page.waitForTimeout(2000);
    await this.openChargeCodeSetupPage();

    await this.createChargeCode(description);
    await this.deactivateAndDeleteFirstMatch('automation');
  }
}
