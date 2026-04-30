import { BrowserContext, Page } from '@playwright/test';
import { ParameterReportsPage } from './ParameterReportsPage';

export class CheckoutMessageReportPage extends ParameterReportsPage {
  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  async openCheckoutMessageReport(): Promise<void> {
    await this.openReportByName('Checkout Message');
  }
}
