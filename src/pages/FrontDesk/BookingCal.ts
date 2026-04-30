import { Page, BrowserContext } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import { WaitUtils } from '../../utils/WaitUtils';
import logger from '../../core/Logger';

/**
 * Booking Calendar Page Object
 * Handles booking calendar, tape chart, room availability, and booking details
 * Locators integrated within the class
 */
export class BookingCalendarPage extends BasePage {
  private elementActions: ElementActions;
  private waitUtils: WaitUtils;

  // ============================================
  // LOCATORS - Integrated in Page Object
  // ============================================
  private readonly calendarContainer = '[class*="calendar"], [data-testid="booking-calendar"]';
  private readonly tapeChart = '[class*="tape-chart"], [class*="schedule-view"]';
  private readonly previousMonthButton = 'button[aria-label*="previous"], button:has-text("‹")';
  private readonly nextMonthButton = 'button[aria-label*="next"], button:has-text("›")';
  private readonly monthYearDisplay = '[class*="month-year"]';
  private readonly todayButton = 'button:has-text("Today")';
  private readonly calendarCell = '[role="gridcell"], [class*="calendar-day"]';
  private readonly bookingBlock = '[class*="booking"], [class*="reservation-block"]';
  private readonly availableRoom = '[class*="available"], [data-testid*="available"]';
  private readonly occupiedRoom = '[class*="occupied"], [data-testid*="occupied"]';
  private readonly bookingDetailPanel = '[class*="detail-panel"], [class*="side-panel"]';
  private readonly confirmationNumberDisplay = '[data-testid*="confirmation"], span:has-text("Conf")';
  private readonly guestNameDisplay = '[data-testid*="guest-name"], [class*="guest-name"]';
  private readonly checkInDate = '[data-testid*="check-in"], span:has-text("Check-in")';
  private readonly checkOutDate = '[data-testid*="check-out"], span:has-text("Check-out")';
  private readonly roomNumberDisplay = '[data-testid*="room-number"], [class*="room-number"]';
  private readonly roomTypeDisplay = '[data-testid*="room-type"], [class*="room-type"]';
  private readonly modifyButton = 'button:has-text("Modify"), [data-testid="modify-btn"]';
  private readonly cancelButton = 'button:has-text("Cancel Booking"), [data-testid="cancel-booking"]';
  private readonly checkInButton = 'button:has-text("Check In"), [data-testid="check-in"]';
  private readonly checkOutButton = 'button:has-text("Check Out"), [data-testid="check-out"]';
  private readonly viewDetailsButton = 'button:has-text("View Details"), [data-testid="view-details"]';
  private readonly bookingCart = '[class*="booking-cart"], [data-testid="booking-cart"]';
  private readonly roomSelectionPanel = '[class*="room-selection"], [data-testid="room-selection"]';
  private readonly roomTypeSelect = '[formControlName="roomType"], select[data-testid="room-type"]';
  private readonly numberOfRoomsInput = '[formControlName="numberOfRooms"], input[type="number"]';
  private readonly roomList = '[class*="room-list"], [data-testid="room-list"]';
  private readonly roomRateDisplay = '[data-testid*="room-rate"], span:has-text("$")';
  private readonly totalPrice = '[data-testid*="total-price"], [class*="total-amount"]';
  private readonly discountAmount = '[data-testid*="discount"], [class*="discount"]';
  private readonly taxAmount = '[data-testid*="tax"], [class*="tax-amount"]';
  private readonly filterPanel = '[class*="filter-panel"], [data-testid="filters"]';
  private readonly roomTypeFilter = '[formControlName*="roomTypeFilter"]';
  private readonly occupancyFilter = '[formControlName*="occupancy"]';
  private readonly applyFilterButton = 'button:has-text("Apply Filter"), [data-testid="apply-filter"]';
  private readonly folioButton = 'button:has-text("Folio"), [data-testid="folio"]';
  private readonly invoiceButton = 'button:has-text("Invoice"), [data-testid="invoice"]';
  private readonly printButton = 'button:has-text("Print"), [data-testid="print"]';
  private readonly statusBadge = '[class*="badge"], [class*="status"]';
  private readonly reservedBadge = '[class*="badge"]:has-text("Reserved")';
  private readonly checkedInBadge = '[class*="badge"]:has-text("Checked In")';
  private readonly checkedOutBadge = '[class*="badge"]:has-text("Checked Out")';
  private readonly closeButton = 'button[aria-label="Close"], button:has-text("Close")';
  private readonly backButton = 'button:has-text("Back"), [data-testid="back"]';
  private readonly loader = '[class*="loader"], [class*="spinner"]';
  private readonly errorMessage = '[class*="error"], [role="alert"]';

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.waitUtils = new WaitUtils(page);
  }

  /**
   * CALENDAR NAVIGATION
   */

  async clickPreviousMonth(): Promise<void> {
    logger.info('Clicking Previous Month button');
    await this.elementActions.click(this.previousMonthButton, 'Previous Month Button');
    await this.waitForLoadingComplete();
  }

  async clickNextMonth(): Promise<void> {
    logger.info('Clicking Next Month button');
    await this.elementActions.click(this.nextMonthButton, 'Next Month Button');
    await this.waitForLoadingComplete();
  }

  async clickToday(): Promise<void> {
    logger.info('Clicking Today button');
    await this.elementActions.click(this.todayButton, 'Today Button');
    await this.waitForLoadingComplete();
  }

  async getDisplayedMonth(): Promise<string> {
    logger.debug('Getting displayed month');
    const month = await this.elementActions.getText(this.monthYearDisplay, 'Month/Year Display');
    logger.info(`Current month displayed: ${month}`);
    return month;
  }

  /**
   * BOOKING SELECTION
   */

  async clickCalendarDate(date: number): Promise<void> {
    logger.info(`Clicking on calendar date: ${date}`);
    const dateLocator = `[aria-label*="${date}"]`;
    await this.elementActions.click(dateLocator, `Calendar Date ${date}`);
    await this.waitForLoadingComplete();
  }

  async clickBookingBlock(confirmationNumber: string): Promise<void> {
    logger.info(`Clicking booking block with confirmation: ${confirmationNumber}`);
    const bookingLocator = `[data-testid*="${confirmationNumber}"], [title*="${confirmationNumber}"]`;
    await this.elementActions.click(bookingLocator, `Booking Block ${confirmationNumber}`);
    await this.waitForLoadingComplete();
  }

  /**
   * BOOKING DETAIL PANEL
   */

  async getConfirmationNumber(): Promise<string> {
    logger.debug('Getting confirmation number from booking detail panel');
    const confirmationNumber = await this.elementActions.getText(this.confirmationNumberDisplay, 'Confirmation Number');
    logger.info(`Confirmation number: ${confirmationNumber}`);
    return confirmationNumber;
  }

  async getGuestName(): Promise<string> {
    logger.debug('Getting guest name from booking detail panel');
    const guestName = await this.elementActions.getText(this.guestNameDisplay, 'Guest Name');
    logger.info(`Guest name: ${guestName}`);
    return guestName;
  }

  async getCheckInDate(): Promise<string> {
    logger.debug('Getting check-in date from booking detail panel');
    const checkInDate = await this.elementActions.getText(this.checkInDate, 'Check-in Date');
    logger.info(`Check-in date: ${checkInDate}`);
    return checkInDate;
  }

  async getCheckOutDate(): Promise<string> {
    logger.debug('Getting check-out date from booking detail panel');
    const checkOutDate = await this.elementActions.getText(this.checkOutDate, 'Check-out Date');
    logger.info(`Check-out date: ${checkOutDate}`);
    return checkOutDate;
  }

  async getRoomNumber(): Promise<string> {
    logger.debug('Getting room number from booking detail panel');
    const roomNumber = await this.elementActions.getText(this.roomNumberDisplay, 'Room Number');
    logger.info(`Room number: ${roomNumber}`);
    return roomNumber;
  }

  async getRoomType(): Promise<string> {
    logger.debug('Getting room type from booking detail panel');
    const roomType = await this.elementActions.getText(this.roomTypeDisplay, 'Room Type');
    logger.info(`Room type: ${roomType}`);
    return roomType;
  }

  async isBookingDetailPanelVisible(): Promise<boolean> {
    logger.debug('Checking if booking detail panel is visible');
    const isVisible = await this.elementActions.isElementVisible(this.bookingDetailPanel, 'Booking Detail Panel');
    logger.info(`Booking detail panel visible: ${isVisible}`);
    return isVisible;
  }

  /**
   * BOOKING ACTIONS
   */

  async clickModify(): Promise<void> {
    logger.info('Clicking Modify button');
    await this.elementActions.click(this.modifyButton, 'Modify Button');
    await this.waitForLoadingComplete();
  }

  async clickCancelBooking(): Promise<void> {
    logger.info('Clicking Cancel Booking button');
    await this.elementActions.click(this.cancelButton, 'Cancel Booking Button');
    await this.waitForLoadingComplete();
  }

  async clickCheckIn(): Promise<void> {
    logger.info('Clicking Check-in button');
    await this.elementActions.click(this.checkInButton, 'Check-in Button');
    await this.waitForLoadingComplete();
  }

  async clickCheckOut(): Promise<void> {
    logger.info('Clicking Check-out button');
    await this.elementActions.click(this.checkOutButton, 'Check-out Button');
    await this.waitForLoadingComplete();
  }

  async clickViewDetails(): Promise<void> {
    logger.info('Clicking View Details button');
    await this.elementActions.click(this.viewDetailsButton, 'View Details Button');
    await this.waitForLoadingComplete();
  }

  /**
   * BOOKING CART - ROOM SELECTION
   */

  async selectRoomType(roomType: string): Promise<void> {
    logger.info(`Selecting room type: ${roomType}`);
    await this.elementActions.click(this.roomTypeSelect, 'Room Type Select');
    await this.elementActions.click(`[role="option"]:has-text("${roomType}")`, `Room Type Option: ${roomType}`);
    await this.waitForLoadingComplete();
  }

  async setNumberOfRooms(count: number): Promise<void> {
    logger.info(`Setting number of rooms to: ${count}`);
    await this.elementActions.sendKeys(this.numberOfRoomsInput, count.toString(), 'Number of Rooms Input', true);
  }

  async selectRoom(roomNumber: string): Promise<void> {
    logger.info(`Selecting room: ${roomNumber}`);
    const roomLocator = `[data-testid*="room-${roomNumber}"], [title*="Room ${roomNumber}"]`;
    await this.elementActions.click(roomLocator, `Room ${roomNumber}`);
    await this.waitForLoadingComplete();
  }

  /**
   * PRICING
   */

  async getRoomRate(): Promise<string> {
    logger.debug('Getting room rate');
    const rate = await this.elementActions.getText(this.roomRateDisplay, 'Room Rate');
    logger.info(`Room rate: ${rate}`);
    return rate;
  }

  async getTotalPrice(): Promise<string> {
    logger.debug('Getting total price');
    const totalPrice = await this.elementActions.getText(this.totalPrice, 'Total Price');
    logger.info(`Total price: ${totalPrice}`);
    return totalPrice;
  }

  async getDiscountAmount(): Promise<string> {
    logger.debug('Getting discount amount');
    const discount = await this.elementActions.getText(this.discountAmount, 'Discount Amount');
    logger.info(`Discount amount: ${discount}`);
    return discount;
  }

  async getTaxAmount(): Promise<string> {
    logger.debug('Getting tax amount');
    const tax = await this.elementActions.getText(this.taxAmount, 'Tax Amount');
    logger.info(`Tax amount: ${tax}`);
    return tax;
  }

  /**
   * FILTERS
   */

  async selectRoomTypeFilter(roomType: string): Promise<void> {
    logger.info(`Selecting room type filter: ${roomType}`);
    await this.elementActions.click(this.roomTypeFilter, 'Room Type Filter');
    await this.elementActions.click(`[role="option"]:has-text("${roomType}")`, `Room Type Filter Option: ${roomType}`);
  }

  async selectOccupancyFilter(occupancy: string): Promise<void> {
    logger.info(`Selecting occupancy filter: ${occupancy}`);
    await this.elementActions.click(this.occupancyFilter, 'Occupancy Filter');
    await this.elementActions.click(`[role="option"]:has-text("${occupancy}")`, `Occupancy Filter Option: ${occupancy}`);
  }

  async clickApplyFilter(): Promise<void> {
    logger.info('Clicking Apply Filter button');
    await this.elementActions.click(this.applyFilterButton, 'Apply Filter Button');
    await this.waitForLoadingComplete();
  }

  /**
   * FOLIO/INVOICE
   */

  async clickFolio(): Promise<void> {
    logger.info('Clicking Folio button');
    await this.elementActions.click(this.folioButton, 'Folio Button');
    await this.waitForLoadingComplete();
  }

  async clickInvoice(): Promise<void> {
    logger.info('Clicking Invoice button');
    await this.elementActions.click(this.invoiceButton, 'Invoice Button');
    await this.waitForLoadingComplete();
  }

  async clickPrint(): Promise<void> {
    logger.info('Clicking Print button');
    await this.elementActions.click(this.printButton, 'Print Button');
  }

  /**
   * STATUS BADGES
   */

  async getBookingStatus(): Promise<string> {
    logger.debug('Getting booking status');
    const status = await this.elementActions.getText(this.statusBadge, 'Status Badge');
    logger.info(`Booking status: ${status}`);
    return status;
  }

  async isReservedStatusVisible(): Promise<boolean> {
    logger.debug('Checking if Reserved status is visible');
    const isVisible = await this.elementActions.isElementVisible(this.reservedBadge, 'Reserved Status Badge');
    logger.info(`Reserved status visible: ${isVisible}`);
    return isVisible;
  }

  async isCheckedInStatusVisible(): Promise<boolean> {
    logger.debug('Checking if Checked-in status is visible');
    const isVisible = await this.elementActions.isElementVisible(this.checkedInBadge, 'Checked-in Status Badge');
    logger.info(`Checked-in status visible: ${isVisible}`);
    return isVisible;
  }

  /**
   * CALENDAR STATE
   */

  async isCalendarVisible(): Promise<boolean> {
    logger.debug('Checking if calendar is visible');
    const isVisible = await this.elementActions.isElementVisible(this.calendarContainer, 'Calendar Container');
    logger.info(`Calendar visible: ${isVisible}`);
    return isVisible;
  }

  async isTapeChartVisible(): Promise<boolean> {
    logger.debug('Checking if tape chart is visible');
    const isVisible = await this.elementActions.isElementVisible(this.tapeChart, 'Tape Chart');
    logger.info(`Tape chart visible: ${isVisible}`);
    return isVisible;
  }

  async getAvailableRoomsCount(): Promise<number> {
    logger.debug('Getting available rooms count');
    const availableRooms = await this.page.$$(this.availableRoom);
    const count = availableRooms.length;
    logger.info(`Available rooms count: ${count}`);
    return count;
  }

  async getOccupiedRoomsCount(): Promise<number> {
    logger.debug('Getting occupied rooms count');
    const occupiedRooms = await this.page.$$(this.occupiedRoom);
    const count = occupiedRooms.length;
    logger.info(`Occupied rooms count: ${count}`);
    return count;
  }

  /**
   * CLOSE/NAVIGATE
   */

  async clickClose(): Promise<void> {
    logger.info('Clicking Close button');
    await this.elementActions.click(this.closeButton, 'Close Button');
  }

  async clickBack(): Promise<void> {
    logger.info('Clicking Back button');
    await this.elementActions.click(this.backButton, 'Back Button');
  }

  /**
   * VALIDATIONS
   */

  async hasError(): Promise<boolean> {
    logger.debug('Checking if error message is visible');
    const hasError = await this.elementActions.isElementVisible(this.errorMessage, 'Error Message');
    logger.info(`Has error: ${hasError}`);
    return hasError;
  }

  async getError(): Promise<string> {
    logger.debug('Getting error message text');
    const errorText = await this.elementActions.getText(this.errorMessage, 'Error Message');
    logger.error(`Error message: ${errorText}`);
    return errorText;
  }

  async isLoading(): Promise<boolean> {
    logger.debug('Checking if loading spinner is visible');
    const isLoading = await this.elementActions.isElementVisible(this.loader, 'Loader');
    logger.info(`Is loading: ${isLoading}`);
    return isLoading;
  }

  /**
   * UTILITY METHODS
   */

  private async waitForLoadingComplete(): Promise<void> {
    await this.waitUtils.waitForNetworkIdle();
  }
}

export default BookingCalendarPage;

