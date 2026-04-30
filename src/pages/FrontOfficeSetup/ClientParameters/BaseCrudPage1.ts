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


 

// generateUniqueCode(): string {
//   return randomUUID().replace(/-/g, '').substring(0, 8);
// }


  // ===== ABSTRACT METHODS (must be implemented) =====
  protected abstract fillForm(data: any): Promise<void>;
  protected abstract openPage(): Promise<void>;
  protected abstract getSearchKeyword(data: any): string;

  // ===== COMMON UTILITIES =====

//   protected generateUniqueCode(prefix = 'A'): string {
//     return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
//   }


 generateUniqueCode(): string {
    const { randomUUID } = require('crypto');
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

  protected getSearchInputCandidates(): Locator[] {
    return [
      this.page.locator('#customerList').getByPlaceholder('Search').first(),
      this.page.getByPlaceholder('Search').first(),
      this.page.locator("#customerList input[placeholder='Search']").first(),
      this.page.locator('#customerList input').first()
    ];
  }

  protected async resolveSearchInput(): Promise<Locator> {
    for (const candidate of this.getSearchInputCandidates()) {
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

  // ===== CORE CRUD OPERATIONS =====

  async create(data: any, mode: 'save' | 'saveAndNew' = 'save', retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`Create attempt ${attempt}`);

      await this.elementActions.click(this.addButton, 'Add');

      // Regenerate code on retry
      if (attempt > 1 && data.code) {
        data.code = this.generateUniqueCode();
        logger.info(`Retry with new code: ${data.code}`);
      }

      await this.fillForm(data);

      if (mode === 'save') {
        await this.elementActions.click(this.saveButton, 'Save');
      } else {
        await this.elementActions.click(this.saveAndAddNewButton, 'Save & Add New');
      }

      // Wait for popup
      await this.popupMessage.waitFor({ state: 'visible', timeout: 5000 });
      const message = await this.popupMessage.innerText();

      logger.info(`Popup message: ${message}`);

      // ✅ Detect duplicate error
      if (
        message.toLowerCase().includes('already') ||
        message.toLowerCase().includes('duplicate') ||
        message.toLowerCase().includes('exists')
      ) {
        logger.info('Duplicate detected, retrying...');
        await this.elementActions.click(this.okButton, 'Duplicate OK');
        continue;
      }

      // ✅ Success case
      await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');
      return;

    } catch (error) {
      logger.info(`Retry due to error: ${error}`);
      await this.page.waitForTimeout(1000);
    }
  }

  throw new Error('Create failed after retries due to duplicate or error');
}

  async deleteOne(searchText: string, retries = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const searchInput = await this.resolveSearchInput();

        await this.elementActions.click(searchInput, 'Search');
        await searchInput.fill('');
        await searchInput.type(searchText, { delay: 100 });
        await searchInput.press('Enter');

        await Promise.race([
          this.page.waitForSelector('#customerList tbody tr'),
          this.page.waitForSelector('h5:has-text("No Record Found")')
        ]);

        const row = this.page.locator('#customerList tbody tr')
          .filter({ hasText: searchText })
          .first();

        if ((await row.count()) === 0) {
          logger.info('No record found');
          return false;
        }

        await row.locator('.bx-edit-alt').first().click();

        await this.ensureActiveOff();

        await this.elementActions.click(this.updateButton, 'Update');
        await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');

        await this.elementActions.click(this.deleteButton, 'Delete');
        await this.expectAndConfirmPopup('Do you want to delete the selected record?', 'Yes');
        await this.expectAndConfirmPopup('Data Deleted Successfully.', 'OK');

        return true;

      } catch (error) {
        logger.info(`Retry ${attempt} due to: ${error}`);
        await this.page.waitForTimeout(1000);
      }
    }

    throw new Error('Delete failed after retries');
  }

  async deleteAll(searchText: string) {
    let count = 0;

    while (true) {
      const deleted = await this.deleteOne(searchText);
      if (!deleted) break;
      count++;
    }

    logger.info(`Total deleted: ${count}`);
  }

  // ===== FULL FLOW =====

//   async runCrudFlow(dataList: any[], searchText: string) {
//     await this.openPage();

//     await this.create(dataList[0], 'save');
//     await this.create(dataList[1], 'saveAndNew');
//     await this.create(dataList[2], 'save');

//     await this.deleteAll(searchText);
//   }


async runCrudFlow(dataList: any[], searchText: string) {
  await this.openPage();

  if (dataList.length === 0) return;

  // ===== FIRST RECORD =====
  await this.elementActions.click(this.addButton, 'Add');

  await this.fillForm(dataList[0]);
  await this.elementActions.click(this.saveButton, 'Save');
  await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');

  // ===== SECOND RECORD =====
  if (dataList.length > 1) {
    await this.elementActions.click(this.addButton, 'Add');

    await this.fillForm(dataList[1]);
    await this.elementActions.click(this.saveAndAddNewButton, 'Save & Add New');
    await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');
  }

  // ===== THIRD+ RECORDS =====
  for (let i = 2; i < dataList.length; i++) {
    // ❌ NO Add click here (form already open)

    await this.fillForm(dataList[i]);
    await this.elementActions.click(this.saveButton, 'Save');
    await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');

    // After Save → form closes → need Add again (if more records exist)
    if (i < dataList.length - 1) {
      await this.elementActions.click(this.addButton, 'Add');
    }
  }

  // ===== DELETE FLOW =====
  await this.deleteAll(searchText);
}


}