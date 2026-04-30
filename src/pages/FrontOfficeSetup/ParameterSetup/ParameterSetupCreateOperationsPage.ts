import { BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { GuestClassPage } from './GuestClassPage';
import { PublicAreaPage } from './PublicAreaPage';
import { TitleMasterPage } from './TitleMasterPage';

export class ParameterSetupCreateOperationsPage extends BasePage {
  private readonly guestClassPage: GuestClassPage;
  private readonly publicAreaPage: PublicAreaPage;
  private readonly titleMasterPage: TitleMasterPage;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.guestClassPage = new GuestClassPage(page, context);
    this.publicAreaPage = new PublicAreaPage(page, context);
    this.titleMasterPage = new TitleMasterPage(page, context);
  }

  private readonly tableRows = this.page.locator('table tbody tr');
  private readonly nextButton = this.page.locator('li.page-item >> a[aria-label="Next"]');
  private readonly previousButton = this.page.locator('li.page-item >> a[aria-label="Previous"]');

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private async readCodeFromRow(rowIndex: number): Promise<string | null> {
    const row = this.tableRows.nth(rowIndex);
    const codeCell = row.locator('td').nth(1);
    const highlightedCode = codeCell.locator('ngb-highlight').first();

    const code = (await highlightedCode.count())
      ? (await highlightedCode.innerText()).trim()
      : ((await codeCell.textContent()) || '').trim();

    return code || null;
  }

  private async collectExistingCodesAcrossPages(entityName: string): Promise<Set<string>> {
    logger.info(`Collecting existing ${entityName} codes across all pages to avoid duplication`);

    const existingCodes = new Set<string>();

    if ((await this.tableRows.count()) === 0) {
      return existingCodes;
    }

    await this.resetToFirstPage(entityName);

    let pageIndex = 1;
    while (true) {
      const rowCount = await this.tableRows.count();
      logger.info(`Scanning ${entityName} page ${pageIndex} with ${rowCount} rows`);

      for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        const code = await this.readCodeFromRow(rowIndex);
        if (code) {
          existingCodes.add(this.normalizeCode(code));
        }
      }

      if (await this.isPaginationButtonDisabled(this.nextButton)) {
        break;
      }

      await this.nextButton.click();
      await this.page.waitForLoadState('networkidle');
      pageIndex += 1;
    }

    logger.info(`Scanned ${pageIndex} ${entityName} page(s), collected ${existingCodes.size} unique code(s)`);

    return existingCodes;
  }

  private async isPaginationButtonDisabled(button: ReturnType<Page['locator']>): Promise<boolean> {
    if ((await button.count()) === 0) {
      return true;
    }

    const buttonParentClass = (await button.locator('..').getAttribute('class')) || '';
    return buttonParentClass.includes('disabled');
  }

  private async resetToFirstPage(entityName: string): Promise<void> {
    if ((await this.previousButton.count()) === 0) {
      return;
    }

    let guard = 0;
    while (!(await this.isPaginationButtonDisabled(this.previousButton)) && guard < 50) {
      guard += 1;
      await this.previousButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  private generateUniqueCodeFromSet(existingCodes: Set<string>, prefix: string, digits: number): string {
    const min = 10 ** (digits - 1);
    const max = (10 ** digits) - 1;

    for (let attempt = 0; attempt < 500; attempt++) {
      const randomPart = Math.floor(Math.random() * (max - min + 1) + min).toString();
      const candidate = `${prefix}${randomPart}`;
      if (!existingCodes.has(this.normalizeCode(candidate))) {
        return candidate;
      }
    }

    const fallback = `${prefix}${`${Date.now()}`.slice(-digits)}`;
    if (!existingCodes.has(this.normalizeCode(fallback))) {
      return fallback;
    }

    throw new Error(`Unable to generate unique code for prefix ${prefix} after repeated attempts.`);
  }

  private buildGuestClassData(existingCodes: Set<string>): { code: string; description: string } {
    const code = this.generateUniqueCodeFromSet(existingCodes, 'G', 3);
    const description = `AUTOMATION GUEST CLASS ${code}`;
    return { code, description };
  }

  private buildPublicAreaData(existingCodes: Set<string>): { code: string; description: string } {
    const code = this.generateUniqueCodeFromSet(existingCodes, 'P', 3);
    const description = `AUTOMATION PUBLIC AREA ${code}`;
    return { code, description };
  }

  private buildTitleMasterData(existingCodes: Set<string>): { code: string; description: string } {
    const code = this.generateUniqueCodeFromSet(existingCodes, 'T', 2);
    const description = `AUTOMATION TITLE ${code}`;
    return { code, description };
  }

  async runCreateOperationsInSequence(): Promise<void> {
    logger.info('Starting Parameter Setup create-only sequence: Guest Class -> Public Area -> Title Master');

    await this.guestClassPage.openGuestClassPage();
    const guestClassExistingCodes = await this.collectExistingCodesAcrossPages('Guest Class');
    const guestClassData = this.buildGuestClassData(guestClassExistingCodes);
    logger.info(`Creating Guest Class with code: ${guestClassData.code}`);
    await this.guestClassPage.createGuestClass(guestClassData.code, guestClassData.description);

    await this.publicAreaPage.openPublicAreaPage();
    const publicAreaExistingCodes = await this.collectExistingCodesAcrossPages('Public Area');
    const publicAreaData = this.buildPublicAreaData(publicAreaExistingCodes);
    logger.info(`Creating Public Area with code: ${publicAreaData.code}`);
    await this.publicAreaPage.createPublicArea(publicAreaData.code, publicAreaData.description);

    await this.titleMasterPage.openTitleMasterPage();
    const titleMasterExistingCodes = await this.collectExistingCodesAcrossPages('Title Master');
    const titleMasterData = this.buildTitleMasterData(titleMasterExistingCodes);
    logger.info(`Creating Title Master with code: ${titleMasterData.code}`);
    await this.titleMasterPage.createTitleMaster(titleMasterData.code, titleMasterData.description);

    logger.info('Completed Parameter Setup create-only sequence successfully');
  }
}
