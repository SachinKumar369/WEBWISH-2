import { BrowserContext, Page } from '@playwright/test';
import { ParameterReportsPage } from './ParameterReportsPage';

export class SellingStatusReportPage extends ParameterReportsPage {
  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  async openSellingStatusReport(): Promise<void> {
    await this.openReportByName('Selling Status');
  }
}