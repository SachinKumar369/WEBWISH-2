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
    this.advanceSelectionButton = this.page.getByRole('button', { name: 'Advance Selection' });
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
    this.businessDateHeading = this.page.getByRole('heading', { name: 'Property Id: WEBWE,  User Id' });
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
  async selectAdvanceDateRange(config: {
    startDate: string;   // DD/MM/YYYY
    endDate: string;     // DD/MM/YYYY
  }): Promise<void> {
    // wait for 2 seconds to ensure the UI is ready for next interactions
    await this.page.waitForTimeout(2000);

    logger.info('Opening Advance Selection');
    await this.elementActions.click(this.advanceSelectionButton, 'Advance Selection button');

    // Click the date range input to open the calendar picker
    logger.info(`Selecting date range: ${config.startDate} to ${config.endDate}`);
    const dateRangeLocator = this.page.getByRole('textbox', { name: 'Select Date Range' });
    await this.elementActions.click(dateRangeLocator, 'Date Range input');

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
    await this.elementActions.click(this.applyButton, 'Apply button');
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
}
