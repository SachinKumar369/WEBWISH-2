import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';

export class LoginDashboardPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly topbar: Locator;
  private readonly searchTextbox: Locator;
  private readonly shiftMenuButton: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    this.topbar = this.page.locator('#page-topbar');
    this.searchTextbox = this.page.getByRole('textbox', { name: 'Search...' });
    this.shiftMenuButton = this.page.getByRole('button', { name: '' }).first();
  }

  async expectDashboardLoaded(propertyName?: string): Promise<void> {
    if (propertyName) {
      await expect(this.topbar).toContainText(propertyName);
    }
    await expect(this.searchTextbox).toBeVisible();

    await expect(this.page.getByRole('button').nth(1)).toBeVisible();
    await expect(this.page.getByRole('button').nth(2)).toBeVisible();
  }

  async openShiftMenu(): Promise<void> {
    await this.elementActions.click(this.shiftMenuButton, 'Shift menu button');
  }

  async expectShiftOptionsVisible(): Promise<void> {
    await expect(this.page.getByRole('radio', { name: 'Shift 1' })).toBeVisible();
  }

  async selectShift(shiftName: 'Shift 1' | 'Shift 2' | 'Shift 3'): Promise<void> {
    await this.elementActions.click(this.page.getByText(shiftName), `${shiftName} option`);
  }

  async validateShiftSwitchFlow(): Promise<void> {
    await this.openShiftMenu();
    await this.expectShiftOptionsVisible();

    await this.selectShift('Shift 1');

    await this.openShiftMenu();
    await this.expectShiftOptionsVisible();
    await this.selectShift('Shift 2');

    await this.openShiftMenu();
    await this.expectShiftOptionsVisible();
    await this.selectShift('Shift 3');

    await expect(this.topbar).toContainText('3');
  }
}
