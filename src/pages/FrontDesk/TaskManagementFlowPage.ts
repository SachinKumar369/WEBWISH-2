import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';

export class TaskManagementFlowPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly globalSearchInput = this.page.locator('#search-options');
  private readonly globalSearchResults = this.page.locator('//li[@tabindex="0"]');

  private readonly addButton = this.page.locator('icon-button-control > .btn').first();
  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
  private readonly saveAndAddNewButton = this.page.getByRole('button', { name: 'Save & Add New' });
  private readonly closeButton = this.page.getByRole('button', { name: 'Close' });
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });
  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });

  private readonly toastText = this.page.getByRole('paragraph');
  private readonly formContainer = this.page.locator('app-task-management-input');

  private readonly dateFrom = this.page.getByRole('textbox', { name: 'Select' }).first();
  private readonly dateTo = this.page.getByRole('textbox', { name: 'Select' }).nth(1);
  private readonly statusDropdown = this.page.getByRole('combobox').first();
  private readonly assignToDropdown = this.page.getByRole('combobox').nth(1);
  private readonly descriptionInput = this.page.locator('input-control').getByRole('textbox');

  private readonly searchInput = this.page.getByRole('textbox', { name: 'Search', exact: true });
  private readonly tableBody = this.page.locator('tbody');
  private readonly firstEditIcon = this.page.locator('.bx.bx-edit-alt').first();
  private readonly selectAllCheckbox = this.page.locator('#checkAll');
  private readonly deleteSelectedButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light.py-0.px-2.btn-soft-danger');

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  async openFromFrontDesk(): Promise<void> {
    await this.elementActions.click(this.page.getByRole('link', { name: ' Front Desk' }), 'Front Desk menu');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Task Management' }), 'Task Management menu');
  }

  async openFromGlobalSearch(searchText = 'Task Management'): Promise<void> {
    await this.elementActions.sendKeys(this.globalSearchInput, searchText, 'Global search input');
    const count = await this.globalSearchResults.count();
    for (let i = 0; i < count; i++) {
      const item = this.globalSearchResults.nth(i);
      const text = (await item.textContent())?.toLowerCase() ?? '';
      if (text.includes('task') && text.includes('management')) {
        await item.click();
        return;
      }
    }
    throw new Error('Task Management link not found in global search results.');
  }

  async verifyBlankSaveValidation(): Promise<void> {
    await this.elementActions.click(this.addButton, 'Add task button');
    await this.elementActions.click(this.saveButton, 'Save button');
    await expect(this.formContainer).toContainText('Date From required');
    await this.elementActions.click(this.closeButton, 'Close button');
  }

  async verifyBlankSaveAndAddNewValidation(): Promise<void> {
    await this.elementActions.click(this.addButton, 'Add task button');
    await this.elementActions.click(this.saveAndAddNewButton, 'Save & Add New button');
    await expect(this.formContainer).toContainText('Date From required');
    await this.elementActions.click(this.closeButton, 'Close button');
  }

  async createTask(description: string, saveAndAddNew = false): Promise<void> {
    await this.elementActions.click(this.addButton, 'Add task button');
    await this.fillTaskForm(description);

    if (saveAndAddNew) {
      await this.elementActions.click(this.saveAndAddNewButton, 'Save & Add New button');
    } else {
      await this.elementActions.click(this.saveButton, 'Save button');
    }

    await expect(this.toastText).toContainText('Details created/updated successfully');
    await this.elementActions.click(this.okButton, 'OK button');

    if (saveAndAddNew) {
      await this.elementActions.click(this.closeButton, 'Close button');
    }
  }

  async searchTask(searchText: string): Promise<void> {
    await this.elementActions.sendKeys(this.searchInput, searchText, 'Task search input');
    await expect(this.tableBody).toContainText(searchText);
  }

  async updateFirstSearchedTask(updatedDescription: string): Promise<void> {
    await this.elementActions.click(this.firstEditIcon, 'First edit icon');
    await this.elementActions.sendKeys(this.descriptionInput, updatedDescription, 'Description input');
    await this.elementActions.click(this.updateButton, 'Update button');
    await expect(this.toastText).toContainText('Details created/updated successfully');
    await this.elementActions.click(this.okButton, 'OK button');
  }

  async deleteSelectedTasks(): Promise<void> {
    await this.selectAllCheckbox.check();
    await this.elementActions.click(this.deleteSelectedButton, 'Delete selected button');
    await expect(this.toastText).toContainText('Do you want to delete the selected record?');
    await this.elementActions.click(this.yesButton, 'Yes button');
    await expect(this.toastText).toContainText('deleted successfully');
    await this.elementActions.click(this.okButton, 'OK button');
  }

  private async fillTaskForm(description: string): Promise<void> {
    await this.elementActions.sendKeys(this.dateFrom, '26/06/2025', 'Date from');
    await this.elementActions.sendKeys(this.dateTo, '30/06/2025', 'Date to');

    await this.elementActions.click(this.statusDropdown, 'Status dropdown');
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');

    await this.elementActions.click(this.assignToDropdown, 'Assign to dropdown');
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');

    await this.elementActions.sendKeys(this.descriptionInput, description, 'Description input');
  }
}
