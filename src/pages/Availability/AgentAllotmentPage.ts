import { BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

/** Details required to create an allotment (block rooms) for an agent. */
export interface AllotmentDetails {
  dateFrom: string;        // DD/MM/YYYY (inclusive)
  dateTo: string;          // DD/MM/YYYY (inclusive)
  /**
   * Optional room-type option text matched against the Room Type dropdown
   * (e.g. 'LPT' or 'DLXD  LPT'). When omitted, a valid room type is auto-picked
   * from the availability snapshot passed to {@link AgentAllotmentPage.addAllotment}.
   */
  roomTypeOption?: string;
  blocked: number;         // number of rooms to block
}

/** Result of an availability capture — room type → per-day available counts. */
export interface AvailabilitySnapshot {
  /** Room type → array of daily availability (index 0 = business date column). */
  roomTypes: Map<string, number[]>;
  /** Business date parsed from the page footer (DD/MM/YYYY). */
  businessDate: string;
}

// ──────────────────────────────────────────────────────────────
//  Page Object – Agent Allotment (Marketing → Agent Maintenance)
// ──────────────────────────────────────────────────────────────

/**
 * Automates allocating rooms to a travel agent via Allotment.
 *
 * Flow (verified on QC / WEBWE):
 *   1. Navigate to Marketing → Agent Maintenance (hover collapsed sidebar).
 *   2. Search an agent by NAME (the grid filter matches Name, not Code) and open it
 *      via its "Card actions" → "Open" menu.
 *   3. Check availability of all room types through the watch/eye icon
 *      (`.side-button.shadow-lg` → Quick Access → Availability). The availability
 *      grid is an Angular DataGrid (`app-availability-enquiry`) — parsed via
 *      `.dg-body-row` / `.dg-cell-text` locators (NOT `<table>`).
 *   4. Sections dropdown → Allotment → "+" → fill Date From/Date To (flatpickr),
 *      Room Type (ng-select) and Blocked → Save → confirm success.
 *   5. Re-check availability and compare.
 *
 * Field/dialog structure (verified on WEBWE):
 *   - The Allotment grid dialog has icon buttons; the FIRST `btn-soft-primary` is "+".
 *   - The add-allotment form is a second dialog containing `input.flatpickr-input`
 *     date fields (Date From*, Date To*), a `drop-down-searchable` Room Type and a
 *     Blocked* text input. Its buttons are "Save", "Save & Add New" and "Close".
 */
export class AgentAllotmentPage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ── Sidebar Navigation ── */
  private readonly marketingLink = this.page.locator('.simplebar-content a').filter({ hasText: 'Marketing' }).first();
  private readonly agentMaintenanceLink = this.page.locator('.simplebar-content a').filter({ hasText: 'Agent Maintenance' }).first();

  /* ── Agent grid (search + open) ── */
  // input.search is the grid search (the "All" filter dropdown also has placeholder
  // "Search", so we target the distinctive class to avoid strict-mode ambiguity).
  private readonly searchInput = this.page.locator('input.search').first();
  private readonly cardActionsButton = this.page.locator('button[aria-label="Card actions"]').first();
  private readonly openAgentButton = this.page.getByRole('button', { name: /Open/ });

  /* ── Quick Access (watch / eye icon) → Availability ── */
  private readonly quickAccessButton = this.page.locator('.side-button.shadow-lg');

  /* ── Sections dropdown → Allotment ── */
  private readonly sectionsButton = this.page.getByRole('button', { name: 'Sections' }).first();

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  // ──────────────────────────────────────────────────────────────
  //  Navigation
  // ──────────────────────────────────────────────────────────────

  /**
   * Navigate to Marketing → Agent Maintenance.
   * The sidebar is collapsed; moving the mouse to the left edge expands it
   * (same pattern as HousekeepingOperationsPage — .simplebar-content is hidden
   * while collapsed, so we cannot hover it directly).
   */
  async navigateToAgentMaintenance(): Promise<void> {
    logger.info('Navigating to Marketing > Agent Maintenance');

    await this.page.mouse.move(5, 400);
    await this.page.waitForTimeout(1500);

    await this.elementActions.click(this.marketingLink, 'Marketing link');
    await this.page.waitForTimeout(1500);

    await this.elementActions.click(this.agentMaintenanceLink, 'Agent Maintenance link');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });

    logger.info('Agent Maintenance page loaded');
  }

  /**
   * Read the business date from the page footer
   * ("Property Id: ..., Business Date: 02/07/2025").
   */
  async getBusinessDate(): Promise<string> {
    const heading = this.page.locator('h6').filter({ hasText: 'Business Date:' }).first();
    const text = (await heading.textContent()) ?? '';
    const match = text.match(/Business Date:\s*(\d{2}\/\d{2}\/\d{4})/);
    if (!match) {
      throw new Error(`Could not parse Business Date from: "${text}"`);
    }
    const date = match[1];
    logger.info(`Business Date: ${date}`);
    return date;
  }

  // ──────────────────────────────────────────────────────────────
  //  Open an existing agent
  // ──────────────────────────────────────────────────────────────

  /**
   * Search the agent grid for an agent by NAME and open it.
   *
   * The grid search filters by agent NAME (not Code/Id), so we must pass the name.
   * Opening uses the card's "Card actions" button → "Open" menu item. The grid is a
   * virtual scroll, so after searching only the matching card is rendered.
   */
  async openAgent(agentName: string): Promise<void> {
    logger.info(`Searching agent grid for: ${agentName}`);

    await this.elementActions.sendKeys(this.searchInput, agentName, 'Agent grid search');
    await this.page.waitForTimeout(1500);

    await this.elementActions.click(this.cardActionsButton, 'Card actions button');
    await this.page.waitForTimeout(500);

    await this.elementActions.click(this.openAgentButton, 'Open agent button');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
    await this.page.waitForTimeout(1000);

    logger.info(`Agent opened: ${this.page.url()}`);
  }

  // ──────────────────────────────────────────────────────────────
  //  Availability (watch / eye icon → Quick Access → Availability)
  // ──────────────────────────────────────────────────────────────

  /**
   * Capture availability for all room types via the watch/eye icon.
   *
   * Clicks `.side-button.shadow-lg` (Quick Access), opens Availability, then parses
   * the Angular DataGrid (`.dg-body-row` / `.dg-cell-text`). Each row is:
   *   [roomTypeName, day1, day2, ... day31]   where day1 = business date column.
   * Summary rows (Total Saleable / Total Booked / Occupancy % / Total Available) are
   * skipped. The modal is closed before returning.
   */
  async captureAvailability(): Promise<AvailabilitySnapshot> {
    logger.info('Capturing availability via watch/eye icon (Quick Access → Availability)');

    // Open the Quick Access panel
    await this.elementActions.click(this.quickAccessButton, 'Quick Access watch/eye button');
    await this.page.waitForTimeout(1000);

    // Click "Availability" inside the Quick Access dialog
    const quickAccessDialog = this.page.getByRole('dialog').filter({ hasText: 'Quick Access' });
    const availabilityLink = quickAccessDialog.getByRole('button', { name: /Availability/ });
    await this.elementActions.click(availabilityLink, 'Availability quick link');

    // Wait for the availability DataGrid to render
    await this.page.waitForSelector('.dg-cell-text', { timeout: 15000 });
    await this.page.waitForTimeout(1000);

    // Parse the grid rows via locators (avoids page.evaluate / DOM lib issues)
    const roomTypes = new Map<string, number[]>();
    const summaryRows = new Set(['Total Saleable', 'Total Booked', 'Occupancy %', 'Total Available']);

    const rows = await this.page.locator('.dg-body-row, .dg-row').all();
    for (const row of rows) {
      const cells = (await row.locator('.dg-cell-text').allTextContents()).map((c) => c.trim());
      const name = cells[0];
      if (!name || summaryRows.has(name)) continue;
      const values = cells.slice(1).map((v) => parseFloat(v) || 0);
      roomTypes.set(name, values);
    }

    const businessDate = await this.getBusinessDate();

    // Close the availability modal
    await this.closeAvailabilityModal();

    logger.info(`Captured availability for ${roomTypes.size} room types`);
    return { roomTypes, businessDate };
  }

  /** Close the availability modal popup (scoped to the DataGrid modal). */
  private async closeAvailabilityModal(): Promise<void> {
    const modal = this.page
      .locator('ngb-modal-window[role="dialog"], .modal.show')
      .filter({ has: this.page.locator('.dg-cell-text') })
      .last();
    const closeBtn = modal.getByRole('button', { name: 'Close' });
    if (await closeBtn.isVisible().catch(() => false)) {
      await this.elementActions.click(closeBtn, 'Availability modal Close');
      await this.page.waitForTimeout(500);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  Allotment (Sections dropdown → Allotment → "+" → Save)
  // ──────────────────────────────────────────────────────────────

  /** Open the Sections dropdown and select "Allotment". */
  async openAllotmentSection(): Promise<void> {
    logger.info('Opening Sections → Allotment');

    await this.elementActions.click(this.sectionsButton, 'Sections dropdown');
    await this.page.waitForTimeout(500);

    await this.elementActions.click(this.page.getByRole('menuitem', { name: 'Allotment' }), 'Allotment menu item');
    await this.page.waitForTimeout(800);

    // Wait for the Allotment dialog to be visible
    await this.elementActions.waitForElement(this.allotmentDialog, 10000, 'Allotment dialog');
    logger.info('Allotment dialog opened');
  }

  /** The Allotment grid dialog (contains the "+" add button). */
  private get allotmentDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Allotment' }).last();
  }

  /**
   * The add-allotment form dialog — identified by its flatpickr date inputs,
   * which the Allotment grid dialog does not have.
   */
  private get allotmentFormDialog(): Locator {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.locator('input.flatpickr-input') })
      .last();
  }

  /**
   * Click "+" in the Allotment dialog to open the add-allotment form.
   */
  async openAddAllotmentForm(): Promise<void> {
    logger.info('Opening add-allotment form (+ button)');

    // The first btn-soft-primary in the Allotment dialog is the "+" (add) button.
    const addButton = this.allotmentDialog.locator('button.btn-soft-primary').first();
    await this.elementActions.click(addButton, '+ Add allotment button');
    await this.page.waitForTimeout(800);

    await this.elementActions.waitForElement(this.allotmentFormDialog, 10000, 'Add allotment form');
    logger.info('Add allotment form opened');
  }

  /**
   * Fill and save an allotment.
   * Expects the add-allotment form to already be open (see {@link openAddAllotmentForm}).
   *
   * Room Type selection is snapshot-aware: the availability grid lists room types by
   * their display name/code (e.g. "LPT", "Delux Room") while the allotment dropdown
   * shows "CODE  Name" (e.g. "DLXD  LPT"). We open the dropdown, match each option
   * against the availability snapshot and pick one with enough availability.
   *
   * @param details - dates (DD/MM/YYYY), blocked count and (optionally) a room-type option.
   * @param snapshot - availability captured BEFORE the allotment; used to pick a valid room type.
   * @returns the room-type option text that was selected.
   */
  async fillAndSaveAllotment(details: AllotmentDetails, snapshot?: AvailabilitySnapshot): Promise<string> {
    const { dateFrom, dateTo, roomTypeOption, blocked } = details;
    logger.info(`Filling allotment: ${dateFrom} → ${dateTo}, blocked ${blocked}`);

    const form = this.allotmentFormDialog;

    // Date From / Date To — flatpickr visible text inputs (nth 0 and nth 1).
    const dateInputs = form.locator('input.flatpickr-input[type="text"]');
    await this.elementActions.click(dateInputs.nth(0), 'Date From input');
    await this.elementActions.sendKeys(dateInputs.nth(0), dateFrom, 'Date From value');
    await this.elementActions.pressKey('Enter'); // commit flatpickr
    await this.page.waitForTimeout(300);

    await this.elementActions.click(dateInputs.nth(1), 'Date To input');
    await this.elementActions.sendKeys(dateInputs.nth(1), dateTo, 'Date To value');
    await this.elementActions.pressKey('Enter'); // commit flatpickr
    await this.page.waitForTimeout(300);

    // Room Type — ng-select (drop-down-searchable). Click to open, pick the option.
    const roomTypeCombo = form.locator('drop-down-searchable input').first();
    await this.elementActions.click(roomTypeCombo, 'Room Type dropdown');
    await this.page.waitForTimeout(500);

    // Inclusive day count of the allotment range — the picked room type must have
    // enough availability on EVERY day of the range, not just the first.
    const rangeDays = daysBetween(dateFrom, dateTo) + 1;
    const selectedOption = await this.pickRoomTypeOption(snapshot, blocked, rangeDays, roomTypeOption);
    await this.page.waitForTimeout(300);

    // Blocked — text input next to the "Blocked*" label-control.
    const blockedInput = form.locator('div:has(> label-control:has-text("Blocked")) input');
    await this.elementActions.sendKeys(blockedInput, String(blocked), 'Blocked value');

    // Save — exact match so we don't hit "Save & Add New".
    await this.elementActions.click(form.getByRole('button', { name: 'Save', exact: true }), 'Save allotment');

    await this.confirmSuccessAndClose();
    logger.info(`Allotment saved for room type: ${selectedOption}`);
    return selectedOption;
  }

  /**
   * Pick a Room Type option from the OPEN ng-select dropdown.
   *
   * Matching rules (the dropdown option text is "CODE  Name"):
   *  - If an explicit `roomTypeOption` is given and an option contains it, use that.
   *  - Otherwise, match each option against the availability snapshot: an option is
   *    valid if its text contains an availability room-type name whose availability is
   *    greater than `blocked` on EVERY day of the allotment range. We pick the option
   *    with the highest worst-day availability across the range.
   *  - Fallback: the first option.
   *
   * @param rangeDays - inclusive number of days in the allotment range to validate.
   * @returns the selected option's text.
   */
  private async pickRoomTypeOption(
    snapshot: AvailabilitySnapshot | undefined,
    blocked: number,
    rangeDays: number,
    roomTypeOption?: string,
  ): Promise<string> {
    const options = this.page.locator('.ng-option');
    const optionTexts = (await options.allTextContents()).map((t) => t.trim()).filter(Boolean);

    if (optionTexts.length === 0) {
      throw new Error('No room type options found in the Room Type dropdown');
    }

    // 1) Explicit option requested by the caller.
    if (roomTypeOption) {
      const match = optionTexts.find((t) => t.includes(roomTypeOption));
      if (match) {
        await this.elementActions.click(options.filter({ hasText: match }).first(), `Room Type option "${match}"`);
        return match;
      }
      logger.warn(`Requested room type "${roomTypeOption}" not in dropdown; falling back to availability match`);
    }

    // 2) Snapshot-aware selection — the picked room type must have more than `blocked`
    //    rooms available on EVERY day of the allotment range.
    if (snapshot) {
      let best: { option: string; minAvailable: number } | undefined;
      for (const optionText of optionTexts) {
        // The option is "CODE  Name"; availability may key on either the code or the name.
        for (const [roomType, values] of snapshot.roomTypes) {
          if (!optionText.includes(roomType)) continue;
          // Availability columns are per-day (index 0 = business date). Require that
          // every day in the range can absorb the block.
          const rangeValues = values.slice(0, rangeDays);
          if (rangeValues.length === 0) continue;
          const minAvailable = Math.min(...rangeValues);
          if (minAvailable > blocked && (!best || minAvailable > best.minAvailable)) {
            best = { option: optionText, minAvailable };
          }
        }
      }
      if (best) {
        logger.info(`Selected room type "${best.option}" (worst-day availability ${best.minAvailable} across ${rangeDays}-day range)`);
        await this.elementActions.click(options.filter({ hasText: best.option }).first(), `Room Type option "${best.option}"`);
        return best.option;
      }
      logger.warn(`No snapshot room type had > ${blocked} rooms available on every day of the ${rangeDays}-day range`);
    }

    // 3) Fallback — first option.
    const first = optionTexts[0];
    logger.warn(`Falling back to first room type option: "${first}"`);
    await this.elementActions.click(options.filter({ hasText: first }).first(), `Room Type option "${first}"`);
    return first;
  }

  /**
   * Convenience wrapper: open the add form, fill it (auto-picking a room type from the
   * availability snapshot) and save.
   *
   * @returns the room-type option text that was allotted.
   */
  async addAllotment(details: AllotmentDetails, snapshot?: AvailabilitySnapshot): Promise<string> {
    await this.openAddAllotmentForm();
    return this.fillAndSaveAllotment(details, snapshot);
  }

  /**
   * Wait for the outcome after Save and act on it.
   *  - Error modal ("Please Fill All *Mandatory Fields..!") → THROW.
   *  - Success modal / SweetAlert2 ("Details created/updated successfully.") → click OK.
   */
  private async confirmSuccessAndClose(): Promise<void> {
    logger.info('Waiting for allotment save confirmation');
    await this.page.waitForTimeout(1500);

    // Validation error — fail loudly.
    const mandatoryError = this.page.getByRole('heading', { name: /Please Fill All \*Mandatory Fields/i });
    if (await mandatoryError.isVisible().catch(() => false)) {
      const msg = (await mandatoryError.textContent().catch(() => ''))?.trim() || 'Please Fill All *Mandatory Fields..!';
      const errOk = this.page.getByRole('button', { name: 'OK' });
      if (await errOk.count() > 0) {
        await this.elementActions.click(errOk.first(), 'Mandatory-fields error OK').catch(() => undefined);
      }
      throw new Error(`Allotment save rejected by app: "${msg}". A mandatory field (Date From/Date To/Room Type/Blocked) was empty.`);
    }

    // SweetAlert2 popup.
    const swalPopup = this.page.locator('.swal2-popup');
    if (await swalPopup.isVisible().catch(() => false)) {
      logger.info('Confirmation shown as SweetAlert2 popup');
      const okBtn = swalPopup.getByRole('button', { name: /ok/i });
      if (await okBtn.count() > 0) {
        await this.elementActions.click(okBtn.first(), 'SweetAlert OK button');
      }
      await this.page.waitForTimeout(500);
      return;
    }

    // Bootstrap success modal.
    const successDialog = this.page.getByRole('dialog').filter({ hasText: 'Details created/updated successfully' });
    if (await successDialog.isVisible().catch(() => false)) {
      logger.info('Confirmation shown as success modal dialog');
      const okBtn = successDialog.getByRole('button', { name: 'OK' });
      if (await okBtn.count() > 0) {
        await this.elementActions.click(okBtn, 'Success OK button');
      }
      await this.page.waitForTimeout(500);
      return;
    }

    logger.warn('No explicit save confirmation detected; continuing');
  }

  /**
   * Verify the newly created allotment row is visible in the Allotment grid.
   * The grid row renders the dates, room-type code and blocked count (whitespace is
   * collapsed in the DOM), so we normalize before matching.
   */
  async verifyAllotmentRow(dateFrom: string, dateTo: string, blocked: number): Promise<boolean> {
    const dialogText = ((await this.allotmentDialog.textContent().catch(() => '')) ?? '').replace(/\s+/g, '');
    const visible = dialogText.includes(dateFrom) && dialogText.includes(dateTo) && dialogText.includes(String(blocked));
    logger.info(`Allotment row visible: ${visible} (looking for ${dateFrom}, ${dateTo}, ${blocked})`);
    return visible;
  }

  /** Close the Allotment dialog (the "Close" button at its footer). */
  async closeAllotmentDialog(): Promise<void> {
    const closeBtn = this.allotmentDialog.getByRole('button', { name: 'Close' });
    if (await closeBtn.isVisible().catch(() => false)) {
      await this.elementActions.click(closeBtn, 'Allotment dialog Close');
      await this.page.waitForTimeout(500);
    }
  }
}

