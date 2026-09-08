import { Page, BrowserContext } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import { WaitUtils } from '../../utils/WaitUtils';
import logger from '../../core/Logger';

/**
 * Page Object for the Night Audit module in WebWish PMS.
 *
 * Night Audit has 9 sequential steps:
 *  1. Initialise Night Audit Status
 *  2. Change Rates for Inhouse Guest
 *  3. Autopost Charges
 *  4. Cancel Reservation On Option Date
 *  5. Make Non Arrivals To No-Show
 *  6. Make Non Arrivals Group To No-Show
 *  7. Change Business Date
 *  8. Prior Statistics Update
 *  9. Recreate Availability
 *
 * After the 9 steps, the system shows post-audit categories:
 *  - Print Night Audit Reports
 *  - Statistics Update and Others
 *  - Transfers
 *  - Purge Data
 *  - Change Audit Date
 */
export class NightAuditPage extends BasePage {
  private elementActions: ElementActions;
  private waitUtils: WaitUtils;

  // ── Locators ──────────────────────────────────────────────────────────
  private readonly NIGHT_AUDIT_HEADING = 'h3:has-text("Night Audit"), h3:text-is("Night Audit")';

  // Date headings
  private readonly AUDIT_DATE = 'h5:has-text("Audit Date:")';
  private readonly BUSINESS_DATE = 'h5:has-text("Business Date:")';
  private readonly SYSTEM_DATE = 'h5:has-text("System Date:")';

  // Radio buttons for audit mode
  private readonly CHANGE_BUSINESS_DATE_RADIO = 'input[type="radio"][value="B"], label:has-text("Change Business Date") input[type="radio"]';
  private readonly CHANGE_AUDIT_DATE_RADIO = 'input[type="radio"][value="A"], label:has-text("Change Audit Date") input[type="radio"]';
  private readonly CHANGE_BUSINESS_DATE_LABEL = 'label:has-text("Change Business Date"), span:has-text("Change Business Date")';
  private readonly CHANGE_AUDIT_DATE_LABEL = 'label:has-text("Change Audit Date"), span:has-text("Change Audit Date")';

  // Navigation buttons
  private readonly NEXT_BUTTON = 'button:has-text("Next"), button:has(i.mdi-arrow-right)';
  private readonly SAVE_BUTTON = 'button:has-text("save"), button:has-text("Save")';

  // Step headings
  private readonly STEP_HEADING = '.step-content h6, .night-audit-step h6, .card-body h6';

  // Verification checkbox
  private readonly VERIFY_CHECKBOX = 'input[type="checkbox"][id*="verify"], label:has-text("I have verified the list") input[type="checkbox"]';
  private readonly VERIFY_CHECKBOX_LABEL = 'span:has-text("I have verified the list"), label:has-text("I have verified the list")';

  // Step 8 checkboxes (Prior Statistics Update)
  private readonly MAKE_OCCUPIED_ROOMS_DIRTY = 'label:has-text("Make Occupied Rooms Dirty") input[type="checkbox"], span:has-text("Make Occupied Rooms Dirty")';
  private readonly RELEASE_ALLOTMENT_BLOCKS = 'label:has-text("Release Allotment Blocks") input[type="checkbox"], span:has-text("Release Allotment Blocks")';
  private readonly RELEASE_GROUP_BLOCK = 'label:has-text("Release Group Block On Action Date") input[type="checkbox"], span:has-text("Release Group Block On Action Date")';
  private readonly EXTEND_BILL_MASK = 'label:has-text("Extend Bill Mask For Stayovers") input[type="checkbox"], span:has-text("Extend Bill Mask For Stayovers")';
  private readonly INITIALISE_AUTO_POST_FLAG = 'label:has-text("Initialise Auto Post Flag") input[type="checkbox"], span:has-text("Initialise Auto Post Flag")';
  private readonly ACCOUNT_SEZ_UPDATE = 'label:has-text("Account SEZ Update") input[type="checkbox"], span:has-text("Account SEZ Update")';

  // Post-audit step headings
  private readonly PRINT_NIGHT_AUDIT_REPORTS_HEADING = 'h6:has-text("Print Night Audit Reports")';
  private readonly STATISTICS_UPDATE_HEADING = 'h6:has-text("Statistics Update and Others")';
  private readonly TRANSFERS_HEADING = 'h6:has-text("Transfers")';
  private readonly PURGE_DATA_HEADING = 'h6:has-text("Purge Data")';
  private readonly CHANGE_AUDIT_DATE_HEADING = 'h6:has-text("Change Audit Date")';

