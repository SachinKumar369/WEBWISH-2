import { Page, BrowserContext, expect } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';
import { GroupManagementPage, GroupCreatedRecord } from '../FrontDesk/GroupManagementPage';

export interface RoomBlockRecord {
  roomTypeCode: string;
  roomTypeName: string;
  noOfRooms: number;
  dates: { date: string; availability: number; noOfRooms: number; pickedUp: number; adult: number }[];
}

/**
 * Page Object Model for Group Availability flow.
 * Delegates to GroupManagementPage for navigation and group creation,
 * and adds availability-specific assertions.
 */
export class GroupAvailabilityPage extends BasePage {
  private elementActions: ElementActions;
  readonly groupManagementPage: GroupManagementPage;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.groupManagementPage = new GroupManagementPage(page, context);
  }

  // ──────────────────────────────────────────────────────
  //  LOCATORS
  // ──────────────────────────────────────────────────────

  /** Floating side button (Quick Access FAB) on right side of the screen */
  private get quickAccessButton() {
    return this.page.locator('.side-button.shadow-lg');
  }

  /** Availability button in the Quick Access dialog */
  private get availabilityQuickLink() {
    return this.page.getByRole('button', { name: 'Availability' });
  }

  /** Close button inside the Availability dialog */
  private get availabilityDialogClose() {
    return this.page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Availability' })
      .getByRole('button', { name: 'Close' });
  }

  /** Group card containing the given name */
  private groupCard(groupName: string) {
    return this.page.locator('.card-mode-2-card').filter({ hasText: groupName });
  }

  /** "Open" heading inside a group card */
  private groupCardOpenButton(groupName: string) {
    return this.groupCard(groupName).locator('h6').filter({ hasText: 'Open' });
  }

  /** "+" button in the Group Block section */
  private get groupBlockAddButton() {
    // The Group Block section has a "+" button next to the "Group Block" heading
    // Structure: div > h5 "Group Block" + div > button(icon)
    // We find the h5 heading, go to its parent, then find buttons in the sibling div
    return this.page.locator('h5:text-is("Group Block")').locator('..').locator('button').first();
  }

  /** Room Type dropdown in the Group Block dialog */
  private get roomTypeDropdown() {
    return this.page.locator('ngb-modal-window[role="dialog"]').last()
      .locator('ng-select').first();
  }

  /** No of Rooms input in the Group Block dialog */
  private get noOfRoomsInput() {
    return this.page.locator('[role="dialog"]').last()
      .locator('input[type="number"]').first();
  }

  /** Adult input in the Group Block dialog */
  private get adultInput() {
    return this.page.locator('[role="dialog"]').last()
      .locator('input[type="number"]').nth(1);
  }

  /** Generate dates button in the Group Block dialog */
  private get generateDatesButton() {
    return this.page.getByRole('button', { name: 'Generate dates' });
  }

  /** Save button in the Group Block dialog */
  private get groupBlockSaveButton() {
    return this.page.locator('.modal.show').last()
      .getByRole('button', { name: 'Save', exact: true });
  }

  /** Success dialog OK button */
  private get successOkButton() {
    return this.page.locator('.swal2-popup').getByRole('button', { name: 'OK' });
  }

  /** "+ Rooming List" button */
  private get roomingListAddButton() {
    return this.page.getByRole('button', { name: '+ Rooming List' });
  }

  /** Save button inside the Rooming List dialog */
  private get roomingListSaveButton() {
    return this.page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Rooming List' })
      .getByRole('button', { name: 'Save' });
  }

  /** Close button inside the Rooming List dialog */
  private get roomingListCloseButton() {
    return this.page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Rooming List' })
      .getByRole('button', { name: 'Close' });
  }

  // ──────────────────────────────────────────────────────
  //  Navigation
  // ──────────────────────────────────────────────────────

  /**
   * Navigate to Group Management page.
   * Tries dashboard tile first, falls back to sidebar navigation.
   */
  async navigateToGroupManagement(): Promise<void> {
    logger.info('Navigating to Group Management page');
    await this.groupManagementPage.navigateToGroupManagement();
  }

  // ──────────────────────────────────────────────────────
  //  Group Creation
  // ──────────────────────────────────────────────────────

  /**
   * Create a new group using the full createNewGroup flow in GroupManagementPage.
   * This handles: name, date range, release block, all required dropdowns,
   * submit (No-Block), and success verification.
   *
   * @param groupName - Unique name for the new group
   * @returns The created group record with all date details
   */
  async createNewGroup(groupName: string): Promise<GroupCreatedRecord> {
    logger.info(`Creating new group: ${groupName}`);
    const record = await this.groupManagementPage.createNewGroup(groupName);
    logger.info(`Group created: ${JSON.stringify(record)}`);
    return record;
  }

  /**
   * Get the business date displayed in the page footer.
   */
  async getBusinessDate(): Promise<string> {
    return this.groupManagementPage.getBusinessDate();
  }

  // ──────────────────────────────────────────────────────
  //  Availability Fetch
  // ──────────────────────────────────────────────────────

  /**
   * Open the Quick Access panel and click Availability to fetch room availability.
   * Returns the availability data as a map of room type to availability counts.
   */
  async fetchAvailability(): Promise<Map<string, number[]>> {
    logger.info('Opening Quick Access panel to fetch availability');

    // Click the floating side button to open Quick Access
    await this.elementActions.click(this.quickAccessButton, 'Quick Access FAB button');
    await this.page.waitForTimeout(500);

    // Click Availability in the Quick Access dialog
    await this.elementActions.click(this.availabilityQuickLink, 'Availability quick link');
    await this.page.waitForTimeout(3000); // Wait for availability data to load

    // Parse availability data from the table
    const availability = new Map<string, number[]>();
    const rows = await this.page.locator('ngb-modal-window[role="dialog"]').last()
      .locator('table tbody tr').all();

    for (const row of rows) {
      const cells = await row.locator('td').all();
      if (cells.length > 1) {
        const roomType = (await cells[0].textContent())?.trim();
        if (roomType && !roomType.startsWith('Total') && !roomType.startsWith('Occupancy')) {
          const counts: number[] = [];
          for (let i = 1; i < cells.length; i++) {
            const text = (await cells[i].textContent())?.trim();
            if (text && !isNaN(parseInt(text))) {
              counts.push(parseInt(text));
            }
          }
          if (counts.length > 0) {
            availability.set(roomType, counts);
          }
        }
      }
    }

    logger.info(`Fetched availability for ${availability.size} room types`);
    return availability;
  }

  /**
   * Close the Availability dialog.
   */
  async closeAvailabilityDialog(): Promise<void> {
    logger.info('Closing Availability dialog');
    try {
      const closeBtn = this.page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Availability' })
        .getByRole('button', { name: 'Close' });
      await closeBtn.click({ force: true, timeout: 5000 });
    } catch {
      // Fallback: press Escape
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(500);
    logger.info('Availability dialog closed');
  }

  // ──────────────────────────────────────────────────────
  //  Open Group
  // ──────────────────────────────────────────────────────

  /**
   * Open a group by name from the Group Management list.
   * Searches for the group card and clicks the "Open" heading.
   *
   * @param groupName - The name of the group to open
   */
  async openGroup(groupName: string): Promise<void> {
    logger.info(`Opening group: ${groupName}`);

    // Use JavaScript to find and click the group card's Open button
    const found = await this.page.evaluate((name) => {
      const cards = document.querySelectorAll('.card-mode-2-card');
      for (const card of Array.from(cards)) {
        if (card.textContent?.includes(name)) {
          const openHeading = card.querySelector('h6');
          if (openHeading) {
            openHeading.click();
            return true;
          }
        }
      }
      return false;
    }, groupName);

    if (!found) {
      throw new Error(`Group "${groupName}" not found in the list`);
    }

    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
    logger.info(`Group "${groupName}" opened successfully`);
  }

  // ──────────────────────────────────────────────────────
  //  Group Block
  // ──────────────────────────────────────────────────────

  /**
   * Add a group block: select room type, set number of rooms, generate dates, and save.
   *
   * @param roomTypeName - The room type name to select (e.g., "Bed Type Standard Room")
   * @param noOfRooms - Number of rooms to block (must be less than available)
   * @returns The created room block record
   */
  async addGroupBlock(roomTypeName: string, noOfRooms: number): Promise<RoomBlockRecord> {
    logger.info(`Adding group block: ${roomTypeName}, ${noOfRooms} rooms`);

    // Wait for the Group Block section to appear
    await this.page.waitForSelector('text=Group Block', { timeout: 15000 });
    logger.info('Group Block heading is visible');

    // Scroll to the Group Block section
    await this.page.evaluate(() => {
      const els = document.querySelectorAll('*');
      for (const el of Array.from(els)) {
        if (el.textContent?.trim() === 'Group Block' && el.tagName.match(/^H[1-6]$/)) {
          el.scrollIntoView({ block: 'center' });
          break;
        }
      }
    });
    await this.page.waitForTimeout(1000);

    // Click the "+" button next to "Group Block" heading
    // The button has icon class containing "plus" or is the first button near the heading
    // Use a broad approach: find all buttons near the Group Block text area
    await this.page.evaluate(() => {
      const headings = document.querySelectorAll('h5');
      for (const h5 of Array.from(headings)) {
        if (h5.textContent?.includes('Group Block')) {
          // Walk up to find a container that has buttons
          let el: Element | null = h5;
          for (let i = 0; i < 5; i++) {
            el = el?.parentElement;
            if (!el) break;
            const btns = el.querySelectorAll('button');
            if (btns.length > 0) {
              btns[0].click();
              return;
            }
          }
          break;
        }
      }
    });
    await this.page.waitForTimeout(2000);

    // Select room type from dropdown
    // Wait for the Group Block dialog to appear (look for the heading inside dialog)
    await this.page.waitForSelector('.modal.show [role="document"], .modal-body', { timeout: 10000 });
    await this.page.waitForTimeout(1000);

    // Find the dialog and the Room Type ng-select within it
    const dialog = this.page.locator('.modal.show').last();
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    const roomTypeCombo = dialog.locator('ng-select').first();
    await this.elementActions.click(roomTypeCombo, 'Room Type dropdown');
    await this.page.waitForTimeout(300);

    // Type room type name to filter, then select
    const textbox = roomTypeCombo.locator('input[type="text"], input[role="combobox"]').first();
    if (await textbox.count()) {
      await textbox.fill(roomTypeName);
      await this.page.waitForTimeout(500);
    }
    // Click the matching option
    const option = this.page.locator('.ng-option').filter({ hasText: roomTypeName }).first();
    await this.elementActions.click(option, `Room Type option: ${roomTypeName}`);
    await this.page.waitForTimeout(300);

    // Set number of rooms
    const roomsInput = dialog.locator('input[type="number"]').first();
    await roomsInput.click();
    await roomsInput.fill(String(noOfRooms));
    await this.page.waitForTimeout(300);

    // Click Generate dates
    await this.elementActions.click(this.generateDatesButton, 'Generate dates button');
    await this.page.waitForTimeout(1000);

    // Parse the generated dates table
    const dates: RoomBlockRecord['dates'] = [];
    const tableRows = await dialog.locator('table tbody tr').all();
    for (const row of tableRows) {
      const cells = await row.locator('td').all();
      if (cells.length >= 4) {
        const dateText = (await cells[0].textContent())?.trim() || '';
        const availText = (await cells[1].textContent())?.trim() || '0';
        const adultText = (cells.length >= 5 ? await cells[4].textContent() : '1')?.trim() || '1';
        dates.push({
          date: dateText,
          availability: parseInt(availText) || 0,
          noOfRooms: noOfRooms,
          pickedUp: 0,
          adult: parseInt(adultText) || 1,
        });
      }
    }

    // Click Save
    await this.elementActions.click(this.groupBlockSaveButton, 'Group Block Save button');
    await this.page.waitForTimeout(500);

    // Verify success and click OK
    await this.verifySuccessAndDismiss();

    const record: RoomBlockRecord = {
      roomTypeCode: roomTypeName.split(' ')[0],
      roomTypeName,
      noOfRooms,
      dates,
    };

    logger.info(`Group block added successfully: ${JSON.stringify(record)}`);
    return record;
  }

  // ──────────────────────────────────────────────────────
  //  Rooming List
  // ──────────────────────────────────────────────────────

  /**
   * Open the Rooming List dialog by clicking the "+ Rooming List" button.
   */
  async openRoomingListDialog(): Promise<void> {
    logger.info('Opening Rooming List dialog');

    // Scroll down to make the rooming list button visible
    await this.page.evaluate(() => {
      const rlHeading = Array.from(document.querySelectorAll('h5'))
        .find(h => h.textContent?.includes('Rooming List'));
      if (rlHeading) rlHeading.scrollIntoView({ block: 'center' });
    });
    await this.page.waitForTimeout(500);

    await this.elementActions.click(this.roomingListAddButton, '+ Rooming List button');
    await this.page.waitForTimeout(1000);

    // Verify the Rooming List dialog is open
    const dialog = this.page.locator('.modal.show').filter({ hasText: 'Rooming List' });
    const isVisible = await dialog.count() > 0;
    if (!isVisible) {
      throw new Error('Rooming List dialog did not open');
    }

    logger.info('Rooming List dialog opened');
  }

  /**
   * Click the "+" button inside the Rooming List dialog to add a new entry.
   * This opens an inner form dialog pre-filled with group data.
   */
  async addRoomingListEntry(): Promise<void> {
    logger.info('Clicking + button inside Rooming List dialog');

    // The outer Rooming List dialog has two buttons before the table:
    // first button (icon 󰐗) = Add, second button (icon 󰑐) = Refresh
    const outerDialog = this.page.locator('.modal.show').filter({ hasText: 'Rooming List' }).last();
    const addBtn = outerDialog.locator('button').first();
    await this.elementActions.click(addBtn, 'Rooming List + button (add entry)');

    // Wait for the inner form dialog to appear
    await this.page.waitForTimeout(1000);

    // Click OK on the inner form dialog to confirm the entry
    const innerDialog = this.page.locator('.modal.show').last();
    const okBtn = innerDialog.getByRole('button', { name: 'Ok', exact: true });
    if (await okBtn.count() > 0) {
      await this.elementActions.click(okBtn, 'Rooming List entry OK button');
    } else {
      // Fallback: look for any OK button
      const fallbackOk = innerDialog.getByRole('button', { name: 'OK' });
      await this.elementActions.click(fallbackOk.first(), 'Rooming List entry OK button (fallback)');
    }

    await this.page.waitForTimeout(1000);
    logger.info('Rooming list entry added');
  }

  /**
   * Save the Rooming List and handle the success confirmation.
   */
  async saveRoomingList(): Promise<void> {
    logger.info('Saving Rooming List');

    // Click Save on the outer Rooming List dialog
    const outerDialog = this.page.locator('.modal.show').filter({ hasText: 'Rooming List' }).last();
    const saveBtn = outerDialog.getByRole('button', { name: 'Save', exact: true });
    await this.elementActions.click(saveBtn, 'Rooming List Save button');

    // Wait for success message
    await this.page.waitForTimeout(1000);

    // Handle the success dialog (SweetAlert2 style)
    const successPopup = this.page.locator('.swal2-popup, .swal2-shown');
    try {
      await successPopup.waitFor({ state: 'visible', timeout: 10000 });
      logger.info('✅ Rooming List save success message displayed');
    } catch {
      // Fallback: look for paragraph-based success
      const successMsg = this.page.getByRole('paragraph').filter({ hasText: /reservation|success|saved|created/i });
      if (await successMsg.count() > 0) {
        logger.info('✅ Rooming List save success message displayed (paragraph)');
      }
    }

    // Click OK
    try {
      const okBtn = this.page.locator('.swal2-popup').getByRole('button', { name: 'OK' });
      await this.elementActions.click(okBtn, 'Rooming List success OK button');
    } catch {
      const fallbackOk = this.page.locator('[role="dialog"] button').filter({ hasText: 'OK' }).first();
      await this.elementActions.click(fallbackOk, 'Rooming List success OK button (fallback)');
    }

    await this.page.waitForTimeout(500);
    logger.info('✅ Rooming List saved and confirmed');
  }

  /**
   * Close the Rooming List dialog.
   */
  async closeRoomingListDialog(): Promise<void> {
    logger.info('Closing Rooming List dialog');
    const outerDialog = this.page.locator('.modal.show').filter({ hasText: 'Rooming List' }).last();
    const closeBtn = outerDialog.getByRole('button', { name: 'Close', exact: true });
    await this.elementActions.click(closeBtn, 'Rooming List Close button');
    await this.page.waitForTimeout(500);
    logger.info('Rooming List dialog closed');
  }

  /**
   * Fetch availability and return the first day's count for a specific room type.
   *
   * @param roomTypeName - The room type name to check (e.g., "Bed Type Standard Room")
   * @returns The first day's availability count for the room type, or -1 if not found
   */
  async getAvailabilityForRoomType(roomTypeName: string): Promise<number> {
    logger.info(`Fetching availability for room type: ${roomTypeName}`);

    // Open Quick Access
    await this.elementActions.click(this.quickAccessButton, 'Quick Access FAB button');
    await this.page.waitForTimeout(500);

    // Click Availability
    await this.elementActions.click(this.availabilityQuickLink, 'Availability quick link');
    await this.page.waitForTimeout(3000);

    // Parse the availability table
    let availability = -1;
    const rows = await this.page.locator('.modal.show table tbody tr, [role="dialog"] table tbody tr').all();

    for (const row of rows) {
      const cells = await row.locator('td').all();
      if (cells.length > 1) {
        const roomType = (await cells[0].textContent())?.trim();
        if (roomType === roomTypeName) {
          const firstDayAvail = (await cells[1].textContent())?.trim();
          availability = parseInt(firstDayAvail || '-1');
          break;
        }
      }
    }

    logger.info(`Availability for ${roomTypeName}: ${availability}`);

    // Close the dialog
    try {
      const closeBtn = this.page.locator('.modal.show').last()
        .getByRole('button', { name: 'Close' });
      await closeBtn.click({ force: true, timeout: 5000 });
    } catch {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(500);

    return availability;
  }

  // ──────────────────────────────────────────────────────
  //  Success / Dismiss
  // ──────────────────────────────────────────────────────

  /**
   * Verify the success message and click OK to dismiss.
   */
  private async verifySuccessAndDismiss(): Promise<void> {
    logger.info('Verifying success message');

    // Wait for success dialog (SweetAlert2 style)
    const successPopup = this.page.locator('.swal2-popup, .swal2-shown');
    try {
      await successPopup.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      // Fallback: try the standard paragraph-based success message
      const successMsg = this.page.getByRole('paragraph').filter({ hasText: /created|updated|successfully/i });
      await expect(successMsg).toBeVisible({ timeout: 10000 });
    }

    logger.info('✅ Success message displayed');

    // Click OK button
    try {
      await this.elementActions.click(this.successOkButton, 'Success dialog OK button');
    } catch {
      // Fallback: click any OK button in a dialog
      const okBtn = this.page.locator('[role="dialog"] button, .swal2-confirm').filter({ hasText: 'OK' });
      await this.elementActions.click(okBtn.first(), 'OK button (fallback)');
    }

    await this.page.waitForTimeout(500);
    logger.info('✅ Success dialog dismissed');
  }
}
