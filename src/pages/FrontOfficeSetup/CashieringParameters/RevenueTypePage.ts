import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class RevenueTypePage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: ' Parameter Setup' });
  private readonly cashieringParametersLink = this.page.getByRole('link', { name: ' Cashiering Parameters' });
  private readonly revenueTypeLink = this.page.getByRole('link', { name: /Revenue Type/i });

  private readonly addButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
  private readonly codeInput = this.page.getByRole('textbox', { name: 'Enter Code' }).first();
  private readonly descriptionInput = this.page.getByRole('textbox', { name: 'Enter Description' }).first();
  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
  private readonly saveAndAddNewButton = this.page.getByRole('button', { name: 'Save & Add New' });
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });
  private readonly activeSwitch = this.page.getByRole('switch', { name: 'Active' });

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
      return;
    }

    await this.elementActions.click(this.yesButton, 'Popup Yes button');
  }

  private async clickAdd(): Promise<void> {
    await this.elementActions.click(this.addButton, 'Add Revenue Type button');
  }

  private async fillRevenueTypeDetails(code: string, description: string): Promise<void> {
    await this.elementActions.click(this.codeInput, 'Code input');
    await this.codeInput.fill(code);

    await this.elementActions.click(this.descriptionInput, 'Description input');
    await this.descriptionInput.fill(description);
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
      if ((await candidate.count()) === 0) {
        continue;
      }

      await candidate.waitFor({ state: 'visible', timeout: 10000 });
      return candidate;
    }

    throw new Error('Revenue Type search input not found');
  }

  private async saveWithSuccess(button: Locator, description: string): Promise<void> {
    await this.elementActions.click(button, description);
    await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');
  }

  private async ensureActiveOff(): Promise<void> {
    if ((await this.activeSwitch.count()) === 0) {
      return;
    }

    if (await this.activeSwitch.isChecked()) {
      logger.info('Active ON -> turning OFF');
      await this.elementActions.click(this.activeSwitch, 'Active switch off');
    }
  }

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
      logger.info('No more revenue type records found');
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

  async openRevenueTypePage(): Promise<void> {
    logger.info('Opening Revenue Type Page');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup');
    await this.elementActions.click(this.cashieringParametersLink, 'Cashiering Parameters');
    await this.elementActions.click(this.revenueTypeLink, 'Revenue Type');
  }

  private async collectAllCodesAcrossPages(): Promise<Set<string>> {
    const codes = new Set<string>();
    const searchInput = await this.resolveSearchInput();

    await this.elementActions.click(searchInput, 'Search input');
    await searchInput.fill('');
    await searchInput.press('Enter');

    if ((await this.firstPageButton.count()) > 0) {
      const firstParentClass = await this.firstPageButton.locator('xpath=ancestor::li').getAttribute('class');
      if (!firstParentClass?.includes('disabled')) {
        await this.elementActions.click(this.firstPageButton, 'First page');
        await this.page.waitForLoadState('networkidle');
      }
    }

    while (true) {
      const rows = this.page.locator('#customerList tbody tr');
      const rowCount = await rows.count();

      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const code = await rows.nth(rowIndex).locator('td').nth(1).innerText();
        codes.add(code.trim());
      }

      if ((await this.nextPageButton.count()) === 0) {
        break;
      }

      const nextParentClass = await this.nextPageButton.locator('xpath=ancestor::li').getAttribute('class');
      if (nextParentClass?.includes('disabled')) {
        break;
      }

      await this.elementActions.click(this.nextPageButton, 'Next page');
      await this.page.waitForLoadState('networkidle');
    }

    return codes;
  }

  private generateUniqueCode(existingCodes: Set<string>): string {
    let max = 0;

    existingCodes.forEach(code => {
      const match = code.match(/^X(\d+)$/i);
      if (match) {
        const value = Number.parseInt(match[1], 10);
        if (value > max) {
          max = value;
        }
      }
    });

    return `X${max + 1}`;
  }

  async runRevenueTypeCreateDeleteFlow(): Promise<void> {
    await this.openRevenueTypePage();

    const existingCodes = await this.collectAllCodesAcrossPages();

    const code1 = this.generateUniqueCode(existingCodes);
    existingCodes.add(code1);

    const code2 = this.generateUniqueCode(existingCodes);
    existingCodes.add(code2);

    const code3 = this.generateUniqueCode(existingCodes);

    await this.clickAdd();
    await this.fillRevenueTypeDetails(code1, 'automation');
    await this.saveWithSuccess(this.saveButton, 'Save');

    await this.clickAdd();
    await this.fillRevenueTypeDetails(code2, 'automation');
    await this.saveWithSuccess(this.saveAndAddNewButton, 'Save & Add New');

    await this.fillRevenueTypeDetails(code3, 'automation');
    await this.saveWithSuccess(this.saveButton, 'Save');

    let totalDeleted = 0;
    while (true) {
      const deleted = await this.deleteOneIfExists('automation');
      if (!deleted) {
        break;
      }
      totalDeleted += 1;
    }

    logger.info(`Total automation revenue type records deleted: ${totalDeleted}`);
  }
}