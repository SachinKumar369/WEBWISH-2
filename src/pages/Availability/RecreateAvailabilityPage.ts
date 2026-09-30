import { BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

export interface RoomAvailability {
  roomType: string;
  availableRooms: number[];   // Available rooms per day (indexed 0 = 1st of month)
  totalAvailable: number;      // Total available on business date (index 0)
}

export interface AvailabilityGridData {
  roomTypes: RoomAvailability[];
  totalSaleable: number[];
  totalBooked: number[];
  occupancyPercent: number[];
  totalAvailable: number[];
  businessDate: string;        // e.g. '01/07/2025'
}

/**
 * Result of attempting to book a room type that has ZERO availability
 * (SU_AVAIL_004). The system should block the booking.
 */
export interface ZeroAvailabilityAttemptResult {
  roomType: string;                    // Room type that was targeted
  availableOnSelectionPage: number;    // Availability shown on the room selection page (should be <= 0)
  popupText: string;                   // Text of the "Room not available." popup
  counterAfterAttempt: number;         // Room counter value after clicking "+" (should stay 0)
  guestDetailsVisibleAfterNext: boolean; // Whether Guest Details appeared after clicking Next (should be false)
}

/**
 * Result of attempting to OVERBOOK a room type (SU_AVAIL_005):
 * select ALL available rooms (N) and then try to select one more (N+1).
 * The system should silently block the extra selection (counter stays at N).
 */
export interface OverbookingAttemptResult {
  roomType: string;                     // Room type that was targeted
  availableOnSelectionPage: number;     // Availability N shown on the room selection page
  counterAfterMaxSelection: number;      // Counter after clicking "+" N times (should equal N)
  counterAfterExtraClick: number;       // Counter after the (N+1)th "+" click (should stay N)
  extraClickPopupText: string | null;   // Popup text on the extra click, if any (null = silently blocked)
}

// ──────────────────────────────────────────────────────────────
//  Page Object – Recreate Availability (System Utilities)
// ──────────────────────────────────────────────────────────────

export class RecreateAvailabilityPage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ── Navigation locators ── */
  private readonly sidebarHoverArea: Locator;
  private readonly systemUtilitiesLink: Locator;
  private readonly systemUtilitiesSearchInput: Locator;
  private readonly recreateAvailabilityLink: Locator;

  /* ── Recreate Availability Action ── */
  private readonly playButton: Locator;
  private readonly refreshIcon: Locator;
  private readonly recreateAvailabilityHeading: Locator;

  /* ── Modal / Dialog ── */
  private readonly successModal: Locator;
  private readonly okButton: Locator;
  private readonly cancelButton: Locator;

  /* ── Quick Access Panel ── */
  private readonly quickAccessButton: Locator;  // .side-button with mdi-clock-fast
  private readonly quickAccessPanel: Locator;
  private readonly availabilityQuickLink: Locator;

  /* ── Availability Grid ── */
  private readonly availabilityHeading: Locator;
  private readonly availabilityTable: Locator;

  /* ── Business Date Header ── */
  private readonly businessDateHeading: Locator;

  /* ── Guest Management / New Reservation ── */
  private readonly guestManagementHeading: Locator;
  private readonly newReservationButton: Locator;

  /* ── Processing Message (Please wait! We are processing your request) ── */
  private readonly processingMessage: Locator;

  /* ── Guest Details ── */
  private readonly lastNameInput: Locator;
  private readonly confirmContinueButton: Locator;

  /* ── Confirmation Letter Prompt ── */
  private readonly confirmationLetterNoButton: Locator;
  private readonly successAlert: Locator;
  private readonly loaderOverlay: Locator;

  /* ── "Room not available." popup (zero-availability booking attempt) ── */
  private readonly roomNotAvailablePopupText: Locator;
  private readonly roomNotAvailableOkButton: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    // Navigation – sidebar
    this.sidebarHoverArea = this.page.locator('.simplebar-content').first();
    this.systemUtilitiesLink = this.page.locator('.simplebar-content li a').filter({ hasText: 'System Utilities' }).first();
    this.systemUtilitiesSearchInput = this.page.locator('.chat-leftsidebar input[placeholder="Search..."]').first();
    this.recreateAvailabilityLink = this.page.locator('a').filter({ hasText: 'Recreate Availability' }).first();

    // Recreate Availability action
    this.playButton = this.page.locator('button.btn-soft-primary').nth(1); // second btn-soft-primary (below heading)
    this.refreshIcon = this.page.locator('i.mdi-refresh');
    this.recreateAvailabilityHeading = this.page.getByRole('heading', { name: 'Recreate Availability' });

    // Modal
    this.successModal = this.page.getByText('Availability has been');
    this.okButton = this.page.getByRole('button', { name: 'OK' });
    //this.cancelButton = this.successModal.getByRole('button', { name: 'Cancel' });

    // Quick Access panel
    this.quickAccessButton = this.page.locator('.side-button.shadow-lg');
    this.quickAccessPanel = this.page.locator('.offcanvas.show, ngb-offcanvas-panel.offcanvas, .offcanvas.offcanvas-end');
    this.availabilityQuickLink = this.page.locator('button.list-group-item').filter({ hasText: 'Availability' });

    // Availability grid — inside the NGB modal popup that appears after clicking Quick Access
    this.availabilityHeading = this.page.getByRole('heading', { name: 'Availability' });
    this.availabilityTable = this.page.locator('.modal.show table, ngb-modal-window table').first();

    // Business date header
    this.businessDateHeading = this.page.getByRole('heading', { name: /Business Date:/ });

    // Guest Management / New Reservation
    this.guestManagementHeading = this.page.getByRole('heading', { name: 'Guest Management' });
    this.newReservationButton = this.page.getByRole('button', { name: /New Reservation/ });

    // Guest Details
    this.lastNameInput = this.page.locator('div').filter({ hasText: /^Last Name\*$/ }).getByRole('textbox');
    this.confirmContinueButton = this.page.getByRole('button', { name: 'Confirm & Continue' });

    // Processing message ("Please wait! We are processing your request")
    this.processingMessage = this.page.getByText('We are processing your request');

    // Confirmation letter prompt
    this.confirmationLetterNoButton = this.page.getByRole('button', { name: 'No' });
    this.successAlert = this.page.getByRole('alert');

    // Loader overlay
    this.loaderOverlay = this.page.locator('.loader-overlay');

    // "Room not available." SweetAlert2 popup – shown when clicking "+" on a
    // room type that has zero availability (verified via Playwright MCP)
    this.roomNotAvailablePopupText = this.page.locator('.swal2-popup .swal2-html-container');
    this.roomNotAvailableOkButton = this.page.locator('.swal2-popup .swal2-confirm');
  }

  // ──────────────────────────────────────────────────────────────
  //  Navigation Helpers
  // ──────────────────────────────────────────────────────────────

  /**
   * Navigate to System Utilities via sidebar.
   * The sidebar is collapsed by default; hovering on the left edge expands it.
   */
  async navigateToSystemUtilities(): Promise<void> {
    logger.info('Navigating to System Utilities via sidebar');

    // Hover on the sidebar to expand it
    await this.page.mouse.move(10, 400);
    await this.page.waitForTimeout(500);

    // Click on System Utilities
    await this.elementActions.click(this.systemUtilitiesLink, 'System Utilities menu item');

    logger.info('System Utilities page loaded');
  }

  /**
   * Search for and click on Recreate Availability.
   */
  async openRecreateAvailability(): Promise<void> {
    logger.info('Searching for Recreate Availability');

    // Wait for the System Utilities content to load
    await this.page.waitForTimeout(2000);

    // Type in the search box
    const searchInput = this.page.locator('.chat-leftsidebar input[placeholder="Search..."]');
    await this.elementActions.click(searchInput, 'System Utilities search input');
    await this.elementActions.sendKeys(searchInput, 'Recreate Availability', 'System Utilities search input');

    // Click on Recreate Availability link
    await this.elementActions.click(this.recreateAvailabilityLink, 'Recreate Availability link');
    await this.page.waitForTimeout(1000);

    logger.info('Recreate Availability page opened');
  }

  // ──────────────────────────────────────────────────────────────
  //  Recreate Availability Action
  // ──────────────────────────────────────────────────────────────

  /**
   * Click the Play button to trigger availability recreation.
   * Uses JavaScript click fallback because the header bar can intercept pointer events.
   */
  async clickPlayButton(): Promise<void> {
    logger.info('Clicking Play button to recreate availability');

    // Wait for the heading to be visible
    await this.page.waitForTimeout(1000);

    // Use JavaScript click to bypass header bar interception
    const clicked = await this.page.evaluate(() => {
      const headings = document.querySelectorAll('h5');
      for (const h of headings) {
        if (h.textContent?.includes('Recreate Availability')) {
          // Walk up a few ancestor levels until a <button> child is found
          let parent: HTMLElement | null = h.parentElement;
          for (let i = 0; i < 4 && parent; i++) {
            const btn = parent.querySelector('button');
            if (btn) {
              btn.scrollIntoView({ block: 'center' });
              btn.click();
              return true;
            }
            parent = parent.parentElement;
          }
        }
      }
      return false;
    });

    if (!clicked) {
      // Fallback: click the second btn-soft-primary button
      await this.elementActions.click(this.playButton, 'Play button (fallback)');
    }

    logger.info('Play button clicked');
  }

  /**
   * Wait for the processing to complete and the success modal to appear.
   *
   * The recreate-availability API call can transiently fail with a
   * "Unable to reach the server. Please try after some time." error dialog.
   * When that happens, dismiss the dialog and retry the Play click.
   *
   * @param timeoutMs       Maximum time to wait for the success modal per attempt
   * @param maxErrorRetries Maximum number of server-error retries
   */
  async waitForProcessingComplete(timeoutMs: number = 100000, maxErrorRetries: number = 3): Promise<void> {
    logger.info('Waiting for availability recreation to complete');

    const serverErrorText = this.page.getByText('Unable to reach the server');

    for (let attempt = 1; attempt <= maxErrorRetries; attempt++) {
      const startTime = Date.now();

      while (Date.now() - startTime < timeoutMs) {
        // Success modal appeared
        if (await this.successModal.isVisible({ timeout: 500 }).catch(() => false)) {
          logger.info('Availability recreation completed – success modal visible');
          return;
        }

        // Transient server error dialog – dismiss and retry the Play click
        if (await serverErrorText.isVisible({ timeout: 500 }).catch(() => false)) {
          logger.warn(`⚠️ "Unable to reach the server" error dialog (attempt ${attempt}/${maxErrorRetries}). Dismissing and retrying Play...`);

          const errorOkButton = this.page
            .locator('.swal2-confirm, .modal.show button, [role="dialog"] button')
            .filter({ hasText: /^OK$/i })
            .first();
          await errorOkButton.click().catch(async () => {
            await this.page.getByRole('button', { name: 'OK' }).first().click().catch(() => {});
          });
          await this.page.waitForTimeout(2000);

          await this.clickPlayButton();
          break; // restart the wait loop with a fresh timeout
        }

        await this.page.waitForTimeout(1000);
      }
    }

    // Final wait for the success modal (last resort)
    await this.successModal.waitFor({ state: 'visible', timeout: timeoutMs });
  }

  /**
   * Click OK on the success modal.
   */
  async clickOkOnSuccessModal(): Promise<void> {
    logger.info('Clicking OK on success modal');
    await this.okButton.click();
    logger.info('OK clicked on success modal');
  }

  // ──────────────────────────────────────────────────────────────
  //  Quick Access & Availability Grid
  // ──────────────────────────────────────────────────────────────

  /**
   * Open the Quick Access side panel by clicking the watch/clock button.
   * The button is a .side-button.shadow-lg div with a mdi-clock-fast icon.
   * It opens an NGB offcanvas panel (ngb-offcanvas-panel).
   */
  async openQuickAccessPanel(): Promise<void> {
    logger.info('Opening Quick Access panel');

    // Use JavaScript click since the button can be hidden/overlayed by header
    const clicked = await this.page.evaluate(() => {
      const btn = document.querySelector('.side-button.shadow-lg') as HTMLElement | null;
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!clicked) {
      throw new Error('Quick Access side button (.side-button.shadow-lg) not found in DOM');
    }

    // Wait for the offcanvas panel to appear in the DOM
    await this.page.waitForSelector('.offcanvas.show, ngb-offcanvas-panel', {
      state: 'visible',
      timeout: 10000,
    });
    await this.page.waitForTimeout(500);
    logger.info('Quick Access panel opened');
  }

  /**
   * Click on Availability in the Quick Access panel to open the availability grid.
   * The Availability link is a button.list-group-item inside the offcanvas panel.
   * Clicking it opens an NGB modal popup (ngb-modal-window) containing the table.
   */
  async clickAvailabilityQuickLink(): Promise<void> {
    logger.info('Clicking Availability in Quick Access panel');

    // The button is inside the offcanvas panel — click it directly
    await this.elementActions.click(this.availabilityQuickLink, 'Availability quick link');

    // Wait for the availability modal popup (NGB modal) to appear
    await this.page.waitForSelector('.modal.show table, ngb-modal-window table', {
      state: 'visible',
      timeout: 15000,
    });
    await this.page.waitForTimeout(1000);

    logger.info('Availability grid modal loaded with table');
  }

  // ──────────────────────────────────────────────────────────────
  //  Data Capture
  // ──────────────────────────────────────────────────────────────

  /**
   * Get the business date from the header bar.
   * Format: DD/MM/YYYY
   */
  async getBusinessDate(): Promise<string> {
    // The Business Date heading is in the footer (contentinfo) which may be
    // obscured by the availability modal overlay. Use page.evaluate to read
    // the text directly from the DOM, bypassing Playwright visibility checks.
    const headerText = await this.page.evaluate(() => {
      const headings = document.querySelectorAll('h6, h5, h4');
      for (const h of headings) {
        if (h.textContent?.includes('Business Date:')) {
          return h.textContent;
        }
      }
      return null;
    });

    if (!headerText) {
      throw new Error('Could not find Business Date heading in the DOM');
    }

    const match = headerText.match(/Business Date:\s*(\d{2}\/\d{2}\/\d{4})/);
    if (!match) {
      throw new Error(`Could not parse Business Date from header: "${headerText}"`);
    }
    const date = match[1];
    logger.info(`Business Date: ${date}`);
    return date;
  }

  /**
   * Capture the full availability grid data from the table.
   * Returns structured data with room types, available counts, totals, etc.
   */
  async captureAvailabilityGrid(): Promise<AvailabilityGridData> {
    logger.info('Capturing availability grid data');

    // Wait for the table inside the availability modal to be visible
    await this.page.waitForSelector('.modal.show table, ngb-modal-window table', {
      state: 'visible',
      timeout: 15000,
    });

    // Extract table data from the modal popup
    const tableData = await this.page.evaluate(() => {
      // Prefer the table inside the modal popup (NGB modal)
      const modalTable = document.querySelector('.modal.show table') || document.querySelector('ngb-modal-window table');
      const table = modalTable || document.querySelector('table');
      if (!table) return null;

      const rows = Array.from(table.querySelectorAll('tr'));
      const data: string[][] = [];

      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td, th'));
        const rowData = cells.map(cell => cell.textContent?.trim() || '');
        if (rowData.length > 0) {
          data.push(rowData);
        }
      }

      return data;
    });

    if (!tableData || tableData.length === 0) {
      throw new Error('Could not capture availability grid – table not found in modal popup');
    }

    // Parse the data
    // Row 0 = header (dates)
    // Rows 1-8 = room types
    // Row 9 = empty separator
    // Row 10 = Total Saleable
    // Row 11 = Total Booked
    // Row 12 = Occupancy %
    // Row 13 = Total Available

    const roomTypes: RoomAvailability[] = [];

    for (let i = 1; i < tableData.length; i++) {
      const row = tableData[i];
      const roomType = row[0];
      if (!roomType) continue;

      const values = row.slice(1).map(v => parseFloat(v) || 0);

      if (roomType === 'Total Saleable' || roomType === 'Total Booked' || roomType === 'Occupancy %' || roomType === 'Total Available') {
        continue; // Handle these separately below
      }

      roomTypes.push({
        roomType,
        availableRooms: values,
        totalAvailable: values[0] || 0,
      });
    }

    // Find summary rows
    const saleableRow = tableData.find(r => r[0] === 'Total Saleable');
    const bookedRow = tableData.find(r => r[0] === 'Total Booked');
    const occupancyRow = tableData.find(r => r[0] === 'Occupancy %');
    const availableRow = tableData.find(r => r[0] === 'Total Available');

    const businessDate = await this.getBusinessDate();

    const gridData: AvailabilityGridData = {
      roomTypes,
      totalSaleable: saleableRow ? saleableRow.slice(1).map(v => parseFloat(v) || 0) : [],
      totalBooked: bookedRow ? bookedRow.slice(1).map(v => parseFloat(v) || 0) : [],
      occupancyPercent: occupancyRow ? occupancyRow.slice(1).map(v => parseFloat(v) || 0) : [],
      totalAvailable: availableRow ? availableRow.slice(1).map(v => parseFloat(v) || 0) : [],
      businessDate,
    };

    logger.info(`Captured ${roomTypes.length} room types from availability grid`);
    return gridData;
  }

  // ──────────────────────────────────────────────────────────────
  //  Close Availability Modal
  // ──────────────────────────────────────────────────────────────

  /**
   * Close the availability modal popup (X button or Escape).
   */
  async closeAvailabilityModal(): Promise<void> {
    logger.info('Closing availability modal');

    //const closeBtn = this.page.locator('.modal.show .btn-close, ngb-modal-window .btn-close').first();
    const closeBtn = this.page.getByRole('button', { name: 'Close' });
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
      logger.info('Availability modal closed via close button');
      await this.page.waitForTimeout(500);
      return;
    }

    await this.page.keyboard.press('Escape');
    logger.info('Availability modal closed via Escape');
    await this.page.waitForTimeout(500);
  }

  // ──────────────────────────────────────────────────────────────
  //  Guest Management Navigation
  // ──────────────────────────────────────────────────────────────

  /**
   * Navigate to Guest Management via the global search in the header bar.
   */
  async navigateToGuestManagement(): Promise<void> {
    logger.info('Navigating to Guest Management via global search');

    const searchInput = this.page.locator('#search-options');
    await this.elementActions.click(searchInput, 'Global search input');
    await this.elementActions.sendKeys(searchInput, 'guest management', 'Global search input');
    await this.page.waitForTimeout(1000);

    const guestMgmtItem = this.page.locator('#page-topbar').getByText('Guest Management');
    await this.elementActions.click(guestMgmtItem, 'Guest Management menu item');

    await this.guestManagementHeading.waitFor({ state: 'visible', timeout: 15000 });
    logger.info('✅ Guest Management page loaded');
  }

  // ──────────────────────────────────────────────────────────────
  //  New Reservation Flow
  // ──────────────────────────────────────────────────────────────

  /**
   * Click New Reservation button on Guest Management page.
   */
  async clickNewReservation(): Promise<void> {
    logger.info('Clicking New Reservation');
    await this.elementActions.click(this.newReservationButton, 'New Reservation button');
    await this.page.waitForTimeout(1000);
    logger.info('New Reservation page opened');
  }

  /**
   * Click Next to proceed from Stay Details to Room Selection.
   * If the "Please wait! We are processing your request" message appears,
   * the loader overlay stays visible and this method will NOT wait for it
   * to hide. Instead, it returns so the caller can handle the retry.
   *
   * @returns true if room list loaded (loader hidden), false if processing message detected
   */
  async clickNextToRoomSelection(): Promise<boolean> {
    logger.info('Clicking Next to room selection');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Next' }), 'Next button');

    // Wait up to 10 seconds for loader to hide OR for processing message to appear
    const startTime = Date.now();
    const CHECK_INTERVAL = 2000;
    const INITIAL_WAIT = 10000;

    while (Date.now() - startTime < INITIAL_WAIT) {
      const loaderHidden = await this.loaderOverlay
        .isVisible({ timeout: 500 })
        .then(visible => !visible)
        .catch(() => true);

      if (loaderHidden) {
        logger.info('Room selection page loaded (loader hidden)');
        return true;
      }

      // Check if processing message appeared
      const processingVisible = await this.isProcessingMessageVisible();
      if (processingVisible) {
        logger.warn('⚠️ Detected "Please wait! We are processing your request" message');
        return false;
      }

      await this.page.waitForTimeout(CHECK_INTERVAL);
    }

    // After initial wait, check one more time
    const loaderStillVisible = await this.loaderOverlay.isVisible({ timeout: 1000 }).catch(() => false);
    if (loaderStillVisible) {
      const processingVisible = await this.isProcessingMessageVisible();
      if (processingVisible) {
        logger.warn('⚠️ Processing message still visible after initial wait');
        return false;
      }
    }

    logger.info('Room selection page loaded');
    return true;
  }

  /**
   * Wait for the room selection table to fully render (room type headings visible).
   * The "Please wait! We are processing your request" message can appear and then
   * clear after the background processing finishes, so we wait for the actual
   * room type headings instead of assuming the table is ready immediately.
   *
   * @param timeoutMs  Maximum time to wait for the table to load
   */
  async waitForRoomSelectionTableLoaded(timeoutMs: number = 90000): Promise<void> {
    logger.info('Waiting for room selection table to load (room type headings)');
    await this.page.waitForSelector('table tbody tr h5, table tbody tr h6, table tbody tr h4', {
      state: 'visible',
      timeout: timeoutMs,
    });
    await this.page.waitForTimeout(1000);
    logger.info('✅ Room selection table loaded with room type headings');
  }

  /**
   * Find the row index of a room type on the room selection page.
   * The room type name is the heading (h5) inside the first cell.
   *
   * @returns row index, or -1 if not found
   */
  private async findRoomRowIndex(roomType: string): Promise<number> {
    return this.page.evaluate((targetRoomType: string) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      for (let i = 0; i < rows.length; i++) {
        const heading = rows[i].querySelector('h5, h6, h4');
        const roomName = heading?.textContent?.trim() || '';
        if (roomName === targetRoomType) return i;
      }
      return -1;
    }, roomType);
  }

  /**
   * Read the available room count for a specific room type on the room
   * selection page. The date cells show text like "100 Rooms".
   *
   * @returns available room count, 0 if the row shows no availability, -1 if not found
   */
  async getRoomAvailabilityOnSelectionPage(roomType: string): Promise<number> {
    return this.page.evaluate((targetRoomType: string) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      for (const row of rows) {
        const heading = row.querySelector('h5, h6, h4');
        const roomName = heading?.textContent?.trim() || '';
        if (roomName === targetRoomType) {
          const cells = Array.from(row.querySelectorAll('td'));
          // First date cell (index 1) shows "Rack Rate N Rooms ₹..."
          if (cells.length >= 2) {
            const dateCellText = cells[1]?.textContent || '';
            const match = dateCellText.match(/(\d+)\s*Rooms/i);
            if (match) return parseInt(match[1], 10);
          }
          return 0;
        }
      }
      return -1;
    }, roomType);
  }

  /**
   * Read all room types and their available counts from the room selection page.
   */
  async getAllRoomAvailabilityOnSelectionPage(): Promise<{ roomType: string; available: number }[]> {
    return this.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      const result: { roomType: string; available: number }[] = [];
      for (const row of rows) {
        const heading = row.querySelector('h5, h6, h4');
        const roomName = heading?.textContent?.trim() || '';
        if (!roomName) continue;
        const cells = Array.from(row.querySelectorAll('td'));
        let available = 0;
        if (cells.length >= 2) {
          const dateCellText = cells[1]?.textContent || '';
          const match = dateCellText.match(/(\d+)\s*Rooms/i);
          if (match) available = parseInt(match[1], 10);
        }
        result.push({ roomType: roomName, available });
      }
      return result;
    });
  }

  /**
   * Select rooms by clicking the "+" button in the row of the given room type.
   * Each click adds one room to the reservation.
   *
   * @param roomType      Room type row to select rooms from
   * @param numberOfRooms Number of rooms to add
   * @returns true if the room type row was found and the + button clicked
   */
  async selectRoomsByType(roomType: string, numberOfRooms: number): Promise<boolean> {
    logger.info(`Selecting ${numberOfRooms} room(s) of type "${roomType}"`);

    const rowIndex = await this.findRoomRowIndex(roomType);
    if (rowIndex === -1) {
      logger.warn(`Room type "${roomType}" not found on selection page`);
      return false;
    }

    const row = this.page.locator('table tbody tr').nth(rowIndex);
    // The "+" button is the first button inside the last cell ("+ 0 -" controls)
    const plusBtn = row.locator('td').last().locator('button').first();

    for (let i = 0; i < numberOfRooms; i++) {
      await this.elementActions.click(plusBtn, `Add room (+) button click ${i + 1}/${numberOfRooms}`);
      await this.page.waitForTimeout(300); // small wait between clicks
    }

    logger.info(`Selected ${numberOfRooms} room(s) of type "${roomType}"`);
    return true;
  }

  /**
   * Click Next from Room Selection to Guest Details.
   */
  async clickNextToGuestDetails(): Promise<void> {
    logger.info('Clicking Next to guest details');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Next' }), 'Next button');
    await this.loaderOverlay.waitFor({ state: 'hidden', timeout: 30000 });
    logger.info('Guest details form loaded');
  }

  /**
   * Wait for the loader overlay ("Please wait! We are processing your request")
   * to disappear. It can reappear while the system processes a large number of
   * selected rooms, so this polls until all loader overlays are hidden or the
   * timeout elapses.
   *
   * @param timeoutMs  Maximum time to wait
   */
  async waitForLoaderHidden(timeoutMs: number = 60000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const anyVisible = await this.page.evaluate(() => {
        const loaders = Array.from(document.querySelectorAll('.loader-overlay'));
        return loaders.some(loader => {
          const rect = loader.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      });

      if (!anyVisible) {
        return;
      }
      await this.page.waitForTimeout(2000);
    }
    logger.warn(`Loader overlay still visible after ${timeoutMs}ms, proceeding anyway`);
  }

  /**
   * Fill in the guest last name field.
   */
  async fillLastName(lastName: string): Promise<void> {
    logger.info(`Filling last name: ${lastName}`);
    // Wait for the loader overlay to disappear before interacting with the form.
    await this.waitForLoaderHidden();
    // Use fill() directly (instead of click() first) because the loader overlay
    // can briefly cover the field and block pointer events, while fill() sets
    // the value via JS and does not require the element to be uncovered.
    await this.lastNameInput.fill(lastName);
    await this.lastNameInput.press('Tab');
    logger.info(`Last name "${lastName}" entered`);
  }

  /**
   * Close the advance search slide if it opens after entering last name.
   */
  async closeAdvanceSearchIfVisible(): Promise<void> {
    logger.info('Checking for advance search panel');
    await this.page.waitForTimeout(1500);

    await this.page.keyboard.press('Escape');
    logger.info('Advance search closed (if open)');
    await this.page.waitForTimeout(500);
  }

  /**
   * Click Confirm & Continue button.
   */
  async clickConfirmAndContinue(): Promise<void> {
    logger.info('Clicking Confirm & Continue');
    // Wait for any loader overlay to disappear before interacting
    await this.waitForLoaderHidden();
    await this.elementActions.click(this.confirmContinueButton, 'Confirm & Continue button');
    await this.page.waitForTimeout(2000);
    logger.info('Confirm & Continue clicked');
  }

  /**
   * Handle the confirmation letter prompt by clicking "No".
   * Then handle the success alert and click OK.
   *
   * Booking a large number of rooms can cause a transient SQL Server
   * deadlock (HTTP 500 "Rerun the transaction"), so this method detects
   * the deadlock error dialog and retries the booking.
   */
  async handleConfirmationLetterNo(): Promise<string> {
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      logger.info(`Handling confirmation letter prompt – attempt ${attempt}/${MAX_RETRIES}`);

      // Wait for any loader overlay to disappear before the popup appears
      await this.waitForLoaderHidden();

      await this.page.waitForSelector('.swal2-popup, .swal2-html-container', {
        state: 'visible', timeout: 60000,
      });

      await this.elementActions.click(this.confirmationLetterNoButton, 'No button on confirmation letter');
      logger.info('Clicked No on confirmation letter prompt');

      // Wait for either the success alert or a deadlock/error dialog
      const deadlock = await this.waitForBookingResult(60000);

      if (!deadlock) {
        // Success — read alert text and click OK
        const alertText = await this.successAlert.textContent() || '';
        logger.info(`Success alert: ${alertText}`);
        await this.elementActions.click(this.okButton, 'OK button on success alert');
        logger.info('OK clicked on success alert');
        return alertText;
      }

      // Deadlock / transient error detected — dismiss and retry
      logger.warn(`⚠️ Deadlock/error detected on attempt ${attempt}. Dismissing and retrying...`);
      await this.page.getByRole('button', { name: 'OK' }).first().click().catch(() => {});
      await this.page.waitForTimeout(3000);

      if (attempt < MAX_RETRIES) {
        // Retry: click Confirm & Continue again to trigger a fresh booking
        await this.clickConfirmAndContinue();
      }
    }

    throw new Error('Booking failed after multiple deadlock/error retries');
  }

  /**
   * Wait for either the success alert (returns false) or a deadlock/error
   * dialog (returns true).
   *
   * @returns true if an error dialog appeared, false if the success alert appeared
   */
  private async waitForBookingResult(timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      // Check for deadlock / transaction error dialog
      const errorVisible = await this.page
        .locator('text=/deadlock|Rerun the transaction|Transaction .* was deadlocked/i')
        .isVisible({ timeout: 500 })
        .catch(() => false);

      if (errorVisible) {
        return true;
      }

      // Check for the success alert
      if (await this.successAlert.isVisible({ timeout: 500 }).catch(() => false)) {
        return false;
      }

      await this.page.waitForTimeout(1000);
    }

    throw new Error('Timed out waiting for booking result (success alert or error dialog)');
  }

  /**
   * Get the available count for a specific room type from the availability grid.
   */
  async getRoomAvailableCount(roomType: string): Promise<number> {
    logger.info(`Getting available count for room type: ${roomType}`);

    const count = await this.page.evaluate((targetRoomType: string) => {
      const modalTable = document.querySelector('.modal.show table') || document.querySelector('ngb-modal-window table');
      const table = modalTable || document.querySelector('table');
      if (!table) return -1;

      const rows = Array.from(table.querySelectorAll('tr'));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td, th'));
        if (cells.length > 0 && cells[0]?.textContent?.trim() === targetRoomType) {
          return parseFloat(cells[1]?.textContent?.trim() || '0');
        }
      }
      return -1;
    }, roomType);

    logger.info(`Available count for ${roomType}: ${count}`);
    return count;
  }

  // ──────────────────────────────────────────────────────────────
  //  Helper: Check for Processing Message / Room List Loaded
  // ──────────────────────────────────────────────────────────────

  /**
   * Check if the "Please wait! We are processing your request" message
   * is visible on screen.
   */
  async isProcessingMessageVisible(): Promise<boolean> {
    return this.processingMessage.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Check if the room list table has loaded with at least one room row.
   */
  async isRoomListLoaded(): Promise<boolean> {
    const roomRows = this.page.locator('table tbody tr');
    const count = await roomRows.count();
    return count > 0;
  }

  // ──────────────────────────────────────────────────────────────
  //  Zero-Availability Booking Attempt (SU_AVAIL_004)
  // ──────────────────────────────────────────────────────────────

  /**
   * Read the current room counter value ("+ N -") for a room type row
   * on the room selection page.
   *
   * @returns the counter value, or -1 if the room type row was not found
   */
  async getRoomCounterValue(roomType: string): Promise<number> {
    return this.page.evaluate((targetRoomType: string) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      for (const row of rows) {
        const heading = row.querySelector('h5, h6, h4');
        if (heading && heading.textContent?.trim() === targetRoomType) {
          const lastCell = row.querySelector('td:last-child');
          const match = (lastCell?.textContent || '').match(/([+-]?\d+)/);
          return match ? parseInt(match[1], 10) : -1;
        }
      }
      return -1;
    }, roomType);
  }

  /**
   * Click the "+" button once on the given room type row to attempt
   * adding a room to the reservation (no availability check performed).
   */
  async attemptAddRoom(roomType: string): Promise<void> {
    logger.info(`Attempting to add 1 room of type "${roomType}" (clicking +)`);

    const rowIndex = await this.findRoomRowIndex(roomType);
    if (rowIndex === -1) {
      throw new Error(`Room type "${roomType}" not found on the room selection page`);
    }

    const row = this.page.locator('table tbody tr').nth(rowIndex);
    const plusBtn = row.locator('td').last().locator('button').first();
    await this.elementActions.click(plusBtn, `Add room (+) button for "${roomType}"`);
    logger.info(`"+" clicked for room type "${roomType}"`);
  }

  /**
   * Wait for the "Room not available." SweetAlert2 popup that appears when
   * trying to add a room of a type that has zero availability.
   *
   * @returns the popup message text
   */
  async waitForRoomNotAvailablePopup(timeoutMs: number = 10000): Promise<string> {
    logger.info('Waiting for "Room not available." popup');
    await this.page.waitForSelector('.swal2-popup', { state: 'visible', timeout: timeoutMs });

    const text = (await this.roomNotAvailablePopupText.textContent() || '').trim();
    logger.info(`"Room not available." popup visible with text: "${text}"`);
    return text;
  }

  /**
   * Dismiss the "Room not available." popup by clicking its OK button
   * (.swal2-confirm inside .swal2-popup).
   */
  async dismissRoomNotAvailablePopup(): Promise<void> {
    logger.info('Dismissing "Room not available." popup (clicking OK)');
    await this.elementActions.click(this.roomNotAvailableOkButton, 'OK button on "Room not available." popup');
    await this.page.waitForTimeout(500);
    logger.info('Popup dismissed');
  }

  /**
   * Check whether the Guest Details step is currently visible.
   * Uses innerText so hidden DOM elements (other wizard steps) are ignored.
   */
  async isGuestDetailsVisible(): Promise<boolean> {
    return this.page.evaluate(() => {
      const text = document.body.innerText || '';
      return text.includes('Last Name') && text.includes('Confirm & Continue');
    });
  }

  /**
   * Attempt to book a room type that has ZERO availability and verify the
   * system blocks the booking (SU_AVAIL_004).
   *
   * Flow (verified via Playwright MCP):
   *  1. Close availability modal → Guest Management → New Reservation → Next
   *  2. Wait for the room selection table
   *  3. Resolve the target room type (caller-provided, or first one with
   *     zero availability found on the selection page)
   *  4. Click "+" on the zero-availability room row
   *  5. Verify the "Room not available." popup appears
   *  6. Verify the room counter stays at 0 (no room was added)
   *  7. Dismiss the popup, click Next
   *  8. Verify the system does NOT advance to Guest Details
   *
   * @param roomType  Optional room type to target. If omitted (or if it has
   *                  availability on the selection page), the first room type
   *                  with zero availability is picked automatically.
   * @returns structured result describing the blocked booking attempt
   */
  async runZeroAvailabilityBookingAttempt(roomType?: string): Promise<ZeroAvailabilityAttemptResult> {
    logger.info(`Starting zero-availability booking attempt${roomType ? ` for "${roomType}"` : ''}`);

    // ── Step 1: Close the availability modal and navigate to Guest Management ──
    await this.closeAvailabilityModal();
    await this.navigateToGuestManagement();

    // ── Open New Reservation and load the room selection table (with retry) ──
    const MAX_RETRIES = 2;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      logger.info(`Room selection attempt ${attempt}/${MAX_RETRIES}`);

      await this.clickNewReservation();
      await this.clickNextToRoomSelection();

      const roomsLoaded = await this.isRoomListLoaded();
      const processingMsg = await this.isProcessingMessageVisible();

      if (roomsLoaded && !processingMsg) {
        logger.info('✅ Room list loaded successfully');
        break;
      }

      if (attempt < MAX_RETRIES) {
        logger.warn(`⚠️ Room list did not load (processing message: ${processingMsg}). Waiting 30s then retrying...`);

        const alertVisible = await this.page.getByRole('alert').isVisible({ timeout: 2000 }).catch(() => false);
        if (alertVisible) {
          await this.page.getByRole('button', { name: 'OK' }).click().catch(() => {});
        }

        await this.page.waitForTimeout(30000);
        await this.page.reload({ waitUntil: 'networkidle' });
        await this.page.waitForTimeout(2000);
        await this.guestManagementHeading.waitFor({ state: 'visible', timeout: 15000 });
        logger.info('✅ Back on Guest Management after reload');
      } else {
        logger.warn('⚠️ Last attempt – room list still not loaded. Proceeding anyway...');
      }
    }

    await this.waitForRoomSelectionTableLoaded();

    // ── Step 3: Resolve the target room type with zero availability ──
    let targetRoomType = roomType;

    if (targetRoomType) {
      const available = await this.getRoomAvailabilityOnSelectionPage(targetRoomType);
      if (available === -1) {
        throw new Error(`Room type "${targetRoomType}" not found on the room selection page`);
      }
      if (available > 0) {
        logger.warn(`Room type "${targetRoomType}" has ${available} available room(s) – looking for a zero-availability room type instead`);
        targetRoomType = undefined;
      }
    }

    if (!targetRoomType) {
      const allRooms = await this.getAllRoomAvailabilityOnSelectionPage();
      const zeroRoom = allRooms.find(r => r.available <= 0);

      if (!zeroRoom) {
        throw new Error('No room type with zero availability found on the room selection page');
      }

      targetRoomType = zeroRoom.roomType;
      logger.info(`Using zero-availability room type from selection page: "${targetRoomType}"`);
    }

    // ── Verify the target room type really has zero availability ──
    const availableOnSelectionPage = await this.getRoomAvailabilityOnSelectionPage(targetRoomType);
    if (availableOnSelectionPage > 0) {
      throw new Error(`Room type "${targetRoomType}" has ${availableOnSelectionPage} available room(s) – expected zero availability`);
    }
    logger.info(`Room type "${targetRoomType}" shows ${availableOnSelectionPage} available room(s) on the selection page`);

    // ── Step 4: Attempt to add the room by clicking "+" ──
    await this.attemptAddRoom(targetRoomType);

    // ── Step 5: Verify the "Room not available." popup appears ──
    const popupText = await this.waitForRoomNotAvailablePopup();

    // ── Step 6: Verify the room counter stayed at 0 (no room added) ──
    const counterAfterAttempt = await this.getRoomCounterValue(targetRoomType);
    logger.info(`Room counter for "${targetRoomType}" after attempt: ${counterAfterAttempt}`);

    // ── Step 7: Dismiss the popup ──
    await this.dismissRoomNotAvailablePopup();

    // ── Step 8: Click Next and verify Guest Details does NOT appear ──
    logger.info('Clicking Next to verify the system blocks proceeding with 0 rooms');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Next' }), 'Next button');
    await this.page.waitForTimeout(3000);

    const guestDetailsVisibleAfterNext = await this.isGuestDetailsVisible();
    logger.info(`Guest Details visible after Next: ${guestDetailsVisibleAfterNext}`);

    logger.info(`✅ Zero-availability booking attempt completed for "${targetRoomType}"`);
    return {
      roomType: targetRoomType,
      availableOnSelectionPage,
      popupText,
      counterAfterAttempt,
      guestDetailsVisibleAfterNext,
    };
  }

  /**
   * Attempt to OVERBOOK a room type and verify the system blocks selecting
   * more rooms than are available (SU_AVAIL_005).
   *
   * Flow (verified via Playwright MCP):
   *  1. Close availability modal → Guest Management → New Reservation → Next
   *  2. Wait for the room selection table
   *  3. Resolve the target room type with a small positive availability
   *     (caller-provided, or the one with the fewest available rooms)
   *  4. Click "+" N times (N = available rooms) – counter should reach N
   *  5. Click "+" once more (the N+1 overbooking attempt)
   *  6. Verify the counter stays at N (extra selection silently blocked)
   *
   * @param roomType  Optional room type to target. If omitted (or if it has
   *                  no availability on the selection page), the room type
   *                  with the fewest available rooms (> 0) is picked.
   * @returns structured result describing the overbooking attempt
   */
  async runOverbookingAttempt(roomType?: string): Promise<OverbookingAttemptResult> {
    logger.info(`Starting overbooking attempt${roomType ? ` for "${roomType}"` : ''}`);

    // ── Step 1: Close the availability modal and navigate to Guest Management ──
    await this.closeAvailabilityModal();
    await this.navigateToGuestManagement();

    // ── Open New Reservation and load the room selection table (with retry) ──
    const MAX_RETRIES = 2;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      logger.info(`Room selection attempt ${attempt}/${MAX_RETRIES}`);

      await this.clickNewReservation();
      await this.clickNextToRoomSelection();

      const roomsLoaded = await this.isRoomListLoaded();
      const processingMsg = await this.isProcessingMessageVisible();

      if (roomsLoaded && !processingMsg) {
        logger.info('✅ Room list loaded successfully');
        break;
      }

      if (attempt < MAX_RETRIES) {
        logger.warn(`⚠️ Room list did not load (processing message: ${processingMsg}). Waiting 30s then retrying...`);

        const alertVisible = await this.page.getByRole('alert').isVisible({ timeout: 2000 }).catch(() => false);
        if (alertVisible) {
          await this.page.getByRole('button', { name: 'OK' }).click().catch(() => {});
        }

        await this.page.waitForTimeout(30000);
        await this.page.reload({ waitUntil: 'networkidle' });
        await this.page.waitForTimeout(2000);
        await this.guestManagementHeading.waitFor({ state: 'visible', timeout: 15000 });
        logger.info('✅ Back on Guest Management after reload');
      } else {
        logger.warn('⚠️ Last attempt – room list still not loaded. Proceeding anyway...');
      }
    }

    await this.waitForRoomSelectionTableLoaded();

    // ── Step 3: Resolve the target room type with positive availability ──
    let targetRoomType = roomType;
    let available = -1;

    if (targetRoomType) {
      available = await this.getRoomAvailabilityOnSelectionPage(targetRoomType);
      if (available <= 0) {
        logger.warn(`Room type "${targetRoomType}" has no availability on the selection page (${available}). Looking for another room type...`);
        targetRoomType = undefined;
      }
    }

    if (!targetRoomType) {
      // Pick the room type with the fewest available rooms (> 0) to keep the
      // test fast. Uses a sign-aware regex so negative availability
      // (e.g. "-1 Rooms") is not misread as a positive count.
      const allRooms = await this.page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        const result: { roomType: string; available: number }[] = [];
        for (const row of rows) {
          const heading = row.querySelector('h5, h6, h4');
          const roomName = heading ? heading.textContent.trim() : '';
          if (!roomName) continue;
          const cells = Array.from(row.querySelectorAll('td'));
          let availableCount = 0;
          if (cells.length >= 2) {
            const match = (cells[1].textContent || '').match(/([+-]?\d+)\s*Rooms/i);
            if (match) availableCount = parseInt(match[1], 10);
          }
          result.push({ roomType: roomName, available: availableCount });
        }
        return result;
      });

      const positive = allRooms.filter(r => r.available > 0).sort((a, b) => a.available - b.available);

      if (positive.length === 0) {
        throw new Error('No room type with positive availability found on the room selection page');
      }

      targetRoomType = positive[0].roomType;
      available = positive[0].available;
      logger.info(`Using room type with fewest available rooms: "${targetRoomType}" (${available} available)`);
    }

    logger.info(`Room type "${targetRoomType}" shows ${available} available room(s) on the selection page`);

    // ── Step 4: Select ALL available rooms (click "+" N times) ──
    const selected = await this.selectRoomsByType(targetRoomType, available);
    if (!selected) {
      throw new Error(`Failed to select ${available} room(s) of type "${targetRoomType}"`);
    }

    const counterAfterMaxSelection = await this.getRoomCounterValue(targetRoomType);
    logger.info(`Counter after selecting all ${available} room(s): ${counterAfterMaxSelection}`);

    // ── Step 5: Overbooking attempt – click "+" once more (N+1) ──
    await this.attemptAddRoom(targetRoomType);
    await this.page.waitForTimeout(1500);

    // Capture the "Room not available." popup if it appears (the overbooking
    // attempt is normally blocked silently, without any popup)
    const popupVisible = await this.roomNotAvailablePopupText
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    let extraClickPopupText: string | null = null;
    if (popupVisible) {
      extraClickPopupText = ((await this.roomNotAvailablePopupText.textContent()) || '').trim();
      logger.info(`Popup on extra click: "${extraClickPopupText}"`);
      await this.dismissRoomNotAvailablePopup();
    } else {
      logger.info('No popup on extra click – overbooking attempt silently blocked');
    }

    // ── Step 6: Verify the counter stayed at N (no extra room added) ──
    const counterAfterExtraClick = await this.getRoomCounterValue(targetRoomType);
    logger.info(`Counter after the (N+1)th "+" click: ${counterAfterExtraClick}`);

    logger.info(`✅ Overbooking attempt completed for "${targetRoomType}"`);
    return {
      roomType: targetRoomType,
      availableOnSelectionPage: available,
      counterAfterMaxSelection,
      counterAfterExtraClick,
      extraClickPopupText,
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  Full Booking Flow (with retry on processing message)
  // ──────────────────────────────────────────────────────────────

  /**
   * Complete booking flow: Close availability → Guest Management →
   * New Reservation → Select room(s) → Fill details → Confirm.
   * Supports booking multiple rooms in a single reservation.
   *
   * If the room list does not load after clicking Next and the
   * "Please wait! We are processing your request" message appears,
   * the method waits 30 seconds, reloads the page, and retries
   * from Guest Management (New Reservation → Next → room list).
   *
   * @param roomType       Room type to book
   * @param guestLastName  Guest last name
   * @param numberOfRooms  Number of rooms to book in this reservation (default 1)
   * @returns the actual room type booked and its available count before booking
   */
  async runBookingFlow(roomType: string, guestLastName: string, numberOfRooms: number = 1): Promise<{ roomType: string; availableBefore: number }> {
    const MAX_RETRIES = 2;
    logger.info(`Starting booking flow for ${roomType} with guest "${guestLastName}" (${numberOfRooms} room(s))`);

    // Close the availability modal first
    await this.closeAvailabilityModal();
    await this.navigateToGuestManagement();

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      logger.info(`Booking attempt ${attempt}/${MAX_RETRIES}`);

      await this.clickNewReservation();
      await this.clickNextToRoomSelection();

      // Check if the room list loaded properly
      const roomsLoaded = await this.isRoomListLoaded();
      const processingMsg = await this.isProcessingMessageVisible();

      if (roomsLoaded && !processingMsg) {
        logger.info('✅ Room list loaded successfully');
        break; // proceed with remaining steps
      }

      if (attempt < MAX_RETRIES) {
        logger.warn(`⚠️ Room list did not load (processing message: ${processingMsg}). Waiting 30s then retrying...`);

        // Dismiss any alert/modal if visible
        const alertVisible = await this.page.getByRole('alert').isVisible({ timeout: 2000 }).catch(() => false);
        if (alertVisible) {
          await this.page.getByRole('button', { name: 'OK' }).click().catch(() => {});
        }

        await this.page.waitForTimeout(30000);
        logger.info('Reloading page...');
        await this.page.reload({ waitUntil: 'networkidle' });

        // Wait for page to stabilize after reload
        await this.page.waitForTimeout(2000);

        // After reload we are on Guest Management, verify it
        await this.guestManagementHeading.waitFor({ state: 'visible', timeout: 15000 });
        logger.info('✅ Back on Guest Management after reload');
      } else {
        logger.warn('⚠️ Last attempt – room list still not loaded. Proceeding anyway...');
      }
    }

    // ── Wait for the room selection table to fully render ──
    // The "Please wait!" processing message may still be clearing, so wait
    // for the actual room type headings to appear before reading availability.
    await this.waitForRoomSelectionTableLoaded();

    // ── Check availability on the room selection page before clicking "+" ──
    // The requested room type may no longer be available, so verify the
    // actual available count shown in the table. If it has no availability,
    // switch to another room type that does.
    let actualRoomType = roomType;
    let roomsToBook = numberOfRooms;
    let availableBefore: number;

    const available = await this.getRoomAvailabilityOnSelectionPage(roomType);

    if (available <= 0) {
      logger.warn(`Room type "${roomType}" has no available rooms (availability: ${available}). Looking for another room type...`);

      const allRooms = await this.getAllRoomAvailabilityOnSelectionPage();
      const alternative = allRooms.find(r => r.available > 0);

      if (!alternative) {
        throw new Error('No room type has availability on the room selection page');
      }

      actualRoomType = alternative.roomType;
      availableBefore = alternative.available;
      roomsToBook = Math.min(numberOfRooms, alternative.available);
      logger.info(`Switched to room type "${actualRoomType}" with ${alternative.available} available room(s)`);
    } else {
      availableBefore = available;
      logger.info(`Room type "${roomType}" has ${available} available room(s) on the selection page`);
      if (available < numberOfRooms) {
        logger.warn(`Room type "${roomType}" has only ${available} room(s), booking ${available} instead of ${numberOfRooms}`);
        roomsToBook = available;
      }
    }

    // ── Select rooms by clicking "+" on the chosen room type row ──
    const selected = await this.selectRoomsByType(actualRoomType, roomsToBook);
    if (!selected) {
      throw new Error(`Failed to select ${roomsToBook} room(s) of type "${actualRoomType}"`);
    }

    // Continue with remaining steps
    await this.clickNextToGuestDetails();
    await this.fillLastName(guestLastName);
    await this.closeAvailabilityModal();
    //await this.closeAdvanceSearchIfVisible();
    await this.clickConfirmAndContinue();
    await this.handleConfirmationLetterNo();

    logger.info(`✅ Booking flow completed for ${actualRoomType} with ${roomsToBook} room(s)`);
    return { roomType: actualRoomType, availableBefore };
  }

  // ──────────────────────────────────────────────────────────────
  //  Full Recreate Availability Flow
  // ──────────────────────────────────────────────────────────────

  /**
   * Complete flow: Navigate to System Utilities → Recreate Availability →
   * Click Play → Handle modal → Open Quick Access → Click Availability → Capture grid.
   */
  async runRecreateAvailabilityFlow(): Promise<AvailabilityGridData> {
    // Step 1: Navigate to System Utilities
    await this.navigateToSystemUtilities();

    // Step 2: Open Recreate Availability
    await this.openRecreateAvailability();

    // Step 3: Click Play button
    await this.clickPlayButton();

    // Step 4: Wait for processing and handle success modal
    await this.waitForProcessingComplete();
    await this.clickOkOnSuccessModal();
    await this.page.waitForTimeout(1000);

    // Step 5: Open Quick Access panel
    await this.openQuickAccessPanel();

    // Step 6: Click Availability
    await this.clickAvailabilityQuickLink();

    // Step 7: Capture availability grid
    const gridData = await this.captureAvailabilityGrid();

    logger.info('Recreate Availability flow completed successfully');
    return gridData;
  }
}
