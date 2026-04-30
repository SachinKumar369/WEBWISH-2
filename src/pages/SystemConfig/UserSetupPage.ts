import { BrowserContext, expect, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';

export interface UserSetupData {
  userId: string;
  description: string;
  invalidEmail: string;
  validEmail: string;
  mobile: string;
  password: string;
  designation: string;
  employeeCode: string;
  languageSearchText: string;
}

export class UserSetupPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly systemConfigurationsLink = this.page.getByRole('link', { name: /System Configurations/i });
  private readonly userSetupLink = this.page.getByRole('link', { name: /User Setup/i });
  private readonly userIdColumnHeader = this.page.getByRole('columnheader', { name: 'User Id' });
  private readonly nextLink = this.page.getByRole('link', { name: 'Next' });

  private readonly addButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });

  private readonly userIdInput = this.page.getByRole('textbox').first();
  private readonly descriptionInput = this.page.getByRole('textbox').nth(1);
  private readonly emailInput = this.page.getByRole('textbox', { name: 'example@gmail.com' });
  private readonly mobileInput = this.page.getByRole('textbox').nth(3);
  private readonly passwordInput = this.page.getByRole('textbox', { name: 'Enter password' }).last();

  private readonly designationInput = this.page.locator('.text-capitalize.form-control.form-control-sm').first();
  private readonly employeeCodeInput = this.page.locator('.text-capitalize.form-control.form-control-sm').nth(1);

  private readonly okButton = this.page.getByRole('button', { name: 'OK' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });
  private readonly popupMessage = this.page.getByRole('paragraph');

  private readonly searchInput = this.page.getByRole('textbox', { name: 'Search', exact: true });
  private readonly editButton = this.page.locator('.bx.bx-edit-alt').first();

  private readonly changePasswordOnNextLoginSwitch = this.page.getByRole('switch', { name: /Change Password at next Login/i });
  private readonly activeSwitch = this.page.getByRole('switch', { name: 'Active' });

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  async openPage(): Promise<void> {
    logger.info('Opening System Configurations > User Setup');
    await this.elementActions.click(this.systemConfigurationsLink, 'System Configurations link');
    await this.elementActions.click(this.userSetupLink, 'User Setup link');
    await this.elementActions.waitForElement(this.userIdColumnHeader, 15000, 'User Id column header');
  }

  async moveToLaterPage(nextClicks: number = 4): Promise<void> {
    await this.elementActions.click(this.userIdColumnHeader, 'User Id column header');

    for (let i = 0; i < nextClicks; i++) {
      if (await this.nextLink.isVisible().catch(() => false)) {
        await this.elementActions.click(this.nextLink, `Next page link ${i + 1}`);
        await this.page.waitForTimeout(400);
      }
    }
  }

  async startCreateUser(): Promise<void> {
    await this.elementActions.click(this.addButton, 'Add user button');
    await this.elementActions.waitForElement(this.userIdInput, 10000, 'User Id input');
  }

  async fillBasicDetails(userId: string, description: string): Promise<void> {
    await this.userIdInput.press('CapsLock').catch(() => undefined);
    await this.elementActions.sendKeys(this.userIdInput, userId, 'User Id input');

    await this.elementActions.click(this.descriptionInput, 'Description input');
    await this.elementActions.sendKeys(this.descriptionInput, description, 'Description input');
  }

  async validateAndFixEmail(invalidEmail: string, validEmail: string): Promise<void> {
    await this.elementActions.click(this.emailInput, 'Email input');
    await this.emailInput.press('CapsLock').catch(() => undefined);
    await this.elementActions.sendKeys(this.emailInput, invalidEmail, 'Invalid email input');

    // Trigger blur/validation exactly as observed in flow.
    await this.elementActions.click(this.mobileInput, 'Mobile input to trigger email validation');

    await expect(this.popupMessage).toContainText('Invalid Email Id.');
    await this.elementActions.click(this.okButton, 'Invalid email popup OK');

    await this.emailInput.dblclick();
    await this.emailInput.press('ControlOrMeta+a');
    await this.elementActions.sendKeys(this.emailInput, validEmail, 'Valid email input');
  }

  async fillContactAndSecurity(mobile: string, password: string): Promise<void> {
    await this.elementActions.click(this.mobileInput, 'Mobile input');
    await this.elementActions.sendKeys(this.mobileInput, mobile, 'Mobile input');

    await this.elementActions.click(this.passwordInput, 'Password input');
    await this.elementActions.sendKeys(this.passwordInput, password, 'Password input');
  }

  async fillDesignationAndEmployeeCode(designation: string, employeeCode: string): Promise<void> {
    await this.designationInput.dblclick();
    await this.elementActions.sendKeys(this.designationInput, designation, 'Designation input');

    await this.elementActions.click(this.employeeCodeInput, 'Employee code input');
    await this.employeeCodeInput.press('CapsLock').catch(() => undefined);
    await this.elementActions.sendKeys(this.employeeCodeInput, employeeCode, 'Employee code input');
  }

  private async selectComboboxByArrowDown(index: number, downCount: number): Promise<void> {
    const combo = this.page.getByRole('combobox').nth(index);
    await this.elementActions.click(combo, `Combobox ${index}`);

    for (let i = 0; i < downCount; i++) {
      await this.page.keyboard.press('ArrowDown');
    }

    await this.page.keyboard.press('Enter');
  }

  async selectDropdownValues(languageSearchText: string): Promise<void> {
    // Department
    await this.selectComboboxByArrowDown(0, 4);

    // Shift
    await this.selectComboboxByArrowDown(1, 2);

    // Property/User group (as captured in flow)
    await this.selectComboboxByArrowDown(2, 4);

    // Language by typed search
    const languageCombo = this.page.getByRole('combobox').nth(3);
    await this.elementActions.click(languageCombo, 'Language combobox');
    await this.page.keyboard.type(languageSearchText);
    await this.page.keyboard.press('Enter');

    // Role selection inside Roles0 container
    const roleInput = this.page.locator('#Roles0 > .ng-select-container > .ng-value-container > .ng-input > input');
    if (await roleInput.count()) {
      await this.elementActions.click(roleInput.first(), 'Role selector input');
      await this.page.keyboard.press('Enter');
    }
  }

  private async expectAndConfirmPopup(expectedText: RegExp | string, button: 'OK' | 'Yes'): Promise<void> {
    await expect(this.popupMessage).toContainText(expectedText);

    if (button === 'OK') {
      await this.elementActions.click(this.okButton, 'Popup OK');
    } else {
      await this.elementActions.click(this.yesButton, 'Popup Yes');
    }
  }

  async saveUser(): Promise<void> {
    await this.saveButton.dblclick();
    await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');
  }

  async searchAndOpenUser(userId: string): Promise<void> {
    await this.elementActions.click(this.searchInput, 'Search input');
    await this.searchInput.fill(userId);
    await this.elementActions.click(this.editButton, 'Edit user icon');
  }

  async updateWithoutChangePasswordAtNextLogin(): Promise<void> {
    if (await this.changePasswordOnNextLoginSwitch.isChecked().catch(() => false)) {
      await this.changePasswordOnNextLoginSwitch.uncheck();
    }

    await this.elementActions.click(this.updateButton, 'Update button after switch change');
    await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');
  }

  async deactivateAndDeleteUser(): Promise<void> {
    if (await this.activeSwitch.isChecked().catch(() => false)) {
      await this.activeSwitch.uncheck();
    }

    await this.elementActions.click(this.updateButton, 'Update button for deactivation');
    await this.expectAndConfirmPopup('Details created/updated successfully.', 'OK');

    await this.elementActions.click(this.deleteButton, 'Delete button');
    await this.expectAndConfirmPopup('Do you want to delete the selected record?', 'Yes');

    await expect(this.popupMessage).toContainText(/(Reuqested|Requested) data has been deleted successfully\./i);
  }

  async runUserSetupFlow(data: UserSetupData): Promise<void> {
    await this.openPage();
    await this.moveToLaterPage(4);

    await this.startCreateUser();
    await this.fillBasicDetails(data.userId, data.description);
    await this.validateAndFixEmail(data.invalidEmail, data.validEmail);
    await this.fillContactAndSecurity(data.mobile, data.password);
    await this.fillDesignationAndEmployeeCode(data.designation, data.employeeCode);
    await this.selectDropdownValues(data.languageSearchText);

    await this.saveUser();

    await this.searchAndOpenUser(data.userId);
    await this.updateWithoutChangePasswordAtNextLogin();
    await this.deactivateAndDeleteUser();
  }
}