  // Post-audit checkboxes
  private readonly PRINT_REPORTS_BEFORE_MIS = 'label:has-text("Print Reports(Before MIS)") input[type="checkbox"], span:has-text("Print Reports(Before MIS)")';
  private readonly MIS_UPDATE = 'label:has-text("MIS Update") input[type="checkbox"], span:has-text("MIS Update")';
  private readonly TRANSFER_TO_PROFILES = 'label:has-text("Transfer To Profiles") input[type="checkbox"], span:has-text("Transfer To Profiles")';
  private readonly TRANSFER_TO_AR = 'label:has-text("Transfer To A/R") input[type="checkbox"], span:has-text("Transfer To A/R")';
  private readonly TRANSFER_CHECKEDOUT_GUESTS = 'label:has-text("Transfer Checked-Out Guests") input[type="checkbox"], span:has-text("Transfer Checked-Out Guests")';
  private readonly PRINT_REPORTS_AFTER_TRANSFERS = 'label:has-text("Print Reports(After Transfers)") input[type="checkbox"], span:has-text("Print Reports(After Transfers)")';

  // Night Audit completion dialog
  private readonly NIGHT_AUDIT_COMPLETED_DIALOG = 'text=Night Audit Process Completed';

  // Dialog
  private readonly CONFIRM_YES_BUTTON = 'button:has-text("Yes")';
  private readonly CONFIRM_NO_BUTTON = 'button:has-text("No")';
  private readonly OK_BUTTON = 'button:has-text("OK")';

  // Step progress sidebar
  private readonly STEP_LIST = '.list-group, ol, ul';

  // Report buttons
  private readonly RATE_CHANGE_REPORT_BUTTON = 'button:has-text("Rate Change Report")';
  private readonly AUTO_POST_EDIT_LIST_BUTTON = 'button:has-text("Auto Post Edit List")';
  private readonly DETAIL_AUTO_POST_EDIT_LIST_BUTTON = 'button:has-text("Detail Auto Post Edit List")';

  // Night Audit card on dashboard
  private readonly NIGHT_AUDIT_DASHBOARD_CARD = '.card-body:has-text("Night Audit")';

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.waitUtils = new WaitUtils(page);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Navigation
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Navigate directly to the Night Audit page.
   */
  async navigateToNightAudit(): Promise<void> {
    try {
      logger.info('Navigating to Night Audit page');
      const baseURL = this.baseURL || process.env.BASE_URL || 'https://qc2webwish.prologicfirst.in';
      await this.page.goto(`${baseURL}/pms/SystemSetup/NAN_QNA01`, { waitUntil: 'domcontentloaded' });
      await this.page.waitForLoadState('networkidle');
      await this.waitForNightAuditPageLoad();
      logger.info('Successfully navigated to Night Audit page');
    } catch (error) {
      logger.error('Failed to navigate to Night Audit page', error as Error);
      throw error;
    }
  }

  /**
   * Open Night Audit from the dashboard by clicking the Night Audit card.
   */
  async openNightAuditFromDashboard(): Promise<void> {
    try {
      logger.info('Opening Night Audit from dashboard');
      await this.elementActions.click(this.NIGHT_AUDIT_DASHBOARD_CARD, 'Night Audit Dashboard Card');
      await this.page.waitForURL('**/NAN_QNA01**');
      await this.waitForNightAuditPageLoad();
      logger.info('Night Audit opened from dashboard');
    } catch (error) {
      logger.error('Failed to open Night Audit from dashboard', error as Error);
      throw error;
    }
  }

  /**
   * Search for Night Audit in the global search and open it.
   */
  async searchAndOpenNightAudit(searchText: string = 'Night Audit'): Promise<void> {
    try {
      logger.info(`Searching for Night Audit with text: ${searchText}`);
      const searchInput = this.page.getByRole('textbox', { name: 'Search...' });
      await searchInput.clear();
      await searchInput.fill(searchText);
      await this.page.waitForTimeout(1000);

      // Look for the Night Audit option in search results
      const nightAuditOption = this.page.locator('a:has-text("Night Audit"), li:has-text("Night Audit")').first();
      await nightAuditOption.waitFor({ state: 'visible', timeout: 10000 });
      await nightAuditOption.click();
      await this.page.waitForURL('**/NAN_QNA01**');
      await this.waitForNightAuditPageLoad();
      logger.info('Night Audit found and opened via search');
    } catch (error) {
      logger.error('Failed to search and open Night Audit', error as Error);
      throw error;
    }
  }

