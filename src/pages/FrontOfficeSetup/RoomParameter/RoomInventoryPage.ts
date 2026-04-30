import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

interface RoomInventoryRecord {
  inventoryNo: string;
  description: string;
}

export class RoomInventoryPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: /FrontOffice Setup/i });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: /Parameter Setup/i });
  private readonly roomParameterLink = this.page.getByRole('link', { name: /Room Parameter/i });
  private readonly roomInventoryLink = this.page.getByRole('link', { name: /Room Inventory/i });
  private readonly menuNextLink = this.page.getByRole('link', { name: /^Next$/i }).first();

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

  private getInventoryModal(): Locator {
    return this.page.locator('ngb-modal-window').last();
  }

  private getInventoryNoInput(): Locator {
    const modal = this.getInventoryModal();
    const byLabel = modal
      .locator("xpath=.//label[contains(normalize-space(),'Inventory')]/following::input[1]")
      .first();

    return modal.getByRole('textbox').first().or(byLabel);
  }

  private getDescriptionInput(): Locator {
    const modal = this.getInventoryModal();
    const byLabel = modal
      .locator("xpath=.//label[contains(normalize-space(),'Description')]/following::input[1]")
      .first();

    return modal.getByRole('textbox').nth(2).or(byLabel);
  }

  private getSaveButton(): Locator {
    return this.getInventoryModal().getByRole('button', { name: 'Save', exact: true });
  }

  private getSaveAndAddNewButton(): Locator {
    return this.getInventoryModal().getByRole('button', { name: /Save\s*&\s*Add\s*New/i }).first();
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

  private async waitForPopupText(expectedMessages: string[], timeoutMs: number = 10000): Promise<void> {
    await this.popupMessage.waitFor({ state: 'visible', timeout: timeoutMs });

    await expect.poll(async () => {
      const popupText = ((await this.popupMessage.innerText()) || '').toLowerCase();
      return expectedMessages.some((message) => popupText.includes(message.toLowerCase()));
    }, {
      timeout: timeoutMs,
      message: `Popup did not contain any expected text: ${expectedMessages.join(' | ')}`
    }).toBe(true);
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
    const fallback = { pageSize: 10, totalEntries: 0, totalPages: 1 };

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

    return { pageSize, totalEntries, totalPages };
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
      await this.elementActions.click(this.firstButton, 'Room Inventory first page button');
      await this.page.waitForLoadState('networkidle');
      return;
    }

    if ((await this.previousButton.count()) === 0) {
      return;
    }

    let guard = 0;
    while (!(await this.isPaginationButtonDisabled(this.previousButton)) && guard < 50) {
      guard += 1;
      await this.elementActions.click(this.previousButton, 'Room Inventory previous page button');
      await this.page.waitForLoadState('networkidle');
    }
  }

  private async collectExistingInventoryNumbersAcrossPages(): Promise<Set<string>> {
    logger.info('Collecting existing room inventory numbers across all pages to avoid duplication');

    const existing = new Set<string>();

    await this.waitForGridReady();

    if ((await this.tableRows.count()) === 0) {
      logger.info('Room Inventory grid has no rows available for scanning');
      return existing;
    }

    await this.resetToFirstPage();
    const { totalPages, totalEntries } = await this.getPaginationStats();

    logger.info(`Room Inventory grid pagination detected: ${totalEntries} entries across ${totalPages} page(s)`);

    for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
      const rowCount = await this.tableRows.count();
      logger.info(`Scanning Room Inventory page ${pageIndex}/${totalPages} with ${rowCount} row(s)`);

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
      await this.elementActions.click(this.nextButton, 'Room Inventory next page button');

      await expect.poll(async () => this.getActivePageNumber(), {
        timeout: 15000,
        message: `Room Inventory pagination did not move from page ${previousPage} to next page`
      }).toBe(previousPage + 1);
    }

    logger.info(`Collected ${existing.size} existing room inventory number(s)`);
    return existing;
  }

  private buildUniqueInventoryNumbers(existing: Set<string>, total: number): string[] {
    const numericExisting = Array.from(existing)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 0);

    let seed = numericExisting.length > 0 ? Math.max(...numericExisting) + 1 : 5601;
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

  private async openCreateModal(): Promise<void> {
    await this.elementActions.click(this.addButton, 'Add Room Inventory button');
  }

  private async ensureCreateModalOpen(): Promise<void> {
    const modal = this.getInventoryModal();
    if ((await modal.count()) > 0 && await modal.isVisible()) {
      return;
    }

    await this.openCreateModal();
  }

  private async fillInventoryForm(record: RoomInventoryRecord): Promise<void> {
    const inventoryNoInput = this.getInventoryNoInput();
    const descriptionInput = this.getDescriptionInput();

    await this.elementActions.click(inventoryNoInput, 'Room Inventory Number input');
    await inventoryNoInput.fill('');
    await inventoryNoInput.fill(record.inventoryNo);

    await this.elementActions.click(descriptionInput, 'Room Inventory Description input');
    await descriptionInput.fill('');
    await descriptionInput.fill(record.description);
  }

  private async createInventory(record: RoomInventoryRecord, mode: 'Save' | 'SaveAndAddNew', openModal: boolean): Promise<void> {
    if (openModal) {
      await this.openCreateModal();
    } else {
      await this.ensureCreateModalOpen();
    }

    await this.fillInventoryForm(record);

    if (mode === 'SaveAndAddNew') {
      await this.elementActions.click(this.getSaveAndAddNewButton(), 'Save and Add New Room Inventory button');
    } else {
      await this.elementActions.click(this.getSaveButton(), 'Save Room Inventory button');
    }

    await this.expectPopupAndConfirm(['details created/updated successfully', 'success'], 'OK');
  }

  private async clickRowEditButton(rowLocator: Locator): Promise<void> {
    const editIcon = rowLocator.locator('.bx.bx-edit-alt').first();
    await editIcon.scrollIntoViewIfNeeded();
    await this.elementActions.click(editIcon, 'Room Inventory row edit button');
  }

  private async deactivateAndDeleteInventoryByNumber(inventoryNo: string): Promise<void> {
    await this.elementActions.click(this.searchInput, 'Room Inventory search input');
    await this.searchInput.fill('');
    await this.searchInput.fill(inventoryNo);

    const row = this.getRowsByText(inventoryNo).first();
    await expect(row).toBeVisible();

    await this.clickRowEditButton(row);

    const activeSwitch = this.page.getByRole('switch', { name: 'Active' });
    if ((await activeSwitch.count()) > 0 && await activeSwitch.isChecked()) {
      await activeSwitch.uncheck();
    }

    await this.elementActions.click(this.updateButton, 'Update Room Inventory button');
    await this.expectPopupAndConfirm(['details created/updated successfully', 'success'], 'OK');

    await this.elementActions.click(this.deleteButton, 'Delete Room Inventory button');
    await this.waitForPopupText(['do you want to delete the selected record', 'please confirm']);
    await this.elementActions.click(this.yesButton, 'Popup Yes button');
    await this.waitForPopupText(['reuqested data has been deleted successfully', 'requested data has been deleted successfully', 'data has been deleted successfully', 'deleted']);
    await this.elementActions.click(this.okButton, 'Popup OK button');
  }

  private async openRoomInventoryMenu(): Promise<void> {
    if (await this.roomInventoryLink.isVisible()) {
      return;
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (await this.roomInventoryLink.isVisible()) {
        return;
      }

      if ((await this.menuNextLink.count()) === 0) {
        break;
      }

      await this.elementActions.click(this.menuNextLink, 'Room Parameter Next link');
      await this.page.waitForTimeout(300);
    }

    await expect(this.roomInventoryLink).toBeVisible();
  }

  async openRoomInventoryPage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Room Parameter > Room Inventory');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup link');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup link');
    await this.elementActions.click(this.roomParameterLink, 'Room Parameter link');

    await this.openRoomInventoryMenu();
    await this.elementActions.click(this.roomInventoryLink, 'Room Inventory link');
  }

  async runRoomInventoryCreateAndCleanupFlow(): Promise<string[]> {
    await this.openRoomInventoryPage();

    const existingInventoryNumbers = await this.collectExistingInventoryNumbersAcrossPages();
    const inventoryNumbers = this.buildUniqueInventoryNumbers(existingInventoryNumbers, 3);

    const records: RoomInventoryRecord[] = [
      { inventoryNo: inventoryNumbers[0], description: 'wireless charger' },
      { inventoryNo: inventoryNumbers[1], description: 'water jug' },
      { inventoryNo: inventoryNumbers[2], description: 'wine glass' }
    ];

    await this.createInventory(records[0], 'Save', true);
    await this.createInventory(records[1], 'SaveAndAddNew', true);
    await this.createInventory(records[2], 'Save', false);

    for (const inventoryNo of inventoryNumbers) {
      await this.deactivateAndDeleteInventoryByNumber(inventoryNo);
    }

    return inventoryNumbers;
  }
}
