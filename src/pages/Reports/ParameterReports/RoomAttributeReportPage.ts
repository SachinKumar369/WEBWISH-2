import { BrowserContext, Page } from '@playwright/test';
import { ParameterReportsPage } from './ParameterReportsPage';

export class RoomAttributeReportPage extends ParameterReportsPage {
  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  async openRoomAttributeReport(): Promise<void> {
    await this.openReportByName('Room Attribute');
  }
}
