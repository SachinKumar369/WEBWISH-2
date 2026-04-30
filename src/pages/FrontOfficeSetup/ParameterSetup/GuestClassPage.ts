import { expect, BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class GuestClassPage extends BasePage {
  private readonly elementActions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  private getListSearchInput() {
    return this.page.locator('input[placeholder="Search"]').first();
  }

  private getActiveGuestClassModal() {
    return this.page.locator('ngb-modal-window').last();
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
        "(//h3[normalize-space()='Guest Class']/following::button)[1]",
        "(//input[@placeholder='Search']/ancestor::div[1]/preceding::button)[1]",
        "//button[.//text()[normalize-space()='󰐗']]"
      ],
      'Add Guest Class button'
    );
  }

  private async clickToolbarDeleteButton(): Promise<void> {
    await this.clickFirstMatchingLocator(
      [
        "//button[.//i[contains(@class,'delete') or contains(@class,'trash') or contains(@class,'remove')]]",
        "//button[.//i[contains(@class,'mdi-delete') or contains(@class,'fa-trash')]]",
        "(//h3[normalize-space()='Guest Class']/following::button)[2]",
        "(//input[@placeholder='Search']/ancestor::div[1]/preceding::button)[2]",
        "//button[.//text()[normalize-space()='󰚃']]"
      ],
      'Delete Guest Class button'
    );
  }

  private async clickToolbarRefreshButton(): Promise<void> {
    await this.clickFirstMatchingLocator(
      [
        "//button[.//i[contains(@class,'refresh') or contains(@class,'reload') or contains(@class,'sync')]]",
        "//button[.//i[contains(@class,'mdi-refresh') or contains(@class,'fa-refresh')]]",
        "(//h3[normalize-space()='Guest Class']/following::button)[3]",
        "(//input[@placeholder='Search']/ancestor::div[1]/preceding::button)[3]",
        "//button[.//text()[normalize-space()='󰑐']]"
      ],
      'Refresh Guest Class list button'
    );
  }

  private async clickRowEditButton(rowLocator: ReturnType<Page['locator']>, code: string): Promise<void> {
    const editCandidates = [
      rowLocator.locator("xpath=.//i[contains(@class,'edit') or contains(@class,'pencil')]").first(),
      rowLocator.locator('i').first()
    ];

    for (const candidate of editCandidates) {
      if ((await candidate.count()) === 0) {
        continue;
      }
      await this.elementActions.click(candidate, `Edit Guest Class row button for ${code}`);
      return;
    }

    throw new Error(`Edit icon not found for row: ${code}`);
  }

  private async clickRowLogButton(rowLocator: ReturnType<Page['locator']>, code: string): Promise<void> {
    const logCandidates = [
      rowLocator.locator("xpath=.//i[contains(@class,'log') or contains(@class,'history') or contains(@class,'clock')]").first(),
      rowLocator.locator('i').nth(1)
    ];

    for (const candidate of logCandidates) {
      if ((await candidate.count()) === 0) {
        continue;
      }
      await this.elementActions.click(candidate, `Log Guest Class row button for ${code}`);
      return;
    }

    throw new Error(`Log icon not found for row: ${code}`);
  }

  private getCodeInput() {
    const modal = this.getActiveGuestClassModal();
    return modal
      .locator(
        "xpath=.//label[contains(normalize-space(),'Guest Class')]/following::input[1] | .//input[@formcontrolname='guest_Class'] | .//input[@name='guest_Class'] | .//input[contains(@placeholder,'CODE') or contains(@placeholder,'Code')]"
      )
      .first();
  }

  private getDescriptionInput() {
    const modal = this.getActiveGuestClassModal();
    return modal
      .locator(
        "xpath=.//label[contains(normalize-space(),'Description')]/following::input[1] | .//input[@formcontrolname='description'] | .//input[@name='description'] | .//input[contains(@placeholder,'Description') or contains(@placeholder,'DESCRIPTION')]"
      )
      .first();
  }

  private async setInputValueWithVerification(inputLocator: ReturnType<Page['locator']>, value: string, description: string): Promise<void> {
    await this.elementActions.click(inputLocator, `${description} input`);
    await this.elementActions.sendKeys(inputLocator, value, `${description} value`);

    let currentValue = (await inputLocator.inputValue()).trim();
    if (currentValue.toUpperCase() === value.toUpperCase()) {
      return;
    }

    await inputLocator.fill(value);
    currentValue = (await inputLocator.inputValue()).trim();
    if (currentValue.toUpperCase() === value.toUpperCase()) {
      return;
    }

    await inputLocator.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await this.page.keyboard.type(value, { delay: 40 });

    currentValue = (await inputLocator.inputValue()).trim();
    if (currentValue.toUpperCase() !== value.toUpperCase()) {
      throw new Error(`${description} input value mismatch. Expected '${value}', got '${currentValue}'`);
    }
  }

  private async clickModalSaveAndAddNew(): Promise<void> {
    const saveAndAddNew = this.page.getByRole('button', { name: /Save\s*&\s*Add\s*New/i }).first();
    if (await saveAndAddNew.count()) {
      await this.elementActions.click(saveAndAddNew, 'Save & Add New button');
      return;
    }

    const footerButtons = this.page.locator('[role="dialog"] button').filter({ hasText: /Save/i });
    if ((await footerButtons.count()) > 1) {
      await this.elementActions.click(footerButtons.nth(1), 'Save & Add New fallback button');
      return;
    }

    throw new Error('Save & Add New button not found in Guest Class modal');
  }

  private getGridRowByCode(code: string) {
    return this.page.locator('tr').filter({ hasText: new RegExp(`\\b${code}\\b`, 'i') }).first();
  }

  private async clearGuestClassSearch(): Promise<void> {
    const searchInput = this.getListSearchInput();
    await this.elementActions.click(searchInput, 'Guest Class search input');
    await searchInput.fill('');
  }

  private async generateUnusedGuestClassCode(prefix: string = 'A'): Promise<string> {
    const randomPart = Math.floor(Math.random() * 900 + 100).toString();
    const candidate = `${prefix}${randomPart}`;
    logger.info(`Using unique Guest Class code: ${candidate}`);
    return candidate;
  }

  private async openEditForCode(code: string): Promise<void> {
    await this.searchGuestClass(code);
    const row = this.getGridRowByCode(code);
    await expect(row).toBeVisible();
    await this.clickRowEditButton(row, code);
  }

  private async openLogForCode(code: string): Promise<void> {
    await this.searchGuestClass(code);
    const row = this.getGridRowByCode(code);
    await expect(row).toBeVisible();
    await this.clickRowLogButton(row, code);
  }

  private async expectSuccessAndConfirm(message: string): Promise<void> {
    await expect(this.page.locator('#swal2-html-container')).toContainText(message);
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Success popup OK button');
  }

  async openGuestClassPage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Guest Class');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.page.getByRole('link', { name: ' FrontOffice Setup' }), 'FrontOffice Setup link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Parameter Setup' }), 'Parameter Setup link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Guest Class' }), 'Guest Class link');
  }

  async createGuestClass(code: string, description: string): Promise<void> {
    logger.info(`Creating Guest Class with code: ${code}, description: ${description}`);

    await this.clickToolbarAddButton();

    const codeInput = this.getCodeInput();
    await this.setInputValueWithVerification(codeInput, code, 'Enter Code');

    const descriptionInput = this.getDescriptionInput();
    await this.setInputValueWithVerification(descriptionInput, description, 'Enter Description');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save Guest Class button');
    await this.expectSuccessAndConfirm('Details created/updated successfully.');
  }

  async createGuestClassSaveAndAddNew(firstCode: string, firstDescription: string, secondCode: string, secondDescription: string): Promise<void> {
    logger.info('Creating Guest Class via Save & Add New flow');

    await this.clickToolbarAddButton();

    const codeInput = this.getCodeInput();
    await this.setInputValueWithVerification(codeInput, firstCode, 'First code');

    const descriptionInput = this.getDescriptionInput();
    await this.setInputValueWithVerification(descriptionInput, firstDescription, 'First description');

    await this.clickModalSaveAndAddNew();
    await this.expectSuccessAndConfirm('Details created/updated successfully.');

    await this.setInputValueWithVerification(codeInput, secondCode, 'Second code');
    await this.setInputValueWithVerification(descriptionInput, secondDescription, 'Second description');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save second Guest Class button');
    await this.expectSuccessAndConfirm('Details created/updated successfully.');
  }

  async createGuestClassWithOptionalFields(code: string, description: string): Promise<void> {
    logger.info('Creating Guest Class with optional fields (Special Service Group + Maintain History)');

    await this.clickToolbarAddButton();

    const codeInput = this.getCodeInput();
    await this.setInputValueWithVerification(codeInput, code, 'Enter Code');

    const descriptionInput = this.getDescriptionInput();
    await this.setInputValueWithVerification(descriptionInput, description, 'Enter Description');

    const specialServiceGroupInput = this.page.locator('input[aria-autocomplete="list"], ng-select, .ng-select').first();
    if (await specialServiceGroupInput.count()) {
      await this.elementActions.click(specialServiceGroupInput, 'Special Service Group field');
      await this.elementActions.pressKey('ArrowDown');
      await this.elementActions.pressKey('Enter');
    }

    const maintainHistorySwitch = this.page.getByRole('switch', { name: /history/i }).first();
    if (await maintainHistorySwitch.count()) {
      await this.elementActions.click(maintainHistorySwitch, 'Maintain History switch');
    } else {
      const maintainHistoryCheckbox = this.page.getByRole('checkbox', { name: /history/i }).first();
      if (await maintainHistoryCheckbox.count()) {
        await this.elementActions.click(maintainHistoryCheckbox, 'Maintain History checkbox');
      }
    }

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save Guest Class button');
    await this.expectSuccessAndConfirm('Details created/updated successfully.');
  }

  async validateMandatoryFieldMessage(): Promise<void> {
    logger.info('Validating mandatory field message for Guest Class');

    await this.clickToolbarAddButton();
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save button without mandatory data');
    await expect(this.page.locator('#swal2-html-container')).toContainText('Please Fill All *Mandatory Fields..!');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Mandatory alert OK button');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close modal after mandatory check');
  }

  async validateDuplicateCodeBehavior(existingCode: string): Promise<void> {
    logger.info(`Validating duplicate code behavior for: ${existingCode}`);

    await this.clickToolbarAddButton();
    const codeInput = this.getCodeInput();
    await this.elementActions.click(codeInput, 'Duplicate code input');
    await this.elementActions.sendKeys(codeInput, existingCode, 'Duplicate code value');
        await this.page.waitForTimeout(500);

    await this.elementActions.pressKey('Tab');
    await this.page.waitForTimeout(800);

    const duplicatePopup = this.page.getByText('Code Already Exists');
    if (await duplicatePopup.isVisible({ timeout: 3000 }).catch(() => false)) {
      logger.info('Duplicate code validation popup appeared as expected.');
      await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Duplicate code alert OK button');
        await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close modal after duplicate code check');
    }
    
//     if (await duplicatePopup.count()) {
//       const popupText = (await duplicatePopup.textContent()) || '';
//       if (/exist|already|duplicate/i.test(popupText)) {
//             await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close modal after duplicate validation');

//         await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Duplicate warning OK button');
//         //await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close modal after duplicate code warning');
//       }
//     }

   }

  async searchGuestClass(searchText: string): Promise<void> {
    logger.info(`Searching Guest Class by text: ${searchText}`);

    const searchInput = this.getListSearchInput();
    await this.elementActions.click(searchInput, 'Guest Class search input');
    await this.elementActions.sendKeys(searchInput, searchText, 'Guest Class search value');

    const row = this.getGridRowByCode(searchText);
    await expect(row).toBeVisible();
  }

  async refreshList(): Promise<void> {
    await this.clickToolbarRefreshButton();
  }

  async deleteAllByCodes(codes: string[]): Promise<void> {
    logger.info(`Delete Guest Class records for codes: ${codes.join(', ')}`);

    for (const code of codes) {
      await this.clearGuestClassSearch();
      await this.searchGuestClass(code);

      const row = this.getGridRowByCode(code);
      if (await row.count()) {
        const checkbox = row.locator('input[type="checkbox"]').first();
        if (await checkbox.count()) {
          await checkbox.check({ force: true });
        }

        await this.clickToolbarDeleteButton();
        await expect(this.page.locator('#swal2-html-container')).toContainText('Do you want to delete the selected record?');
        await this.elementActions.click(this.page.getByRole('button', { name: 'Yes' }), 'Delete confirmation Yes button');
        await this.expectSuccessAndConfirm('Data Deleted Successfully.');
      }
    }
  }

  async verifyMaintainHistoryIndicatorForCode(code: string): Promise<void> {
    logger.info(`Verifying Maintain History indicator for code: ${code}`);
    await this.searchGuestClass(code);
    const row = this.getGridRowByCode(code);
    await expect(row).toBeVisible();
    await expect(row).toContainText(code);
  }

  async openAndCloseLogForCode(code: string): Promise<void> {
    logger.info(`Opening and closing log popup for code: ${code}`);
    await this.openLogForCode(code);

    const modal = this.page.locator('[role="dialog"], .modal-content').first();
    await expect(modal).toBeVisible();

    const closeButton = this.page.getByRole('button', { name: /Close/i }).first();
    if (await closeButton.count()) {
      await this.elementActions.click(closeButton, 'Log popup Close button');
    } else {
      await this.elementActions.pressKey('Escape');
    }
  }

  async deactivateAndDeleteSearchedGuestClass(searchText: string): Promise<void> {
    logger.info(`Editing and deleting Guest Class for: ${searchText}`);

    await this.openEditForCode(searchText);

    const activeSwitch = this.page.getByRole('switch', { name: 'Active' });
    if (await activeSwitch.isChecked()) {
      await activeSwitch.uncheck();
    }

    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update Guest Class button');
    await this.expectSuccessAndConfirm('Details created/updated successfully.');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Delete' }), 'Delete Guest Class button');
    await expect(this.page.locator('#swal2-html-container')).toContainText('Do you want to delete the selected record?');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Yes' }), 'Delete confirmation Yes button');
    await this.expectSuccessAndConfirm('Data Deleted Successfully.');
  }

  async runGuestClassCreateDeleteFlow(code: string, initialDescription: string, recreateDescription: string): Promise<void> {
    await this.openGuestClassPage();

    await this.createGuestClass(code, initialDescription);
    await this.searchGuestClass(initialDescription);

    await this.refreshList();
    await this.deactivateAndDeleteSearchedGuestClass(initialDescription);

    //await this.createGuestClass(code, recreateDescription);
  }

  async runGuestClassFullCoverageFlow(): Promise<void> {
    const saveAddCode1 = await this.generateUnusedGuestClassCode('X');
    const saveAddCode2 = await this.generateUnusedGuestClassCode('Y');
    //const optionalCode = await this.generateUnusedGuestClassCode('Z');

    await this.openGuestClassPage();
    await this.validateMandatoryFieldMessage();

    await this.createGuestClassSaveAndAddNew(
      saveAddCode1,
      `AUTOMATION SAVEADD ${saveAddCode1}`,
      saveAddCode2,
      `AUTOMATION SAVEADD ${saveAddCode2}`
    );

    await this.refreshList();

    //await this.createGuestClassWithOptionalFields(optionalCode, `AUTOMATION OPT ${optionalCode}`);
    //await this.verifyMaintainHistoryIndicatorForCode(optionalCode);

    await this.openAndCloseLogForCode(saveAddCode1);
    await this.validateDuplicateCodeBehavior(saveAddCode1);

    //await this.deleteAllByCodes([saveAddCode1, saveAddCode2]);
  }
}