// ──────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Whole days between two DD/MM/YYYY dates (to - from). Returns 0 when equal.
 */
export function daysBetween(fromStr: string, toStr: string): number {
  const [fd, fm, fy] = fromStr.split('/').map((p) => Number(p));
  const [td, tm, ty] = toStr.split('/').map((p) => Number(p));
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

/**
 * Add N days to a DD/MM/YYYY date string and return the result as DD/MM/YYYY.
 */
export function addDays(dateStr: string, days: number): string {
  const [day, month, year] = dateStr.split('/').map((p) => Number(p));
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

/**
 * Map an allotment Room Type dropdown option (e.g. "DLXD  LPT") back to the room-type
 * name used in the availability snapshot (e.g. "LPT"). The dropdown option text contains
 * the availability name as a substring (either the code or the display name).
 *
 * @param optionText - the selected dropdown option text (e.g. "DLXD  LPT").
 * @param snapshot - the availability snapshot captured before the allotment.
 * @returns the matching snapshot room-type name, or undefined if none matches.
 */
export function resolveSnapshotRoomTypeForOption(
  optionText: string,
  snapshot: AvailabilitySnapshot,
): string | undefined {
  for (const roomType of snapshot.roomTypes.keys()) {
    if (optionText.includes(roomType)) return roomType;
  }
  return undefined;
}
