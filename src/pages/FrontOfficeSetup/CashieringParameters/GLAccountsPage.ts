import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class GLAccountsPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: ' Parameter Setup' });
  private readonly cashieringParametersLink = this.page.getByRole('link', { name: ' Cashiering Parameters' });
  private readonly glAccountsLink = this.page.getByRole('link', { name: ' GL Accounts' });

  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });
  private readonly closeButton = this.page.getByRole('button', { name: 'Close' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });
  private readonly popupMessage = this.page.locator('#swal2-html-container');

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  private getActiveModal(): Locator {
    return this.page.locator('ngb-modal-window').last();
  }

  private getSearchCandidates(): Locator[] {
    return [
      this.page.locator('#customerList').getByPlaceholder('Search').first(),
      this.page.getByRole('textbox', { name: 'Search', exact: true }).first(),
      this.page.getByPlaceholder('Search').first(),
      this.page.locator("#customerList input[placeholder='Search']").first()
    ];
  }

  private async resolveSearchInput(): Promise<Locator> {
    for (const candidate of this.getSearchCandidates()) {
      if ((await candidate.count()) === 0) {
        continue;
      }

      await candidate.waitFor({ state: 'visible', timeout: 10000 });
      return candidate;
    }

    throw new Error('GL Accounts search input not found');
  }

  private getRowsByText(text: string): Locator {
    return this.page.locator('#customerList tbody tr').filter({ hasText: new RegExp(text, 'i') });
  }

  private async clickToolbarAddButton(): Promise<void> {
    const addCandidates = [
      this.page.locator('#customerList button:has(i.mdi-plus-circle)').first(),
      this.page.locator('#customerList .btn.btn-sm.waves-effect.waves-light').first(),
      this.page.locator('.btn.btn-sm.waves-effect.waves-light').first()
    ];

    for (const candidate of addCandidates) {
      if ((await candidate.count()) === 0) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded();
      await this.elementActions.click(candidate, 'Add GL Accounts button');
      return;
    }

    throw new Error('Add GL Accounts button not found');
  }

  private async clickRowEditButton(rowLocator: Locator): Promise<void> {
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
      await this.elementActions.click(candidate, 'Edit GL Accounts row button');
      return;
    }

    throw new Error('Edit GL Accounts row button not found');
  }

  private async ensureActiveOff(): Promise<void> {
    const activeInput = this.page.locator('#actv').first();
    if (await activeInput.count()) {
      if (await activeInput.isChecked()) {
        await this.elementActions.click(activeInput, 'Active switch off');
      }
      return;
    }

    const activeSwitch = this.page.getByRole('switch', { name: /Active/i }).first();
    if (await activeSwitch.count()) {
      const checked = await activeSwitch.getAttribute('aria-checked');
      if (checked === 'true') {
        await this.elementActions.click(activeSwitch, 'Active switch off');
      }
    }
  }

  private async expectPopupAndConfirm(expectedText: string, confirmLabel: 'OK' | 'Yes'): Promise<void> {
    await expect(this.popupMessage).toContainText(expectedText);

    if (confirmLabel === 'OK') {
      await this.elementActions.click(this.okButton, 'Popup OK button');
      return;
    }

    await this.elementActions.click(this.yesButton, 'Popup Yes button');
  }

  private async closeModalIfVisible(): Promise<void> {
    if ((await this.closeButton.count()) > 0 && await this.closeButton.first().isVisible()) {
      await this.elementActions.click(this.closeButton.first(), 'Close GL Account modal button');
    }
  }

  private generateUniqueNumericCode(length: number = 20): string {
    const seed = `${Date.now()}${Math.floor(Math.random() * 1_000_000_000)}`;
    return seed.slice(-length);
  }

  async openGLAccountsPage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Cashiering Parameters > GL Accounts');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup link');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup link');
    await this.elementActions.click(this.cashieringParametersLink, 'Cashiering Parameters link');
    await this.elementActions.click(this.glAccountsLink, 'GL Accounts link');
  }

  async createGLAccount(
    code: string,
    description: string,
    saveAndAddNew: boolean = false,
    openCreateForm: boolean = true
  ): Promise<void> {
    if (openCreateForm) {
      await this.clickToolbarAddButton();
    }

    const modal = this.getActiveModal();
    const codeInput = modal.getByRole('textbox', { name: 'Enter Code' });
    const descriptionInput = modal.getByRole('textbox', { name: 'Enter Description' });

    await this.elementActions.click(codeInput, 'GL Account code input');
    await this.elementActions.sendKeys(codeInput, code, 'GL Account code value');

    await this.elementActions.click(descriptionInput, 'GL Account description input');
    await this.elementActions.sendKeys(descriptionInput, description, 'GL Account description value');

    const saveButton = saveAndAddNew
      ? modal.getByRole('button', { name: 'Save & Add New' })
      : modal.getByRole('button', { name: 'Save', exact: true });

    await this.elementActions.click(saveButton, saveAndAddNew ? 'Save & Add New GL Account button' : 'Save GL Account button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');
  }



  async searchAndDeleteFirstRecord(searchText: string): Promise<void> {
    const searchInput = await this.resolveSearchInput();
    await this.elementActions.click(searchInput, 'GL Accounts search input');
    await searchInput.fill('');
    await searchInput.fill(searchText);

    const rows = this.getRowsByText(searchText);
    if ((await rows.count()) === 0) {
      throw new Error(`No GL Accounts rows found for search text: ${searchText}`);
    }

    await this.clickRowEditButton(rows.first());
    await this.ensureActiveOff();
    await this.elementActions.click(this.updateButton, 'Update GL Account button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');

    await this.elementActions.click(this.deleteButton, 'Delete GL Account button');
    await this.expectPopupAndConfirm('Do you want to delete the selected record?', 'Yes');
    await this.expectPopupAndConfirm('Data Deleted Successfully.', 'OK');
  }

  async deleteAllAutomationGLAccounts(searchText: string = 'automation'): Promise<void> {
    logger.info(`Deleting all GL Accounts containing text: ${searchText}`);

    let loops = 0;
    while (loops < 200) {
      loops += 1;

      const searchInput = await this.resolveSearchInput();
      await this.elementActions.click(searchInput, 'GL Accounts search input');
      await searchInput.fill('');
      await searchInput.fill(searchText);

      const rows = this.getRowsByText(searchText);
      if ((await rows.count()) === 0) {
        logger.info('No more GL Accounts matching automation text found');
        break;
      }

      await this.clickRowEditButton(rows.first());
      await this.ensureActiveOff();
      await this.elementActions.click(this.updateButton, 'Update GL Account button');
      await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');
      await this.elementActions.click(this.deleteButton, 'Delete GL Account button');
      await this.expectPopupAndConfirm('Do you want to delete the selected record?', 'Yes');
      await this.expectPopupAndConfirm('Data Deleted Successfully.', 'OK');
    }

    if (loops >= 200) {
      throw new Error('Stopped after 200 delete attempts to avoid an infinite loop.');
    }
  }

  async runGLAccountCreateDeleteFlow(): Promise<void> {
    await this.openGLAccountsPage();

    const firstCode = `AUTO${this.generateUniqueNumericCode(16)}`;
    const secondCode = `AUTO${this.generateUniqueNumericCode(16)}`;
    const thirdCode = `AUTO${this.generateUniqueNumericCode(11)}`;

    await this.createGLAccount(firstCode, 'automation', false);
    await this.createGLAccount(secondCode, 'automation', true);
    await this.createGLAccount(thirdCode, 'automation 33', true, false);
    await this.closeModalIfVisible();
    await this.elementActions.click(this.closeButton.first(), 'Close GL Accounts page button');
    await this.deleteAllAutomationGLAccounts('automation');
  }
}
