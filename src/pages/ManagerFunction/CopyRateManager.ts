import { expect, Page } from '@playwright/test';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

interface RateGridSnapshotRow {
  roomCode: string;
  values: string[];
}

export class CopyRateManager {
  private readonly page: Page;
  private readonly elementActions: ElementActions;

  constructor(page: Page) {
    this.page = page;
    this.elementActions = new ElementActions(page);
  }

  private get applyButton() {
    return this.page.getByRole('button', { name: 'Apply' });
  }

  private get okButton() {
    return this.page.getByRole('button', { name: 'OK' });
  }

  private get successMessage() {
    return this.page.getByRole('paragraph');
  }

  private get sectionsButton() {
    return this.page.getByText('Sections');
  }

  private get copyRatesLink() {
    return this.page.getByText('Copy Rates');
  }

  private parseRateValue(value: string): number {
    const cleaned = value.replace(/,/g, '').trim();
    return cleaned === '' ? 0 : Number(cleaned);
  }

  private async captureCurrentRateGridValues(): Promise<RateGridSnapshotRow[]> {
    const rateGridTable = this.page.locator(
      'app-rate-grid-list table.table',
    );

    await rateGridTable.first().waitFor({
      state: 'visible',
      timeout: 15000,
    });

    const rows = rateGridTable.locator('tbody tr');
    const rowCount = await rows.count();

    const snapshot: RateGridSnapshotRow[] = [];

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);

      const roomCode =
        (await row.locator('td').nth(1).textContent())?.trim() ??
        `Row ${i}`;

      const amountInputs = row.locator(
        'amount-control input[type="text"]',
      );

      const inputCount = await amountInputs.count();

      const values: string[] = [];

      for (let j = 0; j < inputCount; j++) {
        values.push(
          (await amountInputs.nth(j).inputValue()).trim(),
        );
      }

      snapshot.push({
        roomCode,
        values,
      });
    }

    return snapshot;
  }

  private assertRates(
    rackSnapshot: RateGridSnapshotRow[],
    copiedSnapshot: RateGridSnapshotRow[],
    increment: number,
  ): void {
    const rackMap = new Map(
      rackSnapshot.map(row => [row.roomCode, row]),
    );

    for (const copiedRow of copiedSnapshot) {
      const rackRow = rackMap.get(copiedRow.roomCode);

      expect(rackRow).toBeDefined();

      copiedRow.values.forEach((value, index) => {
        const rackValue = this.parseRateValue(
          rackRow?.values[index] ?? '0',
        );

        const actualValue = this.parseRateValue(value);

        expect(
          actualValue,
          `${copiedRow.roomCode} index ${index}`,
        ).toBeCloseTo(rackValue + increment, 2);
      });
    }
  }

  private async openCopyRatesSection(): Promise<void> {
    await this.elementActions.click(
      this.sectionsButton,
      'Sections button',
    );

    await this.elementActions.click(
      this.copyRatesLink,
      'Copy Rates link',
    );
  }

  private async openRackRateFromCopyRates(): Promise<void> {
    const searchBox = this.page
      .getByRole('combobox')
      .getByRole('textbox');

    await searchBox.click();
    await searchBox.fill('rack');

    await this.page.getByText('Rack Rate').click();
  }

  private async openRackRateGrid(): Promise<void> {
    await this.page
      .locator('.button-container > button')
      .first()
      .click();

    await this.page
      .locator(
        '.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single .ng-clear-wrapper',
      )
      .click();

    await this.page
      .getByRole('textbox')
      .first()
      .fill('rac');

    await this.page.getByText('Rack Rate').click();

    await this.elementActions.click(
      this.applyButton,
      'Apply button',
    );
  }

  async copyRatesAndVerifyAgainstRackRate(
    incrementAmount: string,
  ): Promise<void> {
    const increment =
      this.parseRateValue(incrementAmount);

    logger.info(
      `Copy Rate Verification Started. Increment=${increment}`,
    );

    await this.openCopyRatesSection();

    await this.openRackRateFromCopyRates();

    await this.page
      .locator('radio-control')
      .filter({ hasText: 'Add' })
      .getByRole('radio')
      .check();

    await this.page.getByRole('textbox').nth(1).fill(
      incrementAmount,
    );

    await this.page.getByRole('switch').check();

    await this.elementActions.click(
      this.applyButton,
      'Apply Copy Rates',
    );

    await expect(this.successMessage).toContainText(
      'Details created/updated successfully.',
      { timeout: 100000 },
    );

    await this.elementActions.click(
      this.okButton,
      'Success OK button',
    );

    const copiedSnapshot =
      await this.captureCurrentRateGridValues();

    logger.info(
      `Copied Snapshot Count = ${copiedSnapshot.length}`,
    );

    await this.openRackRateGrid();

    const rackSnapshot =
      await this.captureCurrentRateGridValues();

    logger.info(
      `Rack Snapshot Count = ${rackSnapshot.length}`,
    );

    this.assertRates(
      rackSnapshot,
      copiedSnapshot,
      increment,
    );

    logger.info(
      'Copy Rate Verification Completed Successfully',
    );
  }
}