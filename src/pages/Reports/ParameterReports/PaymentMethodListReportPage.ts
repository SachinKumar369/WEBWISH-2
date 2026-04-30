import { BrowserContext, Page } from '@playwright/test';
import { ParameterReportsPage } from './ParameterReportsPage';

export class PaymentMethodListReportPage extends ParameterReportsPage {
  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  async openPaymentMethodListReport(): Promise<void> {
    await this.openReportByName('Payment Method List');
  }
}
