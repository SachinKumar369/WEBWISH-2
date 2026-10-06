import { Page, BrowserContext, Locator } from '@playwright/test';
import { GuestReservationPage } from './GuestReservationPage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';

/** Result of opening a reservation from the Guest Management grid */
export interface OpenedReservationInfo {
  /** Confirmation number shown on the Reservation Details page (e.g. "100001339") */
  confirmationNo: string;
  /** Guest last name captured from the Guest Details section */
  lastName: string;
  /** Reservation id shown in the grid / "Being copy From <id>" indicator (e.g. "101586250702") */
  reservationId: string;
}

/** Result of verifying the Copy Details (Quick Reservation) dialog */
export interface CopyDialogInfo {
  /** Reservation id shown in the "Being copy From <id>" indicator */
  copyFromId: string;
  /** Prefilled last name inside the copy dialog */
  lastName: string;
  /** Whether the Confirm radio is preselected */
  confirmSelected: boolean;
}

/**
 * Page Object Model for the "Copy Details" reservation flow (Regression).
 *
 * Extends GuestReservationPage — navigation (sidebar → Guest Management),
 * the protected Quick Reservation dialog locator, Confirm & Continue,
 * the confirmation-letter prompt handler and Open Booking are all reused.
 * This class only adds the copy-details behaviour that was verified live:
 *
 *   1. Guest Management grid → click the row action button titled "Open"
 *      to open an existing (CONFIRMED) reservation.
 *   2. On the "Reservation Details" page, click **More** in the toolbar →
 *      a dropdown opens with: Checkin / **Copy Details** / Link Group /
 *      View Cashiering.
 *   3. **Copy Details** opens the Quick Reservation dialog pre-filled from
 *      the source reservation, with:
 *        - "Being copy From <source reservation id>" indicator
 *        - **Confirm** radio preselected (Waitlist / Confirm / Hold / Walkin)
 *        - Guest Details, Stay Details, Bill Summary and Payment Details
 *          copied from the source booking
 *        - footer countdown "Availability release after: N seconds."
 *   4. **Confirm & Continue** does NOT submit directly — a **Copy Options**
 *      dialog opens with "Select All" (checked) plus:
 *        Amenities & Membership Details, Billing Details, Guest Notes,
 *        Guest Options, Personal Details, Police & Sponsor Details,
 *        Apply Discount. Click **Ok** to submit the copy.
 *   5. The confirmation-letter prompt ("Do you want to send the confirmation
 *      letter on save?") appears — click **No** (handled by the parent class).
 *   6. Success alert (inside the dialog):
 *        "Congratulations, your reservation for <Guest> has been ... successfully"
 *      a NEW confirmation number is shown as "Guest Details <new conf no>"
 *      and the dialog offers "󰈈 Open Booking" / "󰐪 Print Registration" /
 *      "󰜱 Back".
 */
export class GuestReservationCopyPage extends GuestReservationPage {
  /** ElementActions instance for this subclass (parent's instance is private) */
  private readonly actions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.actions = new ElementActions(page);
  }

  // ──────────────────────────────────────────────────────
  //  GUEST MANAGEMENT GRID LOCATORS
  // ──────────────────────────────────────────────────────

  /** "Open" action buttons on Guest Management grid rows (title="Open") */
  private get gridOpenButtons(): Locator {
    return this.page.locator('button[title="Open"]');
  }

  /** Processing loader text shown when a request is stuck
   *  (named differently from the parent's private processingLoader getter) */
  private get processingLoaderText(): Locator {
    return this.page.getByText('We are processing your request');
  }

  // ──────────────────────────────────────────────────────
  //  RESERVATION DETAILS PAGE LOCATORS
  // ──────────────────────────────────────────────────────

  /** "Reservation Details" heading on the opened booking page */
  private get reservationDetailsHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Reservation Details' });
  }

  /** "More" toolbar button — scoped to the Reservation Details toolbar
   *  (a duplicate More button can render elsewhere on the page).
   *  Fallback: the button's accessible name can render EMPTY after modal
   *  close/re-render (verified live) — match by visible text as well. */
  private get moreButton(): Locator {
    return this.reservationDetailsHeading
      .locator('..')
      .getByRole('button', { name: 'More' })
      .or(this.reservationDetailsHeading.locator('..').locator('button').filter({ hasText: 'More' }))
      .first();
  }

  /** "Copy Details" item inside the More dropdown menu */
  private get copyDetailsMenuItem(): Locator {
    return this.page
      .getByRole('menuitem', { name: 'Copy Details' })
      .or(this.page.locator('.dropdown-item').filter({ hasText: 'Copy Details' }))
      .first();
  }

  /** "Guest Details <conf no>" heading on the details page.
   *  Relaxed regex (no anchors) — the heading text has a trailing space and
   *  the conf no arrives with the async data load. */
  private get guestDetailsHeadingWithConfNo(): Locator {
    return this.page.locator('h5').filter({ hasText: /Guest Details\s+\d+/ }).first();
  }

  /** Last Name textbox in the Guest Details section.
   *  The wrapper div's textContent is exactly "Last Name*" (input values are
   *  not part of textContent), so the anchored regex matches the wrapper and
   *  getByRole('textbox') resolves the input inside it. Verified live. */
  private get lastNameInputOnDetailsPage(): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: /^Last Name\*$/ })
      .getByRole('textbox')
      .first();
  }

  // ──────────────────────────────────────────────────────
  //  COPY DIALOG (QUICK RESERVATION) LOCATORS
  // ──────────────────────────────────────────────────────

  /** "Being copy From <id>" indicator inside the Quick Reservation dialog */
  private get copyFromIndicator(): Locator {
    return this.quickReservationDialog.getByText(/Being copy From/i);
  }

  /** Confirm radio — preselected when the copy dialog opens */
  private get confirmRadioInCopyDialog(): Locator {
    return this.quickReservationDialog.getByRole('radio', { name: 'Confirm' });
  }

  /** Last Name input inside the copy dialog (same #lst_nme field as the standard flow) */
  private get lastNameInputInCopyDialog(): Locator {
    return this.quickReservationDialog.locator('#lst_nme').getByRole('textbox');
  }

  /** "Guest Details <conf no>" heading inside the dialog (source before success, new after).
   *  Relaxed regex — heading text carries a trailing space. */
  private get guestDetailsHeadingInDialog(): Locator {
    return this.quickReservationDialog.locator('h5').filter({ hasText: /Guest Details\s+\d+/ }).first();
  }

  /** "Open Booking" button shown inside the dialog after a successful copy.
   *  Fallback covers renderings where the accessible name is icon-only. */
  private get openBookingInCopyDialog(): Locator {
    return this.quickReservationDialog
      .getByRole('button', { name: /Open Booking/ })
      .or(this.quickReservationDialog.locator('button').filter({ hasText: 'Open Booking' }))
      .first();
  }

  // ──────────────────────────────────────────────────────
  //  COPY OPTIONS DIALOG LOCATORS
  // ──────────────────────────────────────────────────────

  /** Copy Options dialog (opens after Confirm & Continue in the copy flow) */
  private get copyOptionsDialog(): Locator {
    return this.page
      .locator('ngb-modal-window[role="dialog"], [role="dialog"]')
      .filter({ hasText: 'Copy Options' })
      .last();
  }

  /** "Select All" checkbox inside the Copy Options dialog */
  private get selectAllCheckboxInCopyOptions(): Locator {
    return this.copyOptionsDialog.getByRole('checkbox', { name: 'Select All' });
  }

  /** "Ok" button inside the Copy Options dialog */
  private get okButtonInCopyOptions(): Locator {
    return this.copyOptionsDialog.getByRole('button', { name: 'Ok' });
  }

  // ──────────────────────────────────────────────────────
  //  SUCCESS LOCATORS
  // ──────────────────────────────────────────────────────

  /** Success alert shown inside the dialog after the copy completes */
  private get copySuccessAlert(): Locator {
    return this.page.locator('[role="alert"]').filter({ hasText: /Congratulations/i }).first();
  }

  // ──────────────────────────────────────────────────────
  //  METHODS
  // ──────────────────────────────────────────────────────

  /**
   * Open the first reservation from the Guest Management grid by clicking
   * its "Open" row-action button, then wait for the Reservation Details page.
   *
   * MULTI-GUEST bookings (green "M" badge near Guest Details) hide the
   * More/Log/Sections toolbar on the summary view (URL …/SE/<conf no>) —
   * verified live. In that case drill into the guest via Stay Details
   * **⋮ three-dots → Reservation Details** (per-guest view, URL …/DE/<id>)
   * which has the full toolbar, then the More → Copy Details flow proceeds.
   * @returns Source reservation info (confirmation no, last name, reservation id)
   */
  async openFirstReservation(): Promise<OpenedReservationInfo> {
    logger.info('Opening first reservation from Guest Management grid');

    // Wait for any loader overlay and for the grid rows to render
    await this.page.locator('.loader-overlay').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    const openBtn = this.gridOpenButtons.first();
    await openBtn.waitFor({ state: 'visible', timeout: 30000 });

    // JS click — grid action icons are often intercepted by overlays
    await openBtn.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(2000);

    // Wait for the Reservation Details page header
    await this.reservationDetailsHeading.waitFor({ state: 'visible', timeout: 30000 });
    logger.info('✅ Reservation Details page header loaded');

    // The More button is absent on MULTI-GUEST (M badge) summary views —
    // drill into a guest via Stay Details ⋮ → Reservation Details (DE/ view)
    let hasMore = await this.waitForMoreButton(15000);

    if (!hasMore && (await this.hasMultiGuestBadge())) {
      logger.info('Multi-guest booking (M badge) — drilling into guest via ⋮ → Reservation Details');
      await this.openStayDotsMenu();
      await this.clickReservationDetailsInDotsMenu();
      // DE-view toolbar renders with the async data load — can exceed 60s on
      // this slow environment (verified live), so allow up to 120s
      hasMore = await this.waitForMoreButton(120000);
    }

    if (!hasMore) {
      throw new Error(
        'More button not available on this reservation even after multi-guest drill-down — cannot open Copy Details'
      );
    }

    // CRITICAL: Guest Details data loads ASYNC and can take 10–40s on this
    // property — the config actionTimeout is only 10s, so wait explicitly
    // with a long timeout before extracting anything (re-wait after the
    // drill-down navigation as well).
    await this.guestDetailsHeadingWithConfNo.waitFor({ state: 'visible', timeout: 90000 });
    await this.processingLoaderText.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});

    const confText = ((await this.guestDetailsHeadingWithConfNo.textContent()) ?? '').trim();
    const confirmationNo = (confText.match(/Guest Details\s+(\d+)/) ?? ['', ''])[1] ?? '';

    // Last Name via the verified wrapper-div locator (auto-waits for the field)
    await this.lastNameInputOnDetailsPage.waitFor({ state: 'visible', timeout: 60000 });
    const lastName = ((await this.lastNameInputOnDetailsPage.inputValue().catch(() => '')) ?? '').trim();

    // Reservation id from the pure-digit h5 under Stay Details (best-effort)
    const reservationId = await this.readReservationIdFromStayDetails();

    logger.info(
      `✅ Source reservation opened — conf no: ${confirmationNo}, last name: ${lastName}, id: ${reservationId}`
    );
    return { confirmationNo, lastName, reservationId };
  }

  // ──────────────────────────────────────────────────────
  //  METHODS — MULTI-GUEST (M BADGE) DRILL-DOWN
  // ──────────────────────────────────────────────────────

  /**
   * Whether the current Reservation Details view shows the green **M**
   * (multi-guest) badge — span.demo-avatar with text "M" near Guest Details.
   */
  private async hasMultiGuestBadge(): Promise<boolean> {
    return this.page.evaluate(() =>
      Array.from(document.querySelectorAll('span.demo-avatar')).some(
        (s) => s.offsetParent !== null && (s.textContent || '').trim() === 'M'
      )
    );
  }

  /**
   * Poll until the More toolbar button is available — checks BOTH the
   * locator (role-name + hasText fallback) and the raw DOM, because the
   * button's accessible name can render EMPTY and toolbar/data rendering
   * can take over a minute on this environment (both verified live).
   */
  private async waitForMoreButton(timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const viaLocator = await this.moreButton
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      if (viaLocator) return true;

      const viaDom = await this.page.evaluate(() =>
        Array.from(document.querySelectorAll('button')).some(
          (b) =>
            b.offsetParent !== null &&
            /more/i.test((b.textContent || '') + (b.getAttribute('aria-label') || '') + (b.getAttribute('title') || ''))
        )
      );
      if (viaDom) {
        logger.info('More button detected via raw DOM check');
        return true;
      }

      await this.page.waitForTimeout(1000);
    }
    return false;
  }

  /**
   * Open the ⋮ (three-dots) dropdown next to the CONFIRMED badge in Stay
   * Details. Verified live: the menu starts with "Reservation Details" and
   * also contains the section list (View Cashiering, …, Sharers, …).
   */
  async openStayDotsMenu(): Promise<void> {
    logger.info('Opening the ⋮ stay menu next to the CONFIRMED badge');

    await this.page.evaluate(() => {
      const toggles = Array.from(
        document.querySelectorAll('[ngbdropdowntoggle], [data-bs-toggle="dropdown"]')
      ).filter((t) => t.offsetParent !== null);
      for (const t of toggles) {
        let p = t.parentElement;
        for (let d = 0; d < 6 && p; d++) {
          const text = p.textContent || '';
          if (text.includes('CONFIRMED') && text.includes('Reservation Details')) {
            (t as HTMLElement).click();
            return;
          }
          p = p.parentElement;
        }
      }
      // Fallback: first visible dropdown toggle
      if (toggles[0]) (toggles[0] as HTMLElement).click();
    });

    // Wait for the menu with the Reservation Details item
    const deadline = Date.now() + 15000;
    let ready = false;
    while (Date.now() < deadline && !ready) {
      ready = await this.page.evaluate(() =>
        Array.from(document.querySelectorAll('.dropdown-menu.show, [role="menu"]')).some(
          (m) =>
            m.offsetParent !== null &&
            Array.from(m.querySelectorAll('button, a, [role="menuitem"]')).some(
              (i) => (i.textContent || '').trim() === 'Reservation Details'
            )
        )
      );
      if (!ready) await this.page.waitForTimeout(400);
    }
    if (!ready) {
      throw new Error('⋮ stay menu did not open — "Reservation Details" item not visible');
    }
    logger.info('✅ ⋮ stay menu opened — Reservation Details item visible');
  }

  /**
   * Click "Reservation Details" in the ⋮ stay menu — navigates to the
   * per-guest view (URL …/DE/<reservation id>) whose toolbar HAS More.
   */
  async clickReservationDetailsInDotsMenu(): Promise<void> {
    logger.info('Clicking Reservation Details in the ⋮ stay menu');

    await this.page.evaluate(() => {
      const menus = Array.from(document.querySelectorAll('.dropdown-menu.show, [role="menu"]')).filter(
        (m) => m.offsetParent !== null
      );
      for (const m of menus) {
        const item = Array.from(m.querySelectorAll('button, a, [role="menuitem"]')).find(
          (i) => (i.textContent || '').trim() === 'Reservation Details'
        );
        if (item) {
          (item as HTMLElement).click();
          return;
        }
      }
    });

    // Navigation: URL switches from …/SE/<conf no> to …/DE/<reservation id>
    await this.page
      .waitForURL((url) => url.href.includes('/DE/'), { timeout: 30000 })
      .catch(() => logger.warn('URL did not switch to /DE/ — continuing (More-button wait will confirm)'));
    logger.info('✅ Per-guest Reservation Details view opened');
  }

  /**
   * Click the "More" toolbar button on the Reservation Details page
   * and wait for the dropdown menu (Copy Details item) to appear.
   */
  async clickMoreButton(): Promise<void> {
    logger.info('Clicking More button on Reservation Details page');

    const moreVisible = await this.moreButton.isVisible({ timeout: 10000 }).catch(() => false);
    if (moreVisible) {
      await this.moreButton.evaluate((el) => (el as HTMLElement).click());
    } else {
      // Fallback: first visible More button on the page
      const anyMore = this.page.getByRole('button', { name: 'More' }).first();
      await anyMore.evaluate((el) => (el as HTMLElement).click());
    }

    // The More dropdown renders at BODY level and can take >10s to appear on
    // this slow environment — poll up to 30s via locator AND raw DOM.
    const deadline = Date.now() + 30000;
    let found = false;
    while (Date.now() < deadline) {
      found = await this.copyDetailsMenuItem.isVisible({ timeout: 1000 }).catch(() => false);
      if (found) break;
      found = await this.copyDetailsMenuItemExistsInDom();
      if (found) break;
      await this.page.waitForTimeout(500);
    }
    if (!found) {
      throw new Error('More dropdown did not open — "Copy Details" menu item not visible');
    }
    logger.info('✅ More dropdown opened — Copy Details item visible');
  }

  /** Raw-DOM check for the Copy Details menu item (menu renders at body level) */
  private async copyDetailsMenuItemExistsInDom(): Promise<boolean> {
    return this.page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[role="menuitem"], .dropdown-item'));
      return items.some(
        (el) => (el.textContent || '').trim() === 'Copy Details' && (el as HTMLElement).offsetParent !== null
      );
    });
  }

  /**
   * Click "Copy Details" in the More dropdown and wait for the
   * Quick Reservation (copy) dialog with the "Being copy From" indicator.
   * @returns The source reservation id shown in the "Being copy From <id>" indicator
   */
  async clickCopyDetails(): Promise<string> {
    logger.info('Clicking Copy Details menu item');

    // Locator click with raw-DOM fallback (body-level menu items can be flaky)
    const clicked = await this.copyDetailsMenuItem
      .evaluate((el) => {
        (el as HTMLElement).click();
        return true;
      })
      .catch(() => false);
    if (!clicked) {
      await this.page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('[role="menuitem"], .dropdown-item'));
        const target = items.find((el) => (el.textContent || '').trim() === 'Copy Details');
        if (target) (target as HTMLElement).click();
      });
    }

    // Wait for the Quick Reservation dialog to open in copy mode
    await this.quickReservationDialog.waitFor({ state: 'visible', timeout: 30000 });
    await this.copyFromIndicator.waitFor({ state: 'visible', timeout: 30000 });
    logger.info('✅ Quick Reservation (copy) dialog opened');

    const copyFromText = (await this.copyFromIndicator.textContent()) ?? '';
    const copyFromId = (copyFromText.match(/(\d+)/) ?? [''])[0];
    logger.info(`Copy dialog indicator: ${copyFromText.trim()} → reservation id: ${copyFromId}`);
    return copyFromId;
  }

  /**
   * Verify the copy dialog is prefilled from the source reservation:
   * "Being copy From <id>" indicator, non-empty Last Name, Confirm radio selected.
   */
  async verifyCopyDialogPrefilled(): Promise<CopyDialogInfo> {
    logger.info('Verifying copy dialog is prefilled from source reservation');

    const copyFromText = (await this.copyFromIndicator.textContent().catch(() => '')) ?? '';
    const copyFromId = (copyFromText.match(/(\d+)/) ?? [''])[0];

    const lastName = ((await this.lastNameInputInCopyDialog.inputValue().catch(() => '')) ?? '').trim();
    const confirmSelected = await this.confirmRadioInCopyDialog.isChecked().catch(() => false);

    logger.info(
      `Copy dialog — from: ${copyFromId}, last name: ${lastName}, confirm selected: ${confirmSelected}`
    );
    return { copyFromId, lastName, confirmSelected };
  }

  /**
   * Handle the Copy Options dialog that opens after Confirm & Continue:
   * ensure "Select All" is checked, then click **Ok** to submit the copy.
   */
  async handleCopyOptionsDialog(): Promise<void> {
    logger.info('Handling Copy Options dialog');

    // Wait for the Copy Options dialog
    const dialogVisible = await this.copyOptionsDialog
      .waitFor({ state: 'visible', timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    if (!dialogVisible) {
      logger.warn('Copy Options dialog did not appear — may not be shown for this configuration');
      return;
    }

    // Ensure Select All is checked (all copy options selected)
    const allChecked = await this.selectAllCheckboxInCopyOptions.isChecked().catch(() => false);
    if (!allChecked) {
      logger.info('Select All not checked — clicking it to select every copy option');
      const selectAllLabel = this.copyOptionsDialog.locator('label').filter({ hasText: 'Select All' }).first();
      const labelVisible = await selectAllLabel.isVisible({ timeout: 3000 }).catch(() => false);
      if (labelVisible) {
        await selectAllLabel.evaluate((el) => (el as HTMLElement).click());
      } else {
        await this.selectAllCheckboxInCopyOptions.evaluate((el) => (el as HTMLElement).click());
      }
      await this.page.waitForTimeout(500);
    } else {
      logger.info('Select All already checked — all copy options selected');
    }

    // Click Ok — JS click since modal buttons are often intercepted
    await this.okButtonInCopyOptions.evaluate((el) => (el as HTMLElement).click());
    logger.info('✅ Copy Options dialog submitted (Ok clicked)');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Override: handle the confirmation letter prompt in the COPY flow.
   * This prompt is a custom SweetAlert-styled dialog whose Yes/No/Cancel
   * buttons are NOT inside `.swal2-popup` (verified live) — the parent's
   * `.swal2-popup`-scoped click times out, so search the visible containers
   * for the prompt text and click "No" inside the matching container.
   */
  async handleConfirmationLetterPrompt(): Promise<void> {
    logger.info('Handling confirmation letter prompt (copy flow override)');

    // Poll up to 30s — the prompt appears after the copy submit (can be slow)
    const deadline = Date.now() + 30000;
    let handled = false;
    while (Date.now() < deadline && !handled) {
      handled = await this.page.evaluate(() => {
        const containers = Array.from(
          document.querySelectorAll('.swal2-popup, .swal2-container, [role="dialog"], [role="alertdialog"]')
        );
        for (const container of containers) {
          const text = container.textContent || '';
          if (text.includes('confirmation letter')) {
            const noBtn = Array.from(container.querySelectorAll('button')).find(
              (b) => (b.textContent || '').trim() === 'No'
            );
            if (noBtn && (noBtn as HTMLElement).offsetParent !== null) {
              (noBtn as HTMLElement).click();
              return true;
            }
          }
        }
        return false;
      });
      if (!handled) {
        await this.page.waitForTimeout(500);
      }
    }

    if (handled) {
      logger.info('✅ Clicked No on confirmation letter prompt');
    } else {
      logger.warn('Confirmation letter prompt not found — may be auto-accepted or not shown');
    }
    await this.page.waitForTimeout(1000);
  }

  /**
   * Verify the copy success alert inside the dialog.
   * @returns The success message text
   */
  async verifyCopySuccess(): Promise<string> {
    logger.info('Verifying copy-details success message');

    await this.copySuccessAlert.waitFor({ state: 'visible', timeout: 60000 });
    const message = ((await this.copySuccessAlert.textContent()) ?? '').trim();
    logger.info(`✅ Copy success message: ${message}`);
    return message;
  }

  /**
   * Extract the NEW confirmation number shown in the copy dialog after success
   * ("Guest Details <conf no>" heading — scoped to the dialog so the source
   * booking page behind it is not matched).
   */
  async extractNewConfirmationNumber(): Promise<string> {
    const confNo = await this.extractConfirmationNoFromHeading(this.guestDetailsHeadingInDialog);
    logger.info(`New confirmation number from copy dialog: ${confNo}`);
    return confNo;
  }

  /**
   * Click "󰈈 Open Booking" inside the success dialog to open the NEW booking,
   * then read its confirmation number and guest last name.
   * @returns New booking confirmation number
   */
  async openBookingFromCopyDialog(): Promise<string> {
    logger.info('Opening the NEW booking from the copy success dialog');

    // Auto-wait for the button — isVisible() returns immediately in this
    // Playwright version and can catch the dialog mid-animation (false negative)
    const btnVisible = await this.openBookingInCopyDialog
      .waitFor({ state: 'visible', timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    if (!btnVisible) {
      throw new Error('Open Booking button not visible in the copy success dialog');
    }

    // The new conf no is read from the dialog FIRST (dialog-scoped, reliable),
    // then we wait for the URL to switch to …/SE/<new conf no>
    const dialogConfNo = await this.extractNewConfirmationNumber();
    await this.openBookingInCopyDialog.evaluate((el) => (el as HTMLElement).click());

    if (dialogConfNo) {
      await this.page
        .waitForURL((url) => url.href.includes(`/SE/${dialogConfNo}`), { timeout: 60000 })
        .catch(() => logger.warn('URL did not switch to the new booking conf no — continuing'));
    }

    // Wait for the new booking's details data (async — long timeout)
    await this.guestDetailsHeadingWithConfNo.waitFor({ state: 'visible', timeout: 90000 });
    await this.processingLoaderText.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});

    const confText = ((await this.guestDetailsHeadingWithConfNo.textContent()) ?? '').trim();
    const newConfNo = (confText.match(/Guest Details\s+(\d+)/) ?? ['', dialogConfNo])[1] ?? dialogConfNo;

    await this.lastNameInputOnDetailsPage.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
    const newLastName = await this.readLastNameFromGuestDetailsSection();
    logger.info(`✅ New booking opened — conf no: ${newConfNo}, last name: ${newLastName}`);
    return newConfNo;
  }

  /**
   * Read the guest Last Name value from the Guest Details section
   * of the currently open Reservation Details page.
   * Uses the verified wrapper-div locator (the label has child elements, so a
   * leaf-text evaluate never matches on this page).
   */
  async readLastNameFromGuestDetailsSection(): Promise<string> {
    await this.lastNameInputOnDetailsPage.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
    const value = await this.lastNameInputOnDetailsPage.inputValue().catch(() => '');
    return (value ?? '').trim();
  }

  /**
   * Extract the confirmation number from a "Guest Details <conf no>" heading.
   */
  private async extractConfirmationNoFromHeading(heading: Locator): Promise<string> {
    const text = ((await heading.textContent().catch(() => '')) ?? '').trim();
    const match = text.match(/Guest Details\s+(\d+)/);
    return match ? match[1] : '';
  }

  /**
   * Read the reservation id from the pure-digit h5 under Stay Details
   * (e.g. "101586250702") on the currently open Reservation Details page.
   * Best-effort — returns '' if not found.
   */
  private async readReservationIdFromStayDetails(): Promise<string> {
    try {
      // Collect h5s containing a long digit run, then pick the purely numeric one
      // (hasText regex cannot be anchored reliably — whitespace breaks ^...$)
      const headings = this.page.locator('h5').filter({ hasText: /\b\d{8,}\b/ });
      const texts = await headings.allTextContents();
      const stayId = texts.map((t) => t.trim()).find((t) => /^\d{8,}$/.test(t)) ?? '';
      logger.info(`Reservation id from Stay Details: ${stayId}`);
      return stayId;
    } catch (error) {
      logger.warn(`Could not read reservation id from Stay Details: ${error}`);
      return '';
    }
  }
}
