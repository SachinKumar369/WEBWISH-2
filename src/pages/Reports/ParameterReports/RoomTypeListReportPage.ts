import { BrowserContext, Page } from '@playwright/test';
import { ParameterReportsPage } from './ParameterReportsPage';

export class RoomTypeListReportPage extends ParameterReportsPage {
  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  async openRoomTypeListReport(): Promise<void> {
    await this.openReportByName('Room Type List');
  }
}
