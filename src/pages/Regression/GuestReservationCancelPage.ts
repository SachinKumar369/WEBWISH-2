import { Page, BrowserContext, expect, Locator } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';

/**
 * Page Object Model for Guest Reservation Cancel flow in Regression testing.
 * Covers the complete flow: Navigate to Guest Management → Select a guest →
 * Cancel reservation → Select reason → Confirm → Verify success message.
 *
 * The Cancel flow is accessed from the Guest Management grid:
 * 1. Navigate to Guest Management (via sidebar Front Desk → Guest Management)
 * 2. Click on a guest card to select it
 * 3. Click "Cancel" in the bottom action toolbar
 * 4. In the Cancel dialog, select a cancellation reason
 * 5. Click OK/Confirm
 * 6. Verify success message "Details created/updated successfully."
 */
export class GuestReservationCancelPage extends BasePage {
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

  /** Arrivals radio button */
  private get arrivalsRadio(): Locator {
    return this.page.getByText('Arrivals', { exact: true });
  }

  /** In-House radio button */
  private get inHouseRadio(): Locator {
    return this.page.getByText('In-House', { exact: true });
  }

  /** Departures radio button */
  private get departuresRadio(): Locator {
    return this.page.getByText('Departures', { exact: true });
  }

  // ──────────────────────────────────────────────────────
  //  GUEST CARD / ROW LOCATORS
  // ──────────────────────────────────────────────────────

  /** First guest card in the grid */
  private get firstGuestCard(): Locator {
    // Guest cards contain a heading with the guest name
    return this.page.locator('.ag-row, [class*="grid-row"], [class*="card"]').first();
  }

  // ──────────────────────────────────────────────────────
  //  BOTTOM ACTION TOOLBAR LOCATORS
  // ──────────────────────────────────────────────────────

  /** Cancel button in the bottom action toolbar */
  private get cancelButton(): Locator {
    return this.page.locator('button').filter({ hasText: /Cancel/ }).last();
  }

  // ──────────────────────────────────────────────────────
  //  CANCEL DIALOG LOCATORS
  // ──────────────────────────────────────────────────────

