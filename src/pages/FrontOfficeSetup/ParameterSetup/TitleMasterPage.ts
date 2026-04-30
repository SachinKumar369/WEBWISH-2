import { expect, BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class TitleMasterPage extends BasePage {
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
        "(//h3[contains(normalize-space(),'Title')]/following::button)[1]",
        "(//input[@placeholder='Search']/ancestor::div[1]/preceding::button)[1]",
        "//button[.//text()[normalize-space()='󰐗']]"
      ],
      'Add Title Master button'
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
      await this.elementActions.click(candidate, 'Edit Title Master row button');
      return;
    }

    throw new Error('Edit Title Master row button not found for matching row');
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

  private generateTitleCode(prefix: string = 'AU'): string {
    const randomPart = Math.floor(Math.random() * 90 + 10).toString();
    const candidate = `${prefix}${randomPart}`;
    logger.info(`Using unique Title Master code: ${candidate}`);
    return candidate;
  }

  async openTitleMasterPage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Title Master');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.page.getByRole('link', { name: ' FrontOffice Setup' }), 'FrontOffice Setup link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Parameter Setup' }), 'Parameter Setup link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Title Master' }), 'Title Master link');
  }

  async createTitleMaster(code: string, description: string): Promise<void> {
    logger.info(`Creating Title Master with code: ${code}, description: ${description}`);

    await this.clickToolbarAddButton();

    const codeInput = this.getCodeInput();
    await this.elementActions.click(codeInput, 'Title Master code input');
    await this.elementActions.sendKeys(codeInput, code, 'Title Master code value');

    const descriptionInput = this.getDescriptionInput();
    await this.elementActions.click(descriptionInput, 'Title Master description input');
    await this.elementActions.sendKeys(descriptionInput, description, 'Title Master description value');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save Title Master button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');
  }

  async searchTitleMaster(searchText: string): Promise<void> {
    const searchInput = this.getListSearchInput();
    await this.elementActions.click(searchInput, 'Title Master search input');
    await searchInput.fill('');
    await searchInput.fill(searchText);

    const rows = this.getRowsByText(searchText);
    await expect(rows.first()).toBeVisible();
  }

  async deactivateAndDeleteFirstMatch(searchText: string): Promise<void> {
    logger.info(`Deactivating and deleting Title Master for search: ${searchText}`);

    await this.searchTitleMaster(searchText);
    const row = this.getRowsByText(searchText).first();
    await this.clickRowEditButton(row);

    await this.ensureActiveOff();
    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update Title Master button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Delete' }), 'Delete Title Master button');
    await this.expectPopupAndConfirm('Do you want to delete the selected record?', 'Yes');
    await this.expectPopupAndConfirm('Data Deleted Successfully.', 'OK');
  }

  async runTitleMasterCreateDeleteFlow(): Promise<void> {
    const code = this.generateTitleCode('AU');
    const description = `AUTOMATION TITLE ${code}`;

    await this.openTitleMasterPage();
    await this.createTitleMaster(code, description);
    await this.deactivateAndDeleteFirstMatch('automation');
  }
}
