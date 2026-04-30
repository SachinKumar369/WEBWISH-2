import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

interface MealTypeRecord {
  code: string;
  description: string;
  startTime: string;
  endTime: string;
}

export class MealTypePage extends BasePage {
  private readonly actions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.actions = new ElementActions(page);
  }

  // ================= LOCATORS (UNCHANGED) =================
  private readonly frontOfficeSetupLink = this.page.locator('a').filter({ hasText: /FrontOffice Setup/i });
  private readonly parameterSetupLink = this.page.locator('a').filter({ hasText: /Parameter Setup/i });
  private readonly mealParametersLink = this.page.locator('a').filter({ hasText: /Meal Parameters/i });
  private readonly mealTypeLink = this.page.locator('a').filter({ hasText: /Meal Type/i });

  private readonly addButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
  private readonly searchInput = this.page.getByPlaceholder('Search', { exact: true });

  private readonly tableRows = this.page.locator('#customerList tbody tr');
  private readonly nextButton = this.page.locator('a[aria-label="Next"]');
  private readonly previousButton = this.page.locator('a[aria-label="Previous"]');

  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });
  private readonly popupMessage = this.page.locator('#swal2-html-container');

  // ================= MODAL =================
  private modal(): Locator {
    return this.page.locator('ngb-modal-window').last();
  }

  private mealTypeInput(): Locator {
    return this.modal().getByRole('textbox', { name: /Enter Meal Type/i });
  }

  private descriptionInput(): Locator {
    return this.modal().getByRole('textbox', { name: /Enter Description/i });
  }

  private startTimeInput(): Locator {
    return this.modal()
      .locator("xpath=.//label[contains(normalize-space(),'Start Time')]/following::input[1]")
      .first();
  }

  private endTimeInput(): Locator {
    return this.modal()
      .locator("xpath=.//label[contains(normalize-space(),'End Time')]/following::input[1]")
      .first();
  }

  private saveButton(): Locator {
    return this.modal().getByRole('button', { name: 'Save', exact: true });
  }

  private saveAndAddNewButton(): Locator {
    return this.modal().getByRole('button', { name: 'Save & Add New' });
  }

  // ================= NAVIGATION =================
  async openMealTypePage(): Promise<void> {
    logger.info('Opening Meal Type Page');

    await this.page.mouse.move(0, 300); // KEEP hover

    await this.actions.click(this.frontOfficeSetupLink, 'FrontOffice Setup link');
    await this.actions.click(this.parameterSetupLink, 'Parameter Setup link');
    await this.actions.click(this.mealParametersLink, 'Meal Parameters link');
    await this.actions.click(this.mealTypeLink, 'Meal Type link');
  }

  // ================= PAGINATION HELPERS =================
  private async isButtonDisabled(button: Locator): Promise<boolean> {
    if ((await button.count()) === 0) return true;

    const parentClass = (await button.locator('..').getAttribute('class')) || '';
    return parentClass.includes('disabled');
  }

  private async goToFirstPage(): Promise<void> {
    let guard = 0;

    while (!(await this.isButtonDisabled(this.previousButton)) && guard < 50) {
      guard++;
      await this.actions.click(this.previousButton, 'Previous Page');
      await this.page.waitForLoadState('networkidle');
    }
  }

  private async collectExistingCodes(): Promise<Set<string>> {
    const codes = new Set<string>();

    if ((await this.tableRows.count()) === 0) return codes;

    await this.goToFirstPage();

    while (true) {
      const rowCount = await this.tableRows.count();

      for (let i = 0; i < rowCount; i++) {
        const text = ((await this.tableRows.nth(i).locator('td').nth(1).textContent()) || '')
          .trim()
          .toUpperCase();

        if (text) codes.add(text);
      }

      if (await this.isButtonDisabled(this.nextButton)) break;

      await this.actions.click(this.nextButton, 'Next Page');
      await this.page.waitForLoadState('networkidle');
    }

    return codes;
  }

  // ================= DATA =================
  private generateUniqueCode(existing: Set<string>, prefix = 'A'): string {
    for (let i = 0; i < 500; i++) {
      const code = `${prefix}${Math.floor(Math.random() * 900 + 100)}`;
      if (!existing.has(code)) return code;
    }

    throw new Error('Unable to generate unique code');
  }

  private buildRecords(existing: Set<string>, description: string): MealTypeRecord[] {
    const templates = [
      { startTime: '0100A', endTime: '500P' },
      { startTime: '11:11:AM', endTime: '11:12:PM' },
      { startTime: '11:14:AM', endTime: '11:16:PM' }
    ];

    return templates.map(template => {
      const code = this.generateUniqueCode(existing);
      existing.add(code);

      return { code, description, ...template };
    });
  }

  // ================= FORM =================
  private async fillForm(record: MealTypeRecord): Promise<void> {
    await this.actions.sendKeys(this.mealTypeInput(), record.code, 'Meal Type input');
    await this.actions.sendKeys(this.descriptionInput(), record.description, 'Description input');
    await this.actions.sendKeys(this.startTimeInput(), record.startTime, 'Start Time input');
    await this.actions.sendKeys(this.endTimeInput(), record.endTime, 'End Time input');
    await this.actions.click(this.okButton, 'OK Button to close any open popup');
  }

  private async handlePopup(expected: string[], action: 'OK' | 'Yes'): Promise<void> {
    await this.popupMessage.waitFor({ state: 'visible', timeout: 10000 });

    const text = ((await this.popupMessage.innerText()) || '').toLowerCase();

    if (!expected.some(msg => text.includes(msg.toLowerCase()))) {
      logger.warn(`Unexpected popup message: ${text}`);
    }

    if (action === 'OK') {
      await this.actions.click(this.okButton, 'OK Button');
    } else {
      await this.actions.click(this.yesButton, 'Yes Button');
    }
  }

  private rowByText(text: string): Locator {
    return this.tableRows.filter({ hasText: new RegExp(text, 'i') });
  }

  // ================= ACTIONS =================
  async createMealType(record: MealTypeRecord, mode: 'Save' | 'Save & Add New'): Promise<void> {
    await this.actions.click(this.addButton, 'Add Button');

    await this.fillForm(record);

    if (mode === 'Save & Add New') {
      await this.actions.click(this.saveAndAddNewButton(), 'Save & Add New');
    } else {
      await this.actions.click(this.saveButton(), 'Save');
    }

    await this.handlePopup(['details created/updated successfully', 'success'], 'OK');
  }

  async createMealTypeInOpenModal(record: MealTypeRecord): Promise<void> {
    await this.fillForm(record);
    
    await this.actions.click(this.saveButton(), 'Save');
    await this.handlePopup(['details created/updated successfully', 'success'], 'OK');
  }

  async searchMealType(text: string): Promise<void> {
    await this.actions.click(this.searchInput, 'Search Input');
    await this.searchInput.fill('');
    await this.searchInput.fill(text);
  }

  async deactivateAndDeleteFirstMatch(text: string): Promise<void> {
    await this.searchMealType(text);

    const row = this.rowByText(text).first();
    await expect(row).toBeVisible();

    await this.actions.click(row.locator('.bx.bx-edit-alt').first(), 'Edit Button');

    const toggle = this.page.getByRole('switch', { name: 'Active' });
    if ((await toggle.count()) > 0 && (await toggle.isChecked())) {
      await toggle.uncheck();
    }

    await this.actions.click(this.updateButton, 'Update Button');
    await this.handlePopup(['success'], 'OK');

    await this.actions.click(this.deleteButton, 'Delete Button');
    await this.handlePopup(['confirm', 'delete'], 'Yes');
    await this.handlePopup(['success', 'deleted'], 'OK');
  }

  async deleteAllAutomationMealTypes(text = 'automation'): Promise<void> {
    let loop = 0;

    while (loop < 50) {
      loop++;

      await this.searchMealType(text);

      if ((await this.rowByText(text).count()) === 0) {
        logger.info('No more records found');
        break;
      }

      await this.deactivateAndDeleteFirstMatch(text);
      await this.page.waitForTimeout(400);
    }
  }

  // ================= MAIN FLOW =================
  async runMealTypeCreateUpdateDeleteFlow(searchText = 'automation'): Promise<string[]> {
    await this.openMealTypePage();

    const existing = await this.collectExistingCodes();
    const records = this.buildRecords(existing, searchText);

    await this.createMealType(records[0], 'Save');
    await this.createMealType(records[1], 'Save & Add New');
    await this.createMealTypeInOpenModal(records[2]);

    await this.deactivateAndDeleteFirstMatch(searchText);
    await this.deleteAllAutomationMealTypes(searchText);

    return records.map(r => r.code);
  }
}