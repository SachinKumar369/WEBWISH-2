import { expect, BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class PublicAreaPage extends BasePage {
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
        "(//h3[contains(normalize-space(),'Public Area')]/following::button)[1]",
        "(//input[@placeholder='Search']/ancestor::div[1]/preceding::button)[1]",
        "//button[.//text()[normalize-space()='󰐗']]"
      ],
      'Add Public Area button'
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
      await this.elementActions.click(candidate, 'Edit Public Area row button');
      return;
    }

    throw new Error('Edit Public Area row button not found for matching row');
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

  private async getFirstAvailableCode(): Promise<string> {
    const firstRow = this.page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    const cells = await firstRow.locator('td').allTextContents();
    const code = cells.map((value) => value.trim()).find((value) => value.length > 0);

    if (!code) {
      throw new Error('Unable to find a public area code in the first row.');
    }

    return code;
  }

  private generatePublicAreaCode(prefix: string = 'A'): string {
    const randomPart = Math.floor(Math.random() * 900 + 100).toString();
    const candidate = `${prefix}${randomPart}`;
    logger.info(`Using unique Public Area code: ${candidate}`);
    return candidate;
  }

  async openPublicAreaPage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Public Area');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.page.getByRole('link', { name: ' FrontOffice Setup' }), 'FrontOffice Setup link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Parameter Setup' }), 'Parameter Setup link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Public Area' }), 'Public Area link');
  }

  async validateDuplicatePublicAreaCode(): Promise<void> {
    const existingCode = await this.getFirstAvailableCode();
    logger.info(`Validating Public Area duplicate code for: ${existingCode}`);

    await this.clickToolbarAddButton();

    const codeInput = this.getCodeInput();
    await this.elementActions.click(codeInput, 'Public Area code input');
    await this.elementActions.sendKeys(codeInput, existingCode, 'Public Area code value');

    const descriptionInput = this.getDescriptionInput();
    await this.elementActions.click(descriptionInput, 'Public Area description input');

    await expect(this.page.locator('#swal2-html-container')).toContainText('Code Already Exists');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Duplicate code OK button');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close Public Area modal');
  }

  async createPublicArea(code: string, description: string): Promise<void> {
    logger.info(`Creating Public Area with code: ${code}, description: ${description}`);

    await this.clickToolbarAddButton();

    const codeInput = this.getCodeInput();
    await this.elementActions.click(codeInput, 'Public Area code input');
    await this.elementActions.sendKeys(codeInput, code, 'Public Area code value');

    const descriptionInput = this.getDescriptionInput();
    await this.elementActions.click(descriptionInput, 'Public Area description input');
    await this.elementActions.sendKeys(descriptionInput, description, 'Public Area description value');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save Public Area button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');
  }

  async createPublicAreaAndAddNew(code: string, description: string): Promise<void> {
    logger.info(`Creating Public Area with code: ${code}, description: ${description} and adding new entry`);

    await this.clickToolbarAddButton();

    const codeInput = this.getCodeInput();
    await this.elementActions.click(codeInput, 'Public Area code input');
    await this.elementActions.sendKeys(codeInput, code, 'Public Area code value');

    const descriptionInput = this.getDescriptionInput();
    await this.elementActions.click(descriptionInput, 'Public Area description input');
    await this.elementActions.sendKeys(descriptionInput, description, 'Public Area description value');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save & Add New' }), 'Save & Add New Public Area button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');
  }

  async validateMandatoryFieldsEmpty(): Promise<void> {
    logger.info('Validating save without mandatory fields');

    await this.clickToolbarAddButton();
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save Public Area button without data');
    await expect(this.page.locator('#swal2-html-container')).toContainText('Please Fill All *Mandatory Fields');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Mandatory fields validation OK button');
  }

  async validateMandatoryFieldsPartial(): Promise<void> {
    logger.info('Validating save with only code field filled');

    const codeInput = this.getCodeInput();
    await this.elementActions.click(codeInput, 'Public Area code input');
    await this.elementActions.sendKeys(codeInput, '1222', 'Public Area code value');

    // First attempt to save without description - should error
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save Public Area button without description (1st attempt)');
    await expect(this.page.locator('#swal2-html-container')).toContainText('Please Fill All *Mandatory Fields');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Mandatory fields validation OK button');

    // Second attempt to save again without filling description - should error again
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save Public Area button without description (2nd attempt)');
    await expect(this.page.locator('#swal2-html-container')).toContainText('Please Fill All *Mandatory Fields');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Mandatory fields validation OK button (2nd)');
  }

  async searchPublicArea(searchText: string): Promise<void> {
    const searchInput = this.getListSearchInput();
    await this.elementActions.click(searchInput, 'Public Area search input');
    await searchInput.fill('');
    await searchInput.fill(searchText);

    const rows = this.getRowsByText(searchText);
    await expect(rows.first()).toBeVisible();
  }

  async deactivateAndDeleteFirstMatch(searchText: string): Promise<void> {
    logger.info(`Deactivating and deleting Public Area for search: ${searchText}`);

    await this.searchPublicArea(searchText);
    const row = this.getRowsByText(searchText).first();
    await this.clickRowEditButton(row);

    await this.ensureActiveOff();
    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update Public Area button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Delete' }), 'Delete Public Area button');
    await this.expectPopupAndConfirm('Do you want to delete the selected record?', 'Yes');
    await this.expectPopupAndConfirm('Data Deleted Successfully.', 'OK');
  }

  async runPublicAreaCreateDeleteFlow(): Promise<void> {
    const code = this.generatePublicAreaCode('A');
    const description = `AUTOMATION PUBLIC AREA ${code}`;

    await this.openPublicAreaPage();
    await this.createPublicArea(code, description);
    await this.deactivateAndDeleteFirstMatch('automation');
  }

  async runPublicAreaSaveAndAddNewFlow(): Promise<void> {
    logger.info('Running Public Area Save & Add New flow with multiple entries');

    await this.openPublicAreaPage();

    // First entry with Save & Add New
    const code1 = this.generatePublicAreaCode('A');
    const description1 = 'automation saved description !@#$%%^&*(*&$&$&$&$&$&#*@(#(#*$';
    await this.createPublicAreaAndAddNew(code1, description1);

    // Second entry with Save & Add New
    const code2 = this.generatePublicAreaCode('A');
    const description2 = 'automation !@#$%^&*&^$#@#$%^&*()(*&^%$#@#$%^&*(*&^%$#$%^&*(*';
    await this.createPublicAreaAndAddNew(code2, description2);

    // Third entry with regular Save
    const code3 = this.generatePublicAreaCode('A');
    const description3 = 'automation adjflakdjflajdlj3o4375984508340984509809485098405';
    await this.createPublicArea(code3, description3);

    logger.info('Successfully created 3 Public Area entries with special characters');
  }

  async runPublicAreaMandatoryFieldsValidationFlow(): Promise<void> {
    logger.info('Running Public Area mandatory fields validation flow');

    await this.openPublicAreaPage();

    // Test 1: Try to save with completely empty form
    await this.validateMandatoryFieldsEmpty();

    // Test 2: Try to save with only code field filled
    await this.validateMandatoryFieldsPartial();

    // Close the modal after validation
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close Public Area modal');

    logger.info('Successfully validated mandatory fields validation');
  }}
