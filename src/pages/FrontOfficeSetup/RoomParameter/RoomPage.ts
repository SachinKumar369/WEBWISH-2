import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

interface RoomRecord {
  roomNo: string;
  description: string;
}

export class RoomPage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ================= PAGE FACTORY LOCATORS ================= */
  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: /FrontOffice Setup/i });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: /Parameter Setup/i });
  private readonly roomParameterLink = this.page.getByRole('link', { name: /Room Parameter/i });
  private readonly roomLink = this.page.getByRole('link', { name: /Room$/i });

  private readonly addButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });
  //private readonly searchInput = this.page.getByRole('textbox', { name: 'Search', exact: true });
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

  private getRoomModal(): Locator {
    return this.page.locator('ngb-modal-window').last();
  }

  private getRoomNoInput(): Locator {
    const modal = this.getRoomModal();
    const byLabel = modal
      .locator("xpath=.//label[contains(normalize-space(),'Room') and (contains(normalize-space(),'No') or contains(normalize-space(),'Number'))]/following::input[1]")
      .first();

    return modal.getByRole('textbox').first().or(byLabel);
  }

  private getDescriptionInput(): Locator {
    const modal = this.getRoomModal();
    const byName = modal.getByRole('textbox', { name: /Enter Description/i }).first();
    const byLabel = modal.locator("xpath=.//label[contains(normalize-space(),'Description')]/following::input[1]").first();

    return byName.or(byLabel);
  }

  private getCategoryCombobox(): Locator {
    const modal = this.getRoomModal();
    return modal.getByRole('combobox').first();
  }

  private getBlockCombobox(): Locator {
    const modal = this.getRoomModal();
    return modal.getByRole('combobox').nth(1);
  }

  private getFloorCombobox(): Locator {
    const modal = this.getRoomModal();
    return modal.getByRole('combobox').nth(2);
  }

  private getSaveButton(): Locator {
    return this.getRoomModal().getByRole('button', { name: 'Save', exact: true });
  }

  private getRowsByText(text: string): Locator {
    return this.tableRows.filter({ hasText: new RegExp(text, 'i') });
  }

  private async expectPopupAndConfirm(expectedMessages: string[], button: 'OK' | 'Yes'): Promise<void> {
    await this.popupMessage.waitFor({ state: 'visible', timeout: 10000 });
    const popupText = ((await this.popupMessage.innerText()) || '').toLowerCase();

    const match = expectedMessages.some((message) => popupText.includes(message.toLowerCase()));
    if (!match) {
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

  private async getPaginationStats(): Promise<{ pageSize: number; totalEntries: number; totalPages: number }> {
    const fallback = { pageSize: 10, totalEntries: 10, totalPages: 1 };

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
    const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));

    return {
      pageSize,
      totalEntries,
      totalPages
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

  private async resetToFirstPage(): Promise<void> {
    if ((await this.firstButton.count()) > 0 && !(await this.isPaginationButtonDisabled(this.firstButton))) {
      await this.elementActions.click(this.firstButton, 'Room first page button');
      await this.page.waitForLoadState('networkidle');
      return;
    }

    if ((await this.previousButton.count()) === 0) {
      return;
    }

    let guard = 0;
    while (!(await this.isPaginationButtonDisabled(this.previousButton)) && guard < 50) {
      guard += 1;
      await this.elementActions.click(this.previousButton, 'Room previous page button');
      await this.page.waitForLoadState('networkidle');
    }
  }

  private async waitForGridReady(): Promise<void> {
    await Promise.race([
      this.tableRows.first().waitFor({ state: 'visible', timeout: 20000 }),
      this.noRecordMessage.waitFor({ state: 'visible', timeout: 20000 })
    ]);
  }

  private async collectExistingRoomNumbersAcrossPages(): Promise<Set<string>> {
    logger.info('Collecting existing room numbers across all pages to avoid duplication');

    const existing = new Set<string>();

    await this.waitForGridReady();

    if ((await this.tableRows.count()) === 0) {
      logger.info('Room grid has no rows available for scanning');
      return existing;
    }

    await this.resetToFirstPage();
    const { totalPages, totalEntries } = await this.getPaginationStats();

    logger.info(`Room grid pagination detected: ${totalEntries} entries across ${totalPages} page(s)`);

    for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
      const rowCount = await this.tableRows.count();
      logger.info(`Scanning Room page ${pageIndex}/${totalPages} with ${rowCount} row(s)`);

      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const row = this.tableRows.nth(rowIndex);
        const candidate = ((await row.locator('td').nth(1).textContent()) || '').trim();
        if (candidate) {
          existing.add(candidate);
        }
      }

      if (pageIndex >= totalPages) {
        continue;
      }

      if (await this.isPaginationButtonDisabled(this.nextButton)) {
        throw new Error(`Pagination ended unexpectedly at page ${pageIndex} while totalPages is ${totalPages}.`);
      }

      const previousPage = await this.getActivePageNumber();
      await this.elementActions.click(this.nextButton, 'Room next page button');

      await expect.poll(async () => this.getActivePageNumber(), {
        timeout: 15000,
        message: `Room pagination did not move from page ${previousPage} to next page`
      }).toBe(previousPage + 1);
    }

    logger.info(`Collected ${existing.size} existing room number(s)`);
    return existing;
  }

  private buildUniqueRoomNumbers(existing: Set<string>, total: number): string[] {
    const numericExisting = Array.from(existing)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 0);

    let seed = numericExisting.length > 0 ? Math.max(...numericExisting) + 1 : 3001;
    const generated: string[] = [];

    while (generated.length < total) {
      const candidate = `${seed}`;
      seed += 1;

      if (existing.has(candidate)) {
        continue;
      }

      existing.add(candidate);
      generated.push(candidate);
    }

    return generated;
  }

  private async selectComboboxByArrowDown(combobox: Locator, arrowDownCount: number, label: string): Promise<void> {
    await this.elementActions.click(combobox, `${label} combobox`);

    const input = combobox.locator('xpath=ancestor::ng-select[1]').locator('.ng-input input').first();
    await input.waitFor({ state: 'visible', timeout: 5000 });

    for (let i = 0; i < arrowDownCount; i += 1) {
      await input.press('ArrowDown');
    }

    await input.press('Enter');
  }

  private async fillRoomForm(record: RoomRecord, categoryArrowDown: number, blockArrowDown: number, floorArrowDown: number): Promise<void> {
    const roomNoInput = this.getRoomNoInput();
    const descriptionInput = this.getDescriptionInput();

    await this.elementActions.click(roomNoInput, 'Room Number input click');
    await roomNoInput.fill(record.roomNo);
    await this.elementActions.click(roomNoInput, 'Room Number input re-click');
    await roomNoInput.dblclick();
    await this.elementActions.sendKeys(roomNoInput, record.roomNo, 'Room Number input');

    await this.elementActions.click(descriptionInput, 'Room Description input click 1');
    await this.elementActions.click(descriptionInput, 'Room Description input click 2');
    await this.elementActions.sendKeys(descriptionInput, record.description, 'Room Description input');

    await this.selectComboboxByArrowDown(this.getCategoryCombobox(), categoryArrowDown, 'Room Category');
    await this.selectComboboxByArrowDown(this.getBlockCombobox(), blockArrowDown, 'Block');
    await this.selectComboboxByArrowDown(this.getFloorCombobox(), floorArrowDown, 'Floor');
  }

  private async createRoom(record: RoomRecord, categoryArrowDown: number, blockArrowDown: number, floorArrowDown: number): Promise<void> {
    await this.elementActions.click(this.addButton, 'Add Room button');
    await this.fillRoomForm(record, categoryArrowDown, blockArrowDown, floorArrowDown);

    await this.elementActions.click(this.getSaveButton(), 'Save Room button');
    await this.expectPopupAndConfirm(['details created/updated successfully', 'success'], 'OK');
  }

  private async clickRowEditButton(rowLocator: Locator): Promise<void> {
    const editIcon = rowLocator.locator('.bx.bx-edit-alt').first();
    await editIcon.scrollIntoViewIfNeeded();
    await this.elementActions.click(editIcon, 'Room row edit button');
  }

  private async deactivateAndDeleteRoomByNumber(roomNo: string): Promise<void> {
    await this.elementActions.click(this.searchInput, 'Room search input');
    await this.searchInput.fill('');
    await this.searchInput.fill(roomNo);

    const row = this.getRowsByText(roomNo).first();
    await expect(row).toBeVisible();

    await this.clickRowEditButton(row);

    const activeSwitch = this.page.getByRole('switch', { name: 'Active' });
    if ((await activeSwitch.count()) > 0 && await activeSwitch.isChecked()) {
      await activeSwitch.uncheck();
    }

    await this.elementActions.click(this.updateButton, 'Update Room button');
    await this.expectPopupAndConfirm(['details created/updated successfully', 'success'], 'OK');

    await this.elementActions.click(this.deleteButton, 'Delete Room button');
    await this.expectPopupAndConfirm(['do you want to delete the selected record', 'please confirm'], 'Yes');
    await this.expectPopupAndConfirm(['reuqested data has been deleted successfully', 'data deleted successfully', 'deleted'], 'OK');
  }

  async openRoomPage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Room Parameter > Room');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup link');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup link');
    await this.elementActions.click(this.roomParameterLink, 'Room Parameter link');
    await this.elementActions.click(this.roomLink, 'Room link');
  }

  async runRoomCreateAndCleanupFlow(): Promise<string[]> {
    await this.openRoomPage();

    const existingRoomNumbers = await this.collectExistingRoomNumbersAcrossPages();
    const roomNumbers = this.buildUniqueRoomNumbers(existingRoomNumbers, 2);
    const records: RoomRecord[] = roomNumbers.map((roomNo) => ({ roomNo, description: 'automation' }));

    // Keep dropdown navigation aligned with observed manual flow.
    await this.createRoom(records[0], 4, 1, 4);
    await this.createRoom(records[1], 5, 1, 2);

    for (const roomNo of roomNumbers) {
      await this.deactivateAndDeleteRoomByNumber(roomNo);
    }

    return roomNumbers;
  }
}