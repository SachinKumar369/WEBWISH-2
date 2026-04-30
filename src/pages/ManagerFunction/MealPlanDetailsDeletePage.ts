import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export interface MealPlanDeleteGuard {
  searchToken?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class MealPlanDetailsDeletePage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly managerFunctionsLink: Locator;
  private readonly mealPlanDetailsLink: Locator;
  private readonly activeSwitch: Locator;
  private readonly updateButton: Locator;
  private readonly okButton: Locator;
  private readonly closeButton: Locator;
  private readonly successMessage: Locator;
  private readonly selectAllCheckbox: Locator;
  private readonly deleteButton: Locator;
  private readonly yesButton: Locator;
  private readonly refreshButton: Locator;
  private readonly pageHeading: Locator;
  private readonly searchTextbox: Locator;
  private readonly dataRows: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    this.managerFunctionsLink = this.page.getByRole('link', { name: ' Manager Functions' });
    this.mealPlanDetailsLink = this.page.getByRole('link', { name: ' Meal Plan Details' });

    this.activeSwitch = this.page.getByRole('switch', { name: 'Active' });
    this.updateButton = this.page.getByRole('button', { name: 'Update' });
    this.okButton = this.page.getByRole('button', { name: 'OK' });
    this.closeButton = this.page.getByRole('button', { name: 'Close' });
    this.successMessage = this.page.getByRole('paragraph');

    this.selectAllCheckbox = this.page.locator('#checkAll');
    this.deleteButton = this.page.getByRole('button', { name: '󰚃' });
    this.yesButton = this.page.getByRole('button', { name: 'Yes' });
    this.refreshButton = this.page.getByRole('button', { name: '󰑐' });
    this.pageHeading = this.page.getByRole('heading', { name: 'Meal Plan Details' });
    this.searchTextbox = this.page.getByRole('textbox', { name: 'Search', exact: true });

    this.dataRows = this.page.locator('table tbody tr');
  }

  async openMealPlanDetailsFromManagerFunctions(): Promise<void> {
    logger.info('Opening Meal Plan Details from Manager Functions module');

    const viewport = this.page.viewportSize();
    if (viewport) {
      await this.page.mouse.move(0, viewport.height / 2);
    }

    // await this.elementActions.click(this.managerFunctionsLink, 'Manager Functions link');
    // await this.elementActions.click(this.mealPlanDetailsLink, 'Meal Plan Details link');

    await this.elementActions.waitForElement(this.pageHeading, 10000, 'Meal Plan Details heading');
  }


  async openMealPlanDetailsFromManager(): Promise<void> {
    logger.info('Opening Meal Plan Details from Manager Functions module');

    const viewport = this.page.viewportSize();
    if (viewport) {
      await this.page.mouse.move(0, viewport.height / 2);
    }

    await this.elementActions.click(this.managerFunctionsLink, 'Manager Functions link');
    await this.elementActions.click(this.mealPlanDetailsLink, 'Meal Plan Details link');

    await this.elementActions.waitForElement(this.pageHeading, 10000, 'Meal Plan Details heading');
  }


//   private async applyGuardSearch(guard?: MealPlanDeleteGuard): Promise<void> {
//     if (!guard?.searchToken) {
//       return;
//     }

