import { BrowserContext, Page } from '@playwright/test';
import { ParameterReportsPage } from './ParameterReportsPage';

export class SectionNoListReportPage extends ParameterReportsPage {
  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  async openSectionNoListReport(): Promise<void> {
    await this.openReportByName('Section No List');
  }
}