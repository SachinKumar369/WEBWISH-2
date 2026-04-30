import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class DepartmentCreateDeletePage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ================= PAGE FACTORY LOCATORS ================= */
  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: ' Parameter Setup' });
  private readonly cashieringParametersLink = this.page.getByRole('link', { name: ' Cashiering Parameters' });
  private readonly departmentLink = this.page.getByRole('link', { name: ' Department' });

  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });

  private readonly popupMessage = this.page.locator('#swal2-html-container');
  private readonly tableRows = this.page.locator('#customerList tbody tr');
  private readonly nextButton = this.page.locator('li.page-item >> a[aria-label="Next"]');

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  private getActiveModal(): Locator {
    return this.page.locator('ngb-modal-window').last();
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

    throw new Error('Department search input not found in list view');
  }

  private async expectPopupAndConfirm(expectedText: string, confirmLabel: 'OK' | 'Yes'): Promise<void> {
    await expect(this.popupMessage).toContainText(expectedText);

    if (confirmLabel === 'OK') {
      await this.elementActions.click(this.okButton, 'Popup OK button');
      return;
    }

    await this.elementActions.click(this.yesButton, 'Popup Yes button');
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
      await this.elementActions.click(candidate, 'Add Department button');
      return;
    }

    throw new Error('Add Department button not found');
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
      await this.elementActions.click(candidate, 'Edit Department row button');
      return;
    }

    throw new Error('Edit Department row button not found');
  }

  private async ensureActiveOff(): Promise<void> {
    const activeInput = this.page.locator('#actv').first();

    if (await activeInput.count()) {
      const isChecked = await activeInput.isChecked();
      if (isChecked) {
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

  private async getCodeAndPrintSeqFromRow(rowIndex: number): Promise<{ code: string; printSeqNo: string }> {
    const row = this.tableRows.nth(rowIndex);
    const codeCell = row.locator('td').nth(1);
    const printSeqCell = row.locator('td').nth(3);

    const code = ((await codeCell.textContent()) || '').trim();
    const printSeqNo = ((await printSeqCell.textContent()) || '').trim();

    if (!code) {
      throw new Error(`Unable to read Department code from row ${rowIndex + 1}`);
    }

    if (!printSeqNo) {
      throw new Error(`Unable to read Department print seq no from row ${rowIndex + 1}`);
    }

    return { code, printSeqNo };
  }

  private async collectExistingDepartmentDataAcrossPages(): Promise<{ codes: Set<string>; printSeqNos: Set<string> }> {
    const codes = new Set<string>();
    const printSeqNos = new Set<string>();

    await expect(this.tableRows.first()).toBeVisible();

    while (true) {
      const rowCount = await this.tableRows.count();

      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const rowData = await this.getCodeAndPrintSeqFromRow(rowIndex);
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

  private generateUniqueDepartmentCode(existingCodes: Set<string>): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let i = 0; i < 200; i += 1) {
      const first = letters[Math.floor(Math.random() * letters.length)];
      const second = letters[Math.floor(Math.random() * letters.length)];
      const candidate = `${first}${second}`;

      if (!existingCodes.has(candidate)) {
        return candidate;
      }
    }

    return `D${Date.now().toString().slice(-3)}`;
  }

  private generateUniquePrintSeqNo(existingPrintSeqNos: Set<string>): string {
    const existingNumbers = Array.from(existingPrintSeqNos)
      .map((n) => Number(n))
      .filter((n) => !isNaN(n) && n >= 0 && n <= 999);

    let nextValue = existingNumbers.length ? Math.max(...existingNumbers) + 1 : 1;

    if (nextValue > 999) {
      nextValue = 1;
    }

    while (existingPrintSeqNos.has(String(nextValue))) {
      nextValue += 1;
      if (nextValue > 999) {
        nextValue = 1;
      }
    }

    return String(nextValue);
  }

  private async selectDepartmentTypeByArrowDown(arrowDownCount: number = 2): Promise<void> {
    const modal = this.getActiveModal();

    const triggerCandidates = [
      modal.locator('div').filter({ hasText: /^--select--$/ }).first(),
      modal.getByRole('combobox').first(),
      modal.locator('ng-select').first()
    ];

    let selected = false;
    for (const trigger of triggerCandidates) {
      if ((await trigger.count()) === 0) {
        continue;
      }

      await this.elementActions.click(trigger, 'Department type dropdown');
      selected = true;
      break;
    }

    if (!selected) {
      throw new Error('Department type dropdown not found in Department modal');
    }

    const comboInput = modal.getByRole('combobox').getByRole('textbox').first();
    await expect(comboInput).toBeVisible();

    for (let i = 0; i < arrowDownCount; i += 1) {
      await comboInput.press('ArrowDown');
    }

    await comboInput.press('Enter');
  }

  async openDepartmentPage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Cashiering Parameters > Department');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup link');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup link');
    await this.elementActions.click(this.cashieringParametersLink, 'Cashiering Parameters link');
    await this.elementActions.click(this.departmentLink, 'Department link');
  }

  async createDepartment(code: string, printSeqNo: string, description: string): Promise<void> {
    logger.info(`Creating Department with code: ${code}, print seq no: ${printSeqNo}`);

    await this.clickToolbarAddButton();

    const modal = this.getActiveModal();
    const codeInput = modal.getByRole('textbox', { name: 'Enter Code' });
    const descriptionInput = modal.getByRole('textbox', { name: 'Enter Description' });
    const printSeqInput = modal.locator('webwish-input').getByRole('textbox').first();

    await this.elementActions.click(codeInput, 'Department code input');
    await this.elementActions.sendKeys(codeInput, code, 'Department code value');

    await this.selectDepartmentTypeByArrowDown(3);

    await this.elementActions.click(descriptionInput, 'Department description input');
    await this.elementActions.sendKeys(descriptionInput, description, 'Department description value');

    await this.elementActions.click(printSeqInput, 'Department print seq no input');
    await this.elementActions.sendKeys(printSeqInput, printSeqNo, 'Department print seq no value');

    await this.elementActions.click(modal.getByRole('button', { name: 'Save', exact: true }), 'Save Department button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');
  }

  async searchDepartment(searchText: string): Promise<void> {
    const searchInput = await this.resolveSearchInput();
    await this.elementActions.click(searchInput, 'Department search input');
    await searchInput.fill('');
    await searchInput.fill(searchText);

    await expect(this.page.locator('#customerList tbody tr').filter({ hasText: new RegExp(searchText, 'i') }).first()).toBeVisible();
  }

  async deactivateAndDeleteFirstMatch(searchText: string): Promise<void> {
    await this.searchDepartment(searchText);

    const row = this.page.locator('#customerList tbody tr').filter({ hasText: new RegExp(searchText, 'i') }).first();
    await this.clickRowEditButton(row);

    await this.ensureActiveOff();
    await this.elementActions.click(this.updateButton, 'Update Department button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');

    await this.elementActions.click(this.deleteButton, 'Delete Department button');
    await this.expectPopupAndConfirm('Do you want to delete the selected record?', 'Yes');
    await this.expectPopupAndConfirm('Data Deleted Successfully.', 'OK');
  }

  async deactivateAndDeleteAllMatches(searchText: string = 'automation'): Promise<void> {
    logger.info(`Deleting all Department records matching description text: ${searchText}`);

    let loops = 0;
    while (loops < 100) {
      loops += 1;

      const searchInput = await this.resolveSearchInput();
      await this.elementActions.click(searchInput, 'Department search input');
      await searchInput.fill('');
      await searchInput.fill(searchText);

      const rows = this.page.locator('#customerList tbody tr').filter({ hasText: new RegExp(searchText, 'i') });
      if ((await rows.count()) === 0) {
        logger.info('No more matching Department records found');
        break;
      }

      const row = rows.first();
      await this.clickRowEditButton(row);

      await this.ensureActiveOff();
      await this.elementActions.click(this.updateButton, 'Update Department button');
      await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');

      await this.elementActions.click(this.deleteButton, 'Delete Department button');
      await this.expectPopupAndConfirm('Do you want to delete the selected record?', 'Yes');
      await this.expectPopupAndConfirm('Data Deleted Successfully.', 'OK');
    }

    if (loops >= 100) {
      throw new Error('Stopped after 100 delete attempts to avoid an infinite loop.');
    }
  }

  async runDepartmentCreateDeleteFlowWithUniqueness(): Promise<void> {
    await this.openDepartmentPage();
    logger.info('Scanning all Department pages to avoid duplicate code and print seq no');

    const existingData = await this.collectExistingDepartmentDataAcrossPages();
    const code = this.generateUniqueDepartmentCode(existingData.codes);
    const printSeqNo = this.generateUniquePrintSeqNo(existingData.printSeqNos);
    const description = `AUTOMATION DEPARTMENT ${code}`;

    await this.createDepartment(code, printSeqNo, description);
    await this.deactivateAndDeleteAllMatches('automation');
  }
}
