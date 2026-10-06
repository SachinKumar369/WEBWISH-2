import { Page, BrowserContext, Locator } from '@playwright/test';
import { GuestReservationPage } from './GuestReservationPage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';

/** Result of opening a reservation from the Guest Management grid */
export interface OpenedReservation {
  /** Confirmation number shown on the Reservation Details page (e.g. "100001339") */
  confirmationNo: string;
  /** Guest last name captured from the Guest Details section */
  lastName: string;
  /** Reservation id from the Stay Details section (e.g. "101586250702") */
  reservationId: string;
}

/** Data used to fill the Add Sharers form */
export interface SharerData {
  /** Last Name* — required */
  lastName: string;
  /** First Name — optional */
  firstName?: string;
  /** Arrival time (HH:MM) — required by validation; defaults to '12:00' */
  arrivalTime?: string;
  /** Departure time (HH:MM) — required by validation; defaults to '11:30' */
  departureTime?: string;
}

/** Data used to modify an existing sharer's Guest Details */
export interface SharerModifyData {
  /** New Contact Number (mobile) — editable in the dialog */
  contactNumber: string;
  /** New Email Id — READONLY for sharers by app design; best-effort JS-set */
  email?: string;
}

/** Result of modifying an existing sharer */
export interface SharerModifyResult {
  /** Success popup message ("Details created/updated successfully.") */
  successMessage: string;
  /** Whether the new contact number is visible on the page after save */
  contactPersisted: boolean;
}

/** A reservation that ALREADY has at least one sharer */
export interface ExistingSharerReservation {
  /** Confirmation number of the reservation */
  confirmationNo: string;
  /** Primary guest last name */
  lastName: string;
  /** Reservation id from Stay Details */
  reservationId: string;
  /** First existing sharer's name from the grid (e.g. "SHR979794 RAHUL") */
  sharerName: string;
}

/**
 * Page Object Model for SHARER management in Guest Management (Regression).
 *
 * Verified live against the dev environment (WEBWE). Flow:
 *
 *   1. Guest Management grid → open an existing reservation ("Open" row action)
 *   2. Reservation Details toolbar → click **Sections** → dropdown with 17 items
 *      (Activities, Amenities & Membership Details, …, **Sharers**, …)
 *   3. Click **Sharers** → "Sharer Details" MODAL opens (ngb-modal-window):
 *        - Guest Information header (name, dates, room, rate)
 *        - Grid: Name | Arrival | Time | Departure | Time | Pax(A/Y/C) |
 *          Guest Rate | Domicile | Status
 *        - Grid toolbar: ⊕ **plus-circle** add button + refresh button
 *        - Footer: Link | Save | Close
 *   4. Click ⊕ → "Sharers" ADD modal opens:
 *        - Last Name* (text), First Name (text), Title (ng-select)
 *        - Arrival* / Departure* — PREFILLED dates from the reservation
 *        - two `input[type="time"]` — REQUIRED by validation even though the
 *          labels show no asterisk ("Please Fill All *Mandatory Fields..!")
 *        - PAX: Adults (1) / Youth (0) / Children (0)
 *        - Domicile Code* (ng-select), Pay By* (ng-select),
 *          Account Receivable Id (ng-select, optional)
 *        - Buttons: Save | Close
 *   5. **Save** → SweetAlert-style popup "Details created/updated successfully."
 *      (OK / No / Cancel) → click **OK** → both modals close
 *   6. Reopen Sections → Sharers → the grid shows the new row
 *      "<LastName> <FirstName>" (e.g. "SHRMA RAHUL")
 *
 * Gotchas (all verified live):
 *   - Sharer modals are `ngb-modal-window` elements — several can coexist in
 *     the DOM (outer + add + stale). Always scope to the VISIBLE one and use
 *     Playwright auto-waiting (`waitFor({state:'visible'})`) — `offsetParent`
 *     checks fail mid fade-in animation.
 *   - ng-select option panels render at PAGE level (outside the modal) —
 *     click the first `.ng-option` on the page, never dialog-scoped options.
 *   - The grid does NOT auto-show the saved row until the modal is reopened
 *     (verified: after Save + OK, reopening Sections → Sharers shows the row).
 */
