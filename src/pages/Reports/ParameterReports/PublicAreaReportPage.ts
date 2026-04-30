import { BrowserContext, Page } from '@playwright/test';
import { ParameterReportsPage } from './ParameterReportsPage';

export class PublicAreaReportPage extends ParameterReportsPage {
  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  async openPublicAreaReport(): Promise<void> {
    await this.openReportByName('Public Area');
  }
}
