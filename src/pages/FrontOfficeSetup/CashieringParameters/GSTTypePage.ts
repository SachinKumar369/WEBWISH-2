import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class GSTTypePage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: ' Parameter Setup' });
  private readonly cashieringParametersLink = this.page.getByRole('link', { name: ' Cashiering Parameters' });
  private readonly gstTypeLink = this.page.getByRole('link', { name: ' GST Type' });

  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });
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
      this.page.getByPlaceholder('Search', { exact: true }).first(),
      this.page.locator("#customerList input[placeholder='Search']").first()
    ];
  }

  private async resolveSearchInput(): Promise<Locator> {
    for (const candidate of this.getSearchCandidates()) {
      if ((await candidate.count()) === 0) continue;
      await candidate.waitFor({ state: 'visible', timeout: 10000 });
      return candidate;
    }
    throw new Error('GST Type search input not found');
  }

  private getRowsByText(text: string): Locator {
    return this.page.locator('#customerList tbody tr').filter({ hasText: new RegExp(text, 'i') });
  }

  private async clickToolbarAddButton(): Promise<void> {
    const btn = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
    await btn.scrollIntoViewIfNeeded();
    await this.elementActions.click(btn, 'Add GST Type button');
  }

  private async clickRowEditButton(rowLocator: Locator): Promise<void> {
    const editBtn = rowLocator.locator('.bx-edit-alt').first();
    await editBtn.scrollIntoViewIfNeeded();
    await this.elementActions.click(editBtn, 'Edit GST Type row button');
  }

  private async expectPopupAndConfirm(expectedText: string, confirmLabel: 'OK' | 'Yes'): Promise<void> {
    await expect(this.popupMessage).toContainText(expectedText);

    if (confirmLabel === 'OK') {
      await this.elementActions.click(this.okButton, 'Popup OK button');
    } else {
      await this.elementActions.click(this.yesButton, 'Popup Yes button');
    }
  }

  async openGSTTypePage(): Promise<void> {
    logger.info('Opening GST Type Page');

    await this.page.mouse.move(0, 300); // ✅ PRESERVED
    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup link');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup link');
    await this.elementActions.click(this.cashieringParametersLink, 'Cashiering Parameters link');
    await this.elementActions.click(this.gstTypeLink, 'GST Type link');
  }

  // ================================
  // 🔥 FIXED: GET ALL GST TYPES
  // ================================
async getAllGSTTypes(): Promise<Set<string>> {
  const gstSet = new Set<string>();

  // ✅ STEP 1: Clear search
  const searchInputs = this.getSearchCandidates();
  for (const input of searchInputs) {
    if ((await input.count()) > 0) {
      await input.fill('');
      await input.press('Enter'); // 🔥 force refresh
      break;
    }
  }

  // ✅ STEP 2: FORCE go to first page
  const firstBtn = this.page.locator('a[aria-label="First"]');

  if (await firstBtn.count() > 0) {
    await this.elementActions.click(firstBtn, 'Pagination First button');
  }

  // 🔥 CRITICAL: Wait for table reload (NOT just networkidle)
  await this.page.waitForSelector('#customerList tbody tr');

  // 🔥 EXTRA SAFETY: wait for DOM stabilization
  await this.page.waitForTimeout(1000);

  // ✅ STEP 3: Iterate ALL pages
  while (true) {
    const rows = this.page.locator('#customerList tbody tr');
    const count = await rows.count();

    logger.info(`Rows found on current page: ${count}`);

    for (let i = 0; i < count; i++) {
      const gst = await rows.nth(i).locator('td').nth(1).innerText();
      gstSet.add(gst.trim());
    }

    const nextBtn = this.page.locator('a[aria-label="Next"]');
    const parentClass = await nextBtn.locator('xpath=ancestor::li').getAttribute('class');

    if (parentClass?.includes('disabled')) break;

    await this.elementActions.click(nextBtn, 'Pagination Next button');

    // 🔥 Wait for new page data
    await this.page.waitForSelector('#customerList tbody tr');
    await this.page.waitForTimeout(800);
  }

  // ✅ DEBUG LOG
  logger.info('========= GST DATA =========');
  gstSet.forEach(code => logger.info(code));
  logger.info(`TOTAL GST COUNT: ${gstSet.size}`);

  return gstSet;
}

  // ================================
  // 🔥 FIXED: UNIQUE GENERATOR
  // ================================
  generateUniqueGST(existingGST: Set<string>): string {
    let max = 0;

    existingGST.forEach(code => {
      const match = code.match(/^A(\d+)$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > max) max = num;
      }
    });

    return `A${max + 1}`;
  }

  async createGSTType(code: string, description: string, saveAndAddNew = false, openCreateForm = true): Promise<void> {
    if (openCreateForm) {
      await this.clickToolbarAddButton();
    }

    const modal = this.getActiveModal();

    const codeInput = modal.getByRole('textbox', { name: 'Enter Code' });
    const descInput = modal.getByRole('textbox', { name: 'Enter Description' });

    await this.elementActions.click(codeInput, 'GST Code input');
    await this.elementActions.sendKeys(codeInput, code, 'GST Code value');

    await this.elementActions.click(descInput, 'GST Desc input');
    await this.elementActions.sendKeys(descInput, description, 'GST Desc value');

    const saveBtn = saveAndAddNew
      ? modal.getByRole('button', { name: 'Save & Add New' })
      : modal.getByRole('button', { name: 'Save', exact: true });

    await this.elementActions.click(saveBtn, 'Save GST');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');
  }

  async searchGSTType(text: string): Promise<number> {
  const input = await this.resolveSearchInput();

  await input.fill('');
  await input.fill(text);

  // Wait for table or empty state
  await this.page.waitForSelector('#customerList');

  const rows = this.getRowsByText(text);
  const count = await rows.count();

  const noRecord = this.page.locator('h5:has-text("No Record Found")');

  if (count === 0) {
    if (await noRecord.isVisible()) {
      logger.info(`Search "${text}" → No Record Found (UI confirmed)`);
    } else {
      logger.warn(`Search "${text}" → 0 rows but no empty state message`);
    }
  } else {
    logger.info(`Search "${text}" → Rows found: ${count}`);
  }

  return count;
}
  // ================================
  // 🔥 DELETE ALL + VALIDATION
  // ================================
async deleteAllMatchingGSTTypes(text: string): Promise<void> {
  let totalDeleted = 0;

  while (true) {
    await this.searchGSTType(text);

    let count = await this.getRowsByText(text).count();

    if (count === 0) break;

    // 🔥 Always re-fetch fresh row (NO stale reference)
    const row = this.getRowsByText(text).first();

    await this.clickRowEditButton(row);
    await this.elementActions.click(this.deleteButton, 'Delete GST');

    await this.expectPopupAndConfirm('Do you want to delete the selected record?', 'Yes');
    await this.expectPopupAndConfirm('Data Deleted Successfully.', 'OK');

    totalDeleted++;

    // 🔥 Wait for table refresh properly
    await this.page.waitForSelector('#customerList tbody tr');
    await this.page.waitForTimeout(800);
  }

  logger.info(`Total Deleted: ${totalDeleted}`);

  // Final validation
  await this.searchGSTType(text);
  const remaining = await this.getRowsByText(text).count();
  expect(remaining).toBe(0);
}

  // ================================
  // 🔥 MAIN FLOW (UNCHANGED)
  // ================================
  async runGSTTypeCreateDeleteFlow(): Promise<void> {
    await this.openGSTTypePage();

    const existingGST = await this.getAllGSTTypes();

    const code1 = this.generateUniqueGST(existingGST);
    existingGST.add(code1);

    const code2 = this.generateUniqueGST(existingGST);
    existingGST.add(code2);

    const code3 = this.generateUniqueGST(existingGST);

    await this.createGSTType(code1, 'aUTOMATION', false);
    await this.createGSTType(code2, 'AUTOMATION', true);
    await this.createGSTType(code3, 'AUTOMATION 123', false, false);

    await this.deleteAllMatchingGSTTypes('AUTOMATION');
  }
}