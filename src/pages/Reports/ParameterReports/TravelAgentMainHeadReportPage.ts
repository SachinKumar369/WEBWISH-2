import { BrowserContext, Page } from '@playwright/test';
import { ParameterReportsPage } from './ParameterReportsPage';

export class TravelAgentMainHeadReportPage extends ParameterReportsPage {
  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  async openTravelAgentMainHeadReport(): Promise<void> {
    await this.openReportByName('Travel Agent Main Head List');
  }
}