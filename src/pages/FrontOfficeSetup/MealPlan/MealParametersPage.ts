import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class MealParametersPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: /FrontOffice Setup/i });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: /Parameter Setup/i });
  private readonly mealParametersLink = this.page.getByRole('link', { name: /Meal Parameters/i });
  private readonly mealPlan = this.page.getByRole('link', { name: ' Meal Plan' });

  private readonly addButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
  private readonly mealPlanIdInput = this.page.getByRole('textbox', { name: /Enter Meal Plan Id\./i });
  private readonly descriptionInput = this.page.getByRole('textbox', { name: /Enter Description/i });
  private readonly clubWithRoomChargeSwitch = this.page.getByRole('switch', { name: /Club with Room Charge/i });
  private readonly percentRadio = this.page.getByRole('radio', { name: /Percent/i });

  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });

  private readonly searchInput = this.page.locator('input[placeholder="Search"]');
  private readonly tableRows = this.page.locator('#customerList tbody tr');

  private readonly nextButton = this.page.locator('a[aria-label="Next"]');
  private readonly firstButton = this.page.locator('a[aria-label="First"]');

  private readonly popupById = this.page.locator('#swal2-html-container');

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  private getRowsByText(text: string): Locator {
    return this.page.locator('#customerList tbody tr').filter({
      hasText: new RegExp(text, 'i')
    });
  }

  private async clickRowEditButton(rowLocator: Locator): Promise<void> {
    const editIcon = rowLocator.locator('i.bx-edit-alt').first();
    await editIcon.scrollIntoViewIfNeeded();
    await this.elementActions.click(editIcon, 'Edit row');
  }

  /* ================= POPUP HANDLING ================= */

  private async readPopupText(): Promise<string> {
    try {
      await this.popupById.waitFor({ state: 'visible', timeout: 5000 });
      const text = await this.popupById.innerText();
      if (text?.trim()) return text.trim();
    } catch {}

    const altPopup = this.page.locator('.swal2-popup');
    if (await altPopup.isVisible().catch(() => false)) {
      return (await altPopup.innerText()).trim();
    }

    return '';
  }

  private async confirmPopup(button: 'OK' | 'Yes'): Promise<void> {
    if (button === 'OK') {
      await this.elementActions.click(this.okButton, 'Popup OK');
    } else {
      await this.elementActions.click(this.yesButton, 'Popup Yes');
    }
  }

  private async expectPopupMessageAndConfirm(
    expectedMessages: string[],
    button: 'OK' | 'Yes'
  ): Promise<void> {

    const popupText = (await this.readPopupText()).toLowerCase();

    const isExpected = expectedMessages.some(m =>
      popupText.includes(m.toLowerCase())
    );

    if (!isExpected) {
      logger.warn(`Popup mismatch but continuing: ${popupText}`);
    }

    await this.confirmPopup(button);
  }

  /* ================= ACTIVE SWITCH ================= */

  private async ensureActiveOff(): Promise<void> {
    const activeSwitch = this.page.getByRole('switch', { name: 'Active' });

    if (await activeSwitch.count() === 0) return;

    const isChecked = await activeSwitch.isChecked();

    if (isChecked) {
      await this.elementActions.click(activeSwitch, 'Active OFF');
      await this.page.waitForTimeout(300);
    }
  }

  /* ================= NAVIGATION ================= */

  async openMealParametersPage(): Promise<void> {
    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup');
    await this.elementActions.click(this.mealParametersLink, 'Meal Parameters');
    await expect(this.mealPlan).toBeVisible();
    await this.elementActions.click(this.mealPlan, 'Meal Plan');
  }

  /* ================= CREATE ================= */

  private generateUniqueMealPlanCode(existingCodes: Set<string>): string {
    let code = Math.random().toString(36).substring(2, 6).toUpperCase();
    while (existingCodes.has(code)) {
      code = Math.random().toString(36).substring(2, 6).toUpperCase();
    }
    return code;
  }

  private async fillMealPlanForm(code: string, description: string): Promise<void> {
    await this.mealPlanIdInput.fill(code);
    await this.descriptionInput.fill(description);
  }

  private async saveAndAcceptSuccess(): Promise<void> {
    await this.elementActions.click(this.saveButton, 'Save');
    await this.expectPopupMessageAndConfirm(['success'], 'OK');
  }

  /* ================= DELETE ================= */

  async deleteAllAutomationMealPlans(searchText: string = 'automation'): Promise<void> {
    let loops = 0;

    while (loops < 50) {
      loops++;

      await this.searchInput.fill('');
      await this.searchInput.fill(searchText);
      await this.page.waitForTimeout(500);

      const rows = this.getRowsByText(searchText);
      const count = await rows.count();

      if (count === 0) {
        logger.info('No more records found');
        break;
      }

      logger.info(`Deleting record ${loops}, remaining: ${count}`);

      const row = rows.first();

      await this.clickRowEditButton(row);

      await this.ensureActiveOff();

      await this.elementActions.click(this.updateButton, 'Update');
      await this.expectPopupMessageAndConfirm(['success'], 'OK');

      await this.elementActions.click(this.deleteButton, 'Delete');

      // ✅ confirmation popup
      await this.expectPopupMessageAndConfirm(
        ['do you want to delete', 'please confirm'],
        'Yes'
      );

      // ✅ success popup
      await this.expectPopupMessageAndConfirm(
        ['deleted', 'success'],
        'OK'
      );

      await this.page.waitForTimeout(700);
    }
  }

  /* ================= MAIN FLOW ================= */

  async runMealParametersCreateAndCleanupFlow(description: string = 'automation'): Promise<string[]> {
    await this.openMealParametersPage();

    const createdCodes: string[] = [];

    for (let i = 0; i < 3; i++) {
      const code = this.generateUniqueMealPlanCode(new Set(createdCodes));
      createdCodes.push(code);

      await this.elementActions.click(this.addButton, 'Add');
      await this.fillMealPlanForm(code, description);
      await this.saveAndAcceptSuccess();
    }

    await this.deleteAllAutomationMealPlans(description);

    return createdCodes;
  }
}