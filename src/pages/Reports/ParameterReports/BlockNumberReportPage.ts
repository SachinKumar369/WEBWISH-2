import { BrowserContext, Page } from '@playwright/test';
import { ParameterReportsPage } from './ParameterReportsPage';

export class BlockNumberReportPage extends ParameterReportsPage {
  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  async openBlockNumberReport(): Promise<void> {
    await this.openReportByName('Block Number');
  }
}