import { expect, BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class VisaTypePage extends BasePage {
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
        "(//h3[contains(normalize-space(),'Visa Type')]/following::button)[1]",
        "(//input[@placeholder='Search']/ancestor::div[1]/preceding::button)[1]",
        "//button[.//text()[normalize-space()='󰐗']]"
      ],
      'Add Visa Type button'
    );
  }

  private getListSearchInput() {
    return this.page.locator('input[placeholder="Search"]').first();
  }

  private getCodeInput() {
    return this.page
      .locator(
        "input[placeholder='Enter Code'], input[placeholder='Enter code'], input[placeholder*='Code'], input[name='code'], input[formcontrolname*='code' i]"
      )
      .first();
  }

  private getDescriptionInput() {
    return this.page
      .locator(
        "input[placeholder='Enter Description'], input[placeholder='Enter description'], input[placeholder*='Description'], input[name='description'], input[formcontrolname*='description' i]"
      )
      .first();
  }

  private getRows() {
    return this.page.locator('tbody tr');
  }

  private getRowsByText(text: string) {
    return this.page.locator('tbody tr').filter({ hasText: new RegExp(text, 'i') });
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
      await this.elementActions.click(candidate, 'Edit Visa Type row button');
      return;
    }

    throw new Error('Edit Visa Type row button not found for matching row');
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

  private async expectPopupAndConfirm(expectedText: string, confirmLabel: 'OK' | 'Yes'): Promise<void> {
    await expect(this.page.locator('#swal2-html-container')).toContainText(expectedText);
    await this.elementActions.click(this.page.getByRole('button', { name: confirmLabel }), `Popup ${confirmLabel} button`);
  }

  private generateVisaCode(prefix: string = 'V'): string {
    const randomPart = Math.floor(Math.random() * 900 + 100).toString();
    const candidate = `${prefix}${randomPart}`;
    logger.info(`Using unique Visa Type code: ${candidate}`);
    return candidate;
  }

  private async getFirstAvailableVisaCode(): Promise<string> {
    const firstRow = this.getRows().first();
    await expect(firstRow).toBeVisible();

    const cells = await firstRow.locator('td').allTextContents();
    const code = cells.map((value) => value.trim()).find((value) => value.length > 0);

    if (!code) {
      throw new Error('Unable to find existing Visa Type code from first row.');
    }

    return code;
  }

  async openVisaTypePage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Visa Type');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.page.getByRole('link', { name: ' FrontOffice Setup' }), 'FrontOffice Setup link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Parameter Setup' }), 'Parameter Setup link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Visa Type' }), 'Visa Type link');
  }

  async validateDuplicateVisaTypeFromFirstRecord(): Promise<void> {
    const existingCode = await this.getFirstAvailableVisaCode();
    logger.info(`Validating duplicate Visa Type code: ${existingCode}`);

    await this.clickToolbarAddButton();

    const codeInput = this.getCodeInput();
    await this.elementActions.click(codeInput, 'Visa Type code input');
    await this.elementActions.sendKeys(codeInput, existingCode, 'Visa Type duplicate code value');
    await this.page.keyboard.press('Tab');

    await expect(this.page.locator('#swal2-html-container')).toContainText('Code Already Exists');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Duplicate visa code OK button');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close duplicate Visa Type modal');
  }

  async createVisaTypeAndVerifyInSearch(): Promise<void> {
    const code = this.generateVisaCode('V');
    const description = `AUTOMATION VISA ${code}`;

    logger.info(`Creating new Visa Type with code ${code}`);
    await this.clickToolbarAddButton();

    const codeInput = this.getCodeInput();
    await this.elementActions.click(codeInput, 'Visa Type code input');
    await this.elementActions.sendKeys(codeInput, code, 'Visa Type code value');

    const descriptionInput = this.getDescriptionInput();
    await this.elementActions.click(descriptionInput, 'Visa Type description input');
    await this.elementActions.sendKeys(descriptionInput, description, 'Visa Type description value');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save Visa Type button');
    await expect(this.page.locator('#swal2-html-container')).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Save Visa Type OK button');

    const searchInput = this.getListSearchInput();
    await this.elementActions.click(searchInput, 'Visa Type search input');
    await searchInput.fill('');
    await searchInput.fill('AUTOMATION');

    await expect(this.page.locator('tbody')).toContainText('AUTOMATION');
    await expect(this.page.locator('tbody')).toContainText(code);
  }

  async searchVisaType(searchText: string): Promise<void> {
    const searchInput = this.getListSearchInput();
    await this.elementActions.click(searchInput, 'Visa Type search input');
    await searchInput.fill('');
    await searchInput.fill(searchText);

    const rows = this.getRowsByText(searchText);
    await expect(rows.first()).toBeVisible();
  }

  async deactivateAndDeleteFirstMatch(searchText: string): Promise<void> {
    logger.info(`Deactivating and deleting Visa Type for search: ${searchText}`);

    await this.searchVisaType(searchText);
    const row = this.getRowsByText(searchText).first();
    await this.clickRowEditButton(row);

    await this.ensureActiveOff();
    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update Visa Type button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Delete' }), 'Delete Visa Type button');
    await this.expectPopupAndConfirm('Do you want to delete the selected record?', 'Yes');
    await this.expectPopupAndConfirm('Data Deleted Successfully.', 'OK');
  }

  async deleteAllAutomationVisaTypes(searchText: string = 'automation'): Promise<void> {
    logger.info(`Deleting all Visa Type records matching: ${searchText}`);

    let loops = 0;
    while (loops < 50) {
      loops += 1;

      const searchInput = this.getListSearchInput();
      await this.elementActions.click(searchInput, 'Visa Type search input');
      await searchInput.fill('');
      await searchInput.fill(searchText);

      const rows = this.getRowsByText(searchText);
      if ((await rows.count()) === 0) {
        logger.info('No more matching Visa Type records found');
        break;
      }

      await this.deactivateAndDeleteFirstMatch(searchText);
    }

    if (loops >= 50) {
      throw new Error('Stopped after 50 delete attempts to avoid an infinite loop.');
    }
  }

  async runVisaTypeDuplicateThenCreateFlow(): Promise<void> {
    await this.openVisaTypePage();
    await this.validateDuplicateVisaTypeFromFirstRecord();
    await this.createVisaTypeAndVerifyInSearch();
  }

  async runVisaTypeDeleteAllAutomationFlow(searchText: string = 'automation'): Promise<void> {
    await this.openVisaTypePage();
    await this.deleteAllAutomationVisaTypes(searchText);
  }
}
