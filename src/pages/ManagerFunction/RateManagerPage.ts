import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export interface RateManagerData {
  rateCode: string;
  publishedRackRateArrowDowns: number;
  rateCategoryArrowDowns: number;
  description: string;
  notes: string;
  marketSegmentKeys: Array<'ArrowDown' | 'ArrowUp'>;
  closeAfterSave?: boolean;
}

export class RateManagerPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly managerFunctionsLink: Locator;
  private readonly rateManagerLink: Locator;
  private readonly newRateButton: Locator;
  private readonly saveButton: Locator;
  private readonly okButton: Locator;
  private readonly successMessage: Locator;
  private readonly closeButton: Locator;
  private readonly postSaveButtons: Locator;
  private readonly rateCodeInputLocator: Locator;
  private readonly globalSearchInput: Locator;
  private readonly guestManagementMenuItem: Locator;
  private readonly newReservationButton: Locator;
  private readonly nextButton: Locator;
  private readonly reservationRoomTable: Locator;
  private readonly rateManagerTopbarLink: Locator;
  private readonly propertyHeader: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    this.rateCodeInputLocator = this.page.getByText('Code Already Exists');
    this.managerFunctionsLink = this.page.getByRole('link', { name: ' Manager Functions' });
    this.rateManagerLink = this.page.getByRole('link', { name: ' Rate Manager' });
    this.newRateButton = this.page.getByRole('button', { name: '󰐕 New Rate' });
    this.saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
    this.okButton = this.page.getByRole('button', { name: 'OK' });
    this.successMessage = this.page.getByRole('paragraph');
    this.closeButton = this.page.getByRole('button', { name: 'Close' });
    this.postSaveButtons = this.page.locator('.button-container > button');

    this.globalSearchInput = this.page.getByRole('textbox', { name: 'Search...' });
    this.guestManagementMenuItem = this.page.getByText('Guest Management', { exact: true });
    this.newReservationButton = this.page.getByRole('button', { name: /New Reservation/ });
    this.nextButton = this.page.getByRole('button', { name: 'Next', exact: true });
    this.reservationRoomTable = this.page.locator('.grid.workspace table.my-table tbody');

    this.rateManagerTopbarLink = this.page
      .locator('#page-topbar')
      .getByText('Rate Manager', { exact: true });
    this.propertyHeader = this.page.getByRole('heading', {
      name: /Property Id:.*User Id/i,
    });
  }

  rateCodeInput(): Locator {
    return this.page.getByRole('textbox').first();
  }

  publishedRackRateInput(): Locator {
    return this.page.getByRole('textbox').nth(1);
  }

  rateCategoryInput(): Locator {
    return this.page.getByRole('textbox').nth(2);
  }

  descriptionInput(): Locator {
    return this.page.getByRole('textbox').nth(3);
  }

  getTextArea(): Locator {
    return this.page.locator('textarea');
  }

  getMarketSegmentInput(): Locator {
    return this.page.getByRole('combobox').nth(2);
  }

  getSaveButton(): Locator {
    return this.saveButton;
  }

  getOkButton(): Locator {
    return this.okButton;
  }

  getNewRateButton(): Locator {
    return this.newRateButton;
  }

  private async selectByArrowDown(dropdown: Locator, arrowDownCount: number, fieldName: string): Promise<void> {
    await this.elementActions.click(dropdown, `${fieldName} dropdown`);

    for (let index = 0; index < arrowDownCount; index++) {
      await this.page.keyboard.press('ArrowDown');
    }

    await this.page.keyboard.press('Enter');
  }

  private async selectByKeySequence(dropdown: Locator, keySequence: Array<'ArrowDown' | 'ArrowUp'>, fieldName: string): Promise<void> {
    await this.elementActions.click(dropdown, `${fieldName} dropdown`);

    for (const key of keySequence) {
      await this.page.keyboard.press(key);
    }

    await this.page.keyboard.press('Enter');
  }

  private getToggleById(id: string): Locator {
    return this.page.locator(`input[type="checkbox"][role="switch"]#${id}`);
  }

  private async ensureToggleEnabled(toggleId: string, toggleName: string): Promise<void> {
    const toggle = this.getToggleById(toggleId);

    await toggle.waitFor({ state: 'visible', timeout: 5000 });
    await toggle.scrollIntoViewIfNeeded();

    const isChecked = await toggle.isChecked();
    if (!isChecked) {
      await this.elementActions.click(toggle, `${toggleName} toggle`);
      logger.info(`Enabled toggle: ${toggleName}`);
    } else {
      logger.info(`Toggle already enabled: ${toggleName}`);
    }
  }

  async ensureAllTogglesEnabled(): Promise<void> {
    logger.info('Ensuring all rate form toggles are enabled');

    await this.ensureToggleEnabled('actv', 'Active');
    await this.ensureToggleEnabled('is_fixed_occupancy_based_rate', 'Is fixed occupancy based rate');
    await this.ensureToggleEnabled('inctax', 'Rates Inclusive of Taxes');
    await this.ensureToggleEnabled('supress', 'Suppress (Do not display the price)');
    await this.ensureToggleEnabled('applicable_for_grup', 'Applicable for Group Member');
    await this.ensureToggleEnabled('applicable_for_irs', 'Applicable for IRS');
    await this.ensureToggleEnabled('system_overide', 'Allow Override for interfaces');
    await this.ensureToggleEnabled('overridereserv', 'Allow override for Users');
    await this.ensureToggleEnabled('reserve_fixed_rate', 'Reservation Fixed Rate');
  }

  async openRateManagerFromManagerFunctions(): Promise<void> {
    logger.info('Opening Rate Manager from Manager Functions');

    await this.page.mouse.move(0,400);

    await this.elementActions.click(this.managerFunctionsLink, 'Manager Functions link');
    await this.elementActions.click(this.rateManagerLink, 'Rate Manager link');
  }

  async createNewRate1(rateData: RateManagerData): Promise<void> {
    logger.info(`Creating rate with code ${rateData.rateCode}`);

    await this.elementActions.click(this.newRateButton, 'New Rate button');

    await this.elementActions.click(this.rateCodeInput(), 'Rate code input');
    await this.elementActions.sendKeys(this.rateCodeInput(), rateData.rateCode, 'Rate code input');

    await this.selectByArrowDown(this.publishedRackRateInput(), rateData.publishedRackRateArrowDowns, 'Published rack rate');
    await this.selectByArrowDown(this.rateCategoryInput(), rateData.rateCategoryArrowDowns, 'Rate category');

    await this.elementActions.click(this.descriptionInput(), 'Description input');
    await this.elementActions.sendKeys(this.descriptionInput(), rateData.description, 'Description input');

    await this.elementActions.click(this.getTextArea(), 'Rate notes textarea');
    await this.elementActions.sendKeys(this.getTextArea(), rateData.notes, 'Rate notes textarea');

    await this.selectByKeySequence(this.getMarketSegmentInput(), rateData.marketSegmentKeys, 'Market segment');

    await this.elementActions.click(this.saveButton, 'Save button');
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Success dialog OK button');

    if (rateData.closeAfterSave) {
      await this.closeRate();
    }
  }

  async createNewRate(rateData: RateManagerData): Promise<void> {
  logger.info(`Creating rate with code ${rateData.rateCode}`);

  await this.elementActions.click(this.newRateButton, 'New Rate button');

  let currentRateCode = Number(rateData.rateCode);

  while (true) {
    await this.elementActions.click(this.rateCodeInput(), 'Rate code input');

    await this.rateCodeInput().clear();
    await this.elementActions.sendKeys(
      this.rateCodeInput(),
      currentRateCode.toString(),
      'Rate code input'
    );

    logger.info(`Trying Rate Code : ${currentRateCode}`);

    // Trigger validation by moving to next field
    await this.elementActions.click(
      this.publishedRackRateInput(),
      'Published Rack Rate input'
    );

    const duplicateMessage = this.page.getByText('Code Already Exists');

    try {
      await duplicateMessage.waitFor({
        state: 'visible',
        timeout: 2000
      });

      logger.info(`Rate Code ${currentRateCode} already exists`);

      await this.elementActions.click(
        this.okButton,
        'Duplicate Code OK button'
      );

      currentRateCode++;

      logger.info(`Trying next Rate Code : ${currentRateCode}`);
    } catch {
      logger.info(`Rate Code ${currentRateCode} is unique`);
      rateData.rateCode = currentRateCode.toString();
      break;
    }
  }

  await this.selectByArrowDown(
    this.publishedRackRateInput(),
    rateData.publishedRackRateArrowDowns,
    'Published rack rate'
  );

  await this.selectByArrowDown(
    this.rateCategoryInput(),
    rateData.rateCategoryArrowDowns,
    'Rate category'
  );

  await this.elementActions.click(
    this.descriptionInput(),
    'Description input'
  );

  await this.elementActions.sendKeys(
    this.descriptionInput(),
    rateData.description,
    'Description input'
  );

  await this.elementActions.click(
    this.getTextArea(),
    'Rate notes textarea'
  );

  await this.elementActions.sendKeys(
    this.getTextArea(),
    rateData.notes,
    'Rate notes textarea'
  );

  await this.selectByKeySequence(
    this.getMarketSegmentInput(),
    rateData.marketSegmentKeys,
    'Market segment'
  );

  await this.ensureAllTogglesEnabled();

  await this.elementActions.click(
    this.saveButton,
    'Save button'
  );

  await expect(this.successMessage).toContainText(
    'Details created/updated successfully.'
  );

  await this.elementActions.click(
    this.okButton,
    'Success dialog OK button'
  );

  // if (rateData.closeAfterSave) {
  //   await this.closeRate();
  // }
}

  // async closeRate(): Promise<void> {
  //   logger.info('Closing Rate Manager screen');

  //   const secondaryButton = this.postSaveButtons.nth(1);
  //   if (await secondaryButton.isVisible().catch(() => false)) {
  //     await this.elementActions.click(secondaryButton, 'Secondary post-save button');
  //   }

  //   if (await this.closeButton.isVisible().catch(() => false)) {
  //     await this.elementActions.click(this.closeButton, 'Close button');
  //   }
  // }

  async runRateManagerCreateFlow(rateData: RateManagerData): Promise<void> {
    await this.openRateManagerFromManagerFunctions();
    await this.createNewRate(rateData);
  }

  private getRoomTypeRowHeaders(): Locator {
    return this.page.locator('.card-view-row-header h5');
  }

  async getRoomTypeCodes(): Promise<string[]> {
    logger.info('Capturing all room type codes from the Rate Manager grid');

    const headers = this.getRoomTypeRowHeaders();
    await headers.first().waitFor({ state: 'visible', timeout: 10000 });

    const codes = await headers.allTextContents();
    const trimmedCodes = codes
      .map(code => code.trim())
      .filter(code => code.length > 0);

    logger.info(`Captured ${trimmedCodes.length} room type codes: ${JSON.stringify(trimmedCodes)}`);

    return trimmedCodes;
  }

  async runRateManagerSetupFlow(): Promise<string[]> {
    logger.info('Running Rate Manager setup flow (capture room type codes)');

    await this.openRateManagerFromManagerFunctions();
    return await this.getRoomTypeCodes();
  }

  async runManagerRateSetupStep1(): Promise<string[]> {
    return await this.runRateManagerSetupFlow();
  }

  async searchAndOpenGuestManagementFromHeader(): Promise<void> {
    logger.info('Searching and opening Guest Management from the global search');

    await this.elementActions.click(this.globalSearchInput, 'Global search input');
    await this.elementActions.sendKeys(this.globalSearchInput, 'guest mana', 'Global search input');
    await this.elementActions.click(this.guestManagementMenuItem, 'Guest Management menu item');
  }

  async openNewReservationRoomSelection(): Promise<void> {
    logger.info('Opening New Reservation and advancing to the room selection page');

    await this.elementActions.click(this.newReservationButton, 'New Reservation button');
    await this.elementActions.click(this.nextButton, 'Next button');
  }

  async getRoomTypeCodesFromNewReservation(): Promise<string[]> {
    logger.info('Capturing all room type codes from the New Reservation room selection page');

    const table = this.reservationRoomTable.first();
    await table.waitFor({ state: 'visible', timeout: 15000 });

    // The room type code (e.g. "DGT", "LPT", "DUMMY Room") lives inside the
    // <h5> element within the first <td>'s `.row-header` div. Grabbing the
    // full cell text would also pull in the room count and "Upto X person(s)
    // per room" line, so we target the h5 directly.
    const headerLocator = table.locator('tr .row-header h5');
    await headerLocator.first().waitFor({ state: 'visible', timeout: 10000 });

    const codes = await headerLocator.allTextContents();
    const trimmedCodes = codes
      .map(code => code.trim())
      .filter(code => code.length > 0);

    logger.info(`Captured ${trimmedCodes.length} room type codes from New Reservation: ${JSON.stringify(trimmedCodes)}`);
    return trimmedCodes;
  }

  async runNewReservationRoomTypeCapture(): Promise<string[]> {
    logger.info('Running New Reservation flow and capturing room type codes');

    await this.searchAndOpenGuestManagementFromHeader();
    await this.openNewReservationRoomSelection();
    return await this.getRoomTypeCodesFromNewReservation();
  }

  async openRateManagerFromGlobalSearch(): Promise<void> {
    logger.info('Opening Rate Manager from global search');

    await this.elementActions.click(this.globalSearchInput, 'Global search input');
    await this.elementActions.sendKeys(this.globalSearchInput, 'rate manager', 'Global search input');
    await this.elementActions.click(this.rateManagerTopbarLink, 'Rate Manager topbar link');
  }

  async getBusinessDate(): Promise<string> {
    logger.info('Fetching business date from property header');

    await this.propertyHeader.first().waitFor({ state: 'visible', timeout: 10000 });

    const fullText = ((await this.propertyHeader.first().textContent()) ?? '').trim();
    logger.info(`Property header text: ${fullText}`);

    // The header looks like:
    //   "Property Id: WEBWE, User Id: Sachin Kumar, Shift: 3, Business Date: 27/06/2025"
    const match = fullText.match(/Business Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (!match || !match[1]) {
      throw new Error(
        `Could not parse Business Date from property header text: "${fullText}"`,
      );
    }

    const businessDate = match[1];
    logger.info(`Parsed business date: ${businessDate}`);
    return businessDate;
  }

  async clickRateManagerCellForCommonRoomType(
    commonRoomTypeCode: string,
    businessDate: string,
  ): Promise<void> {
    logger.info(
      `Clicking Rate Manager cell for room type "${commonRoomTypeCode}" on date ${businessDate}`,
    );

    // First, find the column index for the business date by looking at the header row
    const dateColumnIndex = await this.getDateColumnIndex(businessDate);
    if (dateColumnIndex === -1) {
      throw new Error(
        `Business date "${businessDate}" not found in Rate Manager header`,
      );
    }

    // Locate the row whose header contains the common room type code in an <h5>.
    // Match the whole h5 text (allowing surrounding whitespace) so we don't accidentally
    // pick up a row whose header merely *contains* the code as a substring.
    const escapedCode = commonRoomTypeCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const targetRow = this.page
      .locator('.workspace .row.g-1') // Each row is a .row.g-1 div within .workspace
      .filter({
        has: this.page.locator('h5', { hasText: new RegExp(`^\\s*${escapedCode}\\s*$`, 'i') }),
      });

    const rowCount = await targetRow.count();
    if (rowCount === 0) {
      throw new Error(
        `Common room type "${commonRoomTypeCode}" was not found in the Rate Manager grid`,
      );
    }
    if (rowCount > 1) {
      logger.warn(
        `Multiple rows (${rowCount}) matched room type "${commonRoomTypeCode}" - using the first one`,
      );
    }

    // Within the matching row, get all the date columns and pick the one at our calculated index
    const dateCells = targetRow.first().locator('.col-md-1.col-6');
    const targetCell = dateCells.nth(dateColumnIndex);

    const cellCount = await targetCell.count();
    if (cellCount === 0) {
      throw new Error(
        `Could not find date cell at index ${dateColumnIndex} for room type "${commonRoomTypeCode}"`,
      );
    }

    await targetCell.scrollIntoViewIfNeeded();
    await this.elementActions.click(
      targetCell,
      `Rate Manager cell for ${commonRoomTypeCode} on ${businessDate}`,
    );
  }

  /**
   * Returns the zero-based column index for the given business date in the Rate Manager grid.
   * Uses the first data row (e.g. "Manual") to find which column contains the date.
   * Returns -1 if the date is not found.
   */
  private async getDateColumnIndex(businessDate: string): Promise<number> {
    logger.info(`Finding column index for business date: ${businessDate}`);

    // The first .row.g-1 within .workspace is the first data row (e.g. "Manual").
    // Its .col-md-1.col-6 children are the date cells for that row.
    const firstDataRow = this.page.locator('.workspace .row.g-1').first();

    // Wait for at least one date cell to be visible
    await firstDataRow.locator('.col-md-1.col-6').first().waitFor({
      state: 'visible',
      timeout: 10000,
    });

    // Get all date columns (these are the .col-md-1.col-6 divs)
    const dateCells = firstDataRow.locator('.col-md-1.col-6');
    const count = await dateCells.count();

    for (let i = 0; i < count; i++) {
      const cell = dateCells.nth(i);
      // The date is inside a <span class="n-mt-5"> within the cell
      const dateText = await cell
        .locator('.n-mt-5')
        .first()
        .textContent();
      if (dateText?.trim() === businessDate) {
        logger.info(`Found business date "${businessDate}" at column index ${i}`);
        return i;
      }
    }

    logger.warn(
      `Business date "${businessDate}" not found in any column (checked ${count} columns)`,
    );
    return -1;
  }

  async runOpenRateManagerAndClickDateCell(commonRoomTypeCode: string): Promise<string> {
    logger.info(
      `Running open-Rate-Manager-from-search and click date cell for room type "${commonRoomTypeCode}"`,
    );

    await this.openRateManagerFromGlobalSearch();
    const businessDate = await this.getBusinessDate();
    await this.clickRateManagerCellForCommonRoomType(commonRoomTypeCode, businessDate);
    return businessDate;
  }

  private escapeForRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Scans the Rate Details floating panel and returns the list of rate codes
   * whose inputs are editable (i.e., not disabled).
   */
  async getEditableRateCodesFromRateDetails(): Promise<string[]> {
    logger.info('Capturing editable rate codes from Rate Details panel');

    const container = this.page.locator('app-rate-details-floating, .modal-body').first();
    await container.waitFor({ state: 'visible', timeout: 10000 });

    const headers = container.locator('h5');
    const count = await headers.count();
    const editableCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const header = headers.nth(i);
      const rawText = (await header.textContent()) ?? '';
      const code = rawText.trim().replace(/\s+/g, ' ');

      // Find the closest card container for this header and check for any enabled inputs
      const card = header.locator('xpath=ancestor::div[contains(@class, "card")]');
      const enabledInputs = await card.locator('input:not([disabled]), textarea:not([disabled])').count();

      if (enabledInputs > 0) {
        editableCodes.push(code);
      }
    }

    logger.info(`Found ${editableCodes.length} editable rate codes: ${JSON.stringify(editableCodes)}`);
    return editableCodes;
  }

  /**
   * Clicks the eye (settings) icon adjacent to the provided rate code inside
   * the Rate Details floating panel.
   */
  async clickEyeIconForRateCode(rateCode: string): Promise<void> {
    logger.info(`Clicking eye icon for rate code: ${rateCode}`);

    const container = this.page.locator('app-rate-details-floating, .modal-body').first();
    await container.waitFor({ state: 'visible', timeout: 10000 });

    const escaped = this.escapeForRegex(rateCode);
    const header = container.locator('h5', { hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i') }).first();
    await header.waitFor({ state: 'visible', timeout: 5000 });

    const eyeIcon = header.locator('i.mdi-eye-settings, .mdi-eye-settings').first();
    if (!(await eyeIcon.isVisible().catch(() => false))) {
      throw new Error(`Eye icon not found for rate code: ${rateCode}`);
    }

    await this.elementActions.click(eyeIcon, `Eye icon for ${rateCode}`);
  }

  /**
   * Convenience flow: after opening a rate details panel, find editable rate
   * codes, pick the first one and click its eye icon. Returns the selected code.
   */
  async selectFirstEditableRateCodeAndOpenSettings(): Promise<string> {
    const editable = await this.getEditableRateCodesFromRateDetails();
    if (editable.length === 0) {
      throw new Error('No editable rate codes found in Rate Details');
    }

    const chosen = editable[0];
    await this.clickEyeIconForRateCode(chosen);
    return chosen;
  }
}