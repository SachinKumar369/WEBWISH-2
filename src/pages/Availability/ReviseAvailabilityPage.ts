import { BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';

// ──────────────────────────────────────────────────────────────
//  Types & helpers
// ──────────────────────────────────────────────────────────────

/** Values of the "Type" dropdown in the Set Restrictions → Revise Availability section. */
export type ReviseAvailabilityType = 'Over Booking' | 'Under Booking';

/**
 * Over/Underbooking already stored per day, keyed by ISO date (YYYY-MM-DD).
 * Positive = Over Booking, negative = Under Booking, missing = none.
 */
export type RevisionByDate = Map<string, number>;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Parse a DD/MM/YYYY string (footer business date format) into a local Date. */
export function parseDdMmYyyy(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

/** Format a Date as YYYY-MM-DD (local time). */
export function toIsoDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Return a new Date `days` days after `date`. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Inclusive number of days between two dates. */
export function daysInclusive(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

/** Calendar cell aria-label fragment, e.g. ", 2 October 2026" (leading ", " keeps 2 ≠ 12). */
function cellLabelFragment(date: Date): string {
  return `, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ──────────────────────────────────────────────────────────────
//  Page Object – Availability Management → Revise Availability
// ──────────────────────────────────────────────────────────────

/**
 * Availability Management (Manager Functions, FOMF_QMFN01) — revising the
 * saleable rooms of a room type via Set Restrictions → Revise Availability.
 *
 * UI flow (verified via Playwright against QC2 on 2026-10-18):
 *  1. Header search "ava" → "Availability Management". A side panel
 *     "Room Type Availability Filter" opens automatically with Year (pre-filled),
 *     Room Type and Rate Code ng-selects → pick a Room Type → Apply.
 *  2. A year calendar renders: `.yp-ygrid[role=grid]` with one row per month and
 *     `[role=gridcell]` day cells whose aria-label reads e.g.
 *     "Friday, 2 October 2026, business date, Over/Underbooking: 10".
 *     Days before the business date are `aria-disabled="true"`.
 *     NOTE: this year grid only renders on a wide window; at ~800px the page
 *     falls back to per-month cards, so specs must use a large viewport.
 *  3. Mouse-drag from the first to the last day selects the range (`.is-sel`);
 *     on mouse-up a SweetAlert asks "Do you want to select more days to update?" →
 *     No opens the "Set Restrictions" dialog.
 *  4. Check "Revise Availability (To reset save as 0)" → "Type" (Over Booking /
 *     Under Booking) + "Revise Availability By" number input appear → Save →
 *     "Details created/updated successfully." → OK.
 *
 * Verified quirks:
 *  - The value is ABSOLUTE, not cumulative: Over Booking 10 → +10, then
 *    Under Booking 10 → −10 relative to the base (not 0).
 *  - Saving 0 with a Type selected fails ("Booking Level Cannot be 0"); a reset
 *    needs the Type cleared and 0 entered.
 *  - The dialog pre-fills the checkbox/Type/value from the first selected day,
 *    so the checkbox may already be ticked.
 *  - The calendar cells render BEFORE their Over/Underbooking labels; the labels
 *    arrive with POST …/Availability/Get_RoomTypeAvailability (awaited on Apply).
 *  - Re-selecting Availability Management while already on it does not re-open
 *    the filter; the toolbar Filter button (`button[title=Filter]`) does.
 *  - After a SweetAlert closes, `app-root` can stay `aria-hidden="true"`, which
 *    hides the calendar from role-based locators — the calendar is therefore
 *    located with CSS `[role=gridcell][aria-label*=…]` selectors.
 */
export class ReviseAvailabilityPage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ── Navigation ── */
  private readonly globalSearchInput: Locator;
  private readonly availabilityManagementLink: Locator;

  /* ── Room Type Availability Filter (side panel) ── */
  private readonly filterToolbarButton: Locator;
  private readonly filterPanel: Locator;
  private readonly filterRoomTypeSelect: Locator;
  private readonly filterApplyButton: Locator;
  private readonly dropdownOptions: Locator;

  /* ── Year calendar ── */
  private readonly calendarGrid: Locator;
  private readonly selectedCells: Locator;
  private readonly enabledCells: Locator;

  /* ── SweetAlert popups ── */
  private readonly swalPopup: Locator;
  private readonly swalNoButton: Locator;
  private readonly swalConfirmButton: Locator;

  /* ── Set Restrictions dialog ── */
  private readonly restrictionDialog: Locator;
  private readonly reviseAvailabilityCheckbox: Locator;
  private readonly reviseTypeField: Locator;
  private readonly reviseTypeSelect: Locator;
  private readonly reviseTypeClear: Locator;
  private readonly reviseByInput: Locator;
  private readonly restrictionSaveButton: Locator;

  /* ── Footer ── */
  private readonly businessDateFooter: Locator;

  /* ── Any open NGB modal (used to wait for fade-out) ── */
  private readonly anyModal: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    // Navigation – header global search (CSS id: role locators miss it while app-root is aria-hidden)
    this.globalSearchInput = this.page.locator('#search-options');
    this.availabilityManagementLink = this.page.locator('#page-topbar').getByText('Availability Management');

    // Room Type Availability Filter (the page toolbar is rendered twice → first visible)
    this.filterToolbarButton = this.page.locator('button.app-toolbar__btn[title="Filter"]:visible').first();
    this.filterPanel = this.page.locator('app-room-type-availability-filter');
    this.filterRoomTypeSelect = this.filterPanel
      .locator('.col-md-6')
      .filter({ has: this.page.locator('label', { hasText: /^Room Type$/ }) })
      .locator('ng-select');
    this.filterApplyButton = this.filterPanel.getByRole('button', { name: 'Apply' });
    this.dropdownOptions = this.page.locator('ng-dropdown-panel .ng-option');

    // Year calendar
    this.calendarGrid = this.page.locator('.yp-ygrid[role="grid"]');
    this.selectedCells = this.calendarGrid.locator('[role="gridcell"].is-sel');
    this.enabledCells = this.calendarGrid.locator('[role="gridcell"][aria-label]:not([aria-disabled="true"])');

    // SweetAlert popups
    this.swalPopup = this.page.locator('.swal2-popup');
    this.swalNoButton = this.swalPopup.locator('button', { hasText: /^\s*No\s*$/ });
    this.swalConfirmButton = this.swalPopup.locator('.swal2-confirm');

    // Set Restrictions dialog
    this.restrictionDialog = this.page.locator('app-availability-restriction-popup');
    this.reviseAvailabilityCheckbox = this.restrictionDialog.locator('#chkReviseAvailability input[type="checkbox"]');
    this.reviseTypeField = this.restrictionDialog
      .locator('div[class*="col-6"]')
      .filter({ has: this.page.locator('label', { hasText: /^Type$/ }) });
    this.reviseTypeSelect = this.reviseTypeField.locator('ng-select');
    this.reviseTypeClear = this.reviseTypeField.locator('.ng-clear-wrapper');
    this.reviseByInput = this.restrictionDialog
      .locator('div[class*="col-6"]')
      .filter({ has: this.page.locator('label', { hasText: /Revise Availability By/ }) })
      .locator('input[type="number"]');
    this.restrictionSaveButton = this.restrictionDialog.locator('button', { hasText: /^\s*Save\s*$/ });

    // Footer "Property Id: …, Business Date: 02/10/2026"
    this.businessDateFooter = this.page.locator('h6, h5, h4').filter({ hasText: 'Business Date:' }).first();

    this.anyModal = this.page.locator('ngb-modal-window');
  }

  // ──────────────────────────────────────────────────────────────
  //  Navigation & filter
  // ──────────────────────────────────────────────────────────────

  /** Open Availability Management from the header search; waits for the filter panel. */
  async openAvailabilityManagement(): Promise<void> {
    logger.info('Opening Availability Management from global search');
    await this.waitForModalsClosed();
    await this.elementActions.click(this.globalSearchInput, 'Global search input');
    await this.elementActions.sendKeys(this.globalSearchInput, 'ava', 'Global search input');
    await this.elementActions.click(this.availabilityManagementLink, 'Availability Management link');
    await this.elementActions.waitForElement(this.filterPanel, 30000, 'Room Type Availability Filter');
    logger.info('Room Type Availability Filter opened');
  }

  /**
   * In the Room Type Availability Filter, select a room type by its name
   * (options read "BEAC  Beachsuite", so the name is matched at the end) and Apply.
   * Waits for the year calendar to render.
   */
  async selectRoomTypeAndApply(roomTypeName: string): Promise<void> {
    logger.info(`Selecting room type "${roomTypeName}" in the availability filter`);
    await this.elementActions.click(this.filterRoomTypeSelect, 'Room Type dropdown');
    const option = this.dropdownOptions.filter({ hasText: new RegExp(`\\s${escapeRegExp(roomTypeName)}\\s*$`) }).first();
    await this.elementActions.click(option, `Room Type option: ${roomTypeName}`);

    // The cells render first; their Over/Underbooking labels arrive with this API response
    const availabilityLoaded = this.page.waitForResponse(
      r => r.url().includes('/Availability/Get_RoomTypeAvailability') && r.ok(),
      { timeout: 60000 },
    );
    await this.elementActions.click(this.filterApplyButton, 'Apply button (filter)');
    await availabilityLoaded;
    await this.elementActions.waitForElement(this.calendarGrid, 30000, 'Availability Management year calendar');
    await this.enabledCells.first().waitFor({ state: 'visible', timeout: 30000 });
    await this.page.waitForTimeout(500); // let Angular render the response into the cells
    logger.info('Availability Management calendar loaded');
  }

  /**
   * Make sure the calendar for `roomTypeName` is shown: reuse it when the page
   * already displays that room type (filter chip "Room Type : <name>"),
   * otherwise open Availability Management and apply the filter.
   */
  async ensureRoomTypeCalendar(roomTypeName: string): Promise<void> {
    // Filter chip: <div class="bg-light-blue …"><span>Room Type</span> : <span>Beachsuite</span></div>
    const chip = this.page.locator('div.bg-light-blue', { hasText: new RegExp(`Room Type\\s*:\\s*${escapeRegExp(roomTypeName)}\\s*$`) });
    if (await this.calendarGrid.isVisible().catch(() => false) && await chip.isVisible().catch(() => false)) {
      logger.info(`Availability Management calendar for "${roomTypeName}" already open`);
      return;
    }
    if (await this.filterToolbarButton.isVisible().catch(() => false)) {
      // Already on Availability Management: re-selecting it from the search does not
      // re-open the filter, so use the toolbar Filter button instead
      await this.elementActions.click(this.filterToolbarButton, 'Filter toolbar button');
      await this.elementActions.waitForElement(this.filterPanel, 30000, 'Room Type Availability Filter');
    } else {
      await this.openAvailabilityManagement();
    }
    await this.selectRoomTypeAndApply(roomTypeName);
  }

  // ──────────────────────────────────────────────────────────────
  //  Calendar
  // ──────────────────────────────────────────────────────────────

  /** Calendar day cell for the given date. */
  private dayCell(date: Date): Locator {
    return this.calendarGrid.locator(`[role="gridcell"][aria-label*="${cellLabelFragment(date)}"]`);
  }

  /** Read the business date from the footer ("… Business Date: 02/10/2026"). */
  async getBusinessDate(): Promise<Date> {
    // textContent (not innerText) so it works while a modal overlay covers the footer
    const footerText = (await this.businessDateFooter.textContent({ timeout: 10000 })) || '';
    const match = footerText.match(/Business Date:\s*(\d{2}\/\d{2}\/\d{4})/);
    if (!match) {
      throw new Error(`Could not parse Business Date from footer: "${footerText}"`);
    }
    logger.info(`Business Date: ${match[1]}`);
    return parseDdMmYyyy(match[1]);
  }

  /**
   * Over/Underbooking currently stored for every selectable day of the calendar,
   * parsed from the cell aria-labels ("…, Over/Underbooking: -10").
   */
  async getRevisionByDate(): Promise<RevisionByDate> {
    const labels = await this.enabledCells.evaluateAll(cells => cells.map(c => c.getAttribute('aria-label') || ''));
    const result: RevisionByDate = new Map();
    for (const label of labels) {
      const dateMatch = label.match(/,\s*(\d{1,2}) (\w+) (\d{4})/);
      const revMatch = label.match(/Over\/Underbooking:\s*(-?\d+)/);
      if (!dateMatch || !revMatch) continue;
      const date = new Date(Number(dateMatch[3]), MONTH_NAMES.indexOf(dateMatch[2]), Number(dateMatch[1]));
      result.set(toIsoDate(date), Number(revMatch[1]));
    }
    logger.info(`Days with an existing Over/Underbooking: ${result.size}`);
    return result;
  }

  /**
   * Select a date range by dragging the mouse from `from` to `to` over the
   * calendar, and wait for the "select more days?" prompt. Verifies the number
   * of selected cells and retries the drag once if it fell short (a drag started
   * while a modal is still fading out selects only the first day).
   *
   * @returns number of selected days
   */
  async selectDateRangeByDrag(from: Date, to: Date): Promise<number> {
    const expected = daysInclusive(from, to);
    logger.info(`Drag-selecting ${toIsoDate(from)} → ${toIsoDate(to)} (${expected} days)`);

    for (let attempt = 1; attempt <= 2; attempt++) {
      await this.waitForModalsClosed();
      const startCell = this.dayCell(from);
      const endCell = this.dayCell(to);
      await this.elementActions.scrollToElement(startCell, `Calendar day ${toIsoDate(from)}`);

      const start = await startCell.boundingBox();
      const end = await endCell.boundingBox();
      if (!start || !end) {
        throw new Error(`Calendar cells for ${toIsoDate(from)} / ${toIsoDate(to)} are not visible`);
      }

      await this.page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 25 });
      await this.page.mouse.up();

      await this.swalPopup.waitFor({ state: 'visible', timeout: 10000 });
      const selected = await this.selectedCells.count();
      logger.info(`[Attempt ${attempt}/2] Selected ${selected} of ${expected} days`);
      if (selected === expected) {
        return selected;
      }

      // Short selection — dismiss the prompt and close the dialog it opens, then retry
      await this.answerMoreDaysPrompt(false);
      await this.closeRestrictionDialog();
    }
    throw new Error(`Drag selection did not select all ${expected} days from ${toIsoDate(from)} to ${toIsoDate(to)}`);
  }

  /** Read the "Do you want to select more days to update?" prompt text. */
  async getMoreDaysPromptText(): Promise<string> {
    await this.swalPopup.waitFor({ state: 'visible', timeout: 10000 });
    return (await this.swalPopup.innerText()).trim();
  }

  /**
   * Answer the "Do you want to select more days to update?" prompt.
   * No → opens the Set Restrictions dialog.
   */
  async answerMoreDaysPrompt(selectMore: boolean): Promise<void> {
    const button = selectMore ? this.swalPopup.locator('button', { hasText: /^\s*Yes\s*$/ }) : this.swalNoButton;
    await this.elementActions.click(button, `${selectMore ? 'Yes' : 'No'} on "select more days" prompt`);
    if (!selectMore) {
      await this.elementActions.waitForElement(this.restrictionDialog, 15000, 'Set Restrictions dialog');
      logger.info('Set Restrictions dialog opened');
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  Set Restrictions → Revise Availability
  // ──────────────────────────────────────────────────────────────

  /** Tick "Revise Availability (To reset save as 0)" unless it is pre-ticked. */
  async enableReviseAvailability(): Promise<void> {
    if (await this.reviseAvailabilityCheckbox.isChecked()) {
      logger.info('Revise Availability already checked (pre-filled from existing revision)');
    } else {
      await this.reviseAvailabilityCheckbox.check();
      logger.info('Checked Revise Availability');
    }
    await this.elementActions.waitForElement(this.reviseByInput, 10000, 'Revise Availability By input');
  }

  /** Select "Over Booking" / "Under Booking" in the Type dropdown. */
  async selectReviseType(type: ReviseAvailabilityType): Promise<void> {
    await this.elementActions.click(this.reviseTypeSelect, 'Revise Availability Type dropdown');
    const option = this.dropdownOptions.filter({ hasText: new RegExp(`${escapeRegExp(type)}\\s*$`, 'i') }).first();
    await this.elementActions.click(option, `Type option: ${type}`);
  }

  /** Enter the "Revise Availability By" value. */
  async enterReviseBy(value: number): Promise<void> {
    await this.elementActions.sendKeys(this.reviseByInput, String(value), 'Revise Availability By input');
  }

  /** Click Save in the Set Restrictions dialog and return the resulting popup message. */
  async saveRestrictions(): Promise<string> {
    await this.elementActions.click(this.restrictionSaveButton, 'Save button (Set Restrictions)');
    await this.swalPopup.waitFor({ state: 'visible', timeout: 15000 });
    const message = (await this.swalPopup.innerText()).replace(/\s*OK\s*$/, '').trim();
    logger.info(`Set Restrictions save message: "${message}"`);
    return message;
  }

  /** Click OK on the result popup and wait for the dialogs to close. */
  async confirmResultPopup(): Promise<void> {
    await this.elementActions.click(this.swalConfirmButton, 'OK on result popup');
    await this.swalPopup.waitFor({ state: 'hidden', timeout: 10000 });
    await this.waitForModalsClosed();
  }

  /**
   * Fill and save the Revise Availability section of the open Set Restrictions dialog.
   * @returns the save result message (expected "Details created/updated successfully.")
   */
  async reviseAvailability(type: ReviseAvailabilityType, value: number): Promise<string> {
    logger.info(`Revising availability: ${type} by ${value}`);
    await this.enableReviseAvailability();
    await this.selectReviseType(type);
    await this.enterReviseBy(value);
    return this.saveRestrictions();
  }

  /**
   * Reset the revision of the open Set Restrictions dialog: clear Type and save 0
   * (saving 0 with a Type selected is rejected with "Booking Level Cannot be 0").
   */
  async resetReviseAvailability(): Promise<string> {
    logger.info('Resetting Revise Availability to 0');
    await this.enableReviseAvailability();
    if (await this.reviseTypeClear.isVisible()) {
      await this.elementActions.click(this.reviseTypeClear, 'Clear Type');
      await this.page.keyboard.press('Escape'); // close the dropdown the clear opens
    }
    await this.enterReviseBy(0);
    return this.saveRestrictions();
  }

  /** Close the Set Restrictions dialog without saving. */
  async closeRestrictionDialog(): Promise<void> {
    const closeButton = this.restrictionDialog.locator('button', { hasText: /^\s*Close\s*$/ });
    if (await closeButton.isVisible().catch(() => false)) {
      await this.elementActions.click(closeButton, 'Close (Set Restrictions)');
    }
    await this.waitForModalsClosed();
  }

  // ──────────────────────────────────────────────────────────────
  //  Combined flow
  // ──────────────────────────────────────────────────────────────

  /**
   * Drag-select business date → 31 Dec, answer No, and apply the revision.
   * Pass `value = 0` to reset. Returns the save message and the selected day count.
   */
  async reviseAvailabilityForRange(
    from: Date,
    to: Date,
    type: ReviseAvailabilityType,
    value: number,
  ): Promise<{ message: string; selectedDays: number }> {
    const selectedDays = await this.selectDateRangeByDrag(from, to);
    await this.answerMoreDaysPrompt(false);
    const message = value === 0 ? await this.resetReviseAvailability() : await this.reviseAvailability(type, value);
    await this.confirmResultPopup();
    return { message, selectedDays };
  }

  // ──────────────────────────────────────────────────────────────
  //  Internal
  // ──────────────────────────────────────────────────────────────

  /** Wait until no NGB modal is attached (they fade out after closing). */
  private async waitForModalsClosed(): Promise<void> {
    await this.anyModal.first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {
      logger.warn('An NGB modal is still attached after 10s');
    });
  }
}
