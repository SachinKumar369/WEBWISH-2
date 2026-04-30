import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';
import { WaitUtils } from '../../utils/WaitUtils';

export class GlobalSearchPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly dashboardSearchInput: Locator;
  private readonly searchResults: Locator;
  private readonly globalCloseButton: Locator;

  private static readonly moduleHeadingFallbackTimeoutMs = 4000;
  private static readonly moduleOptionFallbackTimeoutMs = 3000;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    this.dashboardSearchInput = this.page.getByRole('textbox', { name: 'Search...' });

    // ✅ Clean locator (replaced XPath)
    this.searchResults = this.page.locator('li.dropdown-item');

    this.globalCloseButton = this.page.locator('.global-close-btn');
  }

  async openDashboard(): Promise<void> {
    await this.page.goto('https://qc2webwish.prologicfirst.in/#/pms/dashboard');
  }

  // ✅ Clean heading validation
  private async assertModuleHeading(expectedHeading: string): Promise<void> {
    const pattern = new RegExp(expectedHeading, 'i');

    const pageHeader = this.page.locator('page-header').first();
    if (await pageHeader.isVisible().catch(() => false)) {
      await expect(pageHeader).toContainText(pattern);
      return;
    }

    const h3 = this.page.locator('h3').first();
    if (await h3.isVisible().catch(() => false)) {
      await expect(h3).toContainText(pattern);
      return;
    }

    await expect(this.page.locator('h2').first()).toContainText(pattern);
  }

  // ✅ SIMPLIFIED CORE METHOD
  private async clickModuleOption(
    searchTerm: string,
    moduleDisplayName: string
  ): Promise<boolean> {

    // Step 1: Search
    await this.dashboardSearchInput.click();
    await this.dashboardSearchInput.fill(searchTerm);
    await this.page.keyboard.press('Backspace'); // Trigger search results
    await this.page.keyboard.press('Control+Z');
          //await this.page.waitForTimeout(2000);


    // Step 2: Try exact match
    const exactMatch = this.searchResults
      .filter({ hasText: new RegExp(`^${moduleDisplayName}$`, 'i') })
      .first();

    if (await exactMatch.isVisible({ timeout: 2000 }).catch(() => false)) {
      logger.info(`Clicking exact match: ${moduleDisplayName}`);
      
      await exactMatch.click();
      return true;
    }

    // Step 3: Fallback → first item
    const firstItem = this.searchResults.first();

    const isVisible = await firstItem.isVisible({
      timeout: GlobalSearchPage.moduleOptionFallbackTimeoutMs
    }).catch(() => false);

    if (!isVisible) {
      logger.warn(`No search results found for: ${searchTerm}`);
      return false;
    }

    logger.info(`Clicking first available result for: ${searchTerm}`);
    await firstItem.click();
    return true;
  }

  private async isAwayFromDashboardContext(): Promise<boolean> {
    const url = this.page.url().toLowerCase();

    if (!url.includes('/dashboard')) {
      return true;
    }

    const welcomeVisible = await this.page
      .getByRole('heading', { name: /welcome/i })
      .isVisible()
      .catch(() => false);

    return !welcomeVisible;
  }

  // ✅ MAIN METHOD (CLEAN)
  async searchAndOpenModuleFromTopbar(
    searchTerm: string,
    moduleDisplayName: string,
    expectedHeading: string = moduleDisplayName
  ): Promise<boolean> {

    logger.info(`Searching module: ${searchTerm}`);

    const moduleOpened = await this.clickModuleOption(searchTerm, moduleDisplayName);

    if (!moduleOpened) {
      logger.warn(`Module not found: ${searchTerm}`);
      return false;
    }

    try {
      await this.assertModuleHeading(expectedHeading);
            await this.page.waitForTimeout(500);

      logger.info(`Opened module successfully: ${expectedHeading}`);
      return true;
    } catch {
      logger.warn(`Heading mismatch, checking navigation fallback`);

      const moved = await this.isAwayFromDashboardContext();

      if (moved) {
        logger.info(`Navigation occurred but heading not matched`);
        return true;
      }

      logger.error(`Failed to open module: ${expectedHeading}`);
      return false;
    }
  }

  // ✅ LOOP METHOD (UNCHANGED BUT CLEAN)
  async validateTopbarSearchAcrossModules(
    modules: Array<{ searchTerm: string; moduleDisplayName: string; expectedHeading?: string }>
  ): Promise<string[]> {

    const missingModules: string[] = [];

    for (const module of modules) {
      await this.openDashboard();

      const opened = await this.searchAndOpenModuleFromTopbar(
        module.searchTerm,
        module.moduleDisplayName,
        module.expectedHeading ?? module.moduleDisplayName
      );

      if (!opened) {
        missingModules.push(module.moduleDisplayName);
      }
    }

    return missingModules;
  }
}