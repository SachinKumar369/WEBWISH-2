import { Page, BrowserContext } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

export interface RoomAvailability {
  roomType: string;
  availableRooms: number[];
  totalAvailable: number;
}

export interface AvailabilityGridData {
  roomTypes: RoomAvailability[];
  totalSaleable: number[];
  totalBooked: number[];
  occupancyPercent: number[];
  totalAvailable: number[];
  businessDate: string;
}

export interface OutOfOrderResult {
  roomNumber: string;
  roomType: string;
  sellingStatus: string;
  hkStatus: string;
  dateFrom: string;
  dateTo: string;
  remarks: string;
  success: boolean;
  message?: string;
}

// ──────────────────────────────────────────────────────────────
//  Page Object – Housekeeping Operations
// ──────────────────────────────────────────────────────────────

export class HousekeepingOperationsPage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ── Sidebar Navigation ── */
  private readonly sidebarHoverArea = this.page.locator('.simplebar-content').first();
  private readonly housekeepingLink = this.page.locator('a').filter({ hasText: 'Housekeeping' }).first();
  private readonly housekeepingOperationsLink = this.page.locator('a').filter({ hasText: 'HouseKeeping Operations' }).first();

  /* ── Main Content ── */
  private readonly housekeepingHeading = this.page.getByRole('heading', { name: 'HouseKeeping Operations' });
  private readonly dateDisplay = this.page.locator('text=/Date :/');
  private readonly totalButton = this.page.locator('button:has-text("Total:")').first();

  /* ── Toolbar ── */
  private readonly toolbarFilterButton = this.page.locator('button[title="Filter"]').first();
  private readonly moreToolbarOptions = this.page.locator('[aria-label="More toolbar options"]').first();

  /* ── Room Grid ── */
  private readonly roomCards = this.page.locator('.card-list-card--selectable');
  private readonly selectAllButton = this.page.getByRole('button', { name: 'Select All' });

  /* ── Legend Buttons ── */
  private readonly vacantLegendButton = this.page.locator('.legend__button').filter({ hasText: 'Vacant' });
  private readonly occupiedLegendButton = this.page.locator('.legend__button').filter({ hasText: 'Occupied' });

  /* ── Quick Access Panel ── */
  private readonly quickAccessButton = this.page.locator('.side-button.shadow-lg');
  private readonly availabilityQuickLink = this.page.locator('button.list-group-item').filter({ hasText: 'Availability' });

  /* ── Filter Dialog ── */
  private readonly filterDialog = this.page.locator('.modal.show, ngb-modal-window[role="dialog"]').last();
  private readonly filterApplyButton = this.page.locator('.modal.show').last().getByRole('button', { name: 'Apply' });
  private readonly filterCloseButton = this.page.locator('.modal.show').last().getByRole('button', { name: 'Close' });

  /* ── Set Permanent OOO Dialog ── */
  private readonly setPermanentOooButton = this.page.locator('button:has-text("Set Permanent Out of Order")');

  /* ── Success/Error Dialogs ── */
  private readonly successOkButton = this.page.locator('.swal2-popup').getByRole('button', { name: 'OK' });
  private readonly successConfirmButton = this.page.locator('.swal2-popup .swal2-confirm');

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  // ──────────────────────────────────────────────────────────────
  //  NAVIGATION
  // ──────────────────────────────────────────────────────────────

  /**
   * Navigate to Housekeeping Operations page via sidebar.
   * Hovers on the left edge to expand sidebar, then clicks Housekeeping → HouseKeeping Operations.
   */
  async navigateToHousekeepingOperations(): Promise<void> {
    logger.info('Navigating to Housekeeping Operations');

    // Hover on left edge to expand sidebar
    await this.page.mouse.move(5, 400);
    await this.page.waitForTimeout(1500);

    // Click Housekeeping in sidebar
    await this.housekeepingLink.click();
    await this.page.waitForTimeout(1500);

    // Click HouseKeeping Operations sub-menu
    await this.housekeepingOperationsLink.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });

    logger.info('Housekeeping Operations page loaded');
  }

  /**
   * Verify we are on the Housekeeping Operations page.
   */
  async verifyPageLoaded(): Promise<boolean> {
    const heading = this.page.locator('h3').filter({ hasText: 'HouseKeeping Operations' }).first();
    await heading.waitFor({ state: 'visible', timeout: 15000 });
    logger.info('Housekeeping Operations page loaded');
    return true;
  }

  /**
   * Get the business date displayed on the page.
   */
  async getBusinessDate(): Promise<string> {
    const dateText = await this.dateDisplay.textContent();
    const match = dateText?.match(/Date\s*:\s*(\d{2}\/\d{2}\/\d{4})/);
    const date = match?.[1] || '';
    logger.info(`Business Date: ${date}`);
    return date;
  }

  /**
   * Get total number of visible rooms.
   */
  async getTotalRooms(): Promise<number> {
    const text = await this.totalButton.textContent();
    const match = text?.match(/Total[:\s]*(\d+)/);
    return parseInt(match?.[1] || '0');
  }

  // ──────────────────────────────────────────────────────────────
  //  AVAILABILITY (Quick Access)
  // ──────────────────────────────────────────────────────────────

  /**
   * Fetch room availability via Quick Access panel.
   * Returns a map of room type → availability counts per day.
   */
  async fetchAvailability(): Promise<Map<string, number[]>> {
    logger.info('Opening Quick Access panel to fetch availability');

    // Click the floating side button
    await this.elementActions.click(this.quickAccessButton, 'Quick Access FAB button');
    await this.page.waitForTimeout(500);

    // Click Availability
    await this.elementActions.click(this.availabilityQuickLink, 'Availability quick link');
    await this.page.waitForTimeout(5000);

    // The availability dialog uses an Angular DataGrid (not <table>).
    // Parse the data grid cells using .dg-cell-text and .dg-cell-value-wrap classes.
    const availability = new Map<string, number[]>();
    const parsed = await this.page.evaluate(() => {
      const result: [string, number[]][] = [];
      const dialog = document.querySelector('ngb-modal-window[role="dialog"]');
      if (!dialog) return result;

      // Look for DataGrid body rows — typically .dg-body-row or .dg-row
      // Each row has cells: first cell = room type, rest = availability counts per day
      const bodyRows = dialog.querySelectorAll('.dg-body-row, .dg-row');

      for (const row of bodyRows) {
        const cells = row.querySelectorAll('.dg-cell, .dg-cell-value-wrap');
        if (cells.length <= 1) continue;

        // First cell is the room type name
        const roomTypeEl = cells[0].querySelector('.dg-cell-text') || cells[0];
        const roomType = roomTypeEl.textContent?.trim() || '';
        if (!roomType) continue;

        const counts: number[] = [];
        for (let i = 1; i < cells.length; i++) {
          const cellText = cells[i].querySelector('.dg-cell-text')?.textContent?.trim()
            || cells[i].textContent?.trim() || '';
          const num = parseInt(cellText);
          if (cellText && !isNaN(num)) {
            counts.push(num);
          }
        }

        if (counts.length > 0) {
          result.push([roomType, counts]);
        }
      }

      // Fallback: if DataGrid row selectors didn't work, try parsing the
      // full modal text using a known structure from the availability header
      if (result.length === 0) {
        // The modal contains a div-based grid. Look for .ag-body-viewport or similar.
        // Or try to find rows by looking at div elements with room type text
        const allCells = dialog.querySelectorAll('.dg-cell-text');
        // Group cells by parent row
        const rowMap = new Map<Element, string[]>();
        for (const cell of allCells) {
          // Walk up to find the row container
          let row = cell.parentElement;
          while (row && !row.classList.contains('dg-body-row') && !row.classList.contains('dg-row') && row !== dialog) {
            row = row.parentElement;
          }
          if (row && row !== dialog) {
            if (!rowMap.has(row)) rowMap.set(row, []);
            rowMap.get(row)!.push(cell.textContent?.trim() || '');
          }
        }
        for (const [, cellTexts] of rowMap) {
          if (cellTexts.length <= 1) continue;
          const roomType = cellTexts[0];
          const counts: number[] = [];
          for (let i = 1; i < cellTexts.length; i++) {
            const num = parseInt(cellTexts[i]);
            if (!isNaN(num)) counts.push(num);
          }
          if (counts.length > 0) {
            result.push([roomType, counts]);
          }
        }
      }

      // Final fallback: parse raw text content from the modal
      // The text pattern is like: "DGT16182425252618212122..." 
      // where room types are known names followed by numbers
      if (result.length === 0) {
        const modalText = dialog.textContent || '';
        const knownRoomTypes = ['DGT', 'LPT', 'PRK', 'SUITE CITY VIEW', 'Delux Room', 'Standard Double', 'Standard Departme', 'Extra Bed In Room Bl'];
        // Use regex to find room type followed by numbers
        for (const rt of knownRoomTypes) {
          const regex = new RegExp(rt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([\\d]+)', 'g');
          let match;
          while ((match = regex.exec(modalText)) !== null) {
            const numStr = match[1];
            // Split the number string into individual availability values
            // Each value is typically 1-2 digits, but we need to be smart about splitting
            // Look for the pattern: room type name appears, then numbers until next room type
            const counts: number[] = [];
            for (let i = 0; i < numStr.length; i += 2) {
              const twoDigit = parseInt(numStr.substring(i, i + 2));
              if (!isNaN(twoDigit) && twoDigit < 500) {
                counts.push(twoDigit);
              }
            }
            if (counts.length > 0) {
              result.push([rt, counts]);
            }
          }
        }
      }

      return result;
    });

    for (const [roomType, counts] of parsed) {
      availability.set(roomType, counts);
    }

    logger.info(`Fetched availability for ${availability.size} room types`);

    // Log each room type for debugging
    availability.forEach((counts, roomType) => {
      logger.info(`  ${roomType}: ${counts.join(', ')}`);
    });

    return availability;
  }

  /**
   * Get availability for a specific room type from the Quick Access availability table.
   * Returns the business day (first column) availability count.
   */
  async getAvailabilityForRoomType(roomType: string): Promise<number> {
    const availability = await this.fetchAvailability();
    const counts = availability.get(roomType);
    const result = counts?.[0] ?? 0;
    await this.closeAvailabilityDialog();
    logger.info(`Availability for ${roomType}: ${result}`);
    return result;
  }

  /**
   * Close the Availability dialog.
   */
  async closeAvailabilityDialog(): Promise<void> {
    logger.info('Closing Availability dialog');
    // Try multiple selectors to find the Availability dialog
    const selectors = [
      'ngb-modal-window[role="dialog"]',
      '.modal.show',
      '[role="dialog"]'
    ];
    let closed = false;
    for (const sel of selectors) {
      try {
        const dialog = this.page.locator(sel).filter({ hasText: 'Availability' }).last();
        if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
          await dialog.getByRole('button', { name: 'Close' }).click({ force: true, timeout: 5000 });
          closed = true;
          break;
        }
      } catch {
        // try next selector
      }
    }
    if (!closed) {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(500);
  }

  // ──────────────────────────────────────────────────────────────
  //  FILTER
  // ──────────────────────────────────────────────────────────────

  /**
   * Open the House Keeping Filters dialog.
   * The Filter button is in the toolbar but may be hidden in overflow,
   * so we use JavaScript click.
   */
  async openFilterDialog(): Promise<void> {
    logger.info('Opening House Keeping Filters dialog');

    // Use JS click since the filter button may be in the overflow menu
    await this.page.evaluate(() => {
      const filterBtns = document.querySelectorAll('button[title="Filter"]');
      // Click the second one (the one that has dimensions, even if off-screen)
      if (filterBtns.length >= 2) {
        (filterBtns[1] as HTMLElement).click();
      } else if (filterBtns.length === 1) {
        (filterBtns[0] as HTMLElement).click();
      }
    });
    await this.page.waitForTimeout(2000);

    logger.info('House Keeping Filters dialog opened');
  }

  /**
   * Select a room type in the filter dialog.
   * @param roomTypeCode - The room type code/name (e.g., "DLXD", "LPT")
   */
  async selectFilterRoomType(roomTypeCode: string): Promise<void> {
    logger.info(`Selecting room type filter: ${roomTypeCode}`);

    const modal = this.page.locator('.modal.show, ngb-modal-window[role="dialog"]').last();
    const ngSelects = modal.locator('ng-select');

    // First ng-select is Room Type
    await ngSelects.nth(0).click();
    await this.page.waitForTimeout(1000);

    // Select the matching option
    const option = this.page.locator('.ng-option').filter({ hasText: roomTypeCode }).first();
    await option.click();
    await this.page.waitForTimeout(500);

    logger.info(`Room type filter selected: ${roomTypeCode}`);
  }

  /**
   * Select a selling status in the filter dialog.
   * @param sellingStatus - The selling status (e.g., "Vacant", "Occupied")
   */
  async selectFilterSellingStatus(sellingStatus: string): Promise<void> {
    logger.info(`Selecting selling status filter: ${sellingStatus}`);

    const modal = this.page.locator('.modal.show, ngb-modal-window[role="dialog"]').last();
    const ngSelects = modal.locator('ng-select');

    // Second ng-select is Selling Status
    await ngSelects.nth(1).click();
    await this.page.waitForTimeout(1000);

    // Select the matching option
    const option = this.page.locator('.ng-option').filter({ hasText: sellingStatus }).first();
    await option.click();
    await this.page.waitForTimeout(500);

    logger.info(`Selling status filter selected: ${sellingStatus}`);
  }

  /**
   * Click the Apply button in the filter dialog.
   */
  async applyFilter(): Promise<void> {
    logger.info('Applying filter');
    const modal = this.page.locator('.modal.show, ngb-modal-window[role="dialog"]').last();
    await modal.getByRole('button', { name: 'Apply' }).click();
    await this.page.waitForTimeout(3000);
    logger.info('Filter applied');
  }

  /**
   * Close the filter dialog without applying.
   */
  async closeFilterDialog(): Promise<void> {
    logger.info('Closing filter dialog');
    const modal = this.page.locator('.modal.show, ngb-modal-window[role="dialog"]').last();
    const isVisible = await modal.isVisible().catch(() => false);
    if (isVisible) {
      await modal.getByRole('button', { name: 'Close' }).click({ force: true }).catch(() => {
        this.page.keyboard.press('Escape');
      });
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Reset all ng-select dropdowns in the filter dialog to their default (empty) state.
   * This ensures a clean slate when trying a different room type after a failed filter attempt.
   */
  async resetFilterDialogSelections(): Promise<void> {
    logger.info('Resetting filter dialog selections');
    await this.page.evaluate(() => {
      // Find all ng-select elements in the filter dialog and clear them
      const ngSelects = document.querySelectorAll('.modal.show ng-select, ngb-modal-window[role="dialog"] ng-select');
      for (const ns of Array.from(ngSelects)) {
        // Try to find and click the clear button (ng-clear-wrapper)
        const clearBtn = ns.querySelector('.ng-clear-wrapper');
        if (clearBtn) {
          (clearBtn as HTMLElement).click();
        }
      }
    });
    await this.page.waitForTimeout(500);
    logger.info('Filter dialog selections reset');
  }

  /**
   * Apply room type filter in a single step.
   * @param roomTypeCode - Room type code to filter by
   */
  async filterByRoomType(roomTypeCode: string): Promise<void> {
    await this.openFilterDialog();
    await this.selectFilterRoomType(roomTypeCode);
    await this.applyFilter();
  }

  /**
   * Apply room type + selling status filter in a single step.
   * @param roomTypeCode - Room type code to filter by
   * @param sellingStatus - Selling status to filter by (e.g., "Vacant")
   */
  async filterByRoomTypeAndSellingStatus(roomTypeCode: string, sellingStatus: string): Promise<void> {
    await this.openFilterDialog();
    await this.selectFilterRoomType(roomTypeCode);
    await this.selectFilterSellingStatus(sellingStatus);
    await this.applyFilter();
  }

  // ──────────────────────────────────────────────────────────────
  //  ROOM SELECTION
  // ──────────────────────────────────────────────────────────────

  /**
   * Click on a room card by room number to select it and show context actions.
   * @param roomNumber - The room number to click
   */
  async clickRoom(roomNumber: string): Promise<void> {
    logger.info(`Clicking room ${roomNumber}`);
    const roomCard = this.roomCards.filter({ hasText: roomNumber }).first();
    await roomCard.click();
    await this.page.waitForTimeout(2000);
    logger.info(`Room ${roomNumber} clicked`);
  }

  /**
   * Get the count of visible room cards.
   */
  async getVisibleRoomCount(): Promise<number> {
    return this.roomCards.count();
  }

  /**
   * Get room types currently visible in the grid.
   */
  async getVisibleRoomTypes(): Promise<string[]> {
    const types = await this.page.evaluate(() => {
      const els = document.querySelectorAll('.guest-card');
      const types = new Set<string>();
      for (const el of Array.from(els)) {
        const text = el.textContent?.trim();
        if (text) {
          // Extract room type (non-numeric part)
          const match = text.match(/[A-Za-z\s]+$/);
          if (match) types.add(match[0].trim());
        }
      }
      return Array.from(types);
    });
    return types;
  }

  /**
   * Get room numbers from the filtered grid that do NOT have a booking.
   * Rooms with a booking show a `.mdi-account` icon (person icon).
   * These rooms are skipped because they cannot be set as Out of Order.
   *
   * @param maxRooms - Maximum number of rooms to collect
   * @returns Array of room numbers without bookings
   */
  async getRoomNumbersWithoutBooking(maxRooms: number): Promise<string[]> {
    logger.info(`Collecting up to ${maxRooms} room numbers without bookings`);

    const roomNumbers = await this.page.evaluate((max) => {
      const cards = document.querySelectorAll('.card-list-card--selectable');
      const result: string[] = [];

      for (const card of Array.from(cards)) {
        if (result.length >= max) break;

        // Skip rooms that have a booking (indicated by the mdi-account person icon)
        const hasBookingIcon = !!card.querySelector('.mdi-account, .mdi.mdi-account');
        if (hasBookingIcon) continue;

        // Extract room number
        const roomNum = card.querySelector('h5')?.textContent?.trim();
        if (roomNum) {
          result.push(roomNum);
        }
      }

      return result;
    }, maxRooms);

    logger.info(`Found ${roomNumbers.length} rooms without bookings: ${roomNumbers.join(', ')}`);
    return roomNumbers;
  }

  /**
   * Get a room number with a specific selling status badge.
   * Searches visible room cards for one matching the selling status.
   *
   * @param sellingStatus - The selling status badge text (e.g., "PO" for Permanent OOO)
   * @param maxRooms - Maximum number of rooms to scan
   * @returns The first room number matching the selling status, or empty string
   */
  async getRoomWithSellingStatus(sellingStatus: string, maxRooms: number = 10): Promise<string> {
    logger.info(`Looking for room with selling status: ${sellingStatus}`);

    const roomNumber = await this.page.evaluate(({ status, max }) => {
      const cards = document.querySelectorAll('.card-list-card--selectable');
      let count = 0;

      for (const card of Array.from(cards)) {
        if (count >= max) break;
        count++;

        // The selling status badge is in .card-list-top-left-badge
        const badge = card.querySelector('.card-list-top-left-badge');
        const badgeText = badge?.textContent?.trim();

        if (badgeText === status) {
          const roomNum = card.querySelector('h5')?.textContent?.trim();
          if (roomNum) return roomNum;
        }
      }

      return '';
    }, { status: sellingStatus, max });

    logger.info(`Found room with status ${sellingStatus}: ${roomNumber || 'none'}`);
    return roomNumber;
  }

  // ──────────────────────────────────────────────────────────────
  //  SET PERMANENT OUT OF ORDER
  // ──────────────────────────────────────────────────────────────

  /**
   * Click the "Set Permanent Out of Order" button after selecting a room.
   */
  async clickSetPermanentOoo(): Promise<void> {
    logger.info('Clicking Set Permanent Out of Order button');
    await this.elementActions.click(this.setPermanentOooButton, 'Set Permanent Out of Order button');
    await this.page.waitForTimeout(2000);
    logger.info('Set Permanent Out of Order dialog opened');
  }

  /**
   * Fill the header Date To field by opening flatpickr and selecting a day.
   * @param day - Day of the month to select (e.g., 7 for the 7th)
   */
  async setHeaderDateTo(day: number): Promise<void> {
    logger.info(`Setting header Date To to day ${day}`);

    // Get header inputs (NOT in table)
    const headerInputs = await this.getHeaderInputs();
    if (headerInputs.length < 2) {
      throw new Error('Could not find header Date To input');
    }

    // Click on Date To input to open flatpickr
    await headerInputs[1].click();
    await this.page.waitForTimeout(1000);

    // Select the day from the flatpickr calendar
    const cal = this.page.locator('.flatpickr-calendar.open');
    const dayCell = cal.locator('.flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)')
      .filter({ hasText: new RegExp(`^${day}$`) }).first();
    await dayCell.click();
    await this.page.waitForTimeout(500);

    logger.info(`Header Date To set to day ${day}`);
  }

  /**
   * Fill the header Remarks field.
   * @param remarks - The remarks text to enter
   */
  async setHeaderRemarks(remarks: string): Promise<void> {
    logger.info(`Setting header Remarks: ${remarks}`);

    const headerInputs = await this.getHeaderInputs();
    if (headerInputs.length < 3) {
      throw new Error('Could not find header Remarks input');
    }

    await headerInputs[2].click();
    await headerInputs[2].fill(remarks);
    await this.page.waitForTimeout(500);

    logger.info('Header Remarks set');
  }

  /**
   * Click Apply in the Set Permanent OOO dialog header to populate the room table.
   */
  async clickOooApply(): Promise<void> {
    logger.info('Clicking Apply in OOO dialog');
    const modal = this.page.locator('.modal.show').last();
    await modal.getByRole('button', { name: 'Apply' }).click();
    await this.page.waitForTimeout(3000);
    logger.info('OOO Apply clicked');
  }

  /**
   * Check the checkbox for a room in the OOO table.
   * @param rowIndex - The row index (0-based) to check
   */
  async checkOooRoomRow(rowIndex: number = 0): Promise<void> {
    logger.info(`Checking OOO room row ${rowIndex}`);
    const modal = this.page.locator('.modal.show').last();
    const checkbox = modal.locator('table tbody tr').nth(rowIndex).locator('input[type="checkbox"]').first();
    await checkbox.check();
    await this.page.waitForTimeout(1000);
    logger.info('OOO room row checked');
  }

  /**
   * Click "Save Selected Rooms" button in the OOO dialog.
   */
  async clickSaveSelectedRooms(): Promise<void> {
    logger.info('Clicking Save Selected Rooms');
    const modal = this.page.locator('.modal.show').last();
    await modal.getByRole('button', { name: 'Save Selected Rooms' }).click();
    await this.page.waitForTimeout(3000);
    logger.info('Save Selected Rooms clicked');
  }

  /**
   * Click "Release Selected Rooms" button in the OOO dialog.
   * This button appears when a room already marked as OOO is selected.
   */
  async clickReleaseSelectedRooms(): Promise<void> {
    logger.info('Clicking Release Selected Rooms');
    const modal = this.page.locator('.modal.show').last();
    await modal.getByRole('button', { name: 'Release Selected Rooms' }).click();
    await this.page.waitForTimeout(3000);
    logger.info('Release Selected Rooms clicked');
  }

  /**
   * Handle the SweetAlert success/error/confirmation message.
   * @returns The success status and message text
   */
  async handleSweetAlert(): Promise<{ success: boolean; message: string }> {
    const swalVisible = await this.page.locator('.swal2-popup').isVisible().catch(() => false);

    if (swalVisible) {
      const text = await this.page.locator('.swal2-popup').textContent() || '';

      // Check if it's a confirmation dialog (has Yes/No buttons)
      const yesBtn = this.page.locator('.swal2-popup .swal2-confirm');
      const noBtn = this.page.locator('.swal2-popup .swal2-deny');
      const hasYesNo = await noBtn.isVisible().catch(() => false);

      if (hasYesNo && (text.includes('confirm') || text.includes('Confirm') || text.includes('want to continue'))) {
        // It's a confirmation dialog — click Yes/Confirm
        logger.info(`SweetAlert CONFIRMATION detected: ${text.substring(0, 100)}`);
        await yesBtn.click();
        await this.page.waitForTimeout(3000);

        // Now handle the actual success/error dialog that follows
        const followUpVisible = await this.page.locator('.swal2-popup').isVisible().catch(() => false);
        if (followUpVisible) {
          const followUpText = await this.page.locator('.swal2-popup').textContent() || '';
          const isSuccess = followUpText.includes('success') || followUpText.includes('Success') || followUpText.includes('created') || followUpText.includes('updated') || followUpText.includes('successfully');
          await this.page.locator('.swal2-popup .swal2-confirm').click();
          await this.page.waitForTimeout(1000);
          logger.info(`SweetAlert follow-up: ${isSuccess ? 'SUCCESS' : 'INFO'} - ${followUpText.substring(0, 100)}`);
          return { success: isSuccess, message: followUpText.trim() };
        }

        return { success: true, message: 'Confirmation accepted' };
      }

      // It's a regular success/error dialog
      const isSuccess = text.includes('success') || text.includes('Success') || text.includes('created') || text.includes('updated') || text.includes('successfully');
      await this.page.locator('.swal2-popup .swal2-confirm').click();
      await this.page.waitForTimeout(1000);

      logger.info(`SweetAlert handled: ${isSuccess ? 'SUCCESS' : 'ERROR'} - ${text.substring(0, 100)}`);
      return { success: isSuccess, message: text.trim() };
    }

    return { success: false, message: 'No SweetAlert found' };
  }

  /**
   * Get the number of room rows in the OOO dialog table.
   */
  async getOooRoomRowCount(): Promise<number> {
    const modal = this.page.locator('.modal.show').last();
    return modal.locator('table tbody tr').count();
  }

  /**
   * Check ALL room checkboxes in the OOO dialog table.
   * Returns the number of rooms checked.
   */
  async checkAllOooRoomRows(): Promise<number> {
    logger.info('Checking all room checkboxes in OOO dialog');
    const modal = this.page.locator('.modal.show').last();
    const checkboxes = modal.locator('table tbody tr input[type="checkbox"]');
    const count = await checkboxes.count();

    for (let i = 0; i < count; i++) {
      const isChecked = await checkboxes.nth(i).isChecked();
      if (!isChecked) {
        await checkboxes.nth(i).check();
        await this.page.waitForTimeout(300);
      }
    }

    logger.info(`Checked ${count} room rows in OOO dialog`);
    return count;
  }

  /**
   * Close the Set Permanent OOO dialog.
   */
  async closeOooDialog(): Promise<void> {
    logger.info('Closing OOO dialog');

    // First dismiss any SweetAlert that might be blocking
    const swalVisible = await this.page.locator('.swal2-popup').isVisible().catch(() => false);
    if (swalVisible) {
      await this.page.locator('.swal2-popup .swal2-confirm').click().catch(() => {});
      await this.page.waitForTimeout(1000);
    }

    const modal = this.page.locator('.modal.show').last();
    const isVisible = await modal.isVisible().catch(() => false);
    if (isVisible) {
      await modal.getByRole('button', { name: 'Close' }).click({ force: true }).catch(async () => {
        await this.page.keyboard.press('Escape');
      });
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Full flow: Set a room as Permanent Out of Order.
   * @param roomNumber - Room number to set as OOO
   * @param dateToDay - Day of month for Date To (e.g., 7)
   * @param remarks - Remarks text
   * @returns The OOO result
   */
  async setRoomPermanentOutOfOrder(
    roomNumber: string,
    dateToDay: number,
    remarks: string
  ): Promise<OutOfOrderResult> {
    logger.info(`Setting room ${roomNumber} as Permanent Out of Order`);

    // Step 1: Click on the room
    await this.clickRoom(roomNumber);

    // Step 2: Click "Set Permanent Out of Order"
    await this.clickSetPermanentOoo();

    // Step 3: Set Date To via flatpickr calendar
    await this.setHeaderDateTo(dateToDay);

    // Step 4: Set Remarks
    await this.setHeaderRemarks(remarks);

    // Step 5: Click Apply to populate table
    await this.clickOooApply();

    // Step 6: Check the room checkbox
    await this.checkOooRoomRow(0);

    // Step 7: Click Save Selected Rooms
    await this.clickSaveSelectedRooms();

    // Step 8: Handle success message
    const result = await this.handleSweetAlert();

    // Step 9: Close the OOO dialog
    await this.closeOooDialog();

    const oooResult: OutOfOrderResult = {
      roomNumber,
      roomType: '',
      sellingStatus: 'VA',
      hkStatus: 'RC',
      dateFrom: '',
      dateTo: '',
      remarks,
      success: result.success,
      message: result.message,
    };

    logger.info(`Room ${roomNumber} OOO result: ${JSON.stringify(oooResult)}`);
    return oooResult;
  }

  // ──────────────────────────────────────────────────────────────
  //  RELEASE PERMANENT OUT OF ORDER
  // ──────────────────────────────────────────────────────────────

  /**
   * Release a room from Permanent Out of Order status.
   * Flow:
   * 1. Click room card
   * 2. Click "Set Permanent Out of Order" button
   * 3. Click Apply to populate the table
   * 4. Check the room checkbox
   * 5. Click "Release Selected Rooms"
   * 6. Handle SweetAlert success
   * 7. Close the dialog
   *
   * @param roomNumber - Room number to release from OOO
   * @returns Success status and message
   */
  async releaseRoomFromPermanentOoo(roomNumber: string): Promise<{ success: boolean; message: string }> {
    logger.info(`Releasing room ${roomNumber} from Permanent Out of Order`);

    // Step 1: Click on the room
    await this.clickRoom(roomNumber);

    // Step 2: Click "Set Permanent Out of Order" (this opens the dialog which shows OOO rooms)
    await this.clickSetPermanentOoo();

    // Step 3: Click Apply to populate the table with OOO room data
    //await this.clickOooApply();

    // Step 4: Check the first room checkbox in the table
    await this.checkOooRoomRow(0);

    // Step 5: Click "Release Selected Rooms"
    await this.clickReleaseSelectedRooms();

    // Step 6: Handle SweetAlert success/confirmation
    const result = await this.handleSweetAlert();

    // Step 7: Close the OOO dialog
    await this.closeOooDialog();

    logger.info(`Room ${roomNumber} release result: success=${result.success}, message=${result.message}`);
    return result;
  }

  // ──────────────────────────────────────────────────────────────
  //  PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────

  /**
   * Get header inputs (Date From, Date To, Remarks) that are NOT inside the table.
   */
  private async getHeaderInputs() {
    const modal = this.page.locator('.modal.show').last();
    const allInputs = modal.locator('input[type="text"]');
    const inputs = await allInputs.all();
    const headerInputs = [];

    for (const input of inputs) {
      const inTable = await input.evaluate(el => !!el.closest('table tbody tr'));
      if (!inTable) {
        headerInputs.push(input);
      }
    }

    return headerInputs;
  }
}
