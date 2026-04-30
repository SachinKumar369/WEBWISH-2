import { BrowserContext, Page } from '@playwright/test';
import { ParameterReportsPage } from './ParameterReportsPage';

export class RevenueTypeListReportPage extends ParameterReportsPage {
  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  async openRevenueTypeListReport(): Promise<void> {
    await this.openReportByName('Revenue Type List');
  }
}
