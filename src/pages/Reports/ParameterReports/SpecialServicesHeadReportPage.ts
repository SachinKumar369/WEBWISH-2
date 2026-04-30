import { BrowserContext, Page } from '@playwright/test';
import { ParameterReportsPage } from './ParameterReportsPage';

export class SpecialServicesHeadReportPage extends ParameterReportsPage {
  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  async openSpecialServicesHeadReport(): Promise<void> {
    await this.openReportByName('Special Services Head List');
  }
}