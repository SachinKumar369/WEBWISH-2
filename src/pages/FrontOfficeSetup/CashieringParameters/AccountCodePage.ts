import { expect, BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class AccountCodePage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ================= PAGE FACTORY LOCATORS ================= */
  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: ' Parameter Setup' });
  private readonly cashieringParametersLink = this.page.getByRole('link', { name: ' Cashiering Parameters' });
  private readonly accountCodeLink = this.page.getByRole('link', { name: ' Account Code' });

  private readonly addButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
  private readonly codeInput = this.page.getByRole('textbox', { name: 'Enter Code' });
  private readonly descriptionInput = this.page.getByRole('textbox', { name: 'Enter Description' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });

  private readonly searchInput = this.page.locator('#customerList').getByRole('textbox', { name: 'Search' });
  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });

  private readonly popupMessage = this.page.locator('#swal2-html-container');
  private readonly tableRows = this.page.locator('#customerList tbody tr');
  private readonly nextButton = this.page.locator('li.page-item >> a[aria-label="Next"]');
  private readonly printSeqNo = this.page.getByRole('textbox').nth(2);

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  private getValueInput() {
    return this.page
      .locator("input[placeholder='Enter Value'], input[placeholder='Enter value'], input[formcontrolname*='value' i], input[name='value']")
      .first();
  }

  private getRowsByText(text: string) {
    return this.page.locator('#customerList tbody tr').filter({ hasText: new RegExp(text, 'i') });
  }

  private async clickRowEditButton(rowLocator: ReturnType<Page['locator']>): Promise<void> {
    const editCandidates = [
      rowLocator.locator("xpath=.//i[contains(@class,'edit') or contains(@class,'pencil') or contains(@class,'bx-edit-alt')]").first(),
      rowLocator.locator("xpath=.//button[.//i[contains(@class,'edit') or contains(@class,'pencil') or contains(@class,'bx-edit-alt')]]").first(),
      rowLocator.locator('.bx.bx-edit-alt').first(),
      rowLocator.locator('i').first()
    ];

    for (const candidate of editCandidates) {
      if ((await candidate.count()) === 0) {
        continue;
      }
      await candidate.scrollIntoViewIfNeeded();
      await this.elementActions.click(candidate, 'Edit Account Code row button');
      return;
    }

    throw new Error('Edit Account Code row button not found for matching row');
  }

  private async expectPopupAndConfirm(expectedText: string, confirmLabel: 'OK' | 'Yes'): Promise<void> {
    await expect(this.popupMessage).toContainText(expectedText);

    if (confirmLabel === 'OK') {
      await this.elementActions.click(this.okButton, 'Popup OK button');
      return;
    }

    await this.elementActions.click(this.yesButton, 'Popup Yes button');
  }

//   private async ensureActiveOff(): Promise<void> {
//     const activeSwitch = this.page.getByRole('switch', { name: /Active/i }).first();
//     if (await activeSwitch.count()) {
//       const checked = await activeSwitch.getAttribute('aria-checked');
//       if (checked === 'true') {
//         await this.elementActions.click(activeSwitch, 'Active switch off');
//       }
//       return;
//     }



