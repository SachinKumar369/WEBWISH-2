import { BrowserContext, Page } from '@playwright/test';
import { BaseCrudPage } from '../../FrontOfficeSetup/ClientParameters/BaseCrudPage';

export class RoomParameterPage extends BaseCrudPage {

  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: 'Parameter Setup' });
  private readonly roomParameterLink = this.page.getByRole('link', { name: 'Room Parameter' });

  private readonly codeInput = this.page.getByRole('textbox', { name: 'Enter Code' });
  private readonly descriptionInput = this.page.getByRole('textbox', { name: 'Enter Description' });
  private readonly tableRows = this.page.locator('#customerList tbody tr');
  private readonly tableInfo = this.page.locator('#tickets-table_info, .dataTables_info').first();
  private readonly paginationContainer = this.page.locator('#customerList ngb-pagination').first();
  private readonly nextButton = this.paginationContainer.locator('a[aria-label="Next"]').first();
  private readonly previousButton = this.paginationContainer.locator('a[aria-label="Previous"]').first();
  private readonly firstButton = this.paginationContainer.locator('a[aria-label="First"]').first();

  private readonly screenName: string;
  private isFirstTime = true;

  constructor(page: Page, context: BrowserContext, screenName: string) {
    super(page, context);
    this.screenName = screenName;
  }

  // ================= NAVIGATION =================
  protected async openPage(): Promise<void> {

    if (this.isFirstTime) {

      await this.page.mouse.move(0, 300);

      await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup');
      await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup');
      await this.elementActions.click(this.roomParameterLink, 'Room Parameter');

      this.isFirstTime = false;
    } else {
      await this.page.mouse.move(0, 300);
    }

    const menu = this.page.getByRole('link', { name: this.screenName });
    await this.elementActions.click(menu, this.screenName);
  }

  // ================= FORM =================
  protected async fillForm(data: any): Promise<void> {

    await this.elementActions.click(this.codeInput, 'Code');
    await this.codeInput.fill(data.code);

    await this.elementActions.click(this.descriptionInput, 'Description');
    await this.descriptionInput.fill(data.description);
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private async isPaginationButtonDisabled(button: ReturnType<Page['locator']>): Promise<boolean> {
    if ((await button.count()) === 0) {
      return true;
    }

    const anchorClass = ((await button.getAttribute('class')) || '').toLowerCase();
    if (anchorClass.includes('disabled')) {
      return true;
    }

    const ariaDisabled = ((await button.getAttribute('aria-disabled')) || '').toLowerCase();
    if (ariaDisabled === 'true') {
      return true;
    }

    const parentClass = ((await button.locator('xpath=ancestor::li[1]').getAttribute('class')) || '').toLowerCase();
    return parentClass.includes('disabled');
  }

  private async getPaginationStats(): Promise<{ totalPages: number }> {
    if ((await this.tableInfo.count()) === 0) {
      return { totalPages: 1 };
    }

    const infoText = ((await this.tableInfo.innerText()) || '').replace(/\s+/g, ' ').trim();
    const match = infoText.match(/Showing\s+(\d+)\s+To\s+(\d+)\s+of\s+(\d+)\s+entries/i);

    if (!match) {
      return { totalPages: 1 };
    }

    const from = Number(match[1]);
    const to = Number(match[2]);
    const totalEntries = Number(match[3]);
    const pageSize = Math.max(1, to - from + 1);

    return { totalPages: Math.max(1, Math.ceil(totalEntries / pageSize)) };
  }

  private async getActivePageNumber(): Promise<number> {
    const activePage = this.paginationContainer.locator('li.page-item.active a.page-link').first();
    if ((await activePage.count()) === 0) {
      return 1;
    }

    const text = ((await activePage.innerText()) || '').replace(/\s+/g, ' ').trim();
    const match = text.match(/\d+/);
    return match ? Number(match[0]) : 1;
  }

  private async waitForPageIncrement(previousPage: number): Promise<void> {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const currentPage = await this.getActivePageNumber();
      if (currentPage === previousPage + 1) {
        return;
      }

      await this.page.waitForTimeout(250);
    }

    throw new Error(`${this.screenName} pagination did not move from page ${previousPage} to ${previousPage + 1}`);
  }

  private async resetToFirstPage(): Promise<void> {
    if ((await this.firstButton.count()) > 0 && !(await this.isPaginationButtonDisabled(this.firstButton))) {
      await this.elementActions.click(this.firstButton, `${this.screenName} first page`);
      await this.page.waitForLoadState('networkidle');
      return;
    }

    let guard = 0;
    while (!(await this.isPaginationButtonDisabled(this.previousButton)) && guard < 50) {
      guard += 1;
      await this.elementActions.click(this.previousButton, `${this.screenName} previous page`);
      await this.page.waitForLoadState('networkidle');
    }
  }

  private async collectExistingCodesAcrossPages(): Promise<Set<string>> {
    const existingCodes = new Set<string>();

    if ((await this.tableRows.count()) === 0) {
      return existingCodes;
    }

    await this.resetToFirstPage();
    const { totalPages } = await this.getPaginationStats();

    for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
      const rowCount = await this.tableRows.count();

      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const row = this.tableRows.nth(rowIndex);
        const code = ((await row.locator('td').nth(1).textContent()) || '').trim();
        if (code) {
          existingCodes.add(this.normalizeCode(code));
        }
      }

      if (pageIndex >= totalPages) {
        continue;
      }

      if (await this.isPaginationButtonDisabled(this.nextButton)) {
        throw new Error(`Pagination ended unexpectedly on ${this.screenName} page ${pageIndex} of ${totalPages}.`);
      }

      const previousPage = await this.getActivePageNumber();
      await this.elementActions.click(this.nextButton, `${this.screenName} next page`);
      await this.waitForPageIncrement(previousPage);
    }

    return existingCodes;
  }

  private generateUniqueCodeFromSet(existingCodes: Set<string>): string {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const candidate = this.generateUniqueCode().substring(0, 6).toUpperCase();
      if (!existingCodes.has(this.normalizeCode(candidate))) {
        existingCodes.add(this.normalizeCode(candidate));
        return candidate;
      }
    }

    throw new Error(`Unable to generate unique code for ${this.screenName}`);
  }

  // ================= FLOW =================
  async runFlow(): Promise<void> {

    await this.openPage();
    const existingCodes = await this.collectExistingCodesAcrossPages();

    const data = [
      { code: this.generateUniqueCodeFromSet(existingCodes), description: 'AUTOMATION' },
      { code: this.generateUniqueCodeFromSet(existingCodes), description: 'AUTOMATION' },
      { code: this.generateUniqueCodeFromSet(existingCodes), description: 'AUTOMATION' }
    ];

    await this.runCrudFlow(data, 'AUTOMATION');
  }
}