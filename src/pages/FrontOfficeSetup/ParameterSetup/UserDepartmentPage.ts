import { expect, BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class UserDepartmentPage extends BasePage {
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
        "(//h3[contains(normalize-space(),'User Department')]/following::button)[1]",
        "(//input[@placeholder='Search']/ancestor::div[1]/preceding::button)[1]",
        "//button[.//text()[normalize-space()='󰐗']]"
      ],
      'Add User Department button'
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
      await this.elementActions.click(candidate, 'Edit User Department row button');
      return;
    }

    throw new Error('Edit User Department row button not found for matching row');
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

  private generateDepartmentCode(prefix: string = 'AU'): string {
    const randomPart = Math.floor(Math.random() * 90 + 10).toString();
    const candidate = `${prefix}${randomPart}`;
    logger.info(`Using unique User Department code: ${candidate}`);
    return candidate;
  }

  async openUserDepartmentPage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > User Department');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.page.getByRole('link', { name: ' FrontOffice Setup' }), 'FrontOffice Setup link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Parameter Setup' }), 'Parameter Setup link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' User Department' }), 'User Department link');
  }

  async createUserDepartment(code: string, description: string): Promise<void> {
    logger.info(`Creating User Department with code: ${code}, description: ${description}`);

    await this.clickToolbarAddButton();

    const codeInput = this.getCodeInput();
    await this.elementActions.click(codeInput, 'User Department code input');
    await this.elementActions.sendKeys(codeInput, code, 'User Department code value');

    const descriptionInput = this.getDescriptionInput();
    await this.elementActions.click(descriptionInput, 'User Department description input');
    await this.elementActions.sendKeys(descriptionInput, description, 'User Department description value');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save User Department button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');
  }

  async searchUserDepartment(searchText: string): Promise<void> {
    const searchInput = this.getListSearchInput();
    await this.elementActions.click(searchInput, 'User Department search input');
    await searchInput.fill('');
    await searchInput.fill(searchText);

    const rows = this.getRowsByText(searchText);
    await expect(rows.first()).toBeVisible();
  }

  async deactivateAndDeleteFirstMatch(searchText: string): Promise<void> {
    logger.info(`Deactivating and deleting User Department for search: ${searchText}`);

    await this.searchUserDepartment(searchText);
    const row = this.getRowsByText(searchText).first();
    await this.clickRowEditButton(row);

    await this.ensureActiveOff();
    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update User Department button');
    await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Delete' }), 'Delete User Department button');
    await this.expectPopupAndConfirm('Do you want to delete the selected record?', 'Yes');
    await this.expectPopupAndConfirm('Data Deleted Successfully.', 'OK');
  }

  async runUserDepartmentCreateDeleteFlow(): Promise<void> {
    const code = this.generateDepartmentCode('AU');
    const description = `AUTOMATION USER DEPARTMENT ${code}`;

    await this.openUserDepartmentPage();
    await this.createUserDepartment(code, description);
    await this.deactivateAndDeleteFirstMatch('automation');
  }

  async deleteAllAutomationUserDepartments(searchText: string = 'automation'): Promise<void> {
    logger.info(`Deleting all User Department records matching: ${searchText}`);

    let loops = 0;
    while (loops < 50) {
      loops += 1;

      const searchInput = this.getListSearchInput();
      await this.elementActions.click(searchInput, 'User Department search input');
      await searchInput.fill('');
      await searchInput.fill(searchText);

      const rows = this.getRowsByText(searchText);
      if ((await rows.count()) === 0) {
        logger.info('No more matching User Department records found');
        break;
      }

      await this.deactivateAndDeleteFirstMatch(searchText);
    }

    if (loops >= 50) {
      throw new Error('Stopped after 50 delete attempts to avoid an infinite loop.');
    }
  }

  async runUserDepartmentDeleteAllAutomationFlow(searchText: string = 'automation'): Promise<void> {
    await this.openUserDepartmentPage();
    await this.deleteAllAutomationUserDepartments(searchText);
  }
}