export class GuestManagementSharerPage extends GuestReservationPage {
  /** ElementActions instance for this subclass (parent's instance is private) */
  private readonly actions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.actions = new ElementActions(page);
  }

  // ──────────────────────────────────────────────────────
  //  RESERVATION DETAILS / SECTIONS LOCATORS
  // ──────────────────────────────────────────────────────

  /** "Reservation Details" heading on the opened booking page */
  private get reservationDetailsHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Reservation Details' });
  }

  /** "Sections" toolbar button on the Reservation Details page.
   *  Fallback: the button's accessible name can render EMPTY after modal
   *  close/re-render (verified live) — match by visible text as well. */
  private get sectionsButton(): Locator {
    return this.page
      .getByRole('button', { name: 'Sections' })
      .or(this.page.locator('button').filter({ hasText: 'Sections' }))
      .first();
  }

  /** "Sharers" item inside the Sections dropdown */
  private get sharersDropdownItem(): Locator {
    return this.page
      .locator('.dropdown-menu.show button.dropdown-item')
      .filter({ hasText: 'Sharers' })
      .first();
  }

  /** Processing loader text shown when a request is stuck
   *  (named differently from the parent's private processingLoader getter) */
  private get processingLoaderText(): Locator {
    return this.page.getByText('We are processing your request');
  }

  // ──────────────────────────────────────────────────────
  //  SHARER MODALS LOCATORS
  // ──────────────────────────────────────────────────────

  /** "Sharer Details" modal (outer) — contains the sharer grid */
  private get sharerDetailsModal(): Locator {
    return this.page.locator('ngb-modal-window').filter({ hasText: 'Sharer Details' }).last();
  }

  /** "Sharers" ADD modal (nested) — contains the add-sharer form.
   *  Scoped by "Pay By" which only exists in the add form. */
  private get addSharerModal(): Locator {
    return this.page.locator('ngb-modal-window').filter({ hasText: 'Pay By' }).last();
  }

  /** ⊕ add button (mdi-plus-circle) in the Sharer Details grid toolbar */
  private get addSharerPlusButton(): Locator {
    return this.sharerDetailsModal.locator('button:has(i.mdi-plus-circle)').first();
  }

  /** Last Name* input in the add-sharer form */
  private get lastNameInputInAddModal(): Locator {
    return this.addSharerModal.locator('div').filter({ hasText: /^Last Name\*$/ }).getByRole('textbox').first();
  }

  /** First Name input in the add-sharer form */
  private get firstNameInputInAddModal(): Locator {
    return this.addSharerModal.locator('div').filter({ hasText: /^First Name$/ }).getByRole('textbox').first();
  }

  /** Time inputs in the add-sharer form (nth(0)=arrival, nth(1)=departure) */
  private get timeInputsInAddModal(): Locator {
    return this.addSharerModal.locator('input[type="time"]');
  }

  /** Domicile Code* dropdown in the add-sharer form */
  private get domicileDropdownInAddModal(): Locator {
    return this.addSharerModal.locator('div').filter({ hasText: /^Domicile Code\*/ }).locator('ng-select').first();
  }

  /** Pay By* dropdown in the add-sharer form */
  private get payByDropdownInAddModal(): Locator {
    return this.addSharerModal.locator('div').filter({ hasText: /^Pay By\*/ }).locator('ng-select').first();
  }

  /** Save button inside the add-sharer modal */
  private get saveButtonInAddModal(): Locator {
    return this.addSharerModal.getByRole('button', { name: 'Save' }).first();
  }

  /** Guest Management module route (stable across environments) */
  private readonly guestManagementRoute = '/Webwish_APP/pms/SystemSetup/FDSK_QWGST01';

  // ──────────────────────────────────────────────────────
  //  METHODS — RESERVATION OPENING
  // ──────────────────────────────────────────────────────

  /**
   * Open a reservation from the Guest Management grid whose toolbar supports
   * the Sections button, then wait for the Reservation Details page.
   * (Thin wrapper around tryOpenRowWithSections — walks grid rows.)
   * @returns Opened reservation info (confirmation no, last name, reservation id)
   */
  async openReservationWithSections(): Promise<OpenedReservation> {
    const maxAttempts = await this.gridRowCount();
    if (maxAttempts === 0) {
      throw new Error('No reservations found in the Guest Management grid');
    }

    for (let rowIndex = 0; rowIndex < maxAttempts; rowIndex++) {
      if (rowIndex > 0) {
        await this.returnToGrid();
      }
      const info = await this.tryOpenRowWithSections(rowIndex);
      if (info) return info;
    }

    throw new Error(
      `No reservation with a Sections toolbar button found in the first ${maxAttempts} grid rows — ` +
        'all visible bookings may be multi-guest without a reachable guest view'
    );
  }

  /**
   * Find a reservation that supports ADDING a sharer and leave the Sharer
   * Details modal OPEN with the ⊕ + button visible.
   *
   * VERIFIED LIVE rule: after opening Sharers, if the + button is NOT
   * displayed the reservation CANNOT take more guests — close the modals
   * and move to the NEXT reservation via Guest Management.
   *
   * Per row: open (multi-guest M badge → ⋮ → Reservation Details drill-down)
   * → Sections → Sharers modal → check + button → skip when absent.
   * @returns Opened reservation info for a booking that supports sharer add
   */
  async openReservationWithSharerAddSupport(): Promise<OpenedReservation> {
    const maxAttempts = await this.gridRowCount();
    if (maxAttempts === 0) {
      throw new Error('No reservations found in the Guest Management grid');
    }

    for (let rowIndex = 0; rowIndex < maxAttempts; rowIndex++) {
      logger.info(`Scanning grid row ${rowIndex} for sharer-add support`);

      if (rowIndex > 0) {
        await this.returnToGrid();
      }

      const info = await this.tryOpenRowWithSections(rowIndex);
      if (!info) continue;

      // Sections → Sharers modal
      try {
        await this.openSectionsDropdown();
        await this.openSharersSection();
      } catch (error) {
        logger.warn(
          `Row ${rowIndex}: Sections/Sharers could not be opened (${String(error).slice(0, 80)}) — trying next reservation`
        );
        await this.closeVisibleSharerModals();
        continue;
      }

      // The + button must be displayed — otherwise no more guests can be added
      if (await this.isSharerAddSupported()) {
        logger.info(
          `✅ Row ${rowIndex} supports sharer add — conf no: ${info.confirmationNo}, guest: ${info.lastName}`
        );
        return info;
      }

      logger.warn(
        `Row ${rowIndex}: + button NOT displayed in Sharer Details — cannot add more guests here, moving to the next reservation`
      );
      await this.closeVisibleSharerModals();
    }

    throw new Error(
      `No reservation supporting sharer add found in the first ${maxAttempts} grid rows — ` +
        'every scanned reservation lacks the + (add sharer) button'
    );
  }

  /**
   * Whether the open Sharer Details modal displays the ⊕ + add button.
   * Absence means the reservation cannot take more guests (verified live).
   */
  async isSharerAddSupported(): Promise<boolean> {
    const plusButton = this.page
      .locator('ngb-modal-window')
      .filter({ hasText: 'Sharer Details' })
      .filter({ hasText: 'Guest Information' })
      .last()
      .locator('button:has(i.mdi-plus-circle)')
      .first();
    return plusButton
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false);
  }

  /** Max grid rows to scan (bounded for the test timeout) */
  private async gridRowCount(): Promise<number> {
    const rowCount = await this.page.locator('button[title="Open"]').count();
    return Math.min(rowCount, 8);
  }

  /**
   * Open grid row N and ensure Sections is available (multi-guest M badge →
   * ⋮ → Reservation Details drill-down when needed), then extract the
   * reservation info.
   * VERIFIED LIVE — multi-guest reservations:
   *   - A green **M** badge (span.demo-avatar, text "M") near Guest Details
   *     means MULTIPLE guests; those open a SUMMARY view (URL …/SE/<conf no>)
   *     whose toolbar has NO Sections.
   *   - Drill into a guest via the **⋮ three-dots** dropdown next to the
   *     CONFIRMED badge in Stay Details → **Reservation Details** → the
   *     per-guest view (URL …/DE/<reservation id>) with the FULL toolbar.
   * @returns reservation info, or null when the row has no Sections
   */
  private async tryOpenRowWithSections(rowIndex: number): Promise<OpenedReservation | null> {
    logger.info(`Attempting reservation at grid row ${rowIndex}`);

    await this.page.locator('.loader-overlay').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    const openBtn = this.page.locator('button[title="Open"]').nth(rowIndex);
    await openBtn.waitFor({ state: 'visible', timeout: 30000 });

    // JS click — grid action icons are often intercepted by overlays
    await openBtn.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(2000);

    await this.reservationDetailsHeading.waitFor({ state: 'visible', timeout: 30000 });

    // Sections is absent on MULTI-GUEST (M badge) summary views — drill
    // into a guest via Stay Details ⋮ → Reservation Details (DE/ view)
    let hasSections = await this.sectionsButton
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true)
      .catch(() => false);

    if (!hasSections && (await this.hasMultiGuestBadge())) {
      logger.info(
        `Row ${rowIndex} is a MULTI-GUEST reservation (M badge) — drilling into guest via ⋮ → Reservation Details`
      );
      await this.openStayDotsMenu();
      await this.clickReservationDetailsInDotsMenu();
      hasSections = await this.sectionsButton
        .waitFor({ state: 'visible', timeout: 60000 })
        .then(() => true)
        .catch(() => false);
    }

    if (!hasSections) {
      logger.warn(
        `Row ${rowIndex} booking has no Sections button even after multi-guest drill-down — trying next row`
      );
      return null;
    }

    // CRITICAL: Guest Details data loads ASYNC and can take 10–40s on this
    // property — the config actionTimeout is only 10s, so wait explicitly
    // (re-wait after the drill-down navigation as well).
    const guestDetailsHeading = this.page.locator('h5').filter({ hasText: /Guest Details\s+\d+/ }).first();
    await guestDetailsHeading.waitFor({ state: 'visible', timeout: 90000 });
    await this.processingLoaderText.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});

    const confText = ((await guestDetailsHeading.textContent()) ?? '').trim();
    const confirmationNo = (confText.match(/Guest Details\s+(\d+)/) ?? ['', ''])[1] ?? '';

    // Last Name via the verified wrapper-div locator (input values are not in
    // textContent, so the wrapper's text is exactly "Last Name*")
    const lastNameInput = this.page.locator('div').filter({ hasText: /^Last Name\*$/ }).getByRole('textbox').first();
    await lastNameInput.waitFor({ state: 'visible', timeout: 60000 });
    const lastName = ((await lastNameInput.inputValue().catch(() => '')) ?? '').trim();

    // Reservation id from the pure-digit h5 under Stay Details (best-effort)
    const reservationId = await this.readReservationIdFromStayDetails();

    logger.info(
      `✅ Reservation with Sections opened (row ${rowIndex}) — conf no: ${confirmationNo}, guest: ${lastName}, id: ${reservationId}`
    );
    return { confirmationNo, lastName, reservationId };
  }

  /**
   * Read the reservation id from the pure-digit h5 under Stay Details
   * (e.g. "101586250702") on the currently open Reservation Details page.
   */
  private async readReservationIdFromStayDetails(): Promise<string> {
    try {
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

  /**
   * Return from a Reservation Details page to the Guest Management grid.
   * Closes sharer modals FIRST (an open modal's backdrop blocks every
   * strategy — verified live), then tries: "View all bookings" (DE view),
   * in-page back button, bounded browser back (DE → SE → grid), DIRECT
   * navigation to the Guest Management route (most reliable), and finally
   * sidebar navigation.
   */
  private async returnToGrid(): Promise<void> {
    logger.info('Returning to the Guest Management grid');

    // An open Sharer modal's backdrop intercepts clicks — close it first
    await this.closeVisibleSharerModals();

    const onGrid = async (): Promise<boolean> =>
      this.page
        .locator('button[title="Open"]')
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
        .then(() => true)
        .catch(() => false);

    if (await onGrid()) {
      logger.info('✅ Already on the grid');
      return;
    }

    // Strategy 1: "View all bookings" button (present on the DE per-guest view)
    const viewAllClicked = await this.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.offsetParent !== null && /view all bookings/i.test((b.textContent || '').trim())
      );
      if (btn) {
        (btn as HTMLElement).click();
        return true;
      }
      return false;
    });
    if (viewAllClicked && (await onGrid())) {
      logger.info('✅ Back on the grid (View all bookings)');
      return;
    }

    // Strategy 2: in-page back button
    const backClicked = await this.page.evaluate(() => {
      const back = document.querySelector('.backbtn, button:has(i.bx-arrow-back)') as HTMLElement | null;
      if (back && back.offsetParent !== null) {
        back.click();
        return true;
      }
      return false;
    });
    if (backClicked && (await onGrid())) {
      logger.info('✅ Back on the grid (in-page back button)');
      return;
    }

    // Strategy 3: browser back — bounded to 2 hops (DE → SE → grid)
    for (let hop = 1; hop <= 2; hop++) {
      await this.page.goBack().catch(() => {});
      await this.page.waitForTimeout(1500);
      if (await onGrid()) {
        logger.info(`✅ Back on the grid (browser back ×${hop})`);
        return;
      }
    }

    // Strategy 4: DIRECT navigation to the Guest Management route —
    // bypasses SPA history and any stuck modal state entirely
    await this.page.goto(this.guestManagementRoute).catch(() => {});
    if (await onGrid()) {
      logger.info('✅ Back on the grid (direct navigation)');
      return;
    }

    // Strategy 5: sidebar navigation with generous waits
    await this.page.mouse.move(0, 400);
    await this.page.waitForTimeout(800);
    await this.page.mouse.move(0, 250);
    await this.page.waitForTimeout(500);

    const frontDesk = this.page.getByRole('link', { name: /Front Desk/ }).first();
    await frontDesk
      .click({ timeout: 10000 })
      .catch(async () => frontDesk.evaluate((el) => (el as HTMLElement).click()).catch(() => {}));
    await this.page.waitForTimeout(1000);

    const guestMgmt = this.page.getByRole('link', { name: /Guest Management/ }).first();
    await guestMgmt
      .click({ timeout: 10000 })
      .catch(async () => guestMgmt.evaluate((el) => (el as HTMLElement).click()).catch(() => {}));

    await this.page
      .getByRole('heading', { name: 'Guest Management' })
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {});

    if (await onGrid()) {
      logger.info('✅ Back on the grid (sidebar navigation)');
      return;
    }
    throw new Error('Could not return to the Guest Management grid from the Reservation Details page');
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
   * per-guest view (URL …/DE/<reservation id>) whose toolbar HAS Sections.
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
      .catch(() => logger.warn('URL did not switch to /DE/ — continuing (Sections wait will confirm)'));
    logger.info('✅ Per-guest Reservation Details view opened');
  }

  /**
   * Ensure the Sections button is available on the current page: if it is
   * absent and the M (multi-guest) badge is shown, drill into a guest via
   * Stay Details ⋮ → Reservation Details.
   */
  async ensureSectionsAvailable(): Promise<void> {
    const hasSections = await this.sectionsButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasSections) return;

    const multiGuest = await this.hasMultiGuestBadge();
    if (!multiGuest) {
      throw new Error('Sections button not available and no M (multi-guest) badge found on the page');
    }
    logger.info('Sections missing with M badge present — drilling into guest via ⋮ → Reservation Details');
    await this.openStayDotsMenu();
    await this.clickReservationDetailsInDotsMenu();
    await this.sectionsButton.waitFor({ state: 'visible', timeout: 60000 });
    logger.info('✅ Sections available after multi-guest drill-down');
  }

  // ──────────────────────────────────────────────────────
  //  METHODS — SECTIONS → SHARERS
  // ──────────────────────────────────────────────────────

  /**
   * Click the "Sections" toolbar button and wait for the dropdown
   * (containing the Sharers item) to open.
   */
  async openSectionsDropdown(): Promise<void> {
    logger.info('Clicking Sections button on Reservation Details page');

    const clicked = await this.sectionsButton
      .evaluate((el) => {
        (el as HTMLElement).click();
        return true;
      })
      .catch(() => false);
    if (!clicked) {
      // DOM fallback
      await this.page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b) => b.offsetParent !== null && (b.textContent || '').trim() === 'Sections'
        );
        if (btn) (btn as HTMLElement).click();
      });
    }

    // Poll until the dropdown shows the Sharers item
    const deadline = Date.now() + 20000;
    let ready = false;
    while (Date.now() < deadline && !ready) {
      ready = await this.page.evaluate(() =>
        Array.from(document.querySelectorAll('.dropdown-menu.show button.dropdown-item')).some(
          (i) => i.offsetParent !== null && (i.textContent || '').trim() === 'Sharers'
        )
      );
      if (!ready) await this.page.waitForTimeout(500);
    }
    if (!ready) {
      throw new Error('Sections dropdown did not open — "Sharers" item not visible');
    }
    logger.info('✅ Sections dropdown opened — Sharers item visible');
  }

  /**
   * Click "Sharers" in the Sections dropdown and wait for the
   * "Sharer Details" modal to open.
   */
  async openSharersSection(): Promise<void> {
    logger.info('Clicking Sharers in the Sections dropdown');

    await this.page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.dropdown-menu.show button.dropdown-item')).filter(
        (x) => x.offsetParent !== null
      );
      const t = items.find((x) => (x.textContent || '').trim() === 'Sharers');
      if (t) (t as HTMLElement).click();
    });

    // Locator auto-wait beats mid-animation offsetParent checks
    await this.sharerDetailsModal.waitFor({ state: 'visible', timeout: 30000 });
    await this.page.waitForTimeout(1000);
    logger.info('✅ Sharer Details modal opened');
  }

  // ──────────────────────────────────────────────────────
  //  METHODS — ADD SHARER
  // ──────────────────────────────────────────────────────

  /**
   * Click the ⊕ (mdi-plus-circle) add button in the Sharer Details grid
   * toolbar and wait for the "Sharers" add modal to open.
   *
   * The + button is a Bootstrap POPOVER toggle (data-bs-toggle="popover") —
   * a JS click can be swallowed (popover toggles instead of opening the
   * modal), so use a trusted Playwright click first and RETRY until the
   * add modal appears (verified live).
   */
  async clickAddSharerButton(): Promise<void> {
    logger.info('Clicking + (add sharer) button in the Sharer Details grid');

    // Scope to the OUTER Sharer Details modal (has "Guest Information";
    // the add modal itself does not) and the plus-circle icon button
    const addButton = this.page
      .locator('ngb-modal-window')
      .filter({ hasText: 'Sharer Details' })
      .filter({ hasText: 'Guest Information' })
      .last()
      .locator('button:has(i.mdi-plus-circle)')
      .first();

    // Attempt 1: trusted Playwright click (real events — popovers respond better)
    await addButton.click({ timeout: 10000 }).catch(() => {
      logger.warn('Trusted click on + failed — will rely on retry loop');
    });

    // Retry loop: re-click until the add modal opens (popover may swallow clicks)
    const deadline = Date.now() + 30000;
    let opened = await this.addSharerModal
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    while (!opened && Date.now() < deadline) {
      logger.warn('Add modal not open yet — re-clicking the + button');
      await addButton
        .evaluate((el) => (el as HTMLElement).click())
        .catch(() => {});
      opened = await this.addSharerModal
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
    }

    if (!opened) {
      // Last-resort DOM fallback: plus-circle button inside the visible modal
      await this.page.evaluate(() => {
        const m = Array.from(document.querySelectorAll('ngb-modal-window')).find(
          (x) => x.offsetParent !== null && (x.textContent || '').includes('Sharer Details')
        );
        if (!m) return;
        const plus = m.querySelector('button:has(i.mdi-plus-circle)') as HTMLElement | null;
        if (plus) plus.click();
      });
      opened = await this.addSharerModal
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => true)
        .catch(() => false);
    }

    if (!opened) {
      throw new Error('Sharers add modal did not open after clicking the + button');
    }
    await this.page.waitForTimeout(1000);
    logger.info('✅ Sharers add modal opened');
  }

  /**
   * Fill the add-sharer form: Last Name*, First Name, arrival/departure
   * times (REQUIRED by validation), Domicile Code* and Pay By* (first
   * available option — never hardcoded).
   */
  async fillSharerDetails(data: SharerData): Promise<void> {
    logger.info(`Filling sharer details — last name: ${data.lastName}, first name: ${data.firstName ?? '(empty)'}`);

    // Last Name* (required)
    await this.lastNameInputInAddModal.waitFor({ state: 'visible', timeout: 15000 });
    await this.lastNameInputInAddModal.fill(data.lastName);

    // First Name (optional)
    if (data.firstName) {
      const fnVisible = await this.firstNameInputInAddModal.isVisible({ timeout: 3000 }).catch(() => false);
      if (fnVisible) {
        await this.firstNameInputInAddModal.fill(data.firstName);
      }
    }

    // Time inputs — required by validation even without asterisks in the label
    const arrivalTime = data.arrivalTime ?? '12:00';
    const departureTime = data.departureTime ?? '11:30';
    await this.timeInputsInAddModal.nth(0).fill(arrivalTime);
    await this.timeInputsInAddModal.nth(1).fill(departureTime);
    logger.info(`Times set — arrival: ${arrivalTime}, departure: ${departureTime}`);

    // Required dropdowns — first available option (framework convention)
    await this.selectFirstOptionInAddModalDropdown(this.domicileDropdownInAddModal, 'Domicile Code');
    await this.selectFirstOptionInAddModalDropdown(this.payByDropdownInAddModal, 'Pay By');
  }

  /**
   * Click the dropdown arrow and select the first available option.
   * ng-select panels render at PAGE level (outside the modal).
   */
  private async selectFirstOptionInAddModalDropdown(dropdown: Locator, description: string): Promise<void> {
    logger.info(`Selecting ${description} — choosing first available option`);

    const arrow = dropdown.locator('.ng-arrow-wrapper');
    await arrow.scrollIntoViewIfNeeded();
    await arrow.click({ force: true });
    await this.page.waitForTimeout(1500);

    const selectors = ['.ng-option', '.ng-dropdown-panel-item', '[role="option"]'];
    for (const sel of selectors) {
      const option = this.page.locator(sel).first();
      const visible = await option.isVisible({ timeout: 3000 }).catch(() => false);
      if (visible) {
        const text = (await option.textContent().catch(() => '')) ?? '';
        await option.evaluate((el) => (el as HTMLElement).click());
        await this.page.waitForTimeout(500);
        logger.info(`✅ ${description} selected: ${text.trim()}`);
        return;
      }
    }
    logger.warn(`No options found for ${description}`);
  }

  /**
   * Click Save in the add-sharer modal and defensively dismiss the
   * "Please Fill All *Mandatory Fields..!" alert if it appears.
   */
  async clickSaveInAddModal(): Promise<void> {
    logger.info('Clicking Save in the add-sharer modal');
    await this.saveButtonInAddModal.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(1500);

    const mandatoryAlertShown = await this.handleMandatoryFieldsAlert();
    if (mandatoryAlertShown) {
      throw new Error('Mandatory-fields validation alert appeared — required sharer fields are missing');
    }
    logger.info('✅ Save clicked in add-sharer modal');
  }

  /**
   * Dismiss the "Please Fill All *Mandatory Fields..!" alert if visible.
   * @returns true if the alert was found and dismissed
   */
  private async handleMandatoryFieldsAlert(): Promise<boolean> {
    return this.page.evaluate(() => {
      const alerts = Array.from(
        document.querySelectorAll('[role="alert"], .swal2-popup, .alert, [class*="swal"]')
      ).filter((a) => a.offsetParent !== null);
      for (const a of alerts) {
        if ((a.textContent || '').includes('Mandatory')) {
          const ok = Array.from(a.querySelectorAll('button')).find((b) =>
            /^(ok|yes)$/i.test((b.textContent || '').trim())
          );
          if (ok) {
            (ok as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    });
  }

  /**
   * Wait for the "Details created/updated successfully." popup after Save,
   * then click OK (both sharer modals close afterwards).
   * @returns The success message text
   */
  async handleSharerSuccessPopup(): Promise<string> {
    logger.info('Waiting for sharer save success popup');

    const deadline = Date.now() + 60000;
    let message = '';
    while (Date.now() < deadline && !message) {
      message = await this.page.evaluate(() => {
        const popups = Array.from(document.querySelectorAll('.swal2-popup, [role="dialog"], .alert')).filter(
          (p) => p.offsetParent !== null
        );
        for (const p of popups) {
          const text = (p.textContent || '').replace(/\s+/g, ' ').trim();
          if (text.includes('Details created/updated successfully')) return text;
        }
        return '';
      });
      if (!message) await this.page.waitForTimeout(500);
    }
    if (!message) {
      throw new Error('Sharer success popup ("Details created/updated successfully.") not found after Save');
    }

    // Click OK
    await this.page.evaluate(() => {
      const popups = Array.from(document.querySelectorAll('.swal2-popup, [role="dialog"]')).filter(
        (p) => p.offsetParent !== null
      );
      for (const p of popups) {
        if ((p.textContent || '').includes('Details created/updated successfully')) {
          const ok = Array.from(p.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'OK');
          if (ok) {
            (ok as HTMLElement).click();
            return;
          }
        }
      }
    });
    await this.page.waitForTimeout(1500);
    logger.info(`✅ Sharer saved successfully: ${message}`);
    return message;
  }

  // ──────────────────────────────────────────────────────
  //  METHODS — VERIFICATION
  // ──────────────────────────────────────────────────────

  /**
   * Reopen Sections → Sharers and verify the grid contains the sharer
   * (grid shows "<LastName> <FirstName>" after a successful save).
   * @param sharerName Text expected in the grid (e.g. "SHRMA RAHUL")
   * @returns true if the sharer row was found in the grid
   */
  async verifySharerInGrid(sharerName: string): Promise<boolean> {
    logger.info(`Verifying sharer "${sharerName}" in the Sharer Details grid`);

    // Make sure no leftover modals block the Sections button
    await this.closeVisibleSharerModals();

    // If this page became multi-guest (sharer just added) and re-rendered as
    // the SE summary view, Sections is gone — drill down via ⋮ when needed
    await this.ensureSectionsAvailable();

    await this.openSectionsDropdown();
    await this.openSharersSection();
    await this.page.waitForTimeout(2000);

    const found = await this.page.evaluate((name) => {
      const m = Array.from(document.querySelectorAll('ngb-modal-window'))
        .filter((x) => (x.textContent || '').includes('Sharer Details'))
        .pop();
      if (!m) return false;
      return Array.from(m.querySelectorAll('*')).some(
        (e) => e.children.length === 0 && (e.textContent || '').trim().includes(name)
      );
    }, sharerName);

    logger.info(found ? `✅ Sharer "${sharerName}" found in the grid` : `❌ Sharer "${sharerName}" NOT found in the grid`);
    return found;
  }

  /**
   * Close any open Sharer modals. Verified failure mode: a JS-clicked Close
   * + offsetParent-only checks can leave the modal open, whose BACKDROP then
   * blocks every navigation strategy. Now: trusted Close clicks, .show/
   * aria-hidden aware visibility, and a force-hide fallback.
   */
  async closeVisibleSharerModals(): Promise<void> {
    const sharerModal = this.page
      .locator('ngb-modal-window')
      .filter({ hasText: 'Sharer Details' })
      .last();

    const modalStillOpen = async (): Promise<boolean> =>
      this.page.evaluate(() =>
        Array.from(document.querySelectorAll('ngb-modal-window')).some((m) => {
          const text = m.textContent || '';
          if (!/Sharer/i.test(text)) return false;
          if (m.getAttribute('aria-hidden') === 'true') return false;
          return m.offsetParent !== null || m.classList.contains('show') || m.classList.contains('d-block');
        })
      );

    for (let attempt = 0; attempt < 3; attempt++) {
      if (!(await modalStillOpen())) {
        logger.info('✅ No open Sharer modals');
        return;
      }

      // Trusted click on the Close button (auto-waits, real events)
      const closeBtn = sharerModal.getByRole('button', { name: 'Close' }).last();
      await closeBtn.click({ timeout: 5000 }).catch(() => {});
      await this.page.waitForTimeout(1200);
    }

    // Last resort: Escape
    if (await modalStillOpen()) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(1000);
    }

    // Ultimate fallback: force-hide the modal + backdrop so navigation works
    if (await modalStillOpen()) {
      logger.warn('Sharer modal still open after close attempts — force-hiding modal + backdrop');
      await this.page.evaluate(() => {
        document.querySelectorAll('ngb-modal-window').forEach((m) => {
          if (/Sharer/i.test(m.textContent || '')) {
            const el = m as HTMLElement;
            el.style.display = 'none';
            el.classList.remove('show', 'd-block');
            el.setAttribute('aria-hidden', 'true');
          }
        });
        document.querySelectorAll('.modal-backdrop').forEach((b) => ((b as HTMLElement).style.display = 'none'));
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
      });
      await this.page.waitForTimeout(500);
    }

    if (await modalStillOpen()) {
      logger.warn('Sharer modal STILL open after force-hide — continuing anyway');
    } else {
      logger.info('✅ Sharer modals closed');
    }
  }

  // ──────────────────────────────────────────────────────
  //  METHODS — MODIFY AN EXISTING SHARER
  // ──────────────────────────────────────────────────────

  /**
   * Find a reservation that ALREADY has at least one sharer — do NOT create
   * a new one (verified-live rule) — and leave the Sharer Details modal
   * open showing the existing sharer rows.
   * @returns reservation info + the first existing sharer's grid name
   */
  async openReservationWithExistingSharer(): Promise<ExistingSharerReservation> {
    const maxAttempts = await this.gridRowCount();
    if (maxAttempts === 0) {
      throw new Error('No reservations found in the Guest Management grid');
    }

    for (let rowIndex = 0; rowIndex < maxAttempts; rowIndex++) {
      logger.info(`Scanning grid row ${rowIndex} for existing sharers`);
      if (rowIndex > 0) {
        await this.returnToGrid();
      }

      const info = await this.tryOpenRowWithSections(rowIndex);
      if (!info) continue;

      try {
        await this.openSectionsDropdown();
        await this.openSharersSection();
      } catch (error) {
        logger.warn(
          `Row ${rowIndex}: Sections/Sharers could not be opened (${String(error).slice(0, 80)}) — trying next reservation`
        );
        await this.closeVisibleSharerModals();
        continue;
      }

      const sharerName = await this.getExistingSharerFromModal();
      if (sharerName) {
        logger.info(
          `✅ Row ${rowIndex} already has sharer(s) — first: ${sharerName} (conf no: ${info.confirmationNo})`
        );
        return { ...info, sharerName };
      }

      logger.warn(`Row ${rowIndex}: NO existing sharers in the grid — trying next reservation`);
      await this.closeVisibleSharerModals();
    }

    throw new Error(`No reservation with existing sharers found in the first ${maxAttempts} grid rows`);
  }

  /**
   * Read the first existing sharer's name from the open Sharer Details modal.
   * Returns '' when the grid shows "No records to display".
   */
  private async getExistingSharerFromModal(): Promise<string> {
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      const result = await this.page.evaluate(() => {
        const m = Array.from(document.querySelectorAll('ngb-modal-window'))
          .filter((x) => (x.textContent || '').includes('Sharer Details'))
          .pop();
        if (!m) return { state: 'modal-missing', name: '' };
        const text = (m.textContent || '').replace(/\s+/g, ' ');
        if (text.includes('No records to display')) return { state: 'empty', name: '' };
        // Sharer name cells: leaf elements like "SHR979794 RAHUL" / "KUMAR SACHIN"
        const skip =
          /Guest Information|Guest Name|Arrival|Departure|Room|Rate|Agreed|Status|^Name$|^Time$|Pax|Domicile|Sharer|Book|Comments|Remarks|Total|Payment/i;
        const cells = Array.from(m.querySelectorAll('*'))
          .map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim())
          .filter(
            (t) =>
              t.length >= 5 &&
              t.length <= 45 &&
              /^[A-Za-z][A-Za-z0-9 .'-]*$/.test(t) &&
              t.includes(' ') &&
              !skip.test(t)
          );
        return cells.length ? { state: 'found', name: cells[0] } : { state: 'rows-pending', name: '' };
      });
      if (result.state === 'found') return result.name;
      if (result.state === 'modal-missing' || result.state === 'empty') return '';
      await this.page.waitForTimeout(1000);
    }
    return '';
  }

  /**
   * Open the SHARER's own Reservation Details view:
   * SE summary view → the sharer's stay section (Stay #N containing the
   * sharer id/name) → its ⋮ menu → **Reservation Details** → the per-guest
   * DE view OF THE SHARER (verified live, e.g. DE/101602250702 for the
   * sharer "SHR979794 RAHUL" on reservation 100001343).
   */
  async openSharerReservationDetails(sharerName: string, confNo: string): Promise<void> {
    logger.info(`Opening the sharer's Reservation Details for "${sharerName}" (conf no: ${confNo})`);

    // Directly open the multi-guest SE summary view of the reservation
    await this.page.goto(`${this.guestManagementRoute}/SE/${confNo}`).catch(() => {});
    await this.page
      .locator('h5')
      .filter({ hasText: /Guest Details\s+\d+/ })
      .first()
      .waitFor({ state: 'visible', timeout: 90000 });
    await this.processingLoaderText.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.page.waitForTimeout(2000);
    logger.info('SE summary view loaded: ' + this.page.url());

    // Sharer stays render as "Stay #N - <First> <Last> <id>"; prefer the
    // SHR id from the grid cell name, fall back to the last-name token
    // (grid cells are "LAST FIRST", stays are "FIRST LAST").
    const shrId = (sharerName.match(/SHR\d+/i) ?? [''])[0];
    const lastToken = sharerName.split(/[\s]+/)[0];

    // Click the ⋮ toggle inside the sharer's stay block
    const dotsResult = await this.page.evaluate(
      ({ id, last }) => {
        const stayEls = Array.from(document.querySelectorAll('*')).filter((e) => {
          if (e.children.length > 3 || e.offsetParent === null) return false;
          const t = (e.textContent || '').trim();
          if (!/^Stay #\d+/.test(t)) return false;
          if (id) return t.includes(id);
          return last ? t.toUpperCase().includes(last.toUpperCase()) : false;
        });
        if (!stayEls.length) return 'sharer stay not found';
        let target = stayEls[0];
        for (const el of stayEls) {
          if ((el.textContent || '').trim().length < target.textContent.trim().length) target = el;
        }
        let block: HTMLElement | null = target as HTMLElement;
        for (let d = 0; d < 8 && block; d++) {
          const toggle = block.querySelector('[ngbdropdowntoggle], [data-bs-toggle="dropdown"]') as HTMLElement | null;
          if (toggle && toggle.offsetParent !== null) {
            toggle.click();
            return 'dots clicked on stay: ' + (target.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70);
          }
          block = block.parentElement;
        }
        return 'dropdown toggle not found in stay block';
      },
      { id: shrId, last: lastToken }
    );
    logger.info(`Sharer stay dots: ${dotsResult}`);
    if (!/clicked/.test(dotsResult)) {
      throw new Error(`Could not open the ⋮ menu for sharer "${sharerName}" — ${dotsResult}`);
    }

    // Wait for the menu, click "Reservation Details"
    const deadline = Date.now() + 15000;
    let clicked = false;
    while (Date.now() < deadline && !clicked) {
      clicked = await this.page.evaluate(() => {
        const menus = Array.from(document.querySelectorAll('.dropdown-menu.show, [role="menu"]')).filter(
          (m) => m.offsetParent !== null
        );
        for (const m of menus) {
          const item = Array.from(m.querySelectorAll('button, a, [role="menuitem"]')).find(
            (i) => (i.textContent || '').trim() === 'Reservation Details'
          );
          if (item) {
            (item as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      if (!clicked) await this.page.waitForTimeout(400);
    }
    if (!clicked) throw new Error('Reservation Details item not found in the sharer stay ⋮ menu');

    // Wait for the sharer's per-guest DE view
    await this.page
      .waitForURL((url) => url.href.includes('/DE/'), { timeout: 30000 })
      .catch(() => logger.warn('URL did not switch to /DE/ — Guest Details wait will confirm'));
    await this.page
      .locator('h5')
      .filter({ hasText: /Guest Details\s+\d+/ })
      .first()
      .waitFor({ state: 'visible', timeout: 90000 });
    await this.processingLoaderText.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    logger.info(`✅ Sharer Reservation Details view opened: ${this.page.url()}`);
  }

  /**
   * Modify an EXISTING sharer's Guest Details:
   * pencil next to Guest Details → dialog → fill Contact Number (editable)
   * + Email Id (READONLY for sharers by app design — best-effort JS-set)
   * → **Update** → "Details created/updated successfully." popup → OK.
   * @returns success message + whether the contact persisted on the page
   */
  async modifySharerDetails(data: SharerModifyData): Promise<SharerModifyResult> {
    logger.info(`Modifying sharer details — contact: ${data.contactNumber}, email: ${data.email ?? '(unchanged)'}`);

    // ── Open the Guest Details dialog via the pencil ──
    await this.openGuestDetailsEditDialog();
    const dialog = this.guestDetailsEditDialog;

    // ── Contact Number (editable) ──
    const contactInput = dialog.locator('input[placeholder="Enter Contact Number"]').first();
    await contactInput.waitFor({ state: 'visible', timeout: 20000 });
    await contactInput.fill(data.contactNumber);
    logger.info(`Contact Number set to: ${await contactInput.inputValue().catch(() => '')}`);

    // ── Email Id — READONLY for sharers (verified live) ──
    if (data.email) {
      const emailInput = dialog.locator('input[placeholder="example@gmail.com"]').first();
      const emailVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
      if (emailVisible) {
        const filled = await emailInput
          .fill(data.email)
          .then(() => 'normal-fill')
          .catch(() => 'readonly');
        if (filled === 'readonly') {
          logger.warn('Email Id is READONLY for this sharer (app design) — applying JS-set as best-effort');
          await emailInput.evaluate((el, value) => {
            const input = el as HTMLInputElement;
            input.readOnly = false;
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true }));
          }, data.email);
        }
        logger.info(`Email Id set to: ${data.email} (${filled})`);
      } else {
        logger.warn('Email Id input not visible in the sharer dialog — skipping email modification');
      }
    }

    // ── Click Update ──
    await dialog
      .getByRole('button', { name: 'Update' })
      .first()
      .click({ timeout: 15000 });
    logger.info('Update clicked in the sharer Guest Details dialog');

    // ── Success popup → OK (same popup as the add flow) ──
    const successMessage = await this.handleSharerSuccessPopup();

    // ── Verify the contact persisted on the page ──
    await this.page.waitForTimeout(1500);
    const pageContact = await this.readPageContactNumber();
    const contactPersisted = pageContact === data.contactNumber;
    logger.info(
      contactPersisted
        ? `✅ Sharer contact persisted on page: ${pageContact}`
        : `⚠ Page contact is "${pageContact}" (expected "${data.contactNumber}")`
    );

    return { successMessage, contactPersisted };
  }

  /** Guest Details edit dialog (pencil) — contains the Contact Number field */
  private get guestDetailsEditDialog(): Locator {
    return this.page
      .locator('ngb-modal-window')
      .filter({ hasText: 'Guest Details' })
      .filter({ hasText: 'Contact Number' })
      .last();
  }

  /** Open the Guest Details edit dialog via the pencil (mdi-pencil) next to Guest Details */
  private async openGuestDetailsEditDialog(): Promise<void> {
    logger.info('Opening the Guest Details dialog via the pencil button');

    await this.page.evaluate(() => {
      const gdHeading = Array.from(document.querySelectorAll('h5')).find(
        (h) => /Guest Details\s+\d+/.test((h.textContent || '').trim()) && h.offsetParent !== null
      );
      if (!gdHeading) return;
      let scope = gdHeading.parentElement;
      for (let d = 0; d < 4 && scope; d++) {
        const pencil = Array.from(scope.querySelectorAll('button')).find((b) =>
          /mdi-pencil/.test(Array.from(b.querySelectorAll('i, span')).map((s) => s.className || '').join(' '))
        );
        if (pencil && pencil.offsetParent !== null) {
          (pencil as HTMLElement).click();
          return;
        }
        scope = scope.parentElement;
      }
    });

    await this.guestDetailsEditDialog.waitFor({ state: 'visible', timeout: 30000 });
    await this.page.waitForTimeout(1000);
    logger.info('✅ Guest Details dialog opened');
  }

  /** Read the Contact Number value shown on the sharer's page (post-save verification) */
  async readPageContactNumber(): Promise<string> {
    return this.page.evaluate(() => {
      const contact = Array.from(document.querySelectorAll('input')).find(
        (i) => i.offsetParent !== null && (i.getAttribute('placeholder') || '') === 'Enter Contact Number'
      );
      return contact ? (contact as HTMLInputElement).value.trim() : '';
    });
  }
}
