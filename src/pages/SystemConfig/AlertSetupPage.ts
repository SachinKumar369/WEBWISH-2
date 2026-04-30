import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';

export interface AlertSetupData {
  code: string;
  description: string;
  defaultMessage: string;
  searchText: string;
}

export class AlertSetupPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly systemConfigurationsLink = this.page.getByRole('link', { name: /System Configurations/i });
  private readonly alertSetupLink = this.page.getByRole('link', { name: /Alert Setup/i });

  private readonly addButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });

  private readonly codeInput = this.page.getByRole('textbox').first();
  private readonly descriptionInput = this.page.getByRole('textbox').nth(1);
  private readonly defaultMessageInput = this.page.getByRole('textbox').nth(2);
  private readonly firstDropdownTriggerInput = this.page.getByRole('textbox').nth(3);
  private readonly secondDropdownTriggerInput = this.page.getByRole('textbox').nth(4);

  private readonly searchInput = this.page.locator('#customerList').getByPlaceholder('Search');
  private readonly editIcon = this.page.locator('.bx.bx-edit-alt').first();
  private readonly activeSwitch = this.page.getByRole('switch', { name: /Active/i });

  private readonly popupMessage = this.page.locator('#swal2-html-container');
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  async openPage(): Promise<void> {
    logger.info('Opening System Configurations > Alert Setup');
    await this.elementActions.click(this.systemConfigurationsLink, 'System Configurations link');
    await this.elementActions.click(this.alertSetupLink, 'Alert Setup link');
    await this.elementActions.waitForElement(this.addButton, 15000, 'Alert Setup add button');
  }

  private async selectByArrowDown(trigger: Locator, downCount: number): Promise<void> {
    await this.elementActions.click(trigger, 'dropdown trigger input');

    for (let i = 0; i < downCount; i++) {
      await this.page.keyboard.press('ArrowDown');
    }

    await this.page.keyboard.press('Enter');
  }

  private async expectAndConfirmPopup(expected: RegExp | string, button: 'OK' | 'Yes'): Promise<void> {
    await expect(this.popupMessage).toContainText(expected);

    if (button === 'OK') {
      await this.elementActions.click(this.okButton, 'Popup OK');
    } else {
      await this.elementActions.click(this.yesButton, 'Popup Yes');
    }
  }

  async createAlert(data: AlertSetupData): Promise<void> {
    logger.info(`Creating Alert Setup record with code=${data.code}`);

    await this.elementActions.click(this.addButton, 'Add button');

    await this.elementActions.click(this.codeInput, 'Code input');
    await this.codeInput.fill(data.code);

    await this.elementActions.click(this.descriptionInput, 'Description input');
    await this.descriptionInput.fill(data.description);

    await this.elementActions.click(this.defaultMessageInput, 'Default message input');
    await this.defaultMessageInput.fill(data.defaultMessage);

    await this.selectByArrowDown(this.firstDropdownTriggerInput, 2);

    await this.selectByArrowDown(this.secondDropdownTriggerInput, 3);

    await this.elementActions.click(this.saveButton, 'Save button');
    await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');
  }

  async searchAndOpenRecord(searchText: string): Promise<void> {
    await this.elementActions.click(this.searchInput, 'Search input');
    await this.searchInput.fill(searchText);
    await this.elementActions.click(this.editIcon, 'Edit icon');
  }

  async deactivateAndUpdate(): Promise<void> {
    if (await this.activeSwitch.isChecked().catch(() => false)) {
      await this.activeSwitch.uncheck();
    }

    await this.elementActions.click(this.updateButton, 'Update button');
    await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');
  }

  async deleteRecord(): Promise<void> {
    await this.elementActions.click(this.deleteButton, 'Delete button');

    if (await this.yesButton.isVisible().catch(() => false)) {
      await this.elementActions.click(this.yesButton, 'Delete confirmation Yes');
    }

    await this.expectAndConfirmPopup(/(Reuqested|Requested) data has been deleted successfully\./i, 'OK');
  }

  async runAlertSetupFlow(data: AlertSetupData): Promise<void> {
    await this.openPage();
    await this.createAlert(data);
    await this.searchAndOpenRecord(data.searchText);
    await this.deactivateAndUpdate();
    await this.deleteRecord();
  }
}