  async waitForNightAuditPageLoad(timeout: number = 15000): Promise<void> {
    await this.page.waitForSelector(this.NIGHT_AUDIT_HEADING, { state: 'visible', timeout });
    logger.info('Night Audit page loaded successfully');
  }

  // ══════════════════════════════════════════════════════════════════════
  // Date Information
  // ══════════════════════════════════════════════════════════════════════

  async getAuditDate(): Promise<string> {
    const text = await this.elementActions.getText(this.AUDIT_DATE, 'Audit Date heading');
    return text?.replace('Audit Date:', '').trim() || '';
  }

  async getBusinessDate(): Promise<string> {
    const text = await this.elementActions.getText(this.BUSINESS_DATE, 'Business Date heading');
    return text?.replace('Business Date:', '').trim() || '';
  }

  async getSystemDate(): Promise<string> {
    const text = await this.elementActions.getText(this.SYSTEM_DATE, 'System Date heading');
    return text?.replace('System Date:', '').trim() || '';
  }

  // ══════════════════════════════════════════════════════════════════════
  // Radio Button Selection
  // ══════════════════════════════════════════════════════════════════════

  async selectChangeBusinessDate(): Promise<void> {
    try {
      logger.info('Selecting Change Business Date radio button');
      await this.elementActions.click(this.CHANGE_BUSINESS_DATE_LABEL, 'Change Business Date label');
      await this.page.waitForTimeout(500);
      logger.info('Change Business Date selected');
    } catch (error) {
      logger.error('Failed to select Change Business Date', error as Error);
      throw error;
    }
  }

