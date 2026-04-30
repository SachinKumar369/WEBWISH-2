import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';

export class LockScreenAndSignoutPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly dashboardRegion: Locator;
  private readonly welcomeHeading: Locator;
  private readonly footerInfo: Locator;
  private readonly searchButton: Locator;
  private readonly shiftButton: Locator;
  private readonly notificationDropdown: Locator;
  private readonly headerAvatarButton: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    this.dashboardRegion = this.page.getByRole('region', { name: 'scrollable content' });
    this.welcomeHeading = this.page.locator('h2');
    this.footerInfo = this.page.getByRole('contentinfo');
    this.searchButton = this.page.getByRole('button', { name: 'Search 󱎸' });
    this.shiftButton = this.page.getByRole('button', { name: '' });
    this.notificationDropdown = this.page.locator('#page-header-notifications-dropdown');
    this.headerAvatarButton = this.page.getByRole('button', { name: 'Header Avatar' }).first();
  }

  async expectDashboardVisible(): Promise<void> {
    await expect(this.dashboardRegion).toBeVisible();
  }

  async expectWelcomeHeading(): Promise<void> {
    await expect(this.welcomeHeading).toContainText('Welcome!');
  }

  async expectFooterDetails(): Promise<void> {
    await expect(this.footerInfo).toContainText('Property Id:');
    await expect(this.footerInfo).toContainText('2026 © Prologic First India Pvt. Ltd.');
  }

  async expectHeaderButtonsVisible(): Promise<void> {
    await expect(this.page.getByRole('button').first()).toBeVisible();
    await expect(this.page.getByRole('button').nth(1)).toBeVisible();
    await expect(this.page.getByRole('button').nth(2)).toBeVisible();
    await expect(this.shiftButton).toBeVisible();
    await expect(this.notificationDropdown).toBeVisible();
    await expect(this.headerAvatarButton).toBeVisible();
    await expect(this.searchButton).toBeVisible();
  }

  async validateDashboardAfterPropertySelectionStepByStep(): Promise<void> {
    await this.expectDashboardVisible();
    await this.expectWelcomeHeading();
    await this.expectFooterDetails();
    await this.expectHeaderButtonsVisible();

  }

  async clickHeaderAvatar(): Promise<void> {
    await this.elementActions.click(this.headerAvatarButton, 'Header Avatar button');
  }
}