private async ensureActiveOff(): Promise<void> {
  const activeSwitch = this.page.locator('#actv');

  if (await activeSwitch.count() > 0) {
    const isChecked = await activeSwitch.isChecked();

    if (isChecked) {
      await this.elementActions.click(activeSwitch, 'Active switch off');
    }
  }




    const activeCheckbox = this.page
      .locator("input#actv[type='checkbox'], input[type='checkbox'][formcontrolname*='active' i], input[type='checkbox'][name*='active' i]")
      .first();

    if (await activeCheckbox.count()) {
      if (await activeCheckbox.isChecked()) {
        await activeCheckbox.uncheck();
      }
    }
  }

  private generateUniqueCode(prefix: string = 'X'): string {
    return `${prefix}${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  private generateUniqueCodeFromSet(existingCodes: Set<string>, prefix: string = 'X'): string {
    let candidate = this.generateUniqueCode(prefix);

    while (existingCodes.has(candidate)) {
      candidate = this.generateUniqueCode(prefix);
    }

    return candidate;
  }

//   private generateUniquePrintSeqNo(existingPrintSeqNos: Set<string>): string {
//     let candidate = String(Date.now()).slice(-3);
//     //.padStart(3, '0');
//     let nextValue = Number(candidate);

//     while (existingPrintSeqNos.has(candidate)) {
//       nextValue = (nextValue + 1) % 1000;
//       candidate = String(nextValue);
//       //.padStart(3, '0');
//     }

//     return candidate;
//   }



private generateUniquePrintSeqNo(existingPrintSeqNos: Set<string>): string {
  const existingNumbers = Array.from(existingPrintSeqNos)
    .map(n => Number(n))
    .filter(n => !isNaN(n) && n >= 0 && n <= 999);

  let nextValue = existingNumbers.length
    ? Math.max(...existingNumbers) + 1
    : 1;

  // Ensure within limit (1–999)
  if (nextValue > 999) {
    nextValue = 1;
  }

  // Handle collision (very important)
  while (existingPrintSeqNos.has(String(nextValue))) {
    nextValue++;

    if (nextValue > 999) {
      nextValue = 1;
    }
  }

  return String(nextValue); // ✅ No padStart → no 022 issue
}



  private async readCodeAndPrintSeqFromRow(rowIndex: number): Promise<{ code: string; printSeqNo: string }> {
    const row = this.tableRows.nth(rowIndex);
    const codeCell = row.locator('td').nth(1);
    const printSeqCell = row.locator('td').nth(3);

    const codeHighlighted = codeCell.locator('ngb-highlight').first();
    const printSeqHighlighted = printSeqCell.locator('ngb-highlight').first();

    const code = (await codeHighlighted.count())
      ? (await codeHighlighted.innerText()).trim()
      : ((await codeCell.textContent()) || '').trim();

    const printSeqNo = (await printSeqHighlighted.count())
      ? (await printSeqHighlighted.innerText()).trim()
      : ((await printSeqCell.textContent()) || '').trim();

    if (!code) {
      throw new Error(`Unable to read Account Code from row ${rowIndex + 1}`);
    }

    if (!printSeqNo) {
      throw new Error(`Unable to read Print Seq No from row ${rowIndex + 1}`);
    }

    return { code, printSeqNo };
  }

  private async collectExistingAccountCodeDataAcrossPages(): Promise<{ codes: Set<string>; printSeqNos: Set<string> }> {
    const codes = new Set<string>();
    const printSeqNos = new Set<string>();

    await expect(this.tableRows.first()).toBeVisible();

    while (true) {
      const rowCount = await this.tableRows.count();

      for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        const rowData = await this.readCodeAndPrintSeqFromRow(rowIndex);
        codes.add(rowData.code);
        printSeqNos.add(rowData.printSeqNo);
      }

      const nextParent = this.nextButton.locator('..');
      const nextClass = (await nextParent.getAttribute('class')) || '';
      if (nextClass.includes('disabled')) {
        break;
      }

      await this.elementActions.click(this.nextButton, 'Pagination next button');
      await this.page.waitForLoadState('networkidle');
      await expect(this.tableRows.first()).toBeVisible();
    }

    return { codes, printSeqNos };
  }

  async openAccountCodePage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Cashiering Parameters > Account Code');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup link');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup link');
    await this.elementActions.click(this.cashieringParametersLink, 'Cashiering Parameters link');
    await this.elementActions.click(this.accountCodeLink, 'Account Code link');
  }

  async createAccountCode(code: string, description: string, value: string): Promise<void> {
    logger.info(`Creating Account Code: ${code}`);
    const printSeqNo = value?.trim() || this.generateUniquePrintSeqNo(new Set<string>());

    await this.elementActions.click(this.addButton, 'Add Account Code button');
    await this.elementActions.sendKeys(this.codeInput, code, 'Account Code input');
    await this.elementActions.sendKeys(this.descriptionInput, description, 'Account Code description input');

    await this.elementActions.click(this.printSeqNo, 'Print Sequence Number input');
    await this.elementActions.sendKeys(this.printSeqNo, printSeqNo, 'Print Sequence Number input');
    // const valueInput = this.getValueInput();
    // await this.elementActions.click(valueInput, 'Account Code value input');
    // await this.elementActions.sendKeys(valueInput, value, 'Account Code value');

    await this.elementActions.click(this.saveButton, 'Save Account Code button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');
  }

  async searchAccountCode(searchText: string): Promise<void> {
    await this.elementActions.click(this.searchInput, 'Account Code search input');
    await this.searchInput.fill('');
    await this.elementActions.sendKeys(this.searchInput, searchText, 'Account Code search value');

    await expect(this.getRowsByText(searchText).first()).toBeVisible();
  }

  async deactivateAndDeleteFirstMatch(searchText: string): Promise<void> {
    logger.info(`Deactivating and deleting Account Code for search: ${searchText}`);

    await this.searchAccountCode(searchText);
    const row = this.getRowsByText(searchText).first();

    await this.clickRowEditButton(row);
    await this.ensureActiveOff();

    await this.elementActions.click(this.updateButton, 'Update Account Code button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');

    await this.elementActions.click(this.deleteButton, 'Delete Account Code button');
    await this.expectPopupAndConfirm('Do you want to delete the selected record?', 'Yes');
    await this.expectPopupAndConfirm('Data Deleted Successfully.', 'OK');
  }

  async deleteAllAutomationAccountCodes(searchText: string = 'automation'): Promise<void> {
    logger.info(`Deleting all Account Code records matching description text: ${searchText}`);

    let loops = 0;
    while (loops < 100) {
      loops += 1;

      await this.elementActions.click(this.searchInput, 'Account Code search input');
      await this.searchInput.fill('');
      await this.searchInput.fill(searchText);

      const rows = this.getRowsByText(searchText);
      if ((await rows.count()) === 0) {
        logger.info('No more matching Account Code records found');
        break;
      }

      const row = rows.first();
      await this.clickRowEditButton(row);

      await this.ensureActiveOff();
      await this.elementActions.click(this.updateButton, 'Update Account Code button');
      await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');

      await this.elementActions.click(this.deleteButton, 'Delete Account Code button');
      await this.expectPopupAndConfirm('Do you want to delete the selected record?', 'Yes');
      await this.expectPopupAndConfirm('Data Deleted Successfully.', 'OK');
    }

    if (loops >= 100) {
      throw new Error('Stopped after 100 delete attempts to avoid an infinite loop.');
    }
  }

  async runAccountCodeCreateDeleteFlow(): Promise<void> {
    await this.openAccountCodePage();
    logger.info('Scanning all available Account Code pages before creating a new record');

    const existingData = await this.collectExistingAccountCodeDataAcrossPages();
    const code = this.generateUniqueCodeFromSet(existingData.codes, 'X');
    const printSeqNo = this.generateUniquePrintSeqNo(existingData.printSeqNos);
    const description = `AUTOMATION ACCOUNT CODE ${code}`;
    await this.createAccountCode(code, description, printSeqNo);
    await this.deactivateAndDeleteFirstMatch(code);
  }
}