  async selectChangeAuditDate(): Promise<void> {
    try {
      logger.info('Selecting Change Audit Date radio button');
      await this.elementActions.click(this.CHANGE_AUDIT_DATE_LABEL, 'Change Audit Date label');
      await this.page.waitForTimeout(500);
      logger.info('Change Audit Date selected');
    } catch (error) {
      logger.error('Failed to select Change Audit Date', error as Error);
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Step Navigation (Next / Save)
  // ══════════════════════════════════════════════════════════════════════

  async clickNext(): Promise<void> {
    try {
      logger.info('Clicking Next button');
      await this.elementActions.click(this.NEXT_BUTTON, 'Next button');
      await this.page.waitForTimeout(1000);
      logger.info('Next button clicked');
    } catch (error) {
      logger.error('Failed to click Next button', error as Error);
      throw error;
    }
  }

  async clickSave(): Promise<void> {
    try {
      logger.info('Clicking Save button');
      await this.elementActions.click(this.SAVE_BUTTON, 'Save button');
      await this.page.waitForTimeout(1000);
      logger.info('Save button clicked');
    } catch (error) {
      logger.error('Failed to click Save button', error as Error);
      throw error;
    }
  }

  async isNextButtonEnabled(): Promise<boolean> {
    try {
      const btn = this.page.locator(this.NEXT_BUTTON).first();
      return await btn.isEnabled();
    } catch {
      return false;
    }
  }

  async isSaveButtonEnabled(): Promise<boolean> {
    try {
      const btn = this.page.locator(this.SAVE_BUTTON).first();
      return await btn.isEnabled();
    } catch {
      return false;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Dialog Handling
  // ══════════════════════════════════════════════════════════════════════

  async handleConfirmationDialog(clickYes: boolean = true): Promise<void> {
    try {
      logger.info(`Handling confirmation dialog - clicking ${clickYes ? 'Yes' : 'No'}`);
      if (clickYes) {
        await this.elementActions.click(this.CONFIRM_YES_BUTTON, 'Yes button in confirmation dialog');
      } else {
        await this.elementActions.click(this.CONFIRM_NO_BUTTON, 'No button in confirmation dialog');
      }
      await this.page.waitForTimeout(2000);
      logger.info('Confirmation dialog handled');
    } catch (error) {
      logger.error('Failed to handle confirmation dialog', error as Error);
      throw error;
    }
  }

  async handleOkDialog(): Promise<void> {
    try {
      logger.info('Handling OK dialog');
      const okButton = this.page.locator('button:has-text("OK")');
      if (await okButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await okButton.click();
        await this.page.waitForTimeout(1000);
        logger.info('OK dialog handled');
      }
    } catch (error) {
      logger.error('Failed to handle OK dialog', error as Error);
    }
  }

  async isConfirmationDialogVisible(): Promise<boolean> {
    try {
      const dialog = this.page.locator('.swal2-popup, .modal, [role="dialog"]').first();
      return await dialog.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Verification Checkbox (Steps 4 & 5)
  // ══════════════════════════════════════════════════════════════════════

  async checkVerifiedList(): Promise<void> {
    try {
      logger.info('Checking "I have verified the list" checkbox');
      const checkboxLabel = this.page.getByText('I have verified the list');
      await checkboxLabel.click();
      await this.page.waitForTimeout(500);
      logger.info('Verified list checkbox checked');
    } catch (error) {
      logger.error('Failed to check verified list checkbox', error as Error);
      throw error;
    }
  }

  async isVerifiedListChecked(): Promise<boolean> {
    try {
      const checkbox = this.page.getByRole('checkbox', { name: 'I have verified the list' });
      return await checkbox.isChecked();
    } catch {
      return false;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Step Heading
  // ══════════════════════════════════════════════════════════════════════

  async getCurrentStepHeading(): Promise<string> {
    try {
      const heading = this.page.locator('.step-content h6, h6').first();
      return (await heading.textContent()) || '';
    } catch {
      return '';
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Report Buttons
  // ══════════════════════════════════════════════════════════════════════

  async clickRateChangeReport(): Promise<void> {
    try {
      logger.info('Clicking Rate Change Report button');
      await this.elementActions.click(this.RATE_CHANGE_REPORT_BUTTON, 'Rate Change Report');
      await this.page.waitForTimeout(2000);
      logger.info('Rate Change Report clicked');
    } catch (error) {
      logger.error('Failed to click Rate Change Report', error as Error);
      throw error;
    }
  }

  async clickAutoPostEditList(): Promise<void> {
    try {
      logger.info('Clicking Auto Post Edit List button');
      await this.elementActions.click(this.AUTO_POST_EDIT_LIST_BUTTON, 'Auto Post Edit List');
      await this.page.waitForTimeout(2000);
      logger.info('Auto Post Edit List clicked');
    } catch (error) {
      logger.error('Failed to click Auto Post Edit List', error as Error);
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Step 8 Checkboxes (Prior Statistics Update)
  // ══════════════════════════════════════════════════════════════════════

  async uncheckMakeOccupiedRoomsDirty(): Promise<void> {
    try {
      const checkbox = this.page.locator(this.MAKE_OCCUPIED_ROOMS_DIRTY).first();
      if (await checkbox.isChecked()) {
        await checkbox.click();
        logger.info('Unchecked Make Occupied Rooms Dirty');
      }
    } catch (error) {
      logger.error('Failed to uncheck Make Occupied Rooms Dirty', error as Error);
    }
  }

  async uncheckReleaseAllotmentBlocks(): Promise<void> {
    try {
      const checkbox = this.page.locator(this.RELEASE_ALLOTMENT_BLOCKS).first();
      if (await checkbox.isChecked()) {
        await checkbox.click();
        logger.info('Unchecked Release Allotment Blocks');
      }
    } catch (error) {
      logger.error('Failed to uncheck Release Allotment Blocks', error as Error);
    }
  }

  async uncheckReleaseGroupBlock(): Promise<void> {
    try {
      const checkbox = this.page.locator(this.RELEASE_GROUP_BLOCK).first();
      if (await checkbox.isChecked()) {
        await checkbox.click();
        logger.info('Unchecked Release Group Block On Action Date');
      }
    } catch (error) {
      logger.error('Failed to uncheck Release Group Block', error as Error);
    }
  }

  async uncheckExtendBillMask(): Promise<void> {
    try {
      const checkbox = this.page.locator(this.EXTEND_BILL_MASK).first();
      if (await checkbox.isChecked()) {
        await checkbox.click();
        logger.info('Unchecked Extend Bill Mask For Stayovers');
      }
    } catch (error) {
      logger.error('Failed to uncheck Extend Bill Mask', error as Error);
    }
  }

  async uncheckInitialiseAutoPostFlag(): Promise<void> {
    try {
      const checkbox = this.page.locator(this.INITIALISE_AUTO_POST_FLAG).first();
      if (await checkbox.isChecked()) {
        await checkbox.click();
        logger.info('Unchecked Initialise Auto Post Flag');
      }
    } catch (error) {
      logger.error('Failed to uncheck Initialise Auto Post Flag', error as Error);
    }
  }

  async uncheckAccountSezUpdate(): Promise<void> {
    try {
      const checkbox = this.page.locator(this.ACCOUNT_SEZ_UPDATE).first();
      if (await checkbox.isChecked()) {
        await checkbox.click();
        logger.info('Unchecked Account SEZ Update');
      }
    } catch (error) {
      logger.error('Failed to uncheck Account SEZ Update', error as Error);
    }
  }

  async uncheckAllStatisticsOptions(): Promise<void> {
    await this.uncheckMakeOccupiedRoomsDirty();
    await this.uncheckReleaseAllotmentBlocks();
    await this.uncheckReleaseGroupBlock();
    await this.uncheckExtendBillMask();
    await this.uncheckInitialiseAutoPostFlag();
    await this.uncheckAccountSezUpdate();
    logger.info('All statistics update options unchecked');
  }

  // ══════════════════════════════════════════════════════════════════════
  // Night Audit URL check
  // ══════════════════════════════════════════════════════════════════════

  async isOnNightAuditPage(): Promise<boolean> {
    return this.page.url().includes('NAN_QNA01');
  }

  // ══════════════════════════════════════════════════════════════════════
  // Post-Audit Steps (Change Audit Date flow)
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Wait for a specific post-audit step heading to be visible.
   */
  private async waitForPostAuditStep(partialText: string, timeout: number = 15000): Promise<void> {
    try {
      const heading = this.page.locator(`h6:has-text("${partialText}")`);
      await heading.waitFor({ state: 'visible', timeout });
      logger.info(`Post-audit step heading found: ${partialText}`);
    } catch (error) {
      logger.warn(`Post-audit step heading "${partialText}" not found within ${timeout}ms, proceeding anyway`);
    }
  }

  /**
   * Check if the "Night Audit Process Completed" dialog is visible.
   */
  async isNightAuditCompletedDialogVisible(): Promise<boolean> {
    try {
      const dialog = this.page.locator(this.NIGHT_AUDIT_COMPLETED_DIALOG);
      return await dialog.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  /**
   * Handle the "Night Audit Process Completed" dialog by clicking OK.
   */
  async handleNightAuditCompletedDialog(): Promise<void> {
    try {
      logger.info('Handling Night Audit Process Completed dialog');
      const okButton = this.page.locator('button:has-text("OK")').first();
      if (await okButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await okButton.click();
        await this.page.waitForTimeout(2000);
        logger.info('Night Audit Process Completed dialog handled');
      }
    } catch (error) {
      logger.error('Failed to handle Night Audit Process Completed dialog', error as Error);
    }
  }

  /**
   * Execute the post-audit steps (Change Audit Date flow).
   *
   * After all 9 night audit steps, the system shows:
   *  1. Print Night Audit Reports → Click Next
   *  2. Statistics Update and Others → Click Next
   *  3. Transfers → Click Next
   *  4. Purge Data → Click Next
   *  5. Change Audit Date → Click Next
   *  6. Handle "Night Audit Process Completed" dialog → OK
   */
  async performChangeAuditDate(): Promise<void> {
    try {
      logger.info('Starting Change Audit Date (post-audit) process');

      // ── Post-audit Step 1: Print Night Audit Reports ──
      logger.info('Post-audit Step 1: Print Night Audit Reports');
      await this.waitForPostAuditStep('Print Night Audit Reports');
      await this.clickNext();

      // ── Post-audit Step 2: Statistics Update and Others ──
      logger.info('Post-audit Step 2: Statistics Update and Others');
      await this.waitForPostAuditStep('Statistics Update and Others');
      await this.clickNext();

      // ── Post-audit Step 3: Transfers ──
      logger.info('Post-audit Step 3: Transfers');
      await this.waitForPostAuditStep('Transfers');
      await this.clickNext();

      // ── Post-audit Step 4: Purge Data ──
      logger.info('Post-audit Step 4: Purge Data');
      await this.waitForPostAuditStep('Purge Data');
      await this.clickNext();

      // ── Post-audit Step 5: Change Audit Date ──
      logger.info('Post-audit Step 5: Change Audit Date');
      await this.waitForPostAuditStep('Change Audit Date');
      await this.clickNext();

      // ── Handle "Night Audit Process Completed" dialog ──
      logger.info('Waiting for Night Audit Process Completed dialog');
      await this.handleNightAuditCompletedDialog();

      logger.info('Change Audit Date process completed successfully');
    } catch (error) {
      logger.error('Change Audit Date process failed', error as Error);
      throw error;
    }
  }

  /**
   * Check if the current step is a post-audit step (Print Night Audit Reports or later).
   * This is determined by looking for the "Change Audit Date" radio button being checked.
   */
  async isPostAuditPhase(): Promise<boolean> {
    try {
      const changeAuditDateRadio = this.page.locator('input[type="radio"]').nth(1);
      return await changeAuditDateRadio.isChecked();
    } catch {
      return false;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Complete Night Audit — Orchestrates all 9 steps
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Execute the full Night Audit flow (all 9 steps).
   *
   * Steps:
   *  1. Initialise Night Audit Status → Click Next → Confirm Yes
   *  2. Change Rates for Inhouse Guest → Click Next
   *  3. Autopost Charges → Click Next
   *  4. Cancel Reservation On Option Date → Check verified → Save → OK dialog → Next
   *  5. Make Non Arrivals To No-Show → Check verified → Save → OK dialog → Next
   *  6. Make Non Arrivals Group To No-Show → Click Next
   *  7. Change Business Date → Click Next
   *  8. Prior Statistics Update → Click Next
   *  9. Recreate Availability → Click Next
   */
  async performCompleteNightAudit(): Promise<void> {
    try {
      logger.info('Starting complete Night Audit process');

      // ── Step 1: Initialise Night Audit Status ──
      logger.info('Step 1: Initialise Night Audit Status');
      await this.clickNext();
      await this.handleConfirmationDialog(true); // Click Yes

      // ── Step 2: Change Rates for Inhouse Guest ──
      logger.info('Step 2: Change Rates for Inhouse Guest');
      await this.waitForStepHeading('Change Rates');
      await this.clickNext();

      // ── Step 3: Autopost Charges ──
      logger.info('Step 3: Autopost Charges');
      await this.waitForStepHeading('Autopost');
      await this.clickNext();

      // ── Step 4: Cancel Reservation On Option Date ──
      logger.info('Step 4: Cancel Reservation On Option Date');
      await this.waitForStepHeading('Cancel Reservation');
      await this.checkVerifiedList();
      await this.clickSave();
      await this.handleOkDialog();
      await this.clickNext();

      // ── Step 5: Make Non Arrivals To No-Show ──
      logger.info('Step 5: Make Non Arrivals To No-Show');
      await this.waitForStepHeading('Make Non Arrivals');
      await this.checkVerifiedList();
      await this.clickSave();
      await this.handleOkDialog();
      await this.clickNext();

      // ── Step 6: Make Non Arrivals Group To No-Show ──
      logger.info('Step 6: Make Non Arrivals Group To No-Show');
      await this.waitForStepHeading('Make Non Arrivals Group');
      await this.clickNext();

      // ── Step 7: Change Business Date ──
      logger.info('Step 7: Change Business Date');
      await this.waitForStepHeading('Change Business Date');
      await this.clickNext();

      // ── Step 8: Prior Statistics Update ──
      logger.info('Step 8: Prior Statistics Update');
      await this.waitForStepHeading('Prior Statistics');
      await this.clickNext();

      // ── Step 9: Recreate Availability ──
      logger.info('Step 9: Recreate Availability');
      await this.waitForStepHeading('Recreate Availability');
      await this.clickNext();

      logger.info('Night Audit completed successfully');
    } catch (error) {
      logger.error('Night Audit failed during execution', error as Error);
      throw error;
    }
  }

  /**
   * Wait for a step heading containing the given partial text.
   */
  private async waitForStepHeading(partialText: string, timeout: number = 15000): Promise<void> {
    try {
      const heading = this.page.locator(`h6:has-text("${partialText}")`);
      await heading.waitFor({ state: 'visible', timeout });
      logger.info(`Step heading found: ${partialText}`);
    } catch (error) {
      logger.warn(`Step heading "${partialText}" not found within ${timeout}ms, proceeding anyway`);
    }
  }
}
