import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────



export interface RateManagerData {
  rateCode: string;
  publishedRackRateArrowDowns: number;
  rateCategoryArrowDowns: number;
  description: string;
  notes: string;
  marketSegmentKeys: Array<'ArrowDown' | 'ArrowUp'>;
  closeAfterSave?: boolean;
}

export interface RateGridSnapshotRow {
  roomCode: string;
  values: string[];
}

// ──────────────────────────────────────────────────────────────
//  Page Object
// ──────────────────────────────────────────────────────────────

export class RateManagerPage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ── Navigation locators ── */
  private readonly managerFunctionsLink: Locator;
  private readonly rateManagerLink: Locator;
  private readonly rateManagerTopbarLink: Locator;
  private readonly globalSearchInput: Locator;

  /* ── Rate form locators ── */
  private readonly newRateButton: Locator;
  private readonly saveButton: Locator;
  private readonly okButton: Locator;
  private readonly successMessage: Locator;
  private readonly closeButton: Locator;
  private readonly postSaveButtons: Locator;
  private readonly rateCodeInputLocator: Locator;

  /* ── Reservation / Guest Management locators ── */
  private readonly guestManagementMenuItem: Locator;
  private readonly newReservationButton: Locator;
  private readonly nextButton: Locator;
  private readonly reservationRoomTable: Locator;

  /* ── Advance Date Selection locators ── */
  private readonly advanceDateSelectionLink: Locator;
  private readonly dateRangeInput: Locator;
  private readonly allDaysCheckbox: Locator;
  private readonly applyButton: Locator;
  private readonly rateGridSaveButton: Locator;
  private readonly yesButton: Locator;

  /* ── Guest Management – Rate Verification locators ── */
  private readonly addOccupantButton: Locator;
  private readonly addChildOccupantButton: Locator;
  private readonly rateDropdownArrow: Locator;
  private readonly complimentaryRateOption: Locator;
  private readonly reservationTable: Locator;
  private readonly okReservationButton: Locator;
  private readonly guestOccupancyDropdown: Locator;
  private readonly expandRoomButton: Locator;

  /* ── Sections & Advance Configuration locators ── */
  private readonly sectionsButton: Locator;
  private readonly advanceConfigurationLink: Locator;
  private readonly copyRatesLink: Locator;

  /* ── Property header locator ── */
  private readonly propertyHeader: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    // Navigation
    this.managerFunctionsLink = this.page.getByRole('link', { name: ' Manager Functions' });
    this.rateManagerLink = this.page.getByRole('link', { name: ' Rate Manager' });
    this.rateManagerTopbarLink = this.page
      .locator('#page-topbar')
      .getByText('Rate Manager', { exact: true });
    this.globalSearchInput = this.page.getByRole('textbox', { name: 'Search...' });

    // Rate form
    this.newRateButton = this.page.getByRole('button', { name: '󰐕 New Rate' });
    //this.saveButton = this.page.getByRole('button', { name: 'Save', exact: true });

    this.saveButton = this.page
  .getByRole('button', { name: 'Save', exact: true })
  .or(this.page.getByRole('button', { name: '󰠘 Save' }));


    this.okButton = this.page.getByRole('button', { name: 'OK' });
    //this.okButton = this.page.getByRole('button', { name: 'OK' })
    this.successMessage = this.page.getByRole('paragraph');
    this.closeButton = this.page.getByRole('button', { name: 'Close' });
    this.postSaveButtons = this.page.locator('.button-container > button');
    this.rateCodeInputLocator = this.page.getByText('Code Already Exists');

    // Guest Management / Reservation
    this.guestManagementMenuItem = this.page.getByText('Guest Management', { exact: true });
    this.newReservationButton = this.page.getByRole('button', { name: /New Reservation/ });
    this.nextButton = this.page.getByRole('button', { name: 'Next', exact: true });
    this.reservationRoomTable = this.page.locator('.grid.workspace table.my-table tbody');

    // Advance Date Selection
    this.advanceDateSelectionLink = this.page.getByText('Advance Date Selection');
    this.dateRangeInput = this.page.getByRole('textbox', { name: 'Select Date Range' });
    this.allDaysCheckbox = this.page.getByRole('checkbox', { name: 'All Days' });
    this.applyButton = this.page.getByRole('button', { name: 'Apply' });
    this.rateGridSaveButton = this.page.getByRole('button', { name: '󰠘 Save' });
    this.yesButton = this.page.getByRole('button', { name: 'Yes' });

    // Guest Management – Rate Verification
    this.addOccupantButton = this.page.getByRole('button', { name: '+' }).first();
    this.addChildOccupantButton = this.page.getByRole('button', { name: '+' }).nth(2);
    this.rateDropdownArrow = this.page.locator('.ng-arrow-wrapper').first();
    this.complimentaryRateOption = this.page.getByText('Complimentary Rate');
    this.reservationTable = this.page.getByRole('table');
    this.okReservationButton = this.page.getByRole('button', { name: 'Ok' });
    this.guestOccupancyDropdown = this.page.locator('.dropdown-toggle.border').first();
    this.expandRoomButton = this.page
      .locator('.btn.btn-sm.waves-effect.waves-light.py-0.px-2.btn-soft-secondary')
      .first();

    // Sections & Advance Configuration
    //this.sectionsButton = this.page.getByRole('button', { name: 'Sections 󰅀' });
    this.sectionsButton = this.page.getByText('Sections');
    this.advanceConfigurationLink = this.page.getByText('Advance Configuration');
    this.copyRatesLink = this.page.getByText('Copy Rates');

    // Property header (used to read Business Date)
    this.propertyHeader = this.page.getByRole('heading', {
      name: /Property Id:.*User Id/i,
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  Rate Form – Field Locators (by positional index)
  // ──────────────────────────────────────────────────────────────

  /** Rate code (1st textbox) */
  rateCodeInput(): Locator {
    return this.page.getByRole('textbox').first();
  }

  /** Published Rack Rate (2nd textbox) */
  publishedRackRateInput(): Locator {
    return this.page.getByRole('textbox').nth(1);
  }

  /** Rate Category (3rd textbox) */
  rateCategoryInput(): Locator {
    return this.page.getByRole('textbox').nth(2);
  }

  /** Description (4th textbox) */
  descriptionInput(): Locator {
    return this.page.getByRole('textbox').nth(3);
  }

  /** Notes textarea */
  getTextArea(): Locator {
    return this.page.locator('textarea');
  }

  /** Market Segment combobox */
  getMarketSegmentInput(): Locator {
    return this.page.getByRole('combobox').nth(2);
  }

  // ──────────────────────────────────────────────────────────────
  //  Convenience Getters
  // ──────────────────────────────────────────────────────────────

  getSaveButton(): Locator {
    return this.saveButton;
  }

  getOkButton(): Locator {
    return this.okButton;
  }

  getNewRateButton(): Locator {
    return this.newRateButton;
  }

  // ──────────────────────────────────────────────────────────────
  //  Keyboard Helpers
  // ──────────────────────────────────────────────────────────────

  /**
   * Opens a dropdown and selects an option by pressing ArrowDown N times, then Enter.
   */
  private async selectByArrowDown(
    dropdown: Locator,
    arrowDownCount: number,
    fieldName: string,
  ): Promise<void> {
    await this.elementActions.click(dropdown, `${fieldName} dropdown`);

    for (let i = 0; i < arrowDownCount; i++) {
      await this.page.keyboard.press('ArrowDown');
    }

    await this.page.keyboard.press('Enter');
  }

  /**
   * Opens a dropdown and navigates with a custom key sequence (ArrowDown / ArrowUp), then Enter.
   */
  private async selectByKeySequence(
    dropdown: Locator,
    keySequence: Array<'ArrowDown' | 'ArrowUp'>,
    fieldName: string,
  ): Promise<void> {
    await this.elementActions.click(dropdown, `${fieldName} dropdown`);

    for (const key of keySequence) {
      await this.page.keyboard.press(key);
    }

    await this.page.keyboard.press('Enter');
  }

  // ──────────────────────────────────────────────────────────────
  //  Toggle Helpers
  // ──────────────────────────────────────────────────────────────

  private getToggleById(id: string): Locator {
    return this.page.locator(`input[type="checkbox"][role="switch"]#${id}`);
  }

  /** Ensures a single toggle switch is turned ON. */
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

  /** Turns ON every toggle switch on the Rate form. */
  async ensureAllTogglesEnabled(): Promise<void> {
    logger.info('Ensuring all rate form toggles are enabled');

    const toggles: Array<{ id: string; name: string }> = [
      { id: 'actv', name: 'Active' },
      { id: 'is_fixed_occupancy_based_rate', name: 'Is fixed occupancy based rate' },
      { id: 'inctax', name: 'Rates Inclusive of Taxes' },
      { id: 'supress', name: 'Suppress (Do not display the price)' },
      { id: 'applicable_for_grup', name: 'Applicable for Group Member' },
      { id: 'applicable_for_irs', name: 'Applicable for IRS' },
      { id: 'system_overide', name: 'Allow Override for interfaces' },
      { id: 'overridereserv', name: 'Allow override for Users' },
      { id: 'reserve_fixed_rate', name: 'Reservation Fixed Rate' },
    ];

    for (const { id, name } of toggles) {
      await this.ensureToggleEnabled(id, name);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  Navigation: Open Rate Manager
  // ──────────────────────────────────────────────────────────────

  /** Opens Rate Manager via the Manager Functions sidebar menu. */
  async openRateManagerFromManagerFunctions(): Promise<void> {
    logger.info('Opening Rate Manager from Manager Functions');

    await this.page.mouse.move(0, 400);
    await this.elementActions.click(this.managerFunctionsLink, 'Manager Functions link');
    await this.elementActions.click(this.rateManagerLink, 'Rate Manager link');
  }

  /** Opens Rate Manager via the global search bar in the top bar. */
  async openRateManagerFromGlobalSearch(): Promise<void> {
    logger.info('Opening Rate Manager from global search');

    await this.elementActions.click(this.globalSearchInput, 'Global search input');
    await this.elementActions.sendKeys(this.globalSearchInput, 'rate manager', 'Global search input');
    await this.elementActions.click(this.rateManagerTopbarLink, 'Rate Manager topbar link');
  }

  // ──────────────────────────────────────────────────────────────
  //  Rate Creation
  // ──────────────────────────────────────────────────────────────

  /**
   * Creates a new rate with duplicate-code handling.
   * If the entered code already exists, increments until a unique code is found,
   * then fills in all remaining fields and saves.
   */
  async createNewRate(rateData: RateManagerData): Promise<void> {
    logger.info(`Creating rate with code ${rateData.rateCode}`);

    // Step 1 – Click "New Rate"
    await this.elementActions.click(this.newRateButton, 'New Rate button');

    // Step 2 – Find a unique rate code (auto-increment if duplicate)
    await this.findUniqueRateCode(rateData);

    // Step 3 – Fill form fields
    await this.fillRateFormFields(rateData);

    // Step 4 – Enable all toggles
    await this.ensureAllTogglesEnabled();

    // Step 5 – Save and confirm
    await this.elementActions.click(this.saveButton, 'Save button');
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Success dialog OK button');
  }

  /**
   * Tries the given rate code; if it already exists, increments by 1 and retries
   * until a unique code is found. Updates `rateData.rateCode` with the accepted value.
   */
  private async findUniqueRateCode(rateData: RateManagerData): Promise<void> {
    let currentCode = Number(rateData.rateCode);

    while (true) {
      logger.info(`Trying Rate Code: ${currentCode}`);

      // Enter the code
      await this.elementActions.click(this.rateCodeInput(), 'Rate code input');
      await this.rateCodeInput().clear();
      await this.elementActions.sendKeys(this.rateCodeInput(), currentCode.toString(), 'Rate code input');

      // Move focus away to trigger validation
      await this.elementActions.click(this.publishedRackRateInput(), 'Published Rack Rate input');

      // Check for "Code Already Exists" message
      const duplicateMessage = this.page.getByText('Code Already Exists');

      try {
        await duplicateMessage.waitFor({ state: 'visible', timeout: 2000 });
        logger.info(`Rate Code ${currentCode} already exists – trying next`);
        await this.elementActions.click(this.okButton, 'Duplicate Code OK button');
        currentCode++;
      } catch {
        logger.info(`Rate Code ${currentCode} is unique`);
        rateData.rateCode = currentCode.toString();
        break;
      }
    }
  }

  /**
   * Fills in the rate form fields (Published Rack Rate, Rate Category,
   * Description, Notes, Market Segment) using the provided data.
   */
  private async fillRateFormFields(rateData: RateManagerData): Promise<void> {
    await this.selectByArrowDown(this.publishedRackRateInput(), rateData.publishedRackRateArrowDowns, 'Published rack rate');
    await this.selectByArrowDown(this.rateCategoryInput(), rateData.rateCategoryArrowDowns, 'Rate category');

    await this.elementActions.click(this.descriptionInput(), 'Description input');
    await this.elementActions.sendKeys(this.descriptionInput(), rateData.description, 'Description input');

    await this.elementActions.click(this.getTextArea(), 'Rate notes textarea');
    await this.elementActions.sendKeys(this.getTextArea(), rateData.notes, 'Rate notes textarea');

    await this.selectByKeySequence(this.getMarketSegmentInput(), rateData.marketSegmentKeys, 'Market segment');
  }

  /** High-level flow: open Rate Manager → create a new rate. */
  async runRateManagerCreateFlow(rateData: RateManagerData): Promise<void> {
    await this.openRateManagerFromManagerFunctions();
    await this.createNewRate(rateData);
  }

  // ──────────────────────────────────────────────────────────────
  //  Room Type Codes – from Rate Manager grid
  // ──────────────────────────────────────────────────────────────

  private getRoomTypeRowHeaders(): Locator {
    return this.page.locator('.card-view-row-header h5');
  }

  /** Returns all room-type codes visible in the Rate Manager grid. */
  async getRoomTypeCodes(): Promise<string[]> {
    logger.info('Capturing all room type codes from the Rate Manager grid');

    const headers = this.getRoomTypeRowHeaders();
    await headers.first().waitFor({ state: 'visible', timeout: 750000 });

    const codes = await headers.allTextContents();
    const trimmedCodes = codes.map((c) => c.trim()).filter((c) => c.length > 0);

    logger.info(`Captured ${trimmedCodes.length} room type codes: ${JSON.stringify(trimmedCodes)}`);
    return trimmedCodes;
  }

  /** Opens Rate Manager and returns room-type codes from the grid. */
  async runRateManagerSetupFlow(): Promise<string[]> {
    logger.info('Running Rate Manager setup flow (capture room type codes)');
    await this.openRateManagerFromManagerFunctions();
    return this.getRoomTypeCodes();
  }

  /** Alias kept for backward compatibility. */
  async runManagerRateSetupStep1(): Promise<string[]> {
    return this.runRateManagerSetupFlow();
  }

  // ──────────────────────────────────────────────────────────────
  //  Guest Management & New Reservation
  // ──────────────────────────────────────────────────────────────

  /** Searches for "Guest Management" in the global search and opens it. */
  async searchAndOpenGuestManagementFromHeader(): Promise<void> {
    logger.info('Searching and opening Guest Management from the global search');

    await this.elementActions.click(this.globalSearchInput, 'Global search input');
    await this.elementActions.sendKeys(this.globalSearchInput, 'guest mana', 'Global search input');
    await this.elementActions.click(this.guestManagementMenuItem, 'Guest Management menu item');
  }

  /** Clicks "New Reservation" and advances to the room selection page. */
  async openNewReservationRoomSelection(): Promise<void> {
    logger.info('Opening New Reservation and advancing to the room selection page');

    await this.elementActions.click(this.newReservationButton, 'New Reservation button');
    await this.elementActions.click(this.nextButton, 'Next button');
  }

  /**
   * Returns all room-type codes from the New Reservation room-selection table.
   * Targets the <h5> inside each row's `.row-header` div to avoid capturing
   * room counts or "Upto X person(s)" text.
   */
  async getRoomTypeCodesFromNewReservation(): Promise<string[]> {
    logger.info('Capturing all room type codes from the New Reservation room selection page');

    const table = this.reservationRoomTable.first();
    await table.waitFor({ state: 'visible', timeout: 15000 });

    const headerLocator = table.locator('tr .row-header h5');
    await headerLocator.first().waitFor({ state: 'visible', timeout: 10000 });

    const codes = await headerLocator.allTextContents();
    const trimmedCodes = codes.map((c) => c.trim()).filter((c) => c.length > 0);

    logger.info(`Captured ${trimmedCodes.length} room type codes from New Reservation: ${JSON.stringify(trimmedCodes)}`);
    return trimmedCodes;
  }

  /** Full flow: open Guest Management → New Reservation → capture room types. */
  async runNewReservationRoomTypeCapture(): Promise<string[]> {
    logger.info('Running New Reservation flow and capturing room type codes');
    await this.searchAndOpenGuestManagementFromHeader();
    await this.openNewReservationRoomSelection();
    return this.getRoomTypeCodesFromNewReservation();
  }

  // ──────────────────────────────────────────────────────────────
  //  Business Date & Grid Cell Click
  // ──────────────────────────────────────────────────────────────

  /**
   * Reads the business date from the property header.
   * Expected format: "Property Id: XXXX, User Id: …, Shift: N, Business Date: DD/MM/YYYY"
   */
  async getBusinessDate(): Promise<string> {
    logger.info('Fetching business date from property header');

    await this.propertyHeader.first().waitFor({ state: 'visible', timeout: 10000 });

    const fullText = ((await this.propertyHeader.first().textContent()) ?? '').trim();
    logger.info(`Property header text: ${fullText}`);

    const match = fullText.match(/Business Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (!match?.[1]) {
      throw new Error(`Could not parse Business Date from property header text: "${fullText}"`);
    }

    const businessDate = match[1];
    logger.info(`Parsed business date: ${businessDate}`);
    return businessDate;
  }

  /**
   * Finds the zero-based column index for `businessDate` inside the Rate Manager grid.
   * Scans the first data row's `.col-md-1.col-6` cells looking for the matching
   * `<span class="n-mt-5">` date text.
   * Returns `-1` if not found.
   */
  private async getDateColumnIndex(businessDate: string): Promise<number> {
    logger.info(`Finding column index for business date: ${businessDate}`);

    const firstDataRow = this.page.locator('.workspace .row.g-1').first();

    await firstDataRow.locator('.col-md-1.col-6').first().waitFor({
      state: 'visible',
      timeout: 40000,
    });

    const dateCells = firstDataRow.locator('.col-md-1.col-6');
    const count = await dateCells.count();

    for (let i = 0; i < count; i++) {
      const dateText = await dateCells.nth(i).locator('.n-mt-5').first().textContent();
      if (dateText?.trim() === businessDate) {
        logger.info(`Found business date "${businessDate}" at column index ${i}`);
        return i;
      }
    }

    logger.warn(`Business date "${businessDate}" not found in any column (checked ${count} columns)`);
    return -1;
  }

  /**
   * Clicks the cell at the intersection of a room type row and the business-date column.
   */
  async clickRateManagerCellForCommonRoomType(
    commonRoomTypeCode: string,
    businessDate: string,
  ): Promise<void> {
    logger.info(`Clicking Rate Manager cell for room type "${commonRoomTypeCode}" on date ${businessDate}`);

    // 1 – Resolve the column index for the business date
    const dateColumnIndex = await this.getDateColumnIndex(businessDate);
    if (dateColumnIndex === -1) {
      throw new Error(`Business date "${businessDate}" not found in Rate Manager header`);
    }

    // 2 – Locate the row whose <h5> header matches the room type code exactly
    const escapedCode = this.escapeForRegex(commonRoomTypeCode);
    const targetRow = this.page
      .locator('.workspace .row.g-1')
      .filter({
        has: this.page.locator('h5', {
          hasText: new RegExp(`^\\s*${escapedCode}\\s*$`, 'i'),
        }),
      });

    const rowCount = await targetRow.count();
    if (rowCount === 0) {
      throw new Error(`Common room type "${commonRoomTypeCode}" was not found in the Rate Manager grid`);
    }
    if (rowCount > 1) {
      logger.warn(`Multiple rows (${rowCount}) matched room type "${commonRoomTypeCode}" – using the first one`);
    }

    // 3 – Pick the date cell at the resolved column index and click it
    const targetCell = targetRow.first().locator('.col-md-1.col-6').nth(dateColumnIndex);

    if ((await targetCell.count()) === 0) {
      throw new Error(`Could not find date cell at index ${dateColumnIndex} for room type "${commonRoomTypeCode}"`);
    }

    await targetCell.scrollIntoViewIfNeeded();
    await this.elementActions.click(targetCell, `Rate Manager cell for ${commonRoomTypeCode} on ${businessDate}`);
  }

  /** Opens Rate Manager via search, reads the business date, and clicks the target cell. */
  async runOpenRateManagerAndClickDateCell(commonRoomTypeCode: string): Promise<string> {
    logger.info(
      `Running open-Rate-Manager-from-search and click date cell for room type "${commonRoomTypeCode}"`,
    );

    await this.openRateManagerFromGlobalSearch();
    const businessDate = await this.getBusinessDate();
    await this.clickRateManagerCellForCommonRoomType(commonRoomTypeCode, businessDate);
    return businessDate;
  }

  // ──────────────────────────────────────────────────────────────
  //  Rate Details Panel – Editable Codes & Eye Icon
  // ──────────────────────────────────────────────────────────────

  private escapeForRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Scans the Rate Details floating panel and returns the list of rate codes
   * whose form inputs are editable (not disabled).
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

      // Check the ancestor card for any non-disabled input/textarea
      const card = header.locator('xpath=ancestor::div[contains(@class, "card")]');
      const enabledInputs = await card
        .locator('input:not([disabled]), textarea:not([disabled])')
        .count();

      if (enabledInputs > 0) {
        editableCodes.push(code);
      }
    }

    logger.info(`Found ${editableCodes.length} editable rate codes: ${JSON.stringify(editableCodes)}`);
    return editableCodes;
  }



  

  /** Clicks the eye (settings) icon next to the given rate code in the Rate Details panel. */
  async clickEyeIconForRateCode(rateCode: string): Promise<void> {
    logger.info(`Clicking eye icon for rate code: ${rateCode}`);

    const container = this.page.locator('app-rate-details-floating, .modal-body').first();
    await container.waitFor({ state: 'visible', timeout: 10000 });

    const escaped = this.escapeForRegex(rateCode);
    const header = container
      .locator('h5', { hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i') })
      .first();
    await header.waitFor({ state: 'visible', timeout: 5000 });

    const eyeIcon = header.locator('i.mdi-eye-settings, .mdi-eye-settings').first();
    if (!(await eyeIcon.isVisible().catch(() => false))) {
      throw new Error(`Eye icon not found for rate code: ${rateCode}`);
    }

    await this.elementActions.click(eyeIcon, `Eye icon for ${rateCode}`);
  }

  /** Finds the first editable rate code and opens its settings panel. Returns the selected code. */
  async selectFirstEditableRateCodeAndOpenSettings1(): Promise<string> {
    const editable = await this.getEditableRateCodesFromRateDetails();
    if (editable.length === 0) {
      throw new Error('No editable rate codes found in Rate Details');
    }

    const chosen = editable[0];
    //const chosen = editable.find(code => code.toLowerCase().includes('Complimentary Rate'));
    await this.clickEyeIconForRateCode(chosen);
    return chosen;
  }

  async selectFirstEditableRateCodeAndOpenSettings(): Promise<string> {
    const editable = await this.getEditableRateCodesFromRateDetails();

    const chosen = editable.find(
        code => code.toLowerCase().includes('best rate')
    );

    if (!chosen) {
        throw new Error('Best Rate not found in editable rate codes');
    }

    await this.clickEyeIconForRateCode(chosen);
    return chosen;
}

  async deleteSelectedDate(): Promise<void> {
    logger.info('Deleting the selected date from the rate grid'); 
     // Delete the Selected Dates first
    await this.page.getByRole('button', { name: 'Delete Rate From Selected' }).click();
   
    try{
  await this.elementActions.click(this.okButton, 'OK button after deleting selected dates');

    }catch (e){
    }
    
    try{ 
  //await expect(this.page.locator('#swal2-html-container')).toContainText('Do you want to Delete current rate to all Matching Pattern dates also?');
  await this.page.getByRole('button', { name: 'Yes' }).click();
  //await expect(this.okButton).toContainText('OK');
  await this.elementActions.click(this.okButton, 'OK button after deleting selected dates');
  }catch (e){}
  try{
      await this.elementActions.click(this.okButton, 'OK button after deleting selected dates');
  }catch (e){}

  


   

  }

  // ──────────────────────────────────────────────────────────────
  //  Rate Grid – Fill Rates for All Room Types
  // ──────────────────────────────────────────────────────────────

  /**
   * Fills rate amounts (Single, Double, Triple) for ALL room types
   * in the rate grid list table that appears after clicking a date cell.
   *
   * The table structure (from <app-rate-grid-list>):
   *   th: checkbox | Room Type (colspan=2) | Single | Double | Triple | Extra | Youth | Child | Inclusions | actions
   *   td: checkbox | code | name | Single input | Double input | Triple input | ...
   *
   * @param singleRate  - Rate amount for Single occupancy
   * @param doubleRate  - Rate amount for Double occupancy
   * @param tripleRate  - Rate amount for Triple occupancy
   */
  async fillRatesForAllRoomTypes(
    
    singleRate: string,
    doubleRate: string,
    tripleRate: string,
    extraRate: string,
    youthRate: string,
    child: string,
  ): Promise<void> {
    logger.info(
      `Filling rates for all room types: Single=${singleRate}, Double=${doubleRate}, Triple=${tripleRate}, Child=${child}`,
    );

   
    await this.page.waitForTimeout(5000);
    // Locate the rate grid table inside <app-rate-grid-list>
    const rateGridTable = this.page.locator('app-rate-grid-list table.table');
    await rateGridTable.first().waitFor({ state: 'visible', timeout: 15000 });

    const rows = rateGridTable.locator('tbody tr');
    const rowCount = await rows.count();
    logger.info(`Found ${rowCount} room type rows in the rate grid`);

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);

      // Read room type code from the 2nd <td> for logging
      const roomCodeCell = row.locator('td').nth(1);
      const roomCode = (await roomCodeCell.textContent())?.trim() ?? `Row ${i}`;

      // Get all <amount-control> inputs in this row
      const amountInputs = row.locator('amount-control input[type="text"]');
      const inputCount = await amountInputs.count();

      if (inputCount >= 3) {
        // Column order: Single(0), Double(1), Triple(2), Extra(3), Youth(4), Child(5)
        await this.fillAmountInput(amountInputs.nth(0), singleRate, `${roomCode} Single`);
        await this.fillAmountInput(amountInputs.nth(1), doubleRate, `${roomCode} Double`);
        await this.fillAmountInput(amountInputs.nth(2), tripleRate, `${roomCode} Triple`);
        await this.fillAmountInput(amountInputs.nth(3), extraRate, `${roomCode} Extra`);
        await this.fillAmountInput(amountInputs.nth(4), youthRate, `${roomCode} Youth`);
        await this.fillAmountInput(amountInputs.nth(5), child, `${roomCode} Child`);

        logger.info(`✓ Filled rates for room type: ${roomCode}`);
      } else {
        logger.warn(
          `Room type "${roomCode}" has only ${inputCount} amount inputs – skipping (expected ≥ 3)`,
        );
      }
    }

    logger.info('Finished filling rates for all room types');
  }

  /**
   * Helper: clears an amount input, types the value, and tabs out to
   * trigger Angular change detection.
   */
  private async fillAmountInput(
    input: Locator,
    value: string,
    fieldName: string,
  ): Promise<void> {
    await input.scrollIntoViewIfNeeded();
    await input.click();
    await input.clear();
    await input.fill(value);
    // Tab out so the Angular model updates
    await this.page.keyboard.press('Tab');
    logger.info(`Set ${fieldName} = ${value}`);
  }

  // ──────────────────────────────────────────────────────────────
  //  Advance Date Selection – Apply & Save Rates
  // ──────────────────────────────────────────────────────────────

  /**
   * Applies the filled rates to a date range via the Advance Date Selection
   * panel, saves, and confirms the copy-rate dialog.
   *
   * Steps:
   *   1. Open Advance Date Selection
   *   2. Fill the date range (e.g. "DD/MM/YYYY to DD/MM/YYYY")
   *   3. Check "All Days" and click Apply
   *   4. Click Save, confirm the copy dialog, and acknowledge success
   *
   * @param dateRange - The date range string, e.g. "03/06/2026 to 31/12/2025"
   */
  async applyAdvanceDateSelection(dateRange: string): Promise<void> {
    logger.info(`Opening Advance Date Selection and applying date range: ${dateRange}`);

    await this.elementActions.click(this.advanceDateSelectionLink, 'Advance Date Selection link');

    await this.elementActions.click(this.dateRangeInput, 'Select Date Range input');
    await this.dateRangeInput.fill(dateRange);
    await this.page.keyboard.press('Tab');

    await this.elementActions.click(this.allDaysCheckbox, 'All Days checkbox');

    await this.elementActions.click(this.applyButton, 'Apply button');

    // Save and confirm
    await this.elementActions.click(this.rateGridSaveButton, 'Rate grid Save button');
    await expect(this.page.locator('#swal2-html-container')).toContainText(
      'Do you want to copy current rate to all other selected dates?',
    );

    await this.elementActions.click(this.yesButton, 'Yes button');
    await expect(this.successMessage).toContainText('Details created/updated successfully.',
      { timeout: 60000 }
    );
    await this.elementActions.click(this.okButton, 'OK button');

    logger.info('Advance date selection applied and saved successfully');
  }

  // ──────────────────────────────────────────────────────────────
  //  Guest Management – Rate Verification
  // ──────────────────────────────────────────────────────────────

  /**
   * Selects "Complimentary Rate" from the rate dropdown in the
   * reservation room grid.
   */
  private async selectComplimentaryRate(): Promise<void> {
    logger.info('Selecting Complimentary Rate from dropdown');
    await this.selectRateByName('Complimentary Rate', 'complimentary rate');
  }

  private async selectRateByName(rateName: string, searchText: string): Promise<void> {
    logger.info(`Selecting ${rateName} from dropdown`);
    await this.elementActions.click(this.rateDropdownArrow, 'Rate dropdown arrow');
    const rateCell = this.page.getByRole('cell', { name: /RACK Rack Rate/ });
    await rateCell.getByRole('textbox').fill(searchText);
    await this.page.getByText(rateName, { exact: true }).click();
  }

  private async saveRates(): Promise<void> {
    logger.info('Saving rates in the reservation');
    await this.elementActions.click(this.saveButton, 'Save Rates button');
    await expect(this.yesButton).toBeVisible({ timeout: 500000 });

    await this.elementActions.click(this.yesButton, 'Yes button to confirm saving rates');
    await expect(this.successMessage).toContainText('Details created/updated successfully.', { timeout: 500000 });
    await this.elementActions.click(this.okButton, 'OK button after saving rates');
  }

  private async openCopyRatesSection(): Promise<void> {
    await this.elementActions.click(this.sectionsButton, 'Sections button');
    await this.elementActions.click(this.copyRatesLink, 'Copy Rates link');
  }

  private async selectCopyRatesAddOption(copyRateAmount: string): Promise<void> {
    await this.page.locator('radio-control').filter({ hasText: 'Add' }).getByRole('radio').check();
    await this.page.getByRole('textbox').nth(1).click();
    await this.page.getByRole('textbox').nth(1).fill(copyRateAmount);
  }

  private async openRateCodeFromCopyRates(rateName: string, searchText: string): Promise<void> {
    const rateSearchBox = this.page.getByRole('combobox').getByRole('textbox');
    await rateSearchBox.click();
    await rateSearchBox.fill(searchText);
    await this.page.getByText(rateName, { exact: true }).click();
  }

  /** Opens Rack Rate from the rate-code dropdown by clearing, searching, selecting, and applying. */
  private async openRackRateFromDropdown(): Promise<void> {
    logger.info('Opening Rack Rate from rate-code dropdown');

    // Click the first button in button-container (save/close current section)
    await this.page.locator('.button-container > button').first().click();

    // Clear the rate-code dropdown
    await this.page
      .locator(
        '.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-untouched.ng-pristine.ng-valid.ng-select-focused > .ng-select-container > .ng-clear-wrapper',
      )
      .click();

    // Search for "rac" and select "Rack Rate"
    await this.page.getByRole('textbox').first().fill('rac');
    await this.page.getByText('Rack Rate').click();

    // Apply to load Rack Rate grid
    await this.elementActions.click(this.applyButton, 'Apply button to open Rack Rate');
  }

  /**
   * Converts a raw numeric rate string (e.g. "1000") into the UI display
   * format with commas and two decimal places (e.g. "1,000.00").
   */
  private formatRateForDisplay(rate: string): string {
    const num = parseFloat(rate);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Handles the "System Rate has been Changed" confirmation dialog,
   * verifies the expected rate in the table, and clicks Ok.
   *
   * @param rawRate - The raw rate string (e.g. "1000"), formatted internally
   *                  to the display form (e.g. "1,000.00") before comparison.
   */
  private async confirmRateChangeAndVerify(rawRate: string): Promise<void> {
    const displayRate = this.formatRateForDisplay(rawRate);
    logger.info(`Confirming rate change and verifying rate: ${displayRate}`);
    await expect(this.page.getByRole('paragraph')).toContainText(
      'System Rate has been Changed. Do you want to modify the agreed rate.?',
    );
    await this.elementActions.click(this.yesButton, 'Yes button');
    await expect(this.reservationTable).toContainText(displayRate);
    await this.elementActions.click(this.okReservationButton, 'Ok button');
  }

  /**
   * Opens Guest Management, creates a new reservation with 1 adult,
   * selects Complimentary Rate, and verifies the Single rate amount.
   *
   * @param rawRate - The raw rate value used during setup (e.g. "1000").
   *                 Formatted internally to "1,000.00" for comparison.
   */
  async verifySingleAdultComplimentaryRate(rawRate: string): Promise<void> {
    const displayRate = this.formatRateForDisplay(rawRate);
    logger.info(`Verifying Single adult Complimentary Rate: expected ${displayRate}`);

    await this.searchAndOpenGuestManagementFromHeader();
    await this.elementActions.click(this.newReservationButton, 'New Reservation button');
    await this.elementActions.click(this.nextButton, 'Next button');
    await this.elementActions.click(this.addOccupantButton, 'Add occupant button');
    await this.elementActions.click(this.expandRoomButton, 'Expand room details button');
    await this.selectComplimentaryRate();
    await this.confirmRateChangeAndVerify(rawRate);
    await this.elementActions.click(this.closeButton, 'Close button');

    logger.info(`Single adult rate verified: ${displayRate}`);
  }

  /**
   * Creates a new reservation with 3 adults (guest dropdown + two '+'
   * clicks), selects Complimentary Rate, and verifies the Triple rate
   * amount. Assumes the page is already on Guest Management.
   *
   * @param rawRate - The raw rate value used during setup (e.g. "1300").
   *                 Formatted internally to "1,300.00" for comparison.
   */
  async verifyTripleAdultComplimentaryRate(rawRate: string): Promise<void> {
    const displayRate = this.formatRateForDisplay(rawRate);
    logger.info(`Verifying Triple adult Complimentary Rate: expected ${displayRate}`);

    await this.elementActions.click(this.newReservationButton, 'New Reservation button');
    await this.elementActions.click(this.guestOccupancyDropdown, 'Guest occupancy dropdown');
    await this.elementActions.click(this.addOccupantButton, 'Add occupant button');
    await this.elementActions.click(this.addOccupantButton, 'Add occupant button');
    await this.elementActions.click(this.nextButton, 'Next button');
    await this.elementActions.click(this.addOccupantButton, 'Add occupant to room button');
    await this.elementActions.click(this.expandRoomButton, 'Expand room details button');
    await this.selectComplimentaryRate();
    await this.confirmRateChangeAndVerify(rawRate);
        await this.elementActions.click(this.closeButton, 'Close button');

    //await this.elementActions.click(this.okReservationButton, 'Ok button');

    logger.info(`Triple adult rate verified: ${displayRate}`);
  }

  async verifyOneAdultTwoChildrenRate(rawRate: string, childRate: string): Promise<void> {
    const displayRate = this.formatRateForDisplay(rawRate);
    const displayChildRate = this.formatRateForDisplay(childRate);
    logger.info(`Verifying One Adult and Two Children rates: expected ${displayRate} for adult, ${displayChildRate} for children`);

    await this.elementActions.click(this.newReservationButton, 'New Reservation button');
    await this.elementActions.click(this.guestOccupancyDropdown, 'Guest occupancy dropdown');
    await this.elementActions.click(this.addOccupantButton, 'Add occupant button');
    await this.elementActions.click(this.addChildOccupantButton, 'Add child occupant button');
    await this.elementActions.click(this.addChildOccupantButton, 'Add child occupant button');
    await this.elementActions.click(this.nextButton, 'Next button');
    await this.elementActions.click(this.addOccupantButton, 'Add occupant to room button');
    await this.elementActions.click(this.expandRoomButton, 'Expand room details button');
    await this.selectComplimentaryRate();

    rawRate = (parseFloat(rawRate) + 4 * parseFloat(childRate)).toString(); // Assuming child rate is added to the adult rate for the total
    await this.confirmRateChangeAndVerify('1,400.00');

    // Verify child rate is also displayed in the table
    await expect(this.reservationTable).toContainText(displayChildRate);

    await this.elementActions.click(this.closeButton, 'Close button');
    logger.info(`One Adult + Two Children rates verified: adult ${displayRate}, child ${displayChildRate}`);
  }

  // ──────────────────────────────────────────────────────────────
  //  Advance Configuration – Sections & Toggle Setup
  // ──────────────────────────────────────────────────────────────

  /** Opens Sections → Advance Configuration from the Rate Details panel. */
  async openAdvanceConfigurationFromSections(): Promise<void> {
    logger.info('Opening Advance Configuration from Sections');
    await this.elementActions.click(this.sectionsButton, 'Sections button');
    await this.elementActions.click(this.advanceConfigurationLink, 'Advance Configuration link');
  }

  /** Enables the Advance Configuration toggle switches that are currently OFF. */
  async enableAdvanceConfigurationToggles(): Promise<void> {
    logger.info('Enabling Advance Configuration toggles');

    const toggleNames: string[] = [
      'Rates Inclusive of Taxes',
      'Suppress(Do not display the',
      'Applicable for IRS',
      'Allow override for Users',
      'Reservation Fixed Rate',
      'Allow Override for interfaces',
      'Applicable for Group Member',
    ];

    for (const name of toggleNames) {
      const toggle = this.page.getByRole('switch', { name });
      await toggle.waitFor({ state: 'visible', timeout: 5000 });
      await toggle.scrollIntoViewIfNeeded();

      const isChecked = await toggle.isChecked();
      if (!isChecked) {
        await toggle.check();
        logger.info(`Enabled toggle: ${name}`);
      } else {
        logger.info(`Toggle already enabled: ${name}`);
      }
    }
  }

  /** Saves the Advance Configuration and confirms the success dialog. */
  async saveAndConfirmAdvanceConfiguration(): Promise<void> {
    logger.info('Saving Advance Configuration');
    await this.elementActions.click(this.saveButton, 'Save button');
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'OK button');
  }

  /** Re-opens Sections → Advance Configuration and then clicks Close. */
  async reopenAndCloseAdvanceConfiguration(): Promise<void> {
    logger.info('Re-opening Advance Configuration and closing');
    await this.openAdvanceConfigurationFromSections();
    await this.elementActions.click(this.closeButton, 'Close button');
  }

  /** Reads the current ON/OFF state of Advance Configuration toggles. */
  async getAdvanceConfigurationToggleStates(): Promise<Record<string, boolean>> {
    logger.info('Reading Advance Configuration toggle states');

    const toggleNames: string[] = [
      'Rates Inclusive of Taxes',
      'Suppress(Do not display the',
      'Applicable for IRS',
      'Allow override for Users',
      'Reservation Fixed Rate',
      'Allow Override for interfaces',
      'Applicable for Group Member',
    ];

    const states: Record<string, boolean> = {};

    for (const name of toggleNames) {
      const toggle = this.page.getByRole('switch', { name });
      try {
        await toggle.waitFor({ state: 'visible', timeout: 3000 });
        const checked = await toggle.isChecked().catch(() => false);
        states[name] = checked;
        logger.info(`Toggle state - ${name}: ${checked}`);
      } catch (e) {
        logger.warn(`Toggle not found or not visible: ${name}`);
        states[name] = false;
      }
    }

    return states;
  }

  /** Closes the Advance Configuration panel (clicks the Close button). */
  async closeAdvanceConfiguration(): Promise<void> {
    logger.info('Closing Advance Configuration panel');
    await this.elementActions.click(this.closeButton, 'Close button');
  }

  /** Saves the current rate grid using the toolbar save button. */
  async saveRateGrid(): Promise<void> {
    logger.info('Saving current rate grid');

    await this.elementActions.click(this.page.locator('.button-container > button').first(), 'Rate grid button');
  }

  /** Runs the copy-rate flow from the rate details panel. */
  async runCopyRatesFromRackRate(copyRateAmount: string): Promise<void> {
    logger.info(`Running copy rates flow with amount ${copyRateAmount}`);

    await this.saveRateGrid();

    await this.page.locator(
      '.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-untouched.ng-pristine.ng-valid.ng-select-focused > .ng-select-container > .ng-clear-wrapper',
    ).click();

    await this.page.getByRole('textbox').first().fill('comp');
    await this.page.getByText('Complimentary Rate').click();
    await this.elementActions.click(this.applyButton, 'Apply button after selecting Complimentary Rate');

    await this.elementActions.click(this.sectionsButton, 'Sections button');
    await this.elementActions.click(this.copyRatesLink, 'Copy Rates link');

    const copyRateSearchBox = this.page.getByRole('combobox').getByRole('textbox');
    await copyRateSearchBox.click();
    await copyRateSearchBox.fill('rac');
    await this.page.getByText('Rack Rate').click();

    await this.page.getByRole('textbox').nth(1).click();
    await this.page.getByRole('textbox').nth(1).fill(copyRateAmount);

    await this.elementActions.click(this.applyButton, 'Apply button after copy rate setup');
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'OK button');
  }

  /** Captures the current rate-grid values for every visible room type row. */
  async captureCurrentRateGridValues(): Promise<RateGridSnapshotRow[]> {
    const rateGridTable = this.page.locator('app-rate-grid-list table.table');
    await rateGridTable.first().waitFor({ state: 'visible', timeout: 15000 });

    const rows = rateGridTable.locator('tbody tr');
    const rowCount = await rows.count();
    const snapshot: RateGridSnapshotRow[] = [];

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const roomCodeCell = row.locator('td').nth(1);
      const roomCode = (await roomCodeCell.textContent())?.trim() ?? `Row ${i}`;
      const amountInputs = row.locator('amount-control input[type="text"]');
      const inputCount = await amountInputs.count();
      const values: string[] = [];

      for (let j = 0; j < inputCount; j++) {
        values.push((await amountInputs.nth(j).inputValue()).trim());
      }

      snapshot.push({ roomCode, values });
    }

    logger.info(`Captured ${snapshot.length} rate-grid rows for the active rate code`);
    return snapshot;
  }

  private parseRateValue(value: string): number {
    const cleaned = value.replace(/,/g, '').trim();
    return cleaned === '' ? 0 : Number(cleaned);
  }

  private assertRackAndComplementaryRateSnapshots(
    rackSnapshot: RateGridSnapshotRow[],
    complementarySnapshot: RateGridSnapshotRow[],
    increment: number,
  ): void {
    const rackByRoomCode = new Map(rackSnapshot.map(row => [row.roomCode, row]));
    expect(complementarySnapshot.length).toBeGreaterThan(0);

    for (const complementaryRow of complementarySnapshot) {
      const rackRow = rackByRoomCode.get(complementaryRow.roomCode);
      expect(rackRow, `Missing rack row for room type ${complementaryRow.roomCode}`).toBeDefined();
      expect(complementaryRow.values.length).toBe(rackRow?.values.length ?? 0);

      complementaryRow.values.forEach((copiedValue, index) => {
        const rackValue = this.parseRateValue(rackRow?.values[index] ?? '0');
        const expectedValue = rackValue + increment;
        const actualValue = this.parseRateValue(copiedValue);

        expect(
          actualValue,
          `Room type ${complementaryRow.roomCode} amount index ${index} should be rack (${rackValue}) + ${increment}`,
        ).toBeCloseTo(expectedValue, 2);
      });
    }
  }

  /**
   * Runs the Copy Rates flow, captures the copied Complementary Rate values,
   * then switches to Rack Rate and verifies that every amount is Rack + increment.
   */
  async copyRatesAndVerifyAgainstRackRate(copyRateAmount: string): Promise<void> {
    const increment = this.parseRateValue(copyRateAmount);

    logger.info(`Running copy-rate verification with increment ${increment}`);

    await this.saveRates();

    await this.openCopyRatesSection();
    await this.openRateCodeFromCopyRates('Rack Rate', 'rack');

    await this.selectCopyRatesAddOption(copyRateAmount);
    await this.page.getByRole('switch').check();
    await this.elementActions.click(this.applyButton, 'Apply button after first copy-rate setup');
    await expect(this.successMessage).toContainText('Details created/updated successfully.', { timeout: 100000 });
    await this.elementActions.click(this.okButton, 'OK button');

    // Step A: Capture all rate entries after copying (e.g. Complimentary Rate grid)
    // wait for 10 seconds to ensure the grid updates with copied rates before capturing
    await this.page.waitForTimeout(10000);
    const copiedRatesSnapshot = await this.captureCurrentRateGridValues();
    logger.info(
      `Copied rates snapshot (${copiedRatesSnapshot.length} room types): ${JSON.stringify(copiedRatesSnapshot)}`,
    );

    // Step B: Open Rack Rate from the rate-code dropdown
    await this.openRackRateFromDropdown();

    // Step C: Capture all Rack Rate entries for every room type
    const rackRatesSnapshot = await this.captureCurrentRateGridValues();
    logger.info(
      `Rack Rate snapshot (${rackRatesSnapshot.length} room types): ${JSON.stringify(rackRatesSnapshot)}`,
    );

    // Step D: Compare each rate entry — copied rate should equal rack rate + increment
    this.assertRackAndComplementaryRateSnapshots(rackRatesSnapshot, copiedRatesSnapshot, increment);
    logger.info('Copy-rate verification: every room type rate matches Rack Rate + increment');
  }

  /** High-level flow: open Sections → Advance Config → enable toggles → save → reopen & close. */
  async runAdvanceConfigurationSetup(): Promise<void> {
    await this.openAdvanceConfigurationFromSections();
    await this.enableAdvanceConfigurationToggles();
    await this.saveAndConfirmAdvanceConfiguration();
    await this.reopenAndCloseAdvanceConfiguration();
  }

}