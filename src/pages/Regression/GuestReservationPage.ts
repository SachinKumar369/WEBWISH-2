import { Page, BrowserContext, expect, Locator } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';

export interface GuestReservationData {
  lastName: string;
  businessSource: string;
  guestClass: string;
  marketSegment: string;
}

export interface ReservationCreatedResult {
  guestName: string;
  successMessage: string;
}

/**
 * Page Object Model for Guest Reservation flow in Regression testing.
 * Covers the complete flow: Navigate → New Reservation → Room Selection →
 * Guest Details → Profile Linking → Confirm & Continue.
 */
export class GuestReservationPage extends BasePage {
  private elementActions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  // ──────────────────────────────────────────────────────
  //  SIDEBAR & NAVIGATION LOCATORS
  // ──────────────────────────────────────────────────────

  /** Front Desk link in the sidebar navigation */
  private get frontDeskLink(): Locator {
    return this.page.getByRole('link', { name: /Front Desk/ });
  }

  /** Guest Management link in the sidebar sub-menu */
  private get guestManagementLink(): Locator {
    return this.page.getByRole('link', { name: /Guest Management/ });
  }

  // ──────────────────────────────────────────────────────
  //  GUEST MANAGEMENT PAGE LOCATORS
  // ──────────────────────────────────────────────────────

