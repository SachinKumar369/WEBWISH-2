import { BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import { ElementActions } from '../../../utils/ElementActions';
import logger from '../../../core/Logger';

export class ParameterReportsPage extends BasePage {
  protected readonly elementActions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  protected get reportMenu() {
    return this.page.getByRole('link', { name: /Report/i });
  }

  protected get parameterReportsMenu() {
    return this.page.getByRole('link', { name: /Parameter Reports/i })
    .or(this.page.getByText('Parameter Reports'));
  }

  protected get openReportButton() {
    return this.page.locator('.list-inline-item > .btn').first();
  }

  async openParameterReportsMenu(): Promise<void> {
    logger.info('Opening Parameter Reports menu');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.reportMenu, 'Report menu');
    await this.elementActions.click(this.parameterReportsMenu, 'Parameter Reports menu');
    await this.page.waitForLoadState('networkidle');
  }

  async openReportByName(reportName: string): Promise<void> {
    logger.info(`Opening Parameter Report: ${reportName}`);

    await this.openParameterReportsMenu();
    await this.elementActions.click(this.page.getByRole('link', { name: new RegExp(reportName, 'i') })
        .or(this.page.getByText(new RegExp(reportName, 'i'))),
         `${reportName} report link`);
    await this.page.waitForLoadState('networkidle');
  }

  async openReportPopup(timeoutMs = 30000): Promise<Page> {
    logger.info('Opening report popup');

    const popupPromise = this.page.waitForEvent('popup', { timeout: timeoutMs });
    await this.elementActions.click(this.openReportButton, 'Open report popup button');

    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');

    return popup;
  }
}