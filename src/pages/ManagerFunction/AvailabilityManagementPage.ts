import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

export interface DateComponents {
  day: number;           // 1-indexed day, e.g. 27
  month: number;         // 1-indexed month, e.g. 6 (June)
  monthName: string;     // Full month name, e.g. 'June'
  year: number;          // Full year, e.g. 2025
  label: string;         // Label for getByLabel, e.g. 'June 27,'
}

export interface AvailabilityConfig {
  propertyName?: string;           // e.g. 'DGT'
  startDate?: string;              // DD/MM/YYYY, e.g. '27/06/2025'
  endDate?: string;                // DD/MM/YYYY, e.g. '31/12/2025'
  statusType?: string;             // e.g. 'Close for Arrival'
}

// ──────────────────────────────────────────────────────────────
//  Page Object – Availability Management
// ──────────────────────────────────────────────────────────────

export class AvailabilityManagementPage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ── Navigation locators ── */
  private readonly globalSearchInput: Locator;
  private readonly availabilityManagementLink: Locator;

  /* ── Property Selection & Apply ── */
  private readonly propertyDropdown: Locator;
  private readonly applyButton: Locator;

  /* ── Advance Selection (date range) ── */
  private readonly advanceSelectionButton: Locator;
  private readonly dateRangeInput: Locator;
  private readonly monthSelect: Locator;
  private readonly allDaysCheckbox: Locator;

  /* ── Save flow ── */
  private readonly saveButton: Locator;
  private readonly statusDropdown: Locator;
  private readonly yesButton: Locator;
  private readonly okButton: Locator;
  private readonly successMessage: Locator;
  private readonly moreDaysPrompt: Locator;

  /* ── Guest Management / Reservation ── */
  private readonly guestManagementMenuItem: Locator;
  private readonly newReservationButton: Locator;
  private readonly nextButton: Locator;
  private readonly addOccupantButton: Locator;
  private readonly arrivalClosedMessage: Locator;

  /* ── Business Date Header ── */
  private readonly businessDateHeading: Locator;

  /* ── Availability hover area ── */
  private readonly availabilityHoverArea: Locator;

  /** Month names indexed 1-12 for calendar label construction. */
  private static readonly MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    // Navigation
    this.globalSearchInput = this.page.getByRole('textbox', { name: 'Search...' });
    //this.availabilityManagementLink = this.page.getByText('Availability Management')
    //.or(this.page.locator('#page-topbar').getByText('Availability Management'));

    this.availabilityManagementLink = this.page.locator("#page-topbar").getByText("Availability Management");

    // Property Selection & Apply
    this.propertyDropdown = this.page.getByRole('textbox').nth(1);
    this.applyButton = this.page.getByRole('button', { name: 'Apply' });

    // Advance Selection
    this.advanceSelectionButton = this.page.getByRole('button', { name: /Advance Selection/ });
    this.dateRangeInput = this.page.getByRole('textbox', { name: 'Select Date Range' });
    this.monthSelect = this.page.getByLabel('Month');
    this.allDaysCheckbox = this.page.getByRole('checkbox', { name: 'All Days' });

    // Save flow
    this.saveButton = this.page.locator('button').filter({ hasText: 'Save' });
    this.statusDropdown = this.page.getByRole('textbox').last();
    this.yesButton = this.page.getByRole('button', { name: 'Yes' });
    this.okButton = this.page.getByRole('button', { name: 'OK' });
    this.successMessage = this.page.getByRole('paragraph');
    this.moreDaysPrompt = this.page.getByRole('paragraph');

    // Guest Management / Reservation
    this.guestManagementMenuItem = this.page.getByText('Guest Management');
    this.newReservationButton = this.page.locator('button').filter({ hasText: 'New Reservation' });
    this.nextButton = this.page.getByText('Next');
    //this.addOccupantButton = this.page.getByRole('button', { name: '+' }).first();
    this.addOccupantButton = this.page.getByText('+').first();
    this.arrivalClosedMessage = this.page.getByRole('paragraph');

    // Availability hover area
    this.availabilityHoverArea = this.page.locator('div').filter({ hasText: 'Availability' }).nth(5);

    // Business Date Heading
    // Use a text locator for the header containing 'Business Date:'
    this.businessDateHeading = this.page.locator('text=Business Date:');
  }

  // ──────────────────────────────────────────────────────────────
  //  Business Date Helpers
  // ──────────────────────────────────────────────────────────────

  /** Parses a DD/MM/YYYY date string into its components. */
  static parseDateString(dateStr: string): DateComponents {
    const [dayStr, monthStr, yearStr] = dateStr.split('/');
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    const monthName = AvailabilityManagementPage.MONTH_NAMES[month];
    const label = `${monthName} ${day},`;
    return { day, month, monthName, year, label };
  }

  /**
   * Fetches the business date from the top header bar.
   * The header text looks like:
   *   "Property Id: WEBWE,  User Id: Sachin Kumar,  Shift: 3,  Business Date: 27/06/2025"
   * Returns the date in DD/MM/YYYY format.
   */
  async getBusinessDate(): Promise<string> {
    logger.info('Fetching business date from header');
    // Ensure the header element is present and visible before extracting text
    await this.businessDateHeading.waitFor({ state: 'visible', timeout: 10000 });
    const headerText = await this.businessDateHeading.textContent();
    logger.info(`Header text: ${headerText}`);

    const match = headerText?.match(/Business Date:\s*(\d{2}\/\d{2}\/\d{4})/);
    if (!match) {
      throw new Error(`Could not parse Business Date from header: "${headerText}"`);
    }

    const businessDate = match[1];
    logger.info(`Parsed business date: ${businessDate}`);
    return businessDate;
  }

  /**
   * Computes a random date in December of the same year from a given date string.
   * Input:  '27/06/2025'  →  Output: e.g. '15/12/2025' (random day between 1-28)
   */
  static getRandomDecemberDate(dateStr: string): string {
    const { year } = AvailabilityManagementPage.parseDateString(dateStr);
    const randomDay = Math.floor(Math.random() * 28) + 1; // 1–28 to avoid month-end edge cases
    const paddedDay = String(randomDay).padStart(2, '0');
    const result = `${paddedDay}/12/${year}`;
    logger.info(`Random December date for year ${year}: ${result}`);
    return result;
  }

  // ──────────────────────────────────────────────────────────────
  //  Navigation Helpers
  // ──────────────────────────────────────────────────────────────

  /** Opens Availability Management via the global search bar. */
  async openAvailabilityManagement(): Promise<void> {
    logger.info('Opening Availability Management from global search');
    await this.elementActions.click(this.globalSearchInput, 'Global search input');
    await this.elementActions.sendKeys(this.globalSearchInput, 'ava', 'Global search input');
    await this.elementActions.click(this.availabilityManagementLink, 'Availability Management link');
  }

  /** Opens Guest Management via the global search bar. */
  async openGuestManagement(): Promise<void> {
    logger.info('Opening Guest Management from global search');
    await this.elementActions.click(this.availabilityHoverArea, 'Availability hover area');
    const searchInput = this.page.getByPlaceholder('Search...');
    await this.elementActions.click(searchInput, 'Search input');
    await this.elementActions.sendKeys(searchInput, 'guest mana', 'Search input');
    await this.elementActions.click(this.guestManagementMenuItem, 'Guest Management menu item');
  }

  // ──────────────────────────────────────────────────────────────
  //  Availability Configuration
  // ──────────────────────────────────────────────────────────────

  /** Selects a property from the dropdown and clicks Apply. */
  async selectPropertyAndApply(propertyName: string): Promise<void> {
    logger.info(`Selecting property: ${propertyName}`);
    await this.elementActions.click(this.propertyDropdown, 'Property dropdown');
    await this.elementActions.click(this.page.getByText(propertyName), `Property option: ${propertyName}`);
    await this.elementActions.click(this.applyButton, 'Apply button');
  }

  /** Opens Advance Selection, picks start/end dates from the calendar picker, checks All Days, and applies. */
  /** Opens Advance Selection, picks start/end dates from the calendar picker, checks All Days, and applies. */
  async selectAdvanceDateRange(config: {
    startDate: string;   // DD/MM/YYYY
    endDate: string;     // DD/MM/YYYY
  }): Promise<void> {
    // Ensure the Advance Selection button is present and clickable
    logger.info('Waiting for Advance Selection button to be visible');
    const advanceBtn = this.page.locator('button:has-text("Advance Selection")');
    await advanceBtn.waitFor({ state: 'visible', timeout: 30000 });

    logger.info('Opening Advance Selection');
    // Use a safe click with JavaScript fallback
    try {
      await advanceBtn.click();
    } catch (e) {
      logger.warn('Standard click failed for Advance Selection, using JavaScript click');
      const handle = await advanceBtn.elementHandle();
      if (handle) {
        await this.page.evaluate((el) => (el as HTMLElement).click(), handle);
      }
    }

    // Click the date range input to open the calendar picker
    logger.info(`Selecting date range: ${config.startDate} to ${config.endDate}`);
    const dateRangeLocator = this.page.getByRole('textbox', { name: 'Select Date Range' });
    await dateRangeLocator.waitFor({ state: 'visible', timeout: 10000 });
    await dateRangeLocator.click();

    // Click the start date label in the calendar
    const startComponents = AvailabilityManagementPage.parseDateString(config.startDate);
    logger.info(`Clicking start date: ${startComponents.label}`);
    await this.page.getByLabel(startComponents.label).click();

    // Change the month to the end date's month using the Month dropdown (0-indexed values)
    const endComponents = AvailabilityManagementPage.parseDateString(config.endDate);
    logger.info(`Selecting month: ${endComponents.monthName} (${endComponents.month})`);
    await this.monthSelect.selectOption(String(endComponents.month - 1));

    // Click the end date label in the calendar
    logger.info(`Clicking end date: ${endComponents.label}`);
    await this.page.getByLabel(endComponents.label).click();

    // Check "All Days"
    logger.info('Checking All Days checkbox');
    await this.allDaysCheckbox.check();

    // Apply the date range
    logger.info('Applying date range');
    await this.applyButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.applyButton.click();
  }

  /** Handles the "Do you want to select more days to update?" confirmation. */
  async confirmMoreDaysUpdate(): Promise<void> {
    try {
    logger.info('Confirming more days update prompt');
    await expect(this.moreDaysPrompt).toContainText('Do you want to select more days to update?');
    await this.elementActions.click(this.yesButton, 'Yes button');
    } catch (error) {
      logger.warn('More days update prompt did not appear, proceeding without clicking Yes');
    }
  }

  /** Saves the availability and selects a status type. */
  async saveAndSetStatus(statusType: string): Promise<void> {
    logger.info('Clicking Save');
    await this.elementActions.click(this.saveButton.first(), 'Save button (first)');

    logger.info(`Selecting status: ${statusType}`);
    await this.elementActions.click(this.statusDropdown, 'Status dropdown');
    await this.elementActions.click(
      this.page.getByLabel('Options list').getByText(statusType),
      `Status option: ${statusType}`,
    );

    logger.info('Clicking Save (final)');
    await this.elementActions.click(this.saveButton.last(), 'Save button (final)');

    logger.info('Verifying success message');
    await expect(this.successMessage).toContainText('Details created/updated successfully.');

    await this.elementActions.click(this.okButton, 'OK button');
  }

  // ──────────────────────────────────────────────────────────────
  //  Reservation Verification
  // ──────────────────────────────────────────────────────────────

  /** Opens Guest Management, creates a new reservation, and verifies the arrival closure message. */
  async verifyArrivalClosed(expectedMessage: string): Promise<void> {
    logger.info('Clicking New Reservation');
    await this.elementActions.click(this.newReservationButton, 'New Reservation button');

    logger.info('Clicking Next');
    await this.elementActions.click(this.nextButton, 'Next button');

    // Wait for loader overlay to disappear after navigation
    logger.info('Waiting for loader overlay to disappear');
    await this.page.locator('.loader-overlay').waitFor({ state: 'hidden', timeout: 15000 });

    logger.info('Clicking + to add occupant');
    await this.elementActions.click(this.addOccupantButton, 'Add occupant (+) button');

    logger.info(`Verifying arrival closed message: "${expectedMessage}"`);
    await expect(this.arrivalClosedMessage).toContainText(expectedMessage);
  }

  // ──────────────────────────────────────────────────────────────
  //  Revise Availability (SU_AVAIL_006)
  // ──────────────────────────────────────────────────────────────

  /**
   * Click on the current business date in the calendar header row
   * (S M T W T F S) to select it for editing.
   * The calendar header contains day-of-week abbreviations and clicking
   * on the current business date cell opens a confirmation popup.
   */
  async clickBusinessDateInCalendar(): Promise<void> {
    logger.info('Clicking on the current business date in the calendar (S M T W T F S)');

    // Get the business date and extract the day of week
    const businessDate = await this.getBusinessDate();
    const [dayStr, monthStr, yearStr] = businessDate.split('/');
    const dayOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
    const dayOfWeek = dayOfWeekNames[dateObj.getDay()];
    logger.info(`Business date: ${businessDate} (${dayOfWeek})`);

    // Find the calendar container and click on the business date cell
    const clicked = await this.page.evaluate((day: number) => {
      // Look for the calendar grid cells
      const cells = document.querySelectorAll('.fc-day, td.fc-day, td[data-date], .calendar-day, .day-cell, td.day');
      for (const cell of cells) {
        const dateAttr = cell.getAttribute('data-date') || cell.getAttribute('data-day');
        if (dateAttr && dateAttr.includes(String(day))) {
          (cell as HTMLElement).click();
          return true;
        }
      }

      // Fallback: look for table cells in the availability management grid
      const allCells = document.querySelectorAll('table td');
      for (const cell of allCells) {
        const text = cell.textContent?.trim() || '';
        // Match the day number in a week header context
        if (text === String(day)) {
          (cell as HTMLElement).click();
          return true;
        }
      }
      return false;
    }, parseInt(dayStr));

    if (!clicked) {
      // Try alternative: click the day column header that matches the business date
      logger.info('Trying alternative approach: clicking day column header');
      const dayHeader = this.page.locator('th, td').filter({ hasText: new RegExp(`^${dayOfWeek}$`) }).first();
      await this.elementActions.click(dayHeader, `Day header: ${dayOfWeek}`);
    }

    await this.page.waitForTimeout(1000);
    logger.info('Business date clicked in calendar');
  }

  /**
   * Click Yes on the confirmation popup that appears after clicking
   * a business date in the availability management calendar.
   */
  async confirmBusinessDatePopup(): Promise<void> {
    logger.info('Checking for business date confirmation popup');
    try {
      const yesButton = this.page.getByRole('button', { name: 'Yes' });
      if (await yesButton.isVisible({ timeout: 5000 })) {
        await this.elementActions.click(yesButton, 'Yes button on business date confirmation');
        logger.info('Confirmed business date popup');
      }
    } catch {
      logger.info('No business date confirmation popup appeared');
    }
  }

  /**
   * Click the "Revise Availability" button to open the revise availability modal.
   */
  async clickReviseAvailability(): Promise<void> {
    logger.info('Clicking Revise Availability button');
    const reviseBtn = this.page.getByRole('button', { name: /Revise Availability/i }).first();
    await this.elementActions.click(reviseBtn, 'Revise Availability button');
    await this.page.waitForTimeout(1000);
    logger.info('Revise Availability modal opened');
  }

  /**
   * In the Revise Availability modal, select the type (e.g., "Overbooking")
   * from the dropdown and enter a numeric value.
   *
   * @param type   The type to select (e.g., 'Overbooking')
   * @param value  The numeric value to enter
   */
  async selectReviseTypeAndEnterValue(type: string, value: number): Promise<void> {
    logger.info(`Selecting revise type: "${type}" with value: ${value}`);

    // Select the type from the combobox/dropdown
    const typeDropdown = this.page.getByRole('combobox').first();
    await this.elementActions.click(typeDropdown, 'Revise type dropdown');
    await typeDropdown.selectOption({ label: type });
    logger.info(`Selected type: "${type}"`);

    // Enter the value in the spinbutton/number input
    const valueInput = this.page.getByRole('spinbutton').first();
    await this.elementActions.click(valueInput, 'Revise value input');
    await valueInput.fill(String(value));
    logger.info(`Entered value: ${value}`);
  }

  /**
   * Click Save in the Revise Availability modal.
   */
  async saveReviseAvailability(): Promise<void> {
    logger.info('Saving revised availability');
    const saveBtn = this.page.locator('.modal.show button, ngb-modal-window button')
      .filter({ hasText: /Save/i }).first();
    await this.elementActions.click(saveBtn, 'Save button in Revise Availability modal');
    await this.page.waitForTimeout(2000);
    logger.info('Revise Availability saved');
  }

  /**
   * Verify the success message after saving revised availability
   * and click OK to dismiss.
   */
  async verifyReviseSuccessAndClickOK(): Promise<void> {
    logger.info('Verifying revised availability success message');

    // Wait for the success/alert popup
    const successPopup = this.page.locator('.swal2-popup, .modal.show')
      .filter({ hasText: /success|updated|created|saved/i }).first();
    await successPopup.waitFor({ state: 'visible', timeout: 15000 });

    const messageText = await successPopup.textContent() || '';
    logger.info(`Success message: ${messageText}`);

    // Click OK
    const okBtn = this.page.locator('.swal2-confirm, .modal.show button')
      .filter({ hasText: /^OK$/i }).first();
    await this.elementActions.click(okBtn, 'OK button on success message');
    logger.info('Success message dismissed');
  }

  // ──────────────────────────────────────────────────────────────
  //  Full Flow
  // ──────────────────────────────────────────────────────────────

  /** Runs the full availability management flow: configure dates, set Close for Arrival, verify in reservation. */
  async runAvailabilityCloseForArrivalFlow(config: AvailabilityConfig = {}): Promise<void> {
    const {
      propertyName = 'DGT',
      startDate,
      endDate,
      statusType = 'Close for Arrival',
    } = config;

    // Resolve dates: if not provided, fetch business date and compute end-of-year
    let start = startDate;
    let end = endDate;

    if (!start) {
      start = await this.getBusinessDate();
    }
    if (!end) {
      end = AvailabilityManagementPage.getRandomDecemberDate(start);
    }

    logger.info(`Flow dates: start=${start}, end=${end}`);

    // Step 1: Open Availability Management
    await this.openAvailabilityManagement();

    // Step 2: Select property and apply
    await this.selectPropertyAndApply(propertyName);

    // Step 3: Advance date range selection
    await this.selectAdvanceDateRange({ startDate: start, endDate: end });

    // Step 4: Confirm "more days" prompt
    await this.confirmMoreDaysUpdate();

    // Step 5: Save and set Close for Arrival
    await this.saveAndSetStatus(statusType);

    // Step 6: Navigate to Guest Management
    await this.openGuestManagement();

    // Step 7: Verify arrival closed message in new reservation
    await this.verifyArrivalClosed('This date is closed for Arrival.');
  }

  /**
   * Runs the full overbooking flow via Availability Management (SU_AVAIL_006).
   *
   * @param config  Configuration for the overbooking flow
   */
  async runOverbookingRevisionFlow(config: {
    propertyName: string;
    overbookingValue: number;
  }): Promise<void> {
    const { propertyName, overbookingValue } = config;

    // Step 1: Open Availability Management
    await this.openAvailabilityManagement();

    // Step 2: Get business date and set up date range filter
    const businessDate = await this.getBusinessDate();
    const year = businessDate.split('/')[2];
    const startDate = `01/01/${year}`;
    const endDate = `31/12/${year}`;

    // Step 3: Select property and apply
    await this.selectPropertyAndApply(propertyName);

    // Step 4: Advance date range selection
    await this.selectAdvanceDateRange({ startDate, endDate });

    // Step 5: Confirm "more days" prompt
    await this.confirmMoreDaysUpdate();

    logger.info('Availability Management filter applied successfully');
  }
}
