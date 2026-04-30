import { BrowserContext, expect, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class DepartmentPrintSeqPage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ================= PAGE FACTORY LOCATORS ================= */
  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: ' Parameter Setup' });
  private readonly cashieringParametersLink = this.page.getByRole('link', { name: ' Cashiering Parameters' });
  private readonly departmentLink = this.page.getByRole('link', { name: ' Department' });

  private readonly tableRows = this.page.locator('#customerList tbody tr');
  private readonly nextButton = this.page.locator('li.page-item >> a[aria-label="Next"]');

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  async openDepartmentPage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Cashiering Parameters > Department');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup link');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup link');
    await this.elementActions.click(this.cashieringParametersLink, 'Cashiering Parameters link');
    await this.elementActions.click(this.departmentLink, 'Department link');
  }

  private async getCodeAndPrintSeqFromRow(rowIndex: number): Promise<string> {
    const row = this.tableRows.nth(rowIndex);
    const codeCell = row.locator('td').nth(1);
    const printSeqCell = row.locator('td').nth(3);

    const codeHighlighted = codeCell.locator('ngb-highlight').first();
    const printSeqHighlighted = printSeqCell.locator('ngb-highlight').first();

    const code = (await codeHighlighted.count())
      ? (await codeHighlighted.innerText()).trim()
      : ((await codeCell.textContent()) || '').trim();

    const printSeqNo = (await printSeqHighlighted.count())
      ? (await printSeqHighlighted.innerText()).trim()
      : ((await printSeqCell.textContent()) || '').trim();

    if (!code) {
      throw new Error(`Unable to read Department code from row ${rowIndex + 1}`);
    }

    if (!printSeqNo) {
      throw new Error(`Unable to read Department print seq no from row ${rowIndex + 1}`);
    }

    return `(${code} - ${printSeqNo})`;
  }

  async collectAllCodeAndPrintSeqNoPairs(): Promise<string[]> {
    logger.info('Collecting Department code and print seq no pairs from all pages');

    const pairs: string[] = [];
    let pageIndex = 1;

    await expect(this.tableRows.first()).toBeVisible();

    while (true) {
      const rowCount = await this.tableRows.count();
      logger.info(`Reading page ${pageIndex} with ${rowCount} rows`);

      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const value = await this.getCodeAndPrintSeqFromRow(rowIndex);
        pairs.push(value);
      }

      const nextParent = this.nextButton.locator('..');
      const nextClass = (await nextParent.getAttribute('class')) || '';
      const isDisabled = nextClass.includes('disabled');

      if (isDisabled) {
        break;
      }

      await this.elementActions.click(this.nextButton, 'Pagination next button');
      await this.page.waitForLoadState('networkidle');
      await expect(this.tableRows.first()).toBeVisible();
      pageIndex += 1;
    }

    logger.info(`Department code and print seq no pairs: ${pairs.join(', ')}`);
    return pairs;
  }

  async runCollectAllCodeAndPrintSeqNoFlow(): Promise<string[]> {
    await this.openDepartmentPage();
    return await this.collectAllCodeAndPrintSeqNoPairs();
  }
}