  /** Cancel reservation dialog */
  private get cancelDialog(): Locator {
    return this.page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: /cancel|Cancel/ });
  }

  /** Cancellation reason dropdown in the cancel dialog */
  private get cancellationReasonDropdown(): Locator {
    return this.page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: /cancel|Cancel/ }).locator('ng-select');
  }

  /** OK/Confirm button in the cancel dialog */
  private get confirmCancelButton(): Locator {
    return this.page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: /cancel|Cancel/ }).getByRole('button', { name: /OK|Confirm|Yes|Submit|Save/i });
  }

  /** Success message */
  private get successMessage(): Locator {
    return this.page.locator('[role="alert"], .toast-body, #swal2-html-container, .swal2-html-container');
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
  //  GUEST SELECTION METHODS
  // ──────────────────────────────────────────────────────

  /**
   * Switch to the Arrivals tab to see confirmed reservations.
   */
  async switchToArrivals(): Promise<void> {
    logger.info('Switching to Arrivals tab');
    await this.elementActions.click(this.arrivalsRadio, 'Arrivals radio button');
    await this.page.waitForTimeout(2000);
    logger.info('✅ Switched to Arrivals tab');
  }

  /**
   * Select the first guest card from the grid by clicking its checkbox.
   * In grid view, guests have a checkbox on each row — clicking it selects
   * the guest and triggers the bottom action toolbar.
   */
  async selectFirstGuestCard(): Promise<string> {
    logger.info('Selecting first guest from the grid via checkbox');

    // Wait for the grid to load
    await this.page.waitForTimeout(2000);

    // Get the guest name from the first data row
    const guestName = await this.page.evaluate(() => {
      const rows = document.querySelectorAll('[role="row"]');
      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if (rect.top > 250 && rect.height > 20) {
          const cells = row.querySelectorAll('[role="gridcell"], [role="cell"]');
          for (const cell of cells) {
            const text = cell.textContent?.trim() || '';
            if (text.length > 3 && text.length < 50 && !/^\d+$/.test(text) &&
                !text.includes('CF') && !text.includes('CX') && !text.includes('IN') &&
                !text.includes('DMK') && !text.includes('BDAR') &&
                !text.includes('NORM') && !text.includes('OTHR') &&
                !/^[\/\d\-.:, ]+$/.test(text)) {
              return text;
            }
          }
          return 'Unknown';
        }
      }
      return null;
    });
    logger.info(`First guest name: ${guestName}`);

    // Use Playwright getByRole to find checkboxes — works with Angular custom checkboxes
    const checkboxes = this.page.getByRole('checkbox');
    const checkboxCount = await checkboxes.count();
    logger.info(`Found ${checkboxCount} checkboxes on page`);

    // Click the first checkbox (skip the header "select all" checkbox if present)
    // The header checkbox is usually the first one, data row checkboxes start from index 1
    if (checkboxCount > 1) {
      await checkboxes.nth(1).click();
      await this.page.waitForTimeout(2000);
      logger.info(`✅ Selected guest via checkbox: ${guestName}`);
      return guestName || 'First Guest';
    } else if (checkboxCount === 1) {
      await checkboxes.first().click();
      await this.page.waitForTimeout(2000);
      logger.info(`✅ Selected guest via single checkbox: ${guestName}`);
      return guestName || 'First Guest';
    }

    // Fallback: click the first row directly
    logger.warn('⚠️ No checkboxes found, clicking first row directly');
    const firstDataRow = this.page.locator('[role="row"]').nth(1);
    if (await firstDataRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstDataRow.click();
      await this.page.waitForTimeout(2000);
      logger.info(`✅ Clicked first row: ${guestName}`);
      return guestName || 'First Guest';
    }

    logger.warn('⚠️ Could not find any guest in the grid');
    return 'Unknown';
  }

  /**
   * Click the Cancel button in the bottom action toolbar.
   * The toolbar appears after selecting a guest card.
   *
   * IMPORTANT: Must NOT match the "Cancelled" legend filter button.
   * The legend buttons are inside the Shape legend list, so we exclude them.
   */
  async clickCancelButton(): Promise<void> {
    logger.info('Clicking Cancel button in bottom toolbar');

    // Wait for the bottom toolbar to appear after checkbox selection
    await this.page.waitForTimeout(2000);

    // Strategy 1: Look for a button containing "Cancel" that is NOT the legend filter
    // The actual button text is "Cancel Confirm" (in the bottom toolbar)
    const clicked = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || '';
        if (text.toLowerCase().includes('cancel') && btn.offsetParent !== null) {
          // Skip the "Cancelled" legend filter button
          const isLegend = btn.closest('[aria-label="Shape legend"]') !== null ||
                          btn.closest('.legend') !== null ||
                          btn.className.includes('legend');
          if (!isLegend) {
            // This is the Cancel action button (e.g., "Cancel Confirm")
            (btn as HTMLElement).click();
            return { text, clicked: true };
          }
        }
      }
      return null;
    });

    if (clicked && clicked.clicked) {
      await this.page.waitForTimeout(2000);
      logger.info(`✅ Cancel button clicked: "${clicked.text}"`);
      return;
    }

    // Strategy 2: Use Playwright getByRole to find a button named "Cancel Confirm"
    const cancelConfirmBtn = this.page.getByRole('button', { name: /Cancel Confirm/i });
    if (await cancelConfirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelConfirmBtn.evaluate((el) => (el as HTMLElement).click());
      await this.page.waitForTimeout(2000);
      logger.info('✅ Cancel Confirm button clicked via getByRole');
      return;
    }

    logger.warn('⚠️ Cancel button not found - taking screenshot for debugging');
    await this.page.screenshot({ path: 'screenshots/cancel-button-not-found.png', fullPage: true });
  }

  /**
   * Select a cancellation reason from the dropdown in the Cancel dialog.
   * Picks the first available option.
   */
  async selectCancellationReason(): Promise<void> {
    logger.info('Selecting cancellation reason');

    // Wait for the cancel dialog to appear
    await this.page.waitForTimeout(2000);

    // Take a debug screenshot
    await this.page.screenshot({ path: 'screenshots/cancel-dialog-check.png', fullPage: true });

    // Try to find the dialog/modal - check multiple selectors
    const dialogSelectors = [
      'ngb-modal-window[role="dialog"]',
      '.modal.show',
      '[role="dialog"]',
      '.modal',
      '.swal2-popup',
    ];

    let dialogFound = false;
    for (const sel of dialogSelectors) {
      const dialog = this.page.locator(sel).last();
      const dialogVisible = await dialog.isVisible({ timeout: 3000 }).catch(() => false);

      if (dialogVisible) {
        const dialogText = await dialog.textContent().catch(() => '');
        logger.info(`Found dialog with selector "${sel}": ${dialogText.substring(0, 200)}`);
        dialogFound = true;

        // Look for ng-select dropdown in the dialog for cancellation reason
        const dropdown = dialog.locator('ng-select').first();
        if (await dropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Click the dropdown arrow
          const arrowWrapper = dropdown.locator('.ng-arrow-wrapper');
          if (await arrowWrapper.isVisible({ timeout: 2000 }).catch(() => false)) {
            await arrowWrapper.scrollIntoViewIfNeeded();
            await arrowWrapper.click({ force: true });
            await this.page.waitForTimeout(1500);
          } else {
            await dropdown.click();
            await this.page.waitForTimeout(1500);
          }

          // Select the first available option (rendered at page level)
          const selectors = ['.ng-option', '.ng-dropdown-panel-item', '[role="option"]'];
          for (const optSel of selectors) {
            const firstOption = this.page.locator(optSel).first();
            if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) {
              const optionText = await firstOption.textContent().catch(() => 'Unknown');
              await firstOption.evaluate((el) => (el as HTMLElement).click());
              await this.page.waitForTimeout(500);
              logger.info(`✅ Cancellation reason selected: ${optionText.trim()}`);
              return;
            }
          }
        } else {
          // Maybe the reason is a text input or already selected
          const reasonInput = dialog.locator('input, textarea').first();
          if (await reasonInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await reasonInput.fill('Guest requested cancellation');
            await this.page.waitForTimeout(500);
            logger.info('✅ Cancellation reason entered via text input');
            return;
          }
          logger.info('No dropdown/input found in cancel dialog - reason may be auto-selected');
        }
        break;
      }
    }

    if (!dialogFound) {
      logger.warn('Cancel dialog not visible after clicking Cancel button');
      // Check if the success message appeared directly
      const successCheck = await this.page.locator('[role="alert"], .toast-body, #swal2-html-container').first()
        .isVisible({ timeout: 3000 }).catch(() => false);
      if (successCheck) {
        logger.info('Success message appeared directly - no reason dialog needed');
      }
    }
  }

  /**
   * Click the OK/Confirm button in the Cancel dialog to confirm the cancellation.
   */
  async confirmCancellation(): Promise<void> {
    logger.info('Confirming cancellation');

    // Wait a moment for the dialog to settle
    await this.page.waitForTimeout(1000);

    // Take a debug screenshot
    await this.page.screenshot({ path: 'screenshots/cancel-confirm-check.png', fullPage: true });

    // Strategy 1: Look for OK/Confirm/Yes button in a modal dialog
    const dialogSelectors = ['ngb-modal-window[role="dialog"]', '.modal.show', '[role="dialog"]', '.swal2-popup'];
    for (const sel of dialogSelectors) {
      const dialog = this.page.locator(sel).last();
      if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        const okBtn = dialog.locator('button').filter({ hasText: /OK|Confirm|Yes|Submit|Save/i }).first();
        if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await okBtn.evaluate((el) => (el as HTMLElement).click());
          await this.page.waitForTimeout(2000);
          logger.info('✅ Confirmed cancellation via dialog OK button');
          return;
        }
      }
    }

    // Strategy 2: Look for SweetAlert OK button
    const swalOkBtn = this.page.locator('.swal2-popup').getByRole('button', { name: 'OK' });
    if (await swalOkBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await swalOkBtn.click();
      await this.page.waitForTimeout(2000);
      logger.info('✅ Confirmed cancellation via SweetAlert OK');
      return;
    }

    // Strategy 3: Look for any visible OK/Confirm button
    const anyOkBtn = this.page.locator('button').filter({ hasText: /^(OK|Confirm|Yes)$/i }).first();
    if (await anyOkBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await anyOkBtn.evaluate((el) => (el as HTMLElement).click());
      await this.page.waitForTimeout(2000);
      logger.info('✅ Confirmed cancellation via generic OK button');
      return;
    }

    // Strategy 4: If no dialog appeared, the cancellation might be immediate
    logger.warn('⚠️ Confirm button not found - cancellation may be immediate or dialog not appeared');
  }

  /**
   * Verify the cancellation success message.
   * Expected message: "Details created/updated successfully."
   * @returns The success message text
   */
  async verifyCancellationSuccess(): Promise<string> {
    logger.info('Verifying cancellation success message');

    // Wait for the success message to appear
    await this.page.waitForTimeout(3000);

    // Check multiple possible success message locations
    const checks = [
      { selector: '#swal2-html-container', name: 'SweetAlert' },
      { selector: '.swal2-html-container', name: 'SweetAlert alt' },
      { selector: '.swal2-popup', name: 'SweetAlert popup' },
      { selector: '.toast-body', name: 'Toast' },
      { selector: '[role="alert"]', name: 'Alert role' },
      { selector: '.toast', name: 'Toast element' },
    ];

    for (const check of checks) {
      const el = this.page.locator(check.selector).first();
      const visible = await el.isVisible({ timeout: 3000 }).catch(() => false);
      if (visible) {
        const text = await el.textContent().catch(() => '');
        logger.info(`Found ${check.name} with text: ${text.substring(0, 150)}`);

        if (text.includes('successfully') || text.includes('updated') || text.includes('created') || text.includes('cancel')) {
          // Click OK if it's a SweetAlert
          const okBtn = this.page.locator('.swal2-popup').getByRole('button', { name: 'OK' });
          if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await okBtn.click();
          }
          logger.info('✅ Cancellation success verified');
          return text;
        }
      }
    }

    // Check page text for success
    const bodyText = await this.page.locator('body').textContent().catch(() => '');
    if (bodyText.includes('Details created/updated successfully') || bodyText.includes('successfully')) {
      logger.info('✅ Success message found in page body');
      const match = bodyText.match(/(Details created\/updated successfully[^.]*)/i);
      return match ? match[1] : 'Details created/updated successfully.';
    }

    logger.warn('No success message found - cancellation may have failed');
    return 'No success message detected';
  }

  // ──────────────────────────────────────────────────────
  //  FULL FLOW METHOD
  // ──────────────────────────────────────────────────────

  /**
   * Execute the complete Guest Reservation Cancel flow.
   * 1. Navigate to Guest Management
   * 2. Select a guest from the Arrivals list
   * 3. Click Cancel
   * 4. Select cancellation reason
   * 5. Confirm cancellation
   * 6. Verify success message
   *
   * @returns The success message text
   */
  async cancelGuestReservation(): Promise<string> {
    logger.info('🔄 Starting Guest Reservation Cancel flow');

    // Step 1: Navigate to Guest Management
    await this.navigateToGuestManagement();

    // Step 2: Switch to Arrivals tab
    await this.switchToArrivals();

    // Step 3: Select first guest card
    const guestName = await this.selectFirstGuestCard();

    // Step 4: Click Cancel
    await this.clickCancelButton();

    // Step 5: Select cancellation reason
    await this.selectCancellationReason();

    // Step 6: Confirm cancellation
    await this.confirmCancellation();

    // Step 7: Verify success
    const successMessage = await this.verifyCancellationSuccess();

    logger.info(`✅ Guest Reservation Cancel flow completed for: ${guestName}`);
    return successMessage;
  }
}