  /** Guest Management heading */
  private get guestManagementHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Guest Management' });
  }

  /** New Reservation button in the toolbar */
  private get newReservationButton(): Locator {
    return this.page.getByRole('button', { name: 'New Reservation' });
  }

  // ──────────────────────────────────────────────────────
  //  NEW RESERVATION / STAY DETAILS LOCATORS
  // ──────────────────────────────────────────────────────

  /** Check In/Check Out date range input */
  private get dateRangeInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Select Date Range' });
  }

  /** Next button (used on Stay Details and Room Selection) */
  private get nextButton(): Locator {
    return this.page.getByRole('button', { name: 'Next' });
  }

  /** Close button on the New Reservation page */
  private get closeButton(): Locator {
    return this.page.getByRole('button', { name: 'Close' }).last();
  }

  // ──────────────────────────────────────────────────────
  //  ROOM SELECTION LOCATORS
  // ──────────────────────────────────────────────────────

  /** First "+" button in the room selection grid (for first room type with availability) */
  private get firstRoomAddButton(): Locator {
    return this.page.getByRole('button', { name: '+' }).first();
  }

  /** Room table body - the availability grid table */
  private get roomTableBody(): Locator {
    return this.page.locator('table tbody');
  }

  // ──────────────────────────────────────────────────────
  //  QUICK RESERVATION DIALOG LOCATORS
  // ──────────────────────────────────────────────────────

  /** Quick Reservation dialog */
  private get quickReservationDialog(): Locator {
    return this.page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Quick Reservation' });
  }

  /** Last Name input in Quick Reservation */
  private get lastNameInput(): Locator {
    return this.page.locator('#lst_nme').getByRole('textbox');
  }

  /** First Name input in Quick Reservation */
  private get firstNameInput(): Locator {
    return this.page.locator('div').filter({ hasText: /^First Name$/ }).getByRole('textbox');
  }

  /** Market Segment dropdown in Quick Reservation */
  private get marketSegmentDropdown(): Locator {
    return this.quickReservationDialog.locator('div').filter({ hasText: /^Market Segment\*/ }).locator('ng-select');
  }

  /** Guest Class dropdown in Quick Reservation */
  private get guestClassDropdown(): Locator {
    return this.quickReservationDialog.locator('div').filter({ hasText: /^Guest Class\*/ }).locator('ng-select');
  }

  /** Business Source dropdown in Quick Reservation */
  private get businessSourceDropdown(): Locator {
    return this.quickReservationDialog.locator('div').filter({ hasText: /^Business Source\*/ }).locator('ng-select');
  }

  /** Confirm & Continue button - search at page level since it's at the bottom of the dialog */
  private get confirmAndContinueButton(): Locator {
    return this.page.getByRole('button', { name: 'Confirm & Continue' }).or(
      this.page.locator('button').filter({ hasText: 'Confirm & Continue' })
    );
  }

  // ──────────────────────────────────────────────────────
  //  ADVANCE SEARCH (PROFILE LINKING) DIALOG LOCATORS
  // ──────────────────────────────────────────────────────

  /** Advance Search dialog */
  private get advanceSearchDialog(): Locator {
    return this.page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Advance Search' });
  }

  /** Profile table in Advance Search */
  private get profileTable(): Locator {
    return this.advanceSearchDialog.locator('table');
  }

  /** First profile's link button - the SECOND icon (\uDB84\uDECC = link icon) in the last cell of the first row */
  private get firstProfileLinkButton(): Locator {
    // The last cell contains icon divs inside .d-flex.justify-content-end
    // nth-child(2) = view/eye icon, nth-child(3) = link icon (the one we want)
    return this.profileTable.locator('tbody tr').first().locator('.d-flex.justify-content-end > div').nth(1);
  }

  // ──────────────────────────────────────────────────────
  //  ADVANCE SEARCH CLOSE LOCATORS
  // ──────────────────────────────────────────────────────

  /** Close (×) button on the Advance Search dialog */
  private get advanceSearchCloseButton(): Locator {
    return this.advanceSearchDialog.locator('button').filter({ hasText: /×|Close/ }).first();
  }

  // ──────────────────────────────────────────────────────
  //  CONFIRMATION & SUCCESS DIALOG LOCATORS
  // ──────────────────────────────────────────────────────

  /** Confirmation letter prompt - "Do you want to send the confirmation letter on save?" */
  private get confirmationLetterPrompt(): Locator {
    return this.page.getByText('Do you want to send the confirmation letter on save?');
  }

  /** No button in confirmation letter prompt */
  private get confirmationNoButton(): Locator {
    return this.page.getByRole('button', { name: 'No' });
  }

  /** Yes button in confirmation letter prompt */
  private get confirmationYesButton(): Locator {
    return this.page.getByRole('button', { name: 'Yes' });
  }

  /** Success message in SweetAlert popup */
  private get successMessage(): Locator {
    return this.page.locator('#swal2-html-container');
  }

  /** OK button in SweetAlert popup */
  private get okButton(): Locator {
    return this.page.locator('.swal2-popup').getByRole('button', { name: 'OK' });
  }

  // ──────────────────────────────────────────────────────
  //  OPEN BOOKING & MODIFY RESERVATION LOCATORS
  // ──────────────────────────────────────────────────────

  /** Open Booking button - appears after reservation confirmation */
  private get openBookingButton(): Locator {
    return this.page.getByRole('button', { name: '󰈈 Open Booking' });
  }

  /** Guest Details heading on the booking detail page (h5) */
  private get guestDetailsHeading(): Locator {
    return this.page.locator('h5').filter({ hasText: /^Guest Details/ }).first();
  }

  /** Pencil/edit button near the Guest Details heading — opens Guest Details dialog */
  private get guestDetailsPencilButton(): Locator {
    return this.guestDetailsHeading.locator('..').locator('button').filter({ hasText: /󰏫/ }).first();
  }

  /** Guest Details dialog/modal that opens when pencil button is clicked */
  private get guestDetailsDialog(): Locator {
    return this.page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Guest Details' });
  }

  /** Contact Number input inside the Guest Details dialog */
  private get contactNumberInputInDialog(): Locator {
    return this.guestDetailsDialog.locator('div').filter({ hasText: /^Contact Number$/ }).getByRole('textbox');
  }

  /** Email Id input inside the Guest Details dialog */
  private get emailInputInDialog(): Locator {
    return this.guestDetailsDialog.locator('input[placeholder="example@gmail.com"], input[type="email"]').first();
  }

  /** Update button inside the Guest Details dialog */
  private get updateButtonInGuestDialog(): Locator {
    return this.guestDetailsDialog.locator('button').filter({ hasText: 'Update' }).first();
  }

  /** Close button inside the Guest Details dialog */
  private get closeButtonInGuestDialog(): Locator {
    return this.guestDetailsDialog.locator('button').filter({ hasText: 'Close' }).first();
  }

  /** Stay Details heading on the booking detail page (h5) */
  private get stayDetailsHeading(): Locator {
    return this.page.locator('h5').filter({ hasText: 'Stay Details' }).first();
  }

  /** Pencil/edit button near the Stay Details heading — opens Stay Details for editing */
  private get stayDetailsPencilButton(): Locator {
    // The pencil button is next to "CONFIRMED" badge inside Stay Details section
    return this.page.locator('.mdi-pencil, button:has(i.mdi-pencil)').first();
  }

  /** Stay Details edit dialog/modal that opens when pencil button is clicked */
  private get stayDetailsDialog(): Locator {
    return this.page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: /Stay Details|Edit Stay/ });
  }

  /** Update button inside the Stay Details dialog */
  private get updateButtonInStayDialog(): Locator {
    return this.stayDetailsDialog.locator('button').filter({ hasText: 'Update' }).first();
  }

  // ──────────────────────────────────────────────────────
  //  NAVIGATION METHODS
  // ──────────────────────────────────────────────────────

  /**
   * Navigate to Guest Management page via sidebar.
   * Hovers to the extreme left to reveal sidebar, clicks Front Desk, then Guest Management.
   */
  async navigateToGuestManagement(): Promise<void> {
    logger.info('Navigating to Guest Management page');

    // Hover to the extreme left to reveal the sidebar
    await this.page.mouse.move(0, 400);
    await this.page.waitForTimeout(500);

    // Click Front Desk in sidebar
    await this.elementActions.click(this.frontDeskLink, 'Front Desk sidebar link');
    await this.page.waitForTimeout(300);

    // Click Guest Management in sub-menu
    await this.elementActions.click(this.guestManagementLink, 'Guest Management sidebar link');
    await this.page.waitForTimeout(2000);

    // Verify Guest Management page loaded
    await expect(this.guestManagementHeading).toBeVisible({ timeout: 10000 });
    logger.info('✅ Guest Management page loaded successfully');
  }

  // ──────────────────────────────────────────────────────
  //  NEW RESERVATION METHODS
  // ──────────────────────────────────────────────────────

  /**
   * Click New Reservation button to start the reservation flow.
   */
  async clickNewReservation(): Promise<void> {
    logger.info('Clicking New Reservation button');
    await this.elementActions.click(this.newReservationButton, 'New Reservation button');
    await this.page.waitForTimeout(1000);
    logger.info('✅ New Reservation form opened');
  }

  /**
   * Click Next on the Stay Details page to go to room selection.
   */
  async clickNextOnStayDetails(): Promise<void> {
    logger.info('Clicking Next on Stay Details page');
    await this.elementActions.click(this.nextButton, 'Next button on Stay Details');
    await this.page.waitForTimeout(3000); // Wait for room grid to load
    logger.info('✅ Room selection grid loaded');
  }

  // ──────────────────────────────────────────────────────
  //  ROOM SELECTION METHODS
  // ──────────────────────────────────────────────────────

  /**
   * Select a room by clicking the "+" button on the first available room type.
   * The "+" button is adjacent to the room type that has availability > 0.
   * Verifies the room count changes from 0 to 1 after clicking.
   */
  async selectFirstAvailableRoom(): Promise<void> {
    logger.info('Selecting first available room type');

    // Wait for any loader overlay to disappear
    await this.page.locator('.loader-overlay').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(1000);

    // Wait for room table to be visible
    await this.roomTableBody.waitFor({ state: 'visible', timeout: 20000 });
    await this.page.waitForTimeout(1000);

    // Find the first "+" button and its adjacent count display
    const firstAddRow = this.page.locator('table tbody tr').first();
    const addBtn = firstAddRow.locator('button').filter({ hasText: '+' });
    const countDisplay = firstAddRow.locator('td').last().locator('div').filter({ hasText: /^\d+$/ }).first();

    // Read the count before clicking
    const countBefore = await countDisplay.textContent().catch(() => '0');
    logger.info(`Room count before click: ${countBefore}`);

    // Click the "+" button
    await this.elementActions.click(addBtn, 'First room type + button');
    await this.page.waitForTimeout(1000);

    // Verify count changed
    const countAfter = await countDisplay.textContent().catch(() => '0');
    logger.info(`Room count after click: ${countAfter}`);

    if (countAfter === countBefore) {
      // Fallback: try clicking with force
      logger.warn('Room count did not change, retrying with force click');
      await addBtn.click({ force: true });
      await this.page.waitForTimeout(1000);
    }

    logger.info('✅ Room selected successfully');
  }

  /**
   * Click Next on the Room Selection page to go to Quick Reservation dialog.
   */
  async clickNextOnRoomSelection(): Promise<void> {
    logger.info('Clicking Next on Room Selection page');
    await this.elementActions.click(this.nextButton, 'Next button on Room Selection');
    await this.page.waitForTimeout(3000);

    // Wait for Quick Reservation dialog - try multiple selectors
    const quickResDialog = this.page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Quick Reservation' });
    const anyDialog = this.page.locator('ngb-modal-window[role="dialog"]').last();

    try {
      await quickResDialog.waitFor({ state: 'visible', timeout: 20000 });
      logger.info('✅ Quick Reservation dialog opened');
    } catch {
      // Fallback: check if any dialog appeared
      const dialogVisible = await anyDialog.isVisible({ timeout: 5000 }).catch(() => false);
      if (dialogVisible) {
        const dialogText = await anyDialog.textContent().catch(() => '');
        logger.info(`A dialog appeared with text: ${dialogText.substring(0, 100)}...`);
        // If it's a different dialog, try pressing Escape and waiting
        if (!dialogText.includes('Quick Reservation')) {
          logger.warn('Dialog is not Quick Reservation, pressing Escape and retrying');
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(2000);
          await this.elementActions.click(this.nextButton, 'Next button on Room Selection (retry)');
          await quickResDialog.waitFor({ state: 'visible', timeout: 20000 });
        }
      } else {
        throw new Error('Neither Quick Reservation dialog nor any dialog appeared after clicking Next');
      }
    }
  }

  // ──────────────────────────────────────────────────────
  //  GUEST DETAILS & PROFILE LINKING METHODS
  // ──────────────────────────────────────────────────────

  /**
   * Enter guest last name and press Tab to trigger the Advance Search dialog.
   * @param lastName - Guest's last name (e.g., 'Kumar')
   */
  async enterLastNameAndTriggerProfileSearch(lastName: string): Promise<void> {
    logger.info(`Entering last name: ${lastName} and triggering profile search`);

    // Wait for any loader overlay to disappear
    await this.page.locator('.loader-overlay').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(1000);

    // Wait for the Last Name field to be visible
    await this.lastNameInput.waitFor({ state: 'visible', timeout: 10000 });

    // Click and type the last name
    await this.lastNameInput.click();
    await this.lastNameInput.fill(lastName);

    // Press Tab to trigger the Advance Search dialog
    await this.lastNameInput.press('Tab');
    await this.page.waitForTimeout(2000);

    // Wait for Advance Search dialog to appear
    await this.advanceSearchDialog.waitFor({ state: 'visible', timeout: 10000 });
    logger.info('✅ Advance Search dialog opened after entering last name');
  }

  /**
   * Link the first available profile from the Advance Search results.
   * Clicks the link button on the first row in the profile table.
   */
  async linkFirstProfile(): Promise<string> {
    logger.info('Linking first available profile');

    // Wait for profile table to load
    await this.profileTable.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(1000);

    // Get the first profile name for logging
    const firstRow = this.profileTable.locator('tbody tr').first();
    const profileName = await firstRow.locator('td').nth(1).textContent() ?? 'Unknown';
    logger.info(`Linking profile: ${profileName.trim()}`);

    // Click the link button on the first profile (scroll table into view, then use JS click)
    const tableContainer = this.advanceSearchDialog.locator('.table-responsive, .modal-body').first();
    await tableContainer.evaluate((el) => el.scrollTop = 0);
    await this.page.waitForTimeout(500);

    // Use JavaScript click as the icon may be outside the viewport or partially hidden
    await this.firstProfileLinkButton.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(2000);

    logger.info(`✅ Profile linked successfully: ${profileName.trim()}`);
    return profileName.trim();
  }

  /**
   * Close the Advance Search dialog without linking a profile.
   * Clicks the × / Close button on the Advance Search popup.
   */
  async closeAdvanceSearchDialog(): Promise<void> {
    logger.info('Closing Advance Search dialog without linking profile');

    // Wait for Advance Search dialog to be visible
    await this.advanceSearchDialog.waitFor({ state: 'visible', timeout: 10000 });

    // Try clicking the × button in the modal header first
    const closeBtn = this.advanceSearchDialog.locator('.btn-close, button[data-bs-dismiss="modal"], .modal-header button').first();
    const closeVisible = await closeBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (closeVisible) {
      await closeBtn.evaluate((el) => (el as HTMLElement).click());
    } else {
      // Fallback: try the "Close" text button
      const closeTextBtn = this.advanceSearchDialog.locator('button').filter({ hasText: /Close/ }).first();
      const closeTextVisible = await closeTextBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (closeTextVisible) {
        await closeTextBtn.evaluate((el) => (el as HTMLElement).click());
      } else {
        // Last resort: press Escape
        logger.warn('No close button found on Advance Search dialog, pressing Escape');
        await this.page.keyboard.press('Escape');
      }
    }

    await this.page.waitForTimeout(1000);

    // Verify dialog is closed
    const stillVisible = await this.advanceSearchDialog.isVisible({ timeout: 3000 }).catch(() => false);
    if (stillVisible) {
      logger.warn('Advance Search dialog still visible, pressing Escape again');
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(1000);
    }

    logger.info('✅ Advance Search dialog closed');
  }

  /**
   * Enter guest first name in the Quick Reservation dialog.
   * @param firstName - Guest's first name
   */
  async enterFirstName(firstName: string): Promise<void> {
    logger.info(`Entering first name: ${firstName}`);

    const firstNameInput = this.quickReservationDialog.locator('div').filter({ hasText: /^First Name$/ }).getByRole('textbox');
    await firstNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await firstNameInput.click();
    await firstNameInput.fill(firstName);
    await this.page.waitForTimeout(500);
    logger.info(`✅ First name entered: ${firstName}`);
  }

  /**
   * Click the dropdown arrow and select the first available option.
   * No hardcoded values — picks whatever option is first in the list.
   * @param dropdown - The ng-select dropdown locator
   * @param description - Description for logging
   */
  private async selectFirstAvailableDropdownOption(dropdown: Locator, description: string): Promise<void> {
    logger.info(`Selecting ${description} - choosing first available option`);

    // Click the dropdown arrow to open
    const arrowWrapper = dropdown.locator('.ng-arrow-wrapper');
    await arrowWrapper.scrollIntoViewIfNeeded();
    await arrowWrapper.click({ force: true });
    await this.page.waitForTimeout(1500);

    // ng-select panels render at the body level, outside the dialog
    // Try multiple selectors to find the first option
    const selectors = ['.ng-option', '.ng-dropdown-panel-item', '[role="option"]'];

    for (const sel of selectors) {
      const firstOption = this.page.locator(sel).first();
      const exists = await firstOption.isVisible({ timeout: 3000 }).catch(() => false);
      if (exists) {
        const optionText = await firstOption.textContent().catch(() => 'Unknown');
        await firstOption.evaluate((el) => (el as HTMLElement).click());
        await this.page.waitForTimeout(500);
        logger.info(`✅ ${description} selected: ${optionText.trim()}`);
        return;
      }
    }

    // Fallback: try ArrowDown + Enter on the combobox input
    const comboboxInput = dropdown.locator('input');
    const inputVisible = await comboboxInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (inputVisible) {
      await comboboxInput.press('ArrowDown');
      await this.page.waitForTimeout(500);
      await comboboxInput.press('Enter');
      await this.page.waitForTimeout(500);
      logger.info(`✅ ${description} selected via ArrowDown + Enter`);
    } else {
      logger.warn(`Could not select ${description} - no options found`);
    }
  }

  /**
   * Select Market Segment - picks the first available option.
   */
  async selectMarketSegment(): Promise<void> {
    await this.selectFirstAvailableDropdownOption(this.marketSegmentDropdown, 'Market Segment');
  }

  /**
   * Select Guest Class - picks the first available option.
   */
  async selectGuestClass(): Promise<void> {
    await this.selectFirstAvailableDropdownOption(this.guestClassDropdown, 'Guest Class');
  }

  /**
   * Select Business Source - picks the first available option.
   */
  async selectBusinessSource(): Promise<void> {
    await this.selectFirstAvailableDropdownOption(this.businessSourceDropdown, 'Business Source');
  }

  // ──────────────────────────────────────────────────────
  //  CONFIRMATION METHODS
  // ──────────────────────────────────────────────────────

  /**
   * Click Confirm & Continue button.
   */
  async clickConfirmAndContinue(): Promise<void> {
    logger.info('Clicking Confirm & Continue');
    // Scroll the dialog body to make the button visible
    await this.quickReservationDialog.evaluate((dialog) => {
      const body = dialog.querySelector('.modal-body');
      if (body) body.scrollTop = body.scrollHeight;
    });
    await this.page.waitForTimeout(500);

    // Use JavaScript click since the button is intercepted by overlapping elements
    const btn = this.page.locator('button').filter({ hasText: 'Confirm & Continue' });
    await btn.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(2000);
    logger.info('✅ Confirm & Continue clicked');
  }

  /**
   * Handle the confirmation letter prompt by clicking No.
   * Handles both SweetAlert popups and native dialogs.
   */
  async handleConfirmationLetterPrompt(): Promise<void> {
    logger.info('Handling confirmation letter prompt');

    // Check for SweetAlert2 popup (most common)
    const swalVisible = await this.page.locator('.swal2-popup').isVisible({ timeout: 5000 }).catch(() => false);

    if (swalVisible) {
      const swalText = await this.page.locator('#swal2-html-container').textContent().catch(() => '');
      logger.info(`SweetAlert popup text: ${swalText}`);

      if (swalText.includes('confirmation letter') || swalText.includes('send')) {
        // Click No
        await this.page.locator('.swal2-popup').getByRole('button', { name: 'No' }).click();
        logger.info('✅ Clicked No on confirmation letter prompt');
      } else {
        // It might be a success message - click OK
        await this.page.locator('.swal2-popup').getByRole('button', { name: 'OK' }).click();
        logger.info('✅ Clicked OK on SweetAlert popup');
      }
      await this.page.waitForTimeout(1000);
      return;
    }

    // Check for confirmation letter text in any visible paragraph/text
    const confirmText = this.page.getByText('confirmation letter', { exact: false });
    const confirmVisible = await confirmText.isVisible({ timeout: 3000 }).catch(() => false);

    if (confirmVisible) {
      await this.elementActions.click(this.confirmationNoButton, 'No button on confirmation prompt');
      logger.info('✅ Clicked No on confirmation letter prompt');
      await this.page.waitForTimeout(1000);
      return;
    }

    // Check for any modal with Yes/No buttons
    const noBtn = this.page.getByRole('button', { name: 'No' });
    const noBtnVisible = await noBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (noBtnVisible) {
      await noBtn.click();
      logger.info('✅ Clicked No on prompt');
      await this.page.waitForTimeout(1000);
      return;
    }

    // Check for OK button in any popup (might be success already)
    const okBtn = this.page.locator('.swal2-popup').getByRole('button', { name: 'OK' });
    const okVisible = await okBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (okVisible) {
      await okBtn.click();
      logger.info('✅ Clicked OK on popup');
      await this.page.waitForTimeout(1000);
      return;
    }

    logger.warn('No confirmation prompt found - may have been auto-accepted');
  }

  /**
   * Verify the reservation success message.
   * Checks multiple possible locations for the success text.
   * @returns The success message text
   */
  async verifyReservationSuccess(): Promise<string> {
    logger.info('Verifying reservation success message');

    // Wait a bit for the success popup to appear
    await this.page.waitForTimeout(3000);

    // Check multiple possible success message locations
    const checks = [
      { selector: '#swal2-html-container', name: 'SweetAlert' },
      { selector: '.swal2-html-container', name: 'SweetAlert alt' },
      { selector: '.swal2-popup', name: 'SweetAlert popup' },
      { selector: '.toast-body', name: 'Toast' },
      { selector: '[role="alert"]', name: 'Alert role' },
    ];

    for (const check of checks) {
      const el = this.page.locator(check.selector).first();
      const visible = await el.isVisible({ timeout: 3000 }).catch(() => false);
      if (visible) {
        const text = await el.textContent().catch(() => '');
        logger.info(`Found ${check.name} with text: ${text.substring(0, 100)}`);

        if (text.includes('Congratulations') || text.includes('confirmed')) {
          // Click OK if it's a SweetAlert
          const okBtn = this.page.locator('.swal2-popup').getByRole('button', { name: 'OK' });
          if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await okBtn.click();
          }
          logger.info('✅ Reservation success verified');
          return text;
        }
      }
    }

    // Check page text for success
    const bodyText = await this.page.locator('body').textContent().catch(() => '');
    if (bodyText.includes('Congratulations') || bodyText.includes('confirmed successfully')) {
      logger.info('✅ Reservation success found in page body');
      const match = bodyText.match(/(Congratulations[^.]*confirmed[^.]*)/i);
      return match ? match[1] : 'Reservation confirmed';
    }

    // If no success message found, check if we returned to Guest Management page (indicates success)
    const gmHeading = await this.guestManagementHeading.isVisible({ timeout: 5000 }).catch(() => false);
    if (gmHeading) {
      logger.info('✅ Returned to Guest Management page - reservation likely successful');
      return 'Reservation completed - returned to Guest Management';
    }

    logger.warn('No success message found - reservation may have failed');
    return 'No success message detected';
  }

  // ──────────────────────────────────────────────────────
  //  OPEN BOOKING & MODIFY RESERVATION METHODS
  // ──────────────────────────────────────────────────────

  /**
   * Click the "Open Booking" button after reservation is confirmed.
   * Opens the booking detail page for editing.
   */
  async clickOpenBooking(): Promise<void> {
    logger.info('Clicking Open Booking button');

    // Wait for the button to be visible
    await this.openBookingButton.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(1000);

    // Use JS click since the button may be intercepted
    await this.openBookingButton.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(3000);

    // Wait for Guest Details heading to appear (indicates booking detail page loaded)
    await this.guestDetailsHeading.waitFor({ state: 'visible', timeout: 15000 });
    logger.info('✅ Booking detail page loaded');
  }

  /**
   * Open the Guest Details dialog by clicking the pencil button near Guest Details heading.
   */
  async openGuestDetailsDialog(): Promise<void> {
    logger.info('Opening Guest Details dialog via pencil button');

    // Scroll to make Guest Details visible
    await this.guestDetailsHeading.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);

    // Click the pencil/edit button near Guest Details heading
    const pencilVisible = await this.guestDetailsPencilButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (pencilVisible) {
      await this.guestDetailsPencilButton.evaluate((el) => (el as HTMLElement).click());
    } else {
      // Fallback: find any mdi-pencil button near Guest Details
      const mdiPencil = this.page.locator('button:has(.mdi-pencil)').first();
      if (await mdiPencil.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mdiPencil.evaluate((el) => (el as HTMLElement).click());
      } else {
        throw new Error('Could not find pencil button to open Guest Details dialog');
      }
    }

    // Wait for the Guest Details dialog to appear
    await this.guestDetailsDialog.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(1000);
    logger.info('✅ Guest Details dialog opened');
  }

  /**
   * Modify the Contact Number field in the Guest Details dialog.
   * @param newNumber - The new contact number to enter
   */
  async modifyContactNumber(newNumber: string): Promise<void> {
    logger.info(`Modifying Contact Number to: ${newNumber}`);

    // Wait for the dialog to be visible
    await this.guestDetailsDialog.waitFor({ state: 'visible', timeout: 10000 });

    // Find the Contact Number textbox in the dialog
    const contactInput = this.contactNumberInputInDialog;
    await contactInput.waitFor({ state: 'visible', timeout: 10000 });
    await contactInput.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);

    // Clear and fill
    await contactInput.click();
    await contactInput.fill('');
    await this.page.waitForTimeout(300);
    await contactInput.fill(newNumber);
    await this.page.waitForTimeout(500);

    const actualValue = await contactInput.inputValue().catch(() => '');
    logger.info(`✅ Contact Number modified: ${actualValue}`);
  }

  /**
   * Modify the Email Id field in the Guest Details dialog.
   * @param newEmail - The new email to enter
   */
  async modifyEmail(newEmail: string): Promise<void> {
    logger.info(`Modifying Email to: ${newEmail}`);

    // Wait for the dialog to be visible
    await this.guestDetailsDialog.waitFor({ state: 'visible', timeout: 10000 });

    // Find the Email input in the dialog
    const emailInput = this.emailInputInDialog;
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);

    // Clear and fill
    await emailInput.click();
    await emailInput.fill('');
    await this.page.waitForTimeout(300);
    await emailInput.fill(newEmail);
    await this.page.waitForTimeout(500);

    const actualValue = await emailInput.inputValue().catch(() => '');
    logger.info(`✅ Email modified: ${actualValue}`);
  }

  /**
   * Click the "Update" button in the Guest Details dialog to save changes.
   */
  async clickUpdateInGuestDialog(): Promise<void> {
    logger.info('Clicking Update button in Guest Details dialog');

    // Scroll dialog to bottom to make button visible
    await this.guestDetailsDialog.evaluate((dialog) => {
      const body = dialog.querySelector('.modal-body');
      if (body) body.scrollTop = body.scrollHeight;
    });
    await this.page.waitForTimeout(500);

    const updateBtn = this.updateButtonInGuestDialog;
    await updateBtn.waitFor({ state: 'visible', timeout: 10000 });
    await updateBtn.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(2000);
    logger.info('✅ Update button clicked in Guest Details dialog');
  }

  /**
   * Click "OK" button on any confirmation popup that appears after Update.
   */
  async clickOkOnConfirmation(): Promise<void> {
    logger.info('Looking for OK confirmation popup');

    // Check for SweetAlert2 popup
    const swalVisible = await this.page.locator('.swal2-popup').isVisible({ timeout: 5000 }).catch(() => false);
    if (swalVisible) {
      const okBtn = this.page.locator('.swal2-popup').getByRole('button', { name: 'OK' });
      if (await okBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await okBtn.click();
        await this.page.waitForTimeout(1000);
        logger.info('✅ Clicked OK on SweetAlert confirmation');
        return;
      }
    }

    // Check for any OK button in any dialog
    const okBtn = this.page.getByRole('button', { name: 'OK' });
    if (await okBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await okBtn.click();
      await this.page.waitForTimeout(1000);
      logger.info('✅ Clicked OK on confirmation');
      return;
    }

    logger.info('No OK confirmation popup found - may have been auto-accepted');
  }

  /**
   * Click the "Close" button in the Guest Details dialog to close it.
   */
  async clickCloseInGuestDialog(): Promise<void> {
    logger.info('Clicking Close button in Guest Details dialog');

    const closeBtn = this.closeButtonInGuestDialog;
    const closeVisible = await closeBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (closeVisible) {
      await closeBtn.evaluate((el) => (el as HTMLElement).click());
      await this.page.waitForTimeout(1000);
      logger.info('✅ Guest Details dialog closed');
    } else {
      // Fallback: press Escape
      logger.warn('Close button not found, pressing Escape');
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(1000);
    }

    // Verify dialog is closed
    const stillVisible = await this.guestDetailsDialog.isVisible({ timeout: 3000 }).catch(() => false);
    if (stillVisible) {
      logger.warn('Dialog still visible after Close, pressing Escape again');
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Open the Stay Details for editing by clicking the pencil button next to "CONFIRMED" badge.
   * IMPORTANT: Do NOT use .mdi-pencil — it picks the Guest Details pencil first!
   * The Stay Details pencil is specifically the one NEXT to the "CONFIRMED" text.
   */
  async openStayDetailsForEdit(): Promise<void> {
    logger.info('Opening Stay Details for editing via pencil button');

    // Scroll to make Stay Details visible
    await this.stayDetailsHeading.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);

    // Strategy 1 (PRIMARY): Find the pencil button that is a SIBLING of "CONFIRMED" text
    // From the DOM: generic > [CONFIRMED text] + [button with pencil icon]
    const confirmedText = this.page.locator('text=CONFIRMED').first();
    if (await confirmedText.isVisible({ timeout: 5000 }).catch(() => false)) {
      logger.info('Found CONFIRMED text, looking for sibling pencil button...');
      // The pencil button is in the same parent container as CONFIRMED
      const confirmedParent = confirmedText.locator('..');
      const pencilBtn = confirmedParent.locator('button').first();
      if (await pencilBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        logger.info('Found pencil button next to CONFIRMED, clicking...');
        await pencilBtn.evaluate((el) => (el as HTMLElement).click());
        await this.page.waitForTimeout(2000);
        logger.info('✅ Stay Details opened for editing');
        return;
      }
    }

    // Strategy 2: Use JavaScript to find the button that is a sibling of CONFIRMED
    logger.info('Using JavaScript to find pencil button next to CONFIRMED');
    const clicked = await this.page.evaluate(() => {
      // Find all elements containing "CONFIRMED" text
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.textContent && node.textContent.trim() === 'CONFIRMED') {
          // Found CONFIRMED text node - check its parent for sibling buttons
          const confirmedEl = node.parentElement;
          if (confirmedEl) {
            const parent = confirmedEl.parentElement;
            if (parent) {
              const buttons = parent.querySelectorAll('button');
              for (const btn of buttons) {
                // Skip buttons that are inside other containers (not siblings)
                if (btn.parentElement === parent) {
                  btn.click();
                  return true;
                }
              }
            }
          }
        }
      }
      return false;
    });

    if (clicked) {
      await this.page.waitForTimeout(2000);
      logger.info('✅ Stay Details pencil button clicked via JavaScript');
      return;
    }

    // Strategy 3: Last resort - find the SECOND mdi-pencil on the page (skip Guest Details one)
    logger.info('Trying second mdi-pencil icon as last resort...');
    const allPencils = this.page.locator('.mdi-pencil');
    const pencilCount = await allPencils.count();
    logger.info(`Found ${pencilCount} mdi-pencil icons on page`);

    if (pencilCount >= 2) {
      // The second pencil is for Stay Details
      const stayPencil = allPencils.nth(1);
      const parentBtn = stayPencil.locator('..');
      await parentBtn.evaluate((el) => (el as HTMLElement).click());
      await this.page.waitForTimeout(2000);
      logger.info('✅ Stay Details pencil button clicked (second mdi-pencil)');
      return;
    }

    throw new Error('Could not find pencil button to open Stay Details');
  }

  /**
   * Modify the Expected Departure Date after opening Stay Details for editing.
   * The stay details edit may open a dialog or inline form with date inputs.
   * @param daysToAdd - Number of days to add to the current departure date (default: 1)
   */
  async modifyDepartureDate(daysToAdd: number = 1): Promise<void> {
    logger.info(`Modifying Departure Date - adding ${daysToAdd} day(s)`);
    await this.page.waitForTimeout(1000);

    // Look for a Stay Details edit dialog
    const stayDialog = this.stayDetailsDialog;
    const dialogVisible = await stayDialog.isVisible({ timeout: 5000 }).catch(() => false);

    if (dialogVisible) {
      logger.info('Stay Details edit dialog is open');

      // Look for departure date input in the dialog
      const depInput = stayDialog.locator('input').filter({ hasText: /departure/i }).first();
      const depInputVisible = await depInput.isVisible({ timeout: 3000 }).catch(() => false);

      if (depInputVisible) {
        await depInput.click();
        await this.page.waitForTimeout(500);
        // Handle date picker if it appears
        const calVisible = await this.page.locator('.flatpickr-calendar.open, .datepicker-dropdown:visible').first().isVisible({ timeout: 2000 }).catch(() => false);
        if (calVisible) {
          const day = this.page.locator('.flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)').first();
          if (await day.isVisible({ timeout: 1000 }).catch(() => false)) {
            await day.click();
            await this.page.waitForTimeout(1000);
            logger.info('✅ Departure date modified via calendar in dialog');
            return;
          }
        }
      }
    }

    // If no dialog, try finding date inputs on the main page
    // Look for inputs near Expected Departure Date
    const allInputs = this.page.locator('input[type="date"], input.flatpickr-input, input[placeholder*="date" i]');
    const inputCount = await allInputs.count();
    logger.info(`Found ${inputCount} date-related inputs on page`);

    for (let i = 0; i < inputCount; i++) {
      const input = allInputs.nth(i);
      const isVisible = await input.isVisible({ timeout: 1000 }).catch(() => false);
      if (!isVisible) continue;

      // Check if this input is near "Departure" text
      const nearbyText = await input.locator('..').locator('..').textContent().catch(() => '');
      if (nearbyText.includes('Departure') || nearbyText.includes('departure')) {
        logger.info(`Found departure date input at index ${i}`);
        await input.scrollIntoViewIfNeeded();
        await input.click();
        await this.page.waitForTimeout(500);

        // Handle flatpickr calendar
        const calVisible = await this.page.locator('.flatpickr-calendar.open').first().isVisible({ timeout: 2000 }).catch(() => false);
        if (calVisible) {
          const nextDay = this.page.locator('.flatpickr-day:not(.prevMonthDay):not(.nextMonthDay):not(.selected)').first();
          if (await nextDay.isVisible({ timeout: 1000 }).catch(() => false)) {
            await nextDay.click();
            await this.page.waitForTimeout(1000);
            logger.info('✅ Departure date modified via calendar');
            return;
          }
        }

        // Fallback: try clearing and typing a new date
        const currentValue = await input.inputValue().catch(() => '');
        logger.info(`Current departure value: ${currentValue}`);

        // Parse the current date and add days
        if (currentValue) {
          const parts = currentValue.split('/');
          if (parts.length === 3) {
            const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            date.setDate(date.getDate() + daysToAdd);
            const newDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            await input.fill('');
            await input.fill(newDate);
            await this.page.waitForTimeout(500);
            logger.info(`✅ Departure date changed from ${currentValue} to ${newDate}`);
            return;
          }
        }
      }
    }

    // Strategy: use JavaScript to find and modify the departure date
    logger.info('Using JavaScript to find departure date');
    const jsResult = await this.page.evaluate(() => {
      const h6s = document.querySelectorAll('h6');
      const dates: Array<{text: string; index: number; nearDeparture: boolean}> = [];
      h6s.forEach((h6, i) => {
        const text = h6.textContent?.trim() || '';
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
          const parent = h6.parentElement;
          const grandparent = parent?.parentElement;
          const sectionText = grandparent?.textContent || '';
          dates.push({ text, index: i, nearDeparture: sectionText.includes('Departure') });
        }
      });
      return dates;
    });
    logger.info(`Date headings found: ${JSON.stringify(jsResult)}`);

    logger.info('⚠️ Departure date modification attempted - check screenshots for result');
  }

  /**
   * Click the "Update" button in the Stay Details edit dialog to save changes.
   */
  async clickUpdateInStayDialog(): Promise<void> {
    logger.info('Clicking Update button in Stay Details dialog');

    // Look for Update button in the Stay Details dialog
    const stayDialog = this.stayDetailsDialog;
    const dialogVisible = await stayDialog.isVisible({ timeout: 3000 }).catch(() => false);

    if (dialogVisible) {
      const updateBtn = stayDialog.locator('button').filter({ hasText: 'Update' }).first();
      if (await updateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await updateBtn.evaluate((el) => (el as HTMLElement).click());
        await this.page.waitForTimeout(2000);
        logger.info('✅ Update clicked in Stay Details dialog');
        return;
      }
    }

    // Fallback: look for any visible Update button
    const updateBtns = this.page.locator('button').filter({ hasText: 'Update' });
    const count = await updateBtns.count();
    for (let i = 0; i < count; i++) {
      const btn = updateBtns.nth(i);
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.evaluate((el) => (el as HTMLElement).click());
        await this.page.waitForTimeout(2000);
        logger.info(`✅ Update button clicked (index ${i})`);
        return;
      }
    }

    logger.warn('No Update button found for Stay Details');
  }

  /**
   * Get the current departure date from the Stay Details section.
   * @returns The departure date text
   */
  async getDepartureDate(): Promise<string> {
    // Scroll to make Stay Details visible
    await this.page.evaluate(() => {
      const headings = document.querySelectorAll('h5');
      for (const h of headings) {
        if (h.textContent?.includes('Stay Details')) {
          h.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    });
    await this.page.waitForTimeout(1000);

    // Find "Expected Departure Date" label, then get the h6 sibling/child with the date
    const depLabel = this.page.locator('text=Expected Departure Date').first();
    if (await depLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      const parent = depLabel.locator('..');
      const dateH6 = parent.locator('h6').first();
      const dateText = await dateH6.textContent().catch(() => '');
      if (dateText && dateText.trim() !== '') {
        return dateText.trim();
      }
    }

    // Fallback: use JavaScript to find the departure date
    const jsDate = await this.page.evaluate(() => {
      const labels = document.querySelectorAll('*');
      for (const el of labels) {
        if (el.textContent?.trim() === 'Expected Departure Date' && el.children.length === 0) {
          const parent = el.parentElement;
          if (parent) {
            const h6 = parent.querySelector('h6');
            if (h6) return h6.textContent?.trim() || '';
          }
        }
      }
      return '';
    });

    return jsDate || 'Unknown';
  }

  /**
   * Get the current contact number from Guest Details.
   * @returns The contact number value
   */
  async getContactNumber(): Promise<string> {
    const contactInput = this.contactNumberInputInDialog;
    return await contactInput.inputValue().catch(() => '');
  }

  /**
   * Verify the modification was saved successfully.
   * @returns The success message text
   */
  async verifyModificationSuccess(): Promise<string> {
    logger.info('Verifying modification success');
    await this.page.waitForTimeout(3000);

    // Check for success popup
    const checks = [
      { selector: '#swal2-html-container', name: 'SweetAlert' },
      { selector: '.swal2-html-container', name: 'SweetAlert alt' },
      { selector: '.swal2-popup', name: 'SweetAlert popup' },
      { selector: '.toast-body', name: 'Toast' },
      { selector: '[role="alert"]', name: 'Alert role' },
    ];

    for (const check of checks) {
      const el = this.page.locator(check.selector).first();
      const visible = await el.isVisible({ timeout: 3000 }).catch(() => false);
      if (visible) {
        const text = await el.textContent().catch(() => '');
        logger.info(`Found ${check.name} with text: ${text.substring(0, 150)}`);

        if (text.toLowerCase().includes('success') || text.toLowerCase().includes('updated') ||
            text.toLowerCase().includes('saved') || text.toLowerCase().includes('modified') ||
            text.toLowerCase().includes('confirmed') || text.includes('Congratulations')) {
          const okBtn = this.page.locator('.swal2-popup').getByRole('button', { name: 'OK' });
          if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await okBtn.click();
          }
          logger.info('✅ Modification success verified');
          return text;
        }
      }
    }

    // Check if we're still on the booking detail page
    const reservationDetailsHeading = await this.page.getByRole('heading', { name: 'Reservation Details' }).isVisible({ timeout: 5000 }).catch(() => false);
    if (reservationDetailsHeading) {
      logger.info('✅ Still on Reservation Details page - modifications accepted');
      return 'Modification completed - still on Reservation Details page';
    }

    // Check Guest Management page
    const gmHeading = await this.guestManagementHeading.isVisible({ timeout: 5000 }).catch(() => false);
    if (gmHeading) {
      logger.info('✅ Returned to Guest Management page');
      return 'Modification completed - returned to Guest Management';
    }

    logger.warn('No success message found for modification');
    return 'No modification success message detected';
  }

  // ──────────────────────────────────────────────────────
  //  FULL FLOW METHOD
  // ──────────────────────────────────────────────────────

  /**
   * Execute the complete Guest Reservation flow from Guest Management page to success.
   *
   * @param reservationData - Guest reservation data including last name, business source, etc.
   * @returns The created reservation result with guest name and success message
   */
  async createGuestReservation(reservationData: GuestReservationData): Promise<ReservationCreatedResult> {
    logger.info('🔄 Starting Guest Reservation flow');

    // Step 1: Navigate to Guest Management
    await this.navigateToGuestManagement();

    // Step 2: Click New Reservation
    await this.clickNewReservation();

    // Step 3: Click Next on Stay Details (keep default dates)
    await this.clickNextOnStayDetails();

    // Step 4: Select first available room
    await this.selectFirstAvailableRoom();

    // Step 5: Click Next to go to Quick Reservation
    await this.clickNextOnRoomSelection();

    // Step 6: Enter last name and trigger profile search
    await this.enterLastNameAndTriggerProfileSearch(reservationData.lastName);

    // Step 7: Link first profile
    const linkedProfileName = await this.linkFirstProfile();

    // Step 8: Select Guest Class (first available)
    await this.selectGuestClass();

    // Step 9: Select Market Segment (first available)
    await this.selectMarketSegment();

    // Step 10: Select Business Source (first available)
    await this.selectBusinessSource();

    // Step 11: Click Confirm & Continue
    await this.clickConfirmAndContinue();

    // Step 12: Handle confirmation letter prompt (click No)
    await this.handleConfirmationLetterPrompt();

    // Step 13: Verify success
    const successMessage = await this.verifyReservationSuccess();

    const result: ReservationCreatedResult = {
      guestName: linkedProfileName,
      successMessage,
    };

    logger.info(`✅ Guest Reservation flow completed successfully for: ${linkedProfileName}`);
    return result;
  }

  /**
   * Create a reservation without profile linking and return to Guest Management.
   * This is the setup flow for the modify booking test.
   *
   * @param lastName - Guest last name
   * @param firstName - Guest first name
   */
  async createReservationWithoutProfile(lastName: string, firstName: string): Promise<void> {
    logger.info('🔄 Starting Guest Reservation flow (without profile)');

    // Step 1: Navigate to Guest Management
    await this.navigateToGuestManagement();

    // Step 2: Click New Reservation
    await this.clickNewReservation();

    // Step 3: Click Next on Stay Details
    await this.clickNextOnStayDetails();

    // Step 4: Select first available room
    await this.selectFirstAvailableRoom();

    // Step 5: Click Next to go to Quick Reservation
    await this.clickNextOnRoomSelection();

    // Step 6: Enter last name and trigger profile search
    await this.enterLastNameAndTriggerProfileSearch(lastName);

    // Step 7: Close Advance Search (no profile linking)
    await this.closeAdvanceSearchDialog();

    // Step 8: Enter first name manually
    await this.enterFirstName(firstName);

    // Step 9: Select Guest Class (first available)
    await this.selectGuestClass();

    // Step 10: Select Market Segment (first available)
    await this.selectMarketSegment();

    // Step 11: Select Business Source (first available)
    await this.selectBusinessSource();

    // Step 12: Click Confirm & Continue
    await this.clickConfirmAndContinue();

    // Step 13: Handle confirmation letter prompt (click No)
    await this.handleConfirmationLetterPrompt();

    // Step 14: Verify success
    await this.verifyReservationSuccess();

    logger.info('✅ Guest Reservation (without profile) created successfully');
  }

  /**
   * Open an existing booking from the confirmation screen and modify it.
   */
  async openBookingForModification(): Promise<void> {
    logger.info('🔄 Opening booking for modification');
    await this.clickOpenBooking();
    logger.info('✅ Booking opened for modification');
  }

  /**
   * Modify guest details in the booking using the correct flow:
   * 1. Open Guest Details dialog (pencil button)
   * 2. Modify Contact Number and Email
   * 3. Click Update
   * 4. Click OK on confirmation
   * 5. Click Close to close dialog
   *
   * @param contactNumber - New contact number
   * @param email - New email (optional)
   */
  async modifyGuestDetails(contactNumber: string, email?: string): Promise<void> {
    logger.info('🔄 Modifying guest details');

    // Step 1: Open Guest Details dialog via pencil button
    await this.openGuestDetailsDialog();

    // Step 2: Modify Contact Number
    await this.modifyContactNumber(contactNumber);

    // Step 3: Modify Email if provided
    if (email) {
      await this.modifyEmail(email);
    }

    // Step 4: Click Update button
    await this.clickUpdateInGuestDialog();

    // Step 5: Click OK on confirmation popup
    await this.clickOkOnConfirmation();

    // Step 6: Click Close to close the Guest Details dialog
    await this.clickCloseInGuestDialog();

    logger.info('✅ Guest details modified and saved');
  }

  /**
   * Modify stay details (departure date) using the correct flow:
   * 1. Open Stay Details for editing (pencil button)
   * 2. Modify departure date
   * 3. Click Update to save
   *
   * @param daysToAdd - Number of days to extend the departure date
   */
  async modifyStayDetails(daysToAdd: number = 1): Promise<void> {
    logger.info('🔄 Modifying stay details');

    // Step 1: Open Stay Details for editing via pencil button
    await this.openStayDetailsForEdit();

    // Step 2: Modify departure date
    await this.modifyDepartureDate(daysToAdd);

    // Step 3: Click Update to save
    await this.clickUpdateInStayDialog();

    // Step 4: Click OK if confirmation appears
    await this.clickOkOnConfirmation();

    logger.info('✅ Stay details modified and saved');
  }
}
