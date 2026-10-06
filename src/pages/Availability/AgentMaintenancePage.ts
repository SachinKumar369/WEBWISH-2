import { BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

/** Details required to create a new travel agent. */
export interface NewAgentDetails {
  agentCode: string;      // Id*  (unique)
  agentName: string;      // Name*
  legalName: string;      // Legal Name*
  address?: string;       // Address 1*
  country?: string;       // Country* — REQUIRED on properties where the country master loads (e.g. WEBWE)
  mainHeadOption?: string; // Main Head* dropdown option text (default: 'OT Others')
}

// ──────────────────────────────────────────────────────────────
//  Page Object – Agent Maintenance (Marketing module)
// ──────────────────────────────────────────────────────────────

/**
 * Automates the Marketing → Agent Maintenance flow.
 *
 * Navigation: hover the collapsed left sidebar → click Marketing → click Agent Maintenance.
 * Creation: click "New Account" → fill the "Profile Details" dialog → Save → confirm success.
 *
 * Field structure in the dialog (verified on QC):
 *   Each field is a `col-md-4` div containing a `label-control` (the visible label, e.g. "Id*")
 *   plus a sibling <input> (text field) or <drop-down-searchable> (ng-select dropdown).
 *   We resolve fields by their label text, which is far more stable than nth() indexes.
 */
export class AgentMaintenancePage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ── Sidebar Navigation ── */
  private readonly marketingLink = this.page.locator('.simplebar-content a').filter({ hasText: 'Marketing' }).first();
  private readonly agentMaintenanceLink = this.page.locator('.simplebar-content a').filter({ hasText: 'Agent Maintenance' }).first();

  /* ── Agent Maintenance grid ── */
  private readonly pageHeading = this.page.getByRole('heading', { name: 'Agent Maintenance' });
  private readonly newAccountButton = this.page.getByRole('button', { name: 'New Account' });
  // The grid search input has a distinctive "search" class. We avoid
  // getByPlaceholder('Search') because the "All" filter dropdown toggle also
  // carries placeholder "Search" and would create a strict-mode ambiguity.
  private readonly searchInput = this.page.locator('input.search').first();
  private readonly totalButton = this.page.locator('button:has-text("Total:")').first();

  /* ── Profile Details dialog ── */
  private readonly profileDialog = this.page.getByRole('dialog').filter({ hasText: 'Profile Details' });
  private readonly saveButton = this.profileDialog.getByRole('button', { name: 'Save' });
  private readonly closeButton = this.profileDialog.getByRole('button', { name: 'Close' });

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  // ──────────────────────────────────────────────────────────────
  //  Field locators (resolved by label text)
  // ──────────────────────────────────────────────────────────────

  /**
   * Escape a label so it can be embedded in a RegExp.
   */
  private static escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * The `col-md-4`/`col-md-8` container div for a field, located by its exact
   * label text (e.g. 'Id*', 'Main Head*'). The container holds the label-control
   * plus the sibling input / dropdown.
   */
  private fieldContainer(label: string): Locator {
    const pattern = new RegExp(`^\\s*${AgentMaintenancePage.escapeRegExp(label)}\\s*$`);
    return this.profileDialog
      .locator('label-control')
      .filter({ hasText: pattern })
      .locator('..');
  }

  /** A plain text input for the given label (e.g. 'Id*'). */
  private textInput(label: string): Locator {
    return this.fieldContainer(label).getByRole('textbox');
  }

  /** The ng-select search input for the given dropdown label (e.g. 'Main Head*'). */
  private dropdownInput(label: string): Locator {
    return this.fieldContainer(label).locator('drop-down-searchable input');
  }

  // ──────────────────────────────────────────────────────────────
  //  Navigation
  // ──────────────────────────────────────────────────────────────

  /**
   * Navigate to Marketing → Agent Maintenance.
   * The sidebar is collapsed by default; moving the mouse to the left edge expands it,
   * then we click Marketing and the Agent Maintenance sub-menu item.
   *
   * NOTE: we use page.mouse.move (not elementActions.hover) for the expansion because
   * .simplebar-content is HIDDEN while the sidebar is collapsed — hovering a hidden
   * element fails. This matches the HousekeepingOperationsPage pattern.
   */
  async navigateToAgentMaintenance(): Promise<void> {
    logger.info('Navigating to Marketing > Agent Maintenance');

    // Move the mouse to the left edge to expand the collapsed sidebar
    await this.page.mouse.move(5, 400);
    await this.page.waitForTimeout(1500);

    // Click Marketing in the sidebar
    await this.elementActions.click(this.marketingLink, 'Marketing link');
    await this.page.waitForTimeout(1500);

    // Click Agent Maintenance sub-menu
    await this.elementActions.click(this.agentMaintenanceLink, 'Agent Maintenance link');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });

    logger.info('Agent Maintenance page loaded');
  }

  /**
   * Verify the Agent Maintenance grid has loaded.
   */
  async verifyPageLoaded(): Promise<boolean> {
    await this.elementActions.waitForElement(this.pageHeading, 15000, 'Agent Maintenance heading');
    logger.info('Agent Maintenance page loaded');
    return true;
  }

  // ──────────────────────────────────────────────────────────────
  //  Agent creation
  // ──────────────────────────────────────────────────────────────

  /**
   * Open the "New Account" dialog and fill in the agent details, then Save.
   * Leaves the success dialog handling to {@link confirmSuccessAndClose}.
   */
  async createNewAgent(details: NewAgentDetails): Promise<void> {
    const {
      agentCode,
      agentName,
      legalName,
      address = '123 Test Street',
      // Country* is a MANDATORY field on properties where the country master
      // loads (e.g. WEBWE / Webwish Hotel). Leaving it empty makes the app show
      // "Please Fill All *Mandatory Fields..!" and the agent is NOT created.
      country = 'United Arab Emirates',
      mainHeadOption = 'OT Others',
    } = details;

    logger.info(`Creating new agent: ${agentCode} (${agentName})`);

    // Open the New Account dialog
    await this.elementActions.click(this.newAccountButton, 'New Account button');
    await this.elementActions.waitForElement(this.profileDialog, 15000, 'Profile Details dialog');

    // Required text fields (resolved by label, not nth())
    await this.elementActions.sendKeys(this.textInput('Id*'), agentCode, 'Agent Id');
    await this.elementActions.sendKeys(this.textInput('Name*'), agentName, 'Agent Name');
    await this.elementActions.sendKeys(this.textInput('Legal Name*'), legalName, 'Legal Name');
    await this.elementActions.sendKeys(this.textInput('Address 1*'), address, 'Address 1');

    // Main Head* is a required ng-select dropdown
    await this.selectDropdownOption('Main Head*', mainHeadOption);

    // Country* is a required ng-select dropdown (enforced by the app)
    await this.selectDropdownOption('Country*', country);

    // Save the agent
    await this.elementActions.click(this.saveButton, 'Save agent');
    logger.info('Agent saved, waiting for confirmation');
  }

  /**
   * Select an option in an ng-select dropdown by its visible label.
   * Clicks the dropdown input to open the panel, then clicks the matching option.
   */
  private async selectDropdownOption(label: string, optionText: string): Promise<void> {
    logger.info(`Selecting "${optionText}" in ${label} dropdown`);

    const input = this.dropdownInput(label);
    await this.elementActions.click(input, `${label} dropdown`);
    await this.page.waitForTimeout(500);

    const option = this.page.locator('.ng-option').filter({ hasText: optionText }).first();
    await this.elementActions.click(option, `${label} option "${optionText}"`);
    await this.page.waitForTimeout(300);
  }

  /**
   * Wait for the outcome after Save and act on it.
   *
   * The app can respond with:
   *  - Error modal:   heading "Please Fill All *Mandatory Fields..!" → we THROW so the
   *                   failure is loud and the missing field is obvious.
   *  - Success modal: paragraph "Details created/updated successfully." → click OK.
   *  - SweetAlert2 popup (.swal2-popup) with the same success text → click OK.
   */
  async confirmSuccessAndClose(): Promise<void> {
    logger.info('Waiting for save confirmation');

    // Give the app a moment to render the outcome
    await this.page.waitForTimeout(1500);

    // 0) Validation error — a required field was left empty. Fail loudly.
    const mandatoryError = this.page.getByRole('heading', { name: /Please Fill All \*Mandatory Fields/i });
    if (await mandatoryError.isVisible().catch(() => false)) {
      const msg = (await mandatoryError.textContent().catch(() => ''))?.trim() || 'Please Fill All *Mandatory Fields..!';
      // Dismiss the error so the browser isn't left in a blocked state
      const errOk = this.page.getByRole('button', { name: 'OK' });
      if (await errOk.count() > 0) {
        await this.elementActions.click(errOk.first(), 'Mandatory-fields error OK').catch(() => undefined);
      }
      throw new Error(`Agent save rejected by app: "${msg}". A mandatory field (Id/Name/Legal Name/Address 1/Main Head/Country) was empty.`);
    }

    // 1) SweetAlert2 popup
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

    // 2) Bootstrap modal dialog containing the success text
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

    // 3) Neither appeared — log and continue; grid verification will confirm.
    logger.warn('No explicit success dialog detected; relying on grid verification');
  }

  /**
   * Convenience wrapper: create the agent and confirm the success dialog in one call.
   */
  async createAgentAndConfirm(details: NewAgentDetails): Promise<void> {
    await this.createNewAgent(details);
    await this.confirmSuccessAndClose();
  }

  // ──────────────────────────────────────────────────────────────
  //  Verification helpers
  // ──────────────────────────────────────────────────────────────

  /**
   * Read the "Total: N" counter from the grid toolbar.
   *
   * The grid loads asynchronously, so the button can briefly show "Total: 0" (or
   * nothing) right after navigation. We poll until two consecutive reads agree,
   * which means the grid has finished loading and the count is stable.
   */
  async getTotalCount(): Promise<number> {
    let previous = -1;
    let current = 0;
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
      const text = (await this.totalButton.textContent().catch(() => '')) ?? '';
      const match = text.match(/Total:\s*(\d+)/);
      current = match ? parseInt(match[1], 10) : -1;

      // Stable once we have a real number twice in a row
      if (current >= 0 && current === previous) break;

      previous = current;
      await this.page.waitForTimeout(800);
    }

    const count = current >= 0 ? current : 0;
    logger.info(`Agent grid total count: ${count}`);
    return count;
  }

  /**
   * Search the grid for an agent and report whether it is visible.
   *
   * IMPORTANT: the grid Search box filters by agent NAME, not by Code/Id
   * (verified on WEBWE: searching the code "AGT698240" returns nothing, while
   * the name "Agent_698240" returns the card). We therefore search by name and
   * fall back to the code only if no name is supplied.
   *
   * The toolbar "Refresh" button is intentionally NOT clicked — it is an
   * icon-only button with no accessible name, and the grid already refreshes
   * automatically after a successful save.
   */
  async verifyAgentInGrid(agentCode: string, agentName?: string): Promise<boolean> {
    const searchTerm = agentName || agentCode;
    logger.info(`Searching grid for agent: ${searchTerm} (name preferred — filter matches Name)`);

    await this.page.waitForTimeout(1500);

    await this.elementActions.sendKeys(this.searchInput, searchTerm, 'Grid search input');
    await this.page.waitForTimeout(1500);

    // The agent card renders the name as an h6 heading and the code as a badge.
    let visible = false;
    if (agentName) {
      visible = await this.page.getByRole('heading', { name: agentName }).first().isVisible().catch(() => false);
    }
    if (!visible) {
      visible = await this.page.getByText(searchTerm, { exact: false }).first().isVisible().catch(() => false);
    }

    logger.info(`Agent ${searchTerm} visible in grid: ${visible}`);
    return visible;
  }
}