//     await this.elementActions.click(this.searchTextbox, 'Search textbox');
//     await this.elementActions.sendKeys(this.searchTextbox, guard.searchToken, 'Search textbox');
//     await this.page.waitForTimeout(800);
//   }

  private rowMatchesGuard(rowText: string, guard?: MealPlanDeleteGuard): boolean {
    if (!guard) {
      return true;
    }

    const normalized = rowText.replace(/\s+/g, ' ').trim();

    if (guard.dateFrom && !normalized.includes(guard.dateFrom)) {
      return false;
    }

    if (guard.dateTo && !normalized.includes(guard.dateTo)) {
      return false;
    }

    if (guard.searchToken && !normalized.includes(guard.searchToken)) {
      return false;
    }

    return true;
  }

  private async resolveDataRowsWithRetry(guard?: MealPlanDeleteGuard, maxAttempts: number = 3): Promise<Locator[]> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.page.waitForTimeout(1000);

      //await this.applyGuardSearch(guard);

      const rowCount = await this.dataRows.count();
      logger.info(`Meal plan row lookup attempt ${attempt}/${maxAttempts}: found ${rowCount} rows`);

      if (rowCount > 0) {
        const matchingRows: Locator[] = [];

        for (let i = 0; i < rowCount; i++) {
          const row = this.dataRows.nth(i);
          const rowText = ((await row.textContent()) || '').replace(/\s+/g, ' ').trim();
          if (this.rowMatchesGuard(rowText, guard)) {
            matchingRows.push(row);
          }
        }

        if (matchingRows.length > 0) {
          return matchingRows;
        }
      }

      if (attempt < maxAttempts) {
        logger.warn('No data rows visible yet. Refreshing list and retrying...');
        if (await this.refreshButton.isVisible().catch(() => false)) {
          await this.elementActions.click(this.refreshButton, 'Refresh button');
        }
      }
    }

    return [];
  }

  private async updateAndConfirm(): Promise<void> {
    await this.elementActions.click(this.updateButton, 'Update button');
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Success dialog OK button');
  }

  private async deactivateAndUpdateCurrentRow(rowInfo: string): Promise<void> {
    await this.elementActions.waitForElement(this.activeSwitch, 10000, `Active switch for ${rowInfo}`);

    if (await this.activeSwitch.isChecked()) {
      await this.activeSwitch.uncheck();
      logger.info(`Unchecked Active switch for ${rowInfo}`);
    } else {
      logger.info(`Active switch already unchecked for ${rowInfo}`);
    }

    await this.updateAndConfirm();

    // Some rows may still require a second update after first confirmation.
    if (await this.activeSwitch.isVisible().catch(() => false)) {
      if (await this.activeSwitch.isChecked().catch(() => false)) {
        await this.activeSwitch.uncheck();
      }

      if (await this.updateButton.isVisible().catch(() => false)) {
        await this.updateAndConfirm();
      }
    }

    await this.elementActions.click(this.closeButton, `Close button for ${rowInfo}`);
  }

  async deactivateAndUpdateAllMealPlans(guard?: MealPlanDeleteGuard): Promise<void> {
    const rows = await this.resolveDataRowsWithRetry(guard);
    const rowCount = rows.length;
    logger.info(`Found ${rowCount} meal plan rows to process`);

    if (rowCount === 0) {
      throw new Error('No matching meal plan rows found to process before delete');
    }

    for (let i = 0; i < rowCount; i++) {
      const row = rows[i];
      const rowText = ((await row.textContent()) || `row-${i + 1}`).replace(/\s+/g, ' ').trim();
      const rowInfo = rowText || `row-${i + 1}`;

      logger.info(`Processing meal plan row ${i + 1}/${rowCount}: ${rowInfo}`);

      await this.elementActions.click(row.locator('i').nth(1), `Edit icon for ${rowInfo}`);
      await this.deactivateAndUpdateCurrentRow(rowInfo);
    }
  }

  async selectAllAndDeleteMealPlans(guard?: MealPlanDeleteGuard): Promise<void> {
    //await this.applyGuardSearch(guard);

    await this.selectAllCheckbox.check();
    await this.elementActions.click(this.deleteButton, 'Delete button');

    await expect(this.successMessage).toContainText('Do you want to delete the selected record?');
    await this.elementActions.click(this.yesButton, 'Delete confirmation Yes button');

    await expect(this.successMessage).toContainText('Data Deleted Successfully.');
    await this.elementActions.click(this.okButton, 'Delete success OK button');
  }

  async runMealPlanDetailsDeleteFlow(guard?: MealPlanDeleteGuard): Promise<void> {
    await this.openMealPlanDetailsFromManagerFunctions();
    await this.deactivateAndUpdateAllMealPlans(guard);
    await this.selectAllAndDeleteMealPlans(guard);
  }

  async runMealPlanDetailsDelete(guard?: MealPlanDeleteGuard): Promise<void> {
    await this.openMealPlanDetailsFromManager();
    await this.deactivateAndUpdateAllMealPlans(guard);
    await this.selectAllAndDeleteMealPlans(guard);
  }
}
