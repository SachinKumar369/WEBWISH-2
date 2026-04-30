import { Page, BrowserContext } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import { WaitUtils } from '../../utils/WaitUtils';
import logger from '../../core/Logger';

/**
 * Advance Search Page Object
 * Handles advance search and special account search functionality
 * Locators integrated within the class
 */
export class AdvanceSearchPage extends BasePage {
  private elementActions: ElementActions;
  private waitUtils: WaitUtils;

  // ============================================
  // LOCATORS - Integrated in Page Object
  // ============================================
  private readonly filterContainer = '[class*="autohide-scrollbar"]';
  private readonly advanceSearchForm = 'form[formGroup*="advanceSearch"]';
  private readonly reservedRadio = '#resrvd';
  private readonly holdRadio = '#hld';
  private readonly inhouseRadio = '#inhous';
  private readonly checkedOutRadio = '#chkout';
  private readonly cancelledRadio = '#cncl';
  private readonly noShowRadio = '#noso';
  private readonly propertyDropdown = '[formControlName="propertyId"], [data-testid="property-select"]';
  private readonly guestNameInput = '[formControlName*="guest"], input[placeholder*="Guest"]';
  private readonly guestSearchButton = 'button:has-text("Search"), [data-testid="guest-search-btn"]';
  private readonly confirmationNumberInput = '[formControlName*="confirmation"], input[placeholder*="Confirmation"]';
  private readonly checkInDateInput = '[formControlName*="checkIn"], input[type="date"]';
  private readonly checkOutDateInput = '[formControlName*="checkOut"], input[type="date"]';
  private readonly roomTypeDropdown = '[formControlName*="roomType"]';
  private readonly numberOfRoomsInput = '[formControlName*="numberOfRooms"], input[type="number"]';
  private readonly numberOfGuestsInput = '[formControlName*="numberOfGuests"], input[type="number"]';
  private readonly searchResultsGrid = '[role="grid"], [class*="table"]';
  private readonly searchResultsRows = '[role="row"], tr';
  private readonly searchButton = 'button:has-text("Search"), [data-testid="search-btn"]';
  private readonly clearButton = 'button:has-text("Clear"), [data-testid="clear-btn"]';
  private readonly resetButton = 'button:has-text("Reset")';
  private readonly okButton = 'button:has-text("OK"), [data-testid="ok-btn"]';
  private readonly cancelButton = 'button:has-text("Cancel"), [data-testid="cancel-btn"]';
  private readonly closeButton = 'button:has-text("Close"), [aria-label="Close"]';
  private readonly specialAccountInput = '[formControlName*="specialAccount"], input[placeholder*="Special Account"]';
  private readonly accountTypeDropdown = '[formControlName*="accountType"]';
  private readonly filterPanel = '[class*="filter"], [class*="panel"]';
  private readonly loader = '[class*="loader"], [class*="spinner"], .spinner';
  private readonly errorMessage = '[class*="error"], [role="alert"]';
  private readonly noDataMessage = '[class*="no-data"], [class*="no-records"]';

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.waitUtils = new WaitUtils(page);
  }

  /**
   * SELECT RESERVATION STATUS
   */

  async selectReserved(): Promise<void> {
    logger.info('Selecting Reserved status');
    await this.elementActions.click(this.reservedRadio, 'Reserved Radio Button');
    await this.waitForLoadingComplete();
  }

  async selectHold(): Promise<void> {
    logger.info('Selecting Hold status');
    await this.elementActions.click(this.holdRadio, 'Hold Radio Button');
    await this.waitForLoadingComplete();
  }

  async selectInhouse(): Promise<void> {
    logger.info('Selecting Inhouse status');
    await this.elementActions.click(this.inhouseRadio, 'Inhouse Radio Button');
    await this.waitForLoadingComplete();
  }

  async selectCheckedOut(): Promise<void> {
    logger.info('Selecting Checked Out status');
    await this.elementActions.click(this.checkedOutRadio, 'Checked Out Radio Button');
    await this.waitForLoadingComplete();
  }

  async selectCancelled(): Promise<void> {
    logger.info('Selecting Cancelled status');
    await this.elementActions.click(this.cancelledRadio, 'Cancelled Radio Button');
    await this.waitForLoadingComplete();
  }

  async selectNoShow(): Promise<void> {
    logger.info('Selecting No Show status');
    await this.elementActions.click(this.noShowRadio, 'No Show Radio Button');
    await this.waitForLoadingComplete();
  }

  /**
   * FILL SEARCH CRITERIA
   */

  async selectProperty(propertyName: string): Promise<void> {
    logger.info(`Selecting property: ${propertyName}`);
    await this.elementActions.click(this.propertyDropdown, 'Property Dropdown');
    await this.elementActions.click(`[role="option"]:has-text("${propertyName}")`, `Property Option: ${propertyName}`);
    await this.waitForLoadingComplete();
  }

  async searchByGuestName(guestName: string): Promise<void> {
    logger.info(`Searching by guest name: ${guestName}`);
    await this.elementActions.sendKeys(this.guestNameInput, guestName, 'Guest Name Input', true);
  }

  async searchByConfirmationNumber(confirmationNumber: string): Promise<void> {
    logger.info(`Searching by confirmation number: ${confirmationNumber}`);
    await this.elementActions.sendKeys(this.confirmationNumberInput, confirmationNumber, 'Confirmation Number Input', true);
  }

  async setCheckInDate(date: string): Promise<void> {
    logger.info(`Setting check-in date: ${date}`);
    await this.elementActions.sendKeys(this.checkInDateInput, date, 'Check-in Date Input', true);
  }

  async setCheckOutDate(date: string): Promise<void> {
    logger.info(`Setting check-out date: ${date}`);
    await this.elementActions.sendKeys(this.checkOutDateInput, date, 'Check-out Date Input', true);
  }

  async selectRoomType(roomType: string): Promise<void> {
    logger.info(`Selecting room type: ${roomType}`);
    await this.elementActions.click(this.roomTypeDropdown, 'Room Type Dropdown');
    await this.elementActions.click(`[role="option"]:has-text("${roomType}")`, `Room Type Option: ${roomType}`);
  }

  async setNumberOfRooms(count: number): Promise<void> {
    logger.info(`Setting number of rooms: ${count}`);
    await this.elementActions.sendKeys(this.numberOfRoomsInput, count.toString(), 'Number of Rooms Input', true);
  }

  async setNumberOfGuests(count: number): Promise<void> {
    logger.info(`Setting number of guests: ${count}`);
    await this.elementActions.sendKeys(this.numberOfGuestsInput, count.toString(), 'Number of Guests Input', true);
  }

  /**
   * SEARCH ACTIONS
   */

  async clickSearch(): Promise<void> {
    logger.info('Clicking Search button');
    await this.elementActions.click(this.searchButton, 'Search Button');
    await this.waitForLoadingComplete();
  }

  async clickClear(): Promise<void> {
    logger.info('Clicking Clear button');
    await this.elementActions.click(this.clearButton, 'Clear Button');
  }

  async clickReset(): Promise<void> {
    logger.info('Clicking Reset button');
    await this.elementActions.click(this.resetButton, 'Reset Button');
  }

  async performSearch(criteria: {
    status?: string;
    property?: string;
    guestName?: string;
    confirmationNumber?: string;
    checkInDate?: string;
    checkOutDate?: string;
  }): Promise<void> {
    logger.info('Performing search with criteria', criteria);
    if (criteria.status) {
      await this.selectByStatus(criteria.status);
    }
    if (criteria.property) {
      await this.selectProperty(criteria.property);
    }
    if (criteria.guestName) {
      await this.searchByGuestName(criteria.guestName);
    }
    if (criteria.confirmationNumber) {
      await this.searchByConfirmationNumber(criteria.confirmationNumber);
    }
    if (criteria.checkInDate) {
      await this.setCheckInDate(criteria.checkInDate);
    }
    if (criteria.checkOutDate) {
      await this.setCheckOutDate(criteria.checkOutDate);
    }
    await this.clickSearch();
  }

  /**
   * SEARCH RESULTS
   */

  async getSearchResultsCount(): Promise<number> {
    logger.debug('Getting search results count');
    const rows = await this.page.$$(this.searchResultsRows);
    const count = rows.length;
    logger.info(`Found ${count} search results`);
    return count;
  }

  async isSearchResultsVisible(): Promise<boolean> {
    logger.debug('Checking if search results are visible');
    const isVisible = await this.elementActions.isElementVisible(this.searchResultsGrid, 'Search Results Grid');
    logger.info(`Search results visible: ${isVisible}`);
    return isVisible;
  }

  async getFirstReservationDetails(): Promise<{ confirmationNumber: string; guestName: string; checkInDate: string }> {
    logger.info('Getting first reservation details');
    const confirmationNumber = await this.elementActions.getText('[data-testid*="confirmation"]', 'Confirmation Number');
    const guestName = await this.elementActions.getText('[data-testid*="guest-name"]', 'Guest Name');
    const checkInDate = await this.elementActions.getText('[data-testid*="check-in"]', 'Check-in Date');

    const details = { confirmationNumber, guestName, checkInDate };
    logger.info('Retrieved first reservation details', details);
    return details;
  }

  async clickReservationRow(index: number = 0): Promise<void> {
    logger.info(`Clicking reservation row at index: ${index}`);
    const rows = await this.page.$$(this.searchResultsRows);
    if (rows[index]) {
      await rows[index].click();
      await this.waitForLoadingComplete();
      logger.info(`Clicked reservation row ${index}`);
    } else {
      logger.warn(`No reservation row found at index ${index}`);
    }
  }

  /**
   * SPECIAL ACCOUNT SEARCH
   */

  async searchBySpecialAccount(accountName: string): Promise<void> {
    logger.info(`Searching by special account: ${accountName}`);
    await this.elementActions.sendKeys(this.specialAccountInput, accountName, 'Special Account Input', true);
  }

  async selectAccountType(accountType: string): Promise<void> {
    logger.info(`Selecting account type: ${accountType}`);
    await this.elementActions.click(this.accountTypeDropdown, 'Account Type Dropdown');
    await this.elementActions.click(`[role="option"]:has-text("${accountType}")`, `Account Type Option: ${accountType}`);
  }

  /**
   * VALIDATIONS
   */

  async isFilterPanelVisible(): Promise<boolean> {
    logger.debug('Checking if filter panel is visible');
    const isVisible = await this.elementActions.isElementVisible(this.filterPanel, 'Filter Panel');
    logger.info(`Filter panel visible: ${isVisible}`);
    return isVisible;
  }

  async isFormValid(): Promise<boolean> {
    logger.debug('Checking if form is valid');
    const errorElement = await this.page.$(this.errorMessage);
    const isValid = !errorElement;
    logger.info(`Form is valid: ${isValid}`);
    return isValid;
  }

  async getErrorMessage(): Promise<string> {
    logger.debug('Getting error message');
    const errorMessage = await this.elementActions.getText(this.errorMessage, 'Error Message');
    logger.info(`Error message: ${errorMessage}`);
    return errorMessage;
  }

  async isLoaderVisible(): Promise<boolean> {
    logger.debug('Checking if loader is visible');
    const isVisible = await this.elementActions.isElementVisible(this.loader, 'Loader');
    logger.info(`Loader visible: ${isVisible}`);
    return isVisible;
  }

  async hasNoResults(): Promise<boolean> {
    logger.debug('Checking if no results message is visible');
    const hasNoResults = await this.elementActions.isElementVisible(this.noDataMessage, 'No Data Message');
    logger.info(`No results: ${hasNoResults}`);
    return hasNoResults;
  }

  /**
   * CLOSE/CANCEL
   */

  async clickCancel(): Promise<void> {
    logger.info('Clicking Cancel button');
    await this.elementActions.click(this.cancelButton, 'Cancel Button');
  }

  async clickOk(): Promise<void> {
    logger.info('Clicking OK button');
    await this.elementActions.click(this.okButton, 'OK Button');
  }

  async clickClose(): Promise<void> {
    logger.info('Clicking Close button');
    await this.elementActions.click(this.closeButton, 'Close Button');
  }

  /**
   * UTILITY METHODS
   */

  private async waitForLoadingComplete(): Promise<void> {
    await this.waitUtils.waitForNetworkIdle();
  }

  private async selectByStatus(status: string): Promise<void> {
    const statusMap: { [key: string]: () => Promise<void> } = {
      'Reserved': () => this.selectReserved(),
      'Hold': () => this.selectHold(),
      'Inhouse': () => this.selectInhouse(),
      'CheckedOut': () => this.selectCheckedOut(),
      'Cancelled': () => this.selectCancelled(),
      'NoShow': () => this.selectNoShow(),
    };

    if (statusMap[status]) {
      await statusMap[status]();
    } else {
      logger.warn(`Unknown status: ${status}`);
    }
  }
}

export default AdvanceSearchPage;

