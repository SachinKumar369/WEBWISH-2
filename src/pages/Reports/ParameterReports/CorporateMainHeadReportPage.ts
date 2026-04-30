import { BrowserContext, Page } from '@playwright/test';
import { ParameterReportsPage } from './ParameterReportsPage';

export class CorporateMainHeadReportPage extends ParameterReportsPage {
  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  async openCorporateMainHeadReport(): Promise<void> {
    await this.openReportByName('Corporate Main Head');
  }
}
