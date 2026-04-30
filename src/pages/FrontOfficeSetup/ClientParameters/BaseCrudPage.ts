import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';
import { randomUUID } from 'crypto';

export abstract class BaseCrudPage extends BasePage {
  protected readonly elementActions: ElementActions;

  protected readonly addButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
  protected readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
  protected readonly saveAndAddNewButton = this.page.getByRole('button', { name: 'Save & Add New' });
  protected readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  protected readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });

  protected readonly popupMessage = this.page.locator('#swal2-html-container');
  protected readonly okButton = this.page.getByRole('button', { name: 'OK' });
  protected readonly yesButton = this.page.getByRole('button', { name: 'Yes' });
  protected readonly activeSwitch = this.page.getByRole('switch', { name: 'Active' });

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  protected abstract fillForm(data: any): Promise<void>;
  protected abstract openPage(): Promise<void>;

  generateUniqueCode(): string {
    return randomUUID().replace(/-/g, '').substring(0, 8);
  }

  protected async expectAndConfirmPopup(expectedText: string, button: 'OK' | 'Yes') {
    await expect(this.popupMessage).toContainText(expectedText);

    if (button === 'OK') {
      await this.elementActions.click(this.okButton, 'Popup OK');
    } else {
      await this.elementActions.click(this.yesButton, 'Popup Yes');
    }
  }

  protected async resolveSearchInput(): Promise<Locator> {
    const candidates = [
      this.page.locator('#customerList').getByPlaceholder('Search').first(),
      this.page.getByPlaceholder('Search').first(),
      this.page.locator("#customerList input[placeholder='Search']").first(),
      this.page.locator('#customerList input').first()
    ];

    for (const candidate of candidates) {
      if ((await candidate.count()) === 0) continue;
      await candidate.waitFor({ state: 'visible', timeout: 10000 });
      return candidate;
    }

    throw new Error('Search input not found');
  }

  protected async ensureActiveOff(): Promise<void> {
    if ((await this.activeSwitch.count()) === 0) return;

    if (await this.activeSwitch.isChecked()) {
      logger.info('Active ON → turning OFF');
      await this.elementActions.click(this.activeSwitch, 'Deactivate switch');
    }
  }

  async deleteOne(searchText: string): Promise<boolean> {
    const searchInput = await this.resolveSearchInput();

    await this.elementActions.click(searchInput, 'Search');
    await searchInput.fill('');
    await searchInput.type(searchText);
    await searchInput.press('Enter');

    await Promise.race([
      this.page.waitForSelector('#customerList tbody tr'),
      this.page.waitForSelector('h5:has-text("No Record Found")')
    ]);

    const row = this.page.locator('#customerList tbody tr')
      .filter({ hasText: searchText })
      .first();

    if ((await row.count()) === 0) return false;

    await row.locator('.bx-edit-alt').first().click();

    await this.ensureActiveOff();

    await this.elementActions.click(this.updateButton, 'Update');
    await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');

    await this.elementActions.click(this.deleteButton, 'Delete');
    await this.expectAndConfirmPopup('Do you want to delete the selected record?', 'Yes');
    await this.expectAndConfirmPopup('Data Deleted Successfully.', 'OK');

    return true;
  }

  async deleteAll(searchText: string) {
    while (await this.deleteOne(searchText)) { }
  }

  async runCrudFlow(dataList: any[], searchText: string) {
    await this.openPage();

    if (dataList.length === 0) return;

    // First
    await this.elementActions.click(this.addButton, 'Add');
    await this.fillForm(dataList[0]);
    await this.elementActions.click(this.saveButton, 'Save');
    await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');

    // Second
    if (dataList.length > 1) {
      await this.elementActions.click(this.addButton, 'Add');
      await this.fillForm(dataList[1]);
      await this.elementActions.click(this.saveAndAddNewButton, 'Save & Add New');
      await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');
    }

    // Third+
    for (let i = 2; i < dataList.length; i++) {
      await this.fillForm(dataList[i]);
      await this.elementActions.click(this.saveButton, 'Save');
      await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');

      if (i < dataList.length - 1) {
        await this.elementActions.click(this.addButton, 'Add');
      }
    }

    await this.deleteAll(searchText);
  }
}