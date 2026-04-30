import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

interface RoomTypeRecord {
  code: string;
  description: string;
  occupancy: string;
  longDescription: string;
  extraValue1?: string;
  extraValue2?: string;
}

export class RoomTypePage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ================= PAGE FACTORY LOCATORS ================= */
  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: /FrontOffice Setup/i });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: /Parameter Setup/i });
  private readonly roomParameterLink = this.page.getByRole('link', { name: /Room Parameter/i });
  private readonly roomTypeLink = this.page.getByRole('link', { name: /Room Type/i });

  private readonly addButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });
  private readonly searchInput = this.page.getByPlaceholder('Search', { exact: true });

  private readonly okButton = this.page.getByRole('button', { name: 'OK' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });
  private readonly popupMessage = this.page.locator('#swal2-html-container');

  private readonly paginationContainer = this.page.locator('#customerList ngb-pagination').first();
  private readonly tableRows = this.page.locator('#customerList tbody tr');
  private readonly noRecordMessage = this.page.locator('h5:has-text("No Record Found")').first();
  private readonly tableInfo = this.page.locator('#tickets-table_info, .dataTables_info').first();
  private readonly nextButton = this.paginationContainer.locator('a[aria-label="Next"]').first();
  private readonly previousButton = this.paginationContainer.locator('a[aria-label="Previous"]').first();
  private readonly firstButton = this.paginationContainer.locator('a[aria-label="First"]').first();

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  private getRoomTypeModal(): Locator {
    return this.page.locator('ngb-modal-window').last();
  }

  private getCodeInput(): Locator {
    return this.getRoomTypeModal().getByRole('textbox', { name: /Enter Room Type Code/i }).first();
  }

  private getDescriptionInput(): Locator {
    return this.getRoomTypeModal().getByRole('textbox', { name: /Enter Description/i }).first();
  }

  private getOccupancyInput(): Locator {
    return this.getRoomTypeModal().getByRole('spinbutton').first();
  }

  private getLongDescriptionInput(): Locator {
    return this.getRoomTypeModal().getByRole('textbox', { name: /Enter Long Description/i }).first();
  }

  private getExtraInput(index: number): Locator {
    return this.getRoomTypeModal().getByRole('textbox').nth(index);
  }

  private getSaveButton(): Locator {
    return this.getRoomTypeModal().getByRole('button', { name: 'Save', exact: true });
  }

  private getSaveAndAddNewButton(): Locator {
    return this.getRoomTypeModal().getByRole('button', { name: /Save\s*&\s*Add\s*New/i }).first();
  }

  private getRowsByText(text: string): Locator {
    return this.tableRows.filter({ hasText: new RegExp(text, 'i') });
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private async expectPopupAndConfirm(expectedMessages: string[], button: 'OK' | 'Yes'): Promise<void> {
    await this.popupMessage.waitFor({ state: 'visible', timeout: 10000 });
    const popupText = ((await this.popupMessage.innerText()) || '').toLowerCase();

    const matched = expectedMessages.some((message) => popupText.includes(message.toLowerCase()));
    if (!matched) {
      logger.warn(`Unexpected popup text: ${popupText}`);
    }

    if (button === 'OK') {
      await this.elementActions.click(this.okButton, 'Popup OK button');
      return;
    }

    await this.elementActions.click(this.yesButton, 'Popup Yes button');
  }

  private async isPaginationButtonDisabled(button: Locator): Promise<boolean> {
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

  private async getPaginationStats(): Promise<{ totalPages: number; totalEntries: number }> {
    const fallback = { totalPages: 1, totalEntries: 0 };

    if ((await this.tableInfo.count()) === 0) {
      return fallback;
    }

    const infoText = ((await this.tableInfo.innerText()) || '').replace(/\s+/g, ' ').trim();
    const match = infoText.match(/Showing\s+(\d+)\s+To\s+(\d+)\s+of\s+(\d+)\s+entries/i);

    if (!match) {
      return fallback;
    }

    const from = Number(match[1]);
    const to = Number(match[2]);
    const totalEntries = Number(match[3]);
    const pageSize = Math.max(1, to - from + 1);

    return {
      totalEntries,
      totalPages: Math.max(1, Math.ceil(totalEntries / pageSize))
    };
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

  private async waitForGridReady(): Promise<void> {
    await Promise.race([
      this.tableRows.first().waitFor({ state: 'visible', timeout: 20000 }),
      this.noRecordMessage.waitFor({ state: 'visible', timeout: 20000 })
    ]);
  }

  private async resetToFirstPage(): Promise<void> {
    if ((await this.firstButton.count()) > 0 && !(await this.isPaginationButtonDisabled(this.firstButton))) {
      await this.elementActions.click(this.firstButton, 'Room Type first page button');
      await this.page.waitForLoadState('networkidle');
      return;
    }

    if ((await this.previousButton.count()) === 0) {
      return;
    }

    let guard = 0;
    while (!(await this.isPaginationButtonDisabled(this.previousButton)) && guard < 50) {
      guard += 1;
      await this.elementActions.click(this.previousButton, 'Room Type previous page button');
      await this.page.waitForLoadState('networkidle');
    }
  }

  private async collectExistingRoomTypeCodesAcrossPages(): Promise<Set<string>> {
    logger.info('Collecting existing room type codes across all pages to avoid duplication');

    const existingCodes = new Set<string>();
    await this.waitForGridReady();

    if ((await this.tableRows.count()) === 0) {
      logger.info('Room Type grid has no rows available for scanning');
      return existingCodes;
    }

    await this.resetToFirstPage();
    const { totalPages, totalEntries } = await this.getPaginationStats();

    logger.info(`Room Type grid pagination detected: ${totalEntries} entries across ${totalPages} page(s)`);

    for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
      const rowCount = await this.tableRows.count();
      logger.info(`Scanning Room Type page ${pageIndex}/${totalPages} with ${rowCount} row(s)`);

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
        throw new Error(`Pagination ended unexpectedly at page ${pageIndex} while totalPages is ${totalPages}.`);
      }

      const previousPage = await this.getActivePageNumber();
      await this.elementActions.click(this.nextButton, 'Room Type next page button');

      await expect.poll(async () => this.getActivePageNumber(), {
        timeout: 15000,
        message: `Room Type pagination did not move from page ${previousPage} to next page`
      }).toBe(previousPage + 1);
    }

    logger.info(`Collected ${existingCodes.size} existing room type code(s)`);
    return existingCodes;
  }

  private generateUniqueRoomTypeCode(existingCodes: Set<string>): string {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const randomLetter1 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      const randomLetter2 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      const randomDigit = `${Math.floor(Math.random() * 10)}`;
      const candidate = `D${randomLetter1}${randomLetter2}${randomDigit}`;

      if (!existingCodes.has(candidate)) {
        existingCodes.add(candidate);
        return candidate;
      }
    }

    throw new Error('Unable to generate unique Room Type code after 500 attempts.');
  }

  private buildRoomTypeRecords(existingCodes: Set<string>): RoomTypeRecord[] {
    const code1 = this.generateUniqueRoomTypeCode(existingCodes);
    const code2 = this.generateUniqueRoomTypeCode(existingCodes);
    const code3 = this.generateUniqueRoomTypeCode(existingCodes);

    return [
      {
        code: code1,
        description: 'automation',
        occupancy: '2',
        longDescription: 'delux room with capacity of 2 person',
        extraValue1: '2',
        extraValue2: '2'
      },
      {
        code: code2,
        description: 'delux room',
        occupancy: '4',
        longDescription: 'new delux room with 5 person'
      },
      {
        code: code3,
        description: 'delux room separate',
        occupancy: '22',
        longDescription: 'new delux room created with automation'
      }
    ];
  }

  private async fillOptionalExtraInputs(record: RoomTypeRecord): Promise<void> {
    if (!record.extraValue1 && !record.extraValue2) {
      return;
    }

    const modalTextboxes = this.getRoomTypeModal().getByRole('textbox');
    const textboxCount = await modalTextboxes.count();

    if (record.extraValue1 && textboxCount > 3) {
      const extra1 = this.getExtraInput(3);
      await this.elementActions.click(extra1, 'Room Type extra input 1');
      await this.elementActions.click(extra1, 'Room Type extra input 1 second click');
      await extra1.press('ControlOrMeta+a');
      await extra1.fill(record.extraValue1);
    }

    if (record.extraValue2 && textboxCount > 4) {
      const extra2 = this.getExtraInput(4);
      await this.elementActions.click(extra2, 'Room Type extra input 2');
      await this.elementActions.click(extra2, 'Room Type extra input 2 second click');
      await extra2.press('ControlOrMeta+a');
      await extra2.fill(record.extraValue2);
    }
  }

  private async fillRoomTypeForm(record: RoomTypeRecord): Promise<void> {
    const codeInput = this.getCodeInput();
    const descriptionInput = this.getDescriptionInput();
    const occupancyInput = this.getOccupancyInput();
    const longDescriptionInput = this.getLongDescriptionInput();

    await this.elementActions.click(codeInput, 'Room Type code input');
    await this.elementActions.sendKeys(codeInput, record.code, 'Room Type code value');

    await this.elementActions.click(descriptionInput, 'Room Type description input');
    await this.elementActions.sendKeys(descriptionInput, record.description, 'Room Type description value');

    await this.elementActions.click(occupancyInput, 'Room Type occupancy input click 1');
    await this.elementActions.click(occupancyInput, 'Room Type occupancy input click 2');
    await occupancyInput.press('ControlOrMeta+a');
    await occupancyInput.fill(record.occupancy);

    await this.elementActions.click(longDescriptionInput, 'Room Type long description input');
    await this.elementActions.sendKeys(longDescriptionInput, record.longDescription, 'Room Type long description value');

    await this.fillOptionalExtraInputs(record);
  }

  private async clickRowEditButton(rowLocator: Locator): Promise<void> {
    const editIcon = rowLocator.locator('.bx.bx-edit-alt').first();
    await editIcon.scrollIntoViewIfNeeded();
    await this.elementActions.click(editIcon, 'Room Type row edit button');
  }

  private async createRoomType(record: RoomTypeRecord, mode: 'Save' | 'Save & Add New'): Promise<void> {
    await this.elementActions.click(this.addButton, 'Add Room Type button');
    await this.fillRoomTypeForm(record);

    if (mode === 'Save & Add New') {
      await this.elementActions.click(this.getSaveAndAddNewButton(), 'Save & Add New Room Type button');
    } else {
      await this.elementActions.click(this.getSaveButton(), 'Save Room Type button');
    }

    await this.expectPopupAndConfirm(['details created/updated successfully', 'success'], 'OK');
  }

  private async createRoomTypeOnOpenModal(record: RoomTypeRecord): Promise<void> {
    await this.fillRoomTypeForm(record);
    await this.elementActions.click(this.getSaveButton(), 'Save Room Type button');
    await this.expectPopupAndConfirm(['details created/updated successfully', 'success'], 'OK');
  }

  private async deactivateAndDeleteRoomTypeByCode(code: string): Promise<void> {
    await this.elementActions.click(this.searchInput, 'Room Type search input');
    await this.searchInput.fill('');
    await this.searchInput.fill(code);

    const row = this.getRowsByText(code).first();
    await expect(row).toBeVisible();

    await this.clickRowEditButton(row);

    const activeSwitch = this.page.getByRole('switch', { name: 'Active' });
    if ((await activeSwitch.count()) > 0 && await activeSwitch.isChecked()) {
      await activeSwitch.uncheck();
    }

    await this.elementActions.click(this.updateButton, 'Update Room Type button');
    await this.expectPopupAndConfirm(['details created/updated successfully', 'success'], 'OK');

    await this.elementActions.click(this.deleteButton, 'Delete Room Type button');
    await this.expectPopupAndConfirm(['do you want to delete the selected record', 'please confirm'], 'Yes');
    await this.expectPopupAndConfirm(['reuqested data has been deleted successfully', 'data deleted successfully', 'deleted', 'success'], 'OK');
  }

  async openRoomTypePage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Room Parameter > Room Type');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup link');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup link');
    await this.elementActions.click(this.roomParameterLink, 'Room Parameter link');
    await this.elementActions.click(this.roomTypeLink, 'Room Type link');
  }

  async runRoomTypeCreateInactivateDeleteFlow(): Promise<string[]> {
    await this.openRoomTypePage();

    const existingCodes = await this.collectExistingRoomTypeCodesAcrossPages();
    const records = this.buildRoomTypeRecords(existingCodes);

    await this.createRoomType(records[0], 'Save');
    await this.createRoomType(records[1], 'Save & Add New');
    await this.createRoomTypeOnOpenModal(records[2]);

    for (const record of records) {
      await this.deactivateAndDeleteRoomTypeByCode(record.code);
    }

    return records.map((record) => record.code);
  }
}
