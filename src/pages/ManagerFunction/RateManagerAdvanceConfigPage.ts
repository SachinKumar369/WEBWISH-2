import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';
import { TIMEOUT } from 'dns';

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

export interface RateAmountRow {
  rowIndex: number;
  columnIndex: number;
  amount: string;
}

// ──────────────────────────────────────────────────────────────
//  Page Object – Rate Manager Advance Configuration
// ──────────────────────────────────────────────────────────────

export class RateManagerAdvanceConfigPage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ── Navigation locators ── */
  private readonly globalSearchInput: Locator;
  private readonly rateManagerTopbarLink: Locator;
  private readonly guestManagementMenuItem: Locator;

  /* ── Rate Manager – Advance Date Selection ── */
  private readonly advanceDateSelectionLink: Locator;

  /* ── Rate Grid locators ── */
  private readonly rateGridSaveButton: Locator;
  private readonly yesButton: Locator;
  private readonly successMessage: Locator;
  private readonly okButton: Locator;

  /* ── Sections & Advance Configuration ── */
  private readonly sectionsButton: Locator;
  private readonly advanceConfigurationLink: Locator;

  /* ── Toggle switches (Advance Configuration) ── */
  private readonly ratesInclusiveOfTaxesToggle: Locator;
  private readonly reservationFixedRateToggle: Locator;
  private readonly allowOverrideForUsersToggle: Locator;
  private readonly advanceConfigSaveButton: Locator;

  /* ── Guest Management / Reservation ── */
  private readonly newReservationButton: Locator;
  private readonly nextButton: Locator;
  private readonly addOccupantButton: Locator;
  private readonly expandRoomButton: Locator;
  private readonly reservationTable: Locator;
  private readonly closeButton: Locator;

  /* ── Rate Override ── */
  private readonly systemRateChangedMessage: Locator;
  private readonly yesOverrideButton: Locator;
  private readonly okOverrideButton: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    // Navigation
    //this.globalSearchInput = this.page.getByRole('textbox', { name: 'Search...' });
    this.globalSearchInput = this.page
  .getByRole('textbox', { name: 'Search...' })
  .or(this.page.getByPlaceholder('Search...'));
    this.rateManagerTopbarLink = this.page
      .locator('#page-topbar')
      .getByText('Rate Manager', { exact: true });
    this.guestManagementMenuItem = this.page.getByText('Guest Management', { exact: true });

    // Rate Manager – Advance Date Selection
    this.advanceDateSelectionLink = this.page.getByText('Advance Date Selection');

    // Rate Grid
    this.rateGridSaveButton = this.page.getByRole('button', { name: '󰠘 Save' });
    this.yesButton = this.page.getByRole('button', { name: 'Yes' });
    this.successMessage = this.page.getByRole('paragraph');
    this.okButton = this.page.getByRole('button', { name: 'OK' });

    // Sections & Advance Configuration
    this.sectionsButton = this.page.getByText('Sections');
    this.advanceConfigurationLink = this.page.getByText('Advance Configuration');

    // Toggle switches
    this.ratesInclusiveOfTaxesToggle = this.page.getByRole('switch', { name: 'Rates Inclusive of Taxes' });
    this.reservationFixedRateToggle = this.page.getByRole('switch', { name: 'Reservation Fixed Rate' });
    this.allowOverrideForUsersToggle = this.page.getByRole('switch', { name: 'Allow override for Users' });
    this.advanceConfigSaveButton = this.page.getByRole('button', { name: 'Save', exact: true });

    // Guest Management / Reservation
    this.newReservationButton = this.page.locator('button').filter({ hasText: 'New Reservation' });
    this.nextButton = this.page.getByText('Next', { exact: true });
    this.addOccupantButton = this.page.getByText('+').first();
    this.expandRoomButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light.py-0.px-2.btn-soft-secondary').first();
    this.reservationTable = this.page.getByRole('table');
    this.closeButton = this.page.getByRole('button', { name: 'Close' });

    // Rate Override
    this.systemRateChangedMessage = this.page.getByText('System Rate has been Changed');
    this.yesOverrideButton = this.page.getByRole('button', { name: 'Yes' });
    this.okOverrideButton = this.page.getByRole('button', { name: 'Ok' });
  }

  // ──────────────────────────────────────────────────────────────
  //  Navigation Helpers
  // ──────────────────────────────────────────────────────────────

  /** Opens Rate Manager via the global search bar. */
  async openRateManager(): Promise<void> {
    logger.info('Opening Rate Manager from global search');
    await this.elementActions.click(this.globalSearchInput, 'Global search input');
    await this.elementActions.sendKeys(this.globalSearchInput, 'rate manager', 'Global search input');
    await this.elementActions.click(this.rateManagerTopbarLink, 'Rate Manager topbar link');
  }

  /** Opens Guest Management via the global search bar. */
  async openGuestManagement(): Promise<void> {
    logger.info('Opening Guest Management from global search');
    await this.elementActions.click(this.globalSearchInput, 'Global search input');
    await this.elementActions.sendKeys(this.globalSearchInput, 'guest management', 'Global search input');
    await this.elementActions.click(this.guestManagementMenuItem, 'Guest Management menu item');
  }

  // ──────────────────────────────────────────────────────────────
  //  Rate Grid – Fill Rate Amount
  // ──────────────────────────────────────────────────────────────

  /**
   * Opens the rate grid for editing by clicking the expand/eye icon area,
   * then fills the amount in the specified row and column.
   */
  async fillRateAmount(rowSelector: string, amount: string): Promise<void> {
    logger.info(`Filling rate amount: ${amount} at ${rowSelector}`);

    const input = this.page.locator(rowSelector);
    await this.elementActions.click(input, `Rate amount input at ${rowSelector}`);
    await input.press('ControlOrMeta+a');
    await input.fill(amount);
  }

  /** Saves the rate grid and confirms. */
  async saveRateGrid(): Promise<void> {
    logger.info('Saving rate grid');
    await this.elementActions.click(this.rateGridSaveButton, 'Rate grid Save button');
    await this.elementActions.click(this.yesButton, 'Confirm save button');
            await this.page.waitForTimeout(30000);

    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Success dialog OK button');
  }

  // ──────────────────────────────────────────────────────────────
  //  Sections & Advance Configuration
  // ──────────────────────────────────────────────────────────────

  /** Navigates to Sections > Advance Configuration. */
  async openAdvanceConfiguration(): Promise<void> {
    logger.info('Opening Advance Configuration via Sections');

    await this.elementActions.click(this.globalSearchInput, 'Global search input');
    await this.elementActions.sendKeys(this.globalSearchInput, 'rate manager', 'Global search input');
    await this.elementActions.click(this.rateManagerTopbarLink, 'Rate Manager topbar link');

    // Open the rate grid (click the date cell area – same as original test)
    await this.page.locator('div:nth-child(7) > div:nth-child(2) > .rounded').click();
    await this.page.locator('div:nth-child(8) > .col-md-12 > .card > .text-warning > .mdi').click();

    await this.elementActions.click(this.sectionsButton, 'Sections button');
    await this.elementActions.click(this.advanceConfigurationLink, 'Advance Configuration link');
  }

  /** Checks the "Rates Inclusive of Taxes" toggle if not already enabled. */
//   async enableRatesInclusiveOfTaxes(): Promise<void> {
//     const isChecked = await this.ratesInclusiveOfTaxesToggle.isChecked();
//     if (isChecked) {
//       logger.info('Rates Inclusive of Taxes is already enabled — skipping toggle');
//     } else {
//       logger.info('Enabling Rates Inclusive of Taxes');
//       await this.elementActions.click(this.ratesInclusiveOfTaxesToggle, 'Rates Inclusive of Taxes toggle');
//     }
//   }


async enableRatesInclusiveOfTaxes(): Promise<void> {
  logger.info('Checking Rates Inclusive of Taxes setting');

  const toggle = this.page.locator('#inctax');

 // wait for 1 second to ensure the toggle state is loaded
    await this.page.waitForTimeout(1000);
  const isChecked = await toggle.isChecked();

  logger.info(`Current checkbox state reported by DOM: ${isChecked}`);

  if (!isChecked) {
    logger.info('Attempting to enable Rates Inclusive of Taxes');
    await this.page.waitForTimeout(1000);

    await this.elementActions.click(
      this.page.locator('label[for="inctax"]'),
      'Rates Inclusive of Taxes'
    );

    await this.page.waitForTimeout(1000);

    logger.info('Rates Inclusive of Taxes toggle clicked');
  } else {
    logger.info('Rates Inclusive of Taxes is already enabled');
  }
}




  /** Unchecks the "Rates Inclusive of Taxes" toggle if not already disabled. */
  async disableRatesInclusiveOfTaxes(): Promise<void> {
    // wait for 2 seconds to ensure the toggle state is loaded 
    await this.page.waitForTimeout(2000);
    const isChecked = await this.ratesInclusiveOfTaxesToggle.isChecked();
    if (!isChecked) {
      logger.info('Rates Inclusive of Taxes is already disabled — skipping toggle');
    } else {
      logger.info('Disabling Rates Inclusive of Taxes');
         await this.page.waitForTimeout(1500);
      await this.elementActions.click(this.ratesInclusiveOfTaxesToggle, 'Rates Inclusive of Taxes toggle');
    }
  }

  /** Checks the "Reservation Fixed Rate" toggle. */
  async enableReservationFixedRate(): Promise<void> {
    logger.info('Enabling Reservation Fixed Rate');
    await this.elementActions.click(this.reservationFixedRateToggle, 'Reservation Fixed Rate toggle');
  }

  /** Unchecks the "Reservation Fixed Rate" toggle. */
  async disableReservationFixedRate(): Promise<void> {
    logger.info('Disabling Reservation Fixed Rate');
    await this.elementActions.click(this.reservationFixedRateToggle, 'Reservation Fixed Rate toggle');
  }

  /** Checks the "Allow override for Users" toggle. */
  async enableAllowOverrideForUsers(): Promise<void> {
    logger.info('Enabling Allow override for Users');
    await this.elementActions.click(this.allowOverrideForUsersToggle, 'Allow override for Users toggle');
  }

  /** Saves the Advance Configuration and confirms. */
  async saveAdvanceConfiguration(): Promise<void> {
    logger.info('Saving Advance Configuration');
    await this.elementActions.click(this.advanceConfigSaveButton, 'Advance Configuration Save button');
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Success dialog OK button');
  }

  // ──────────────────────────────────────────────────────────────
  //  Guest Management – New Reservation Flow
  // ──────────────────────────────────────────────────────────────

  /** Opens New Reservation and advances through the wizard. */
  async openNewReservation(): Promise<void> {
    logger.info('Opening New Reservation');
    await this.elementActions.click(this.newReservationButton, 'New Reservation button');
        await this.page.waitForTimeout(1000);
    logger.info('Clicking Next in reservation wizard');
        await this.page.waitForTimeout(5000);

    await this.elementActions.click(this.nextButton, 'Next button');
  }

  /** Adds an occupant (clicks the first '+' button). */
  async addOccupant(): Promise<void> {
    logger.info('Adding occupant');
        await this.page.waitForTimeout(5000);
    await this.elementActions.click(this.addOccupantButton, 'Add occupant + button');
  }

  /** Advances to the next step in the reservation wizard. */
  async clickNext(): Promise<void> {
            await this.page.waitForTimeout(3000);

    logger.info('Clicking Next in reservation wizard');
    await this.elementActions.click(this.nextButton, 'Next button');
  }

  /** Expands the room details row to show the rate input. */
  async expandRoomDetails(): Promise<void> {
    logger.info('Expanding room details');
            await this.page.waitForTimeout(2000);

    await this.elementActions.click(this.expandRoomButton, 'Expand room details button');
  }

  /** Closes the reservation dialog. */
  async closeReservation(): Promise<void> {
    logger.info('Closing reservation');
    // Wait for any loader overlay to disappear before closing
    const loader = this.page.locator('.loader-overlay');
    try {
      await loader.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      logger.info('No loader overlay found or already hidden');
    }
    await this.page.waitForTimeout(1000);
    // Press Escape to close the dialog — avoids scroll issues with bottom Close button
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(1000);
  }

  // ──────────────────────────────────────────────────────────────
  //  Rate Verification
  // ──────────────────────────────────────────────────────────────

  /** Verifies the amount summary card contains the expected amount. */
  async verifyAmountSummary(expectedAmount: string): Promise<void> {
    logger.info(`Verifying amount summary card contains: ${expectedAmount}`);
    await expect(this.page.locator('amount-summary-card')).toContainText(expectedAmount);
  }

  /** Verifies the row group contains the expected amount. */
  async verifyRowGroupAmount(expectedAmount: string): Promise<void> {
    logger.info(`Verifying row group contains: ${expectedAmount}`);
    await expect(this.page.getByRole('rowgroup')).toContainText(expectedAmount);
  }

  /** Verifies the reservation table contains the expected amount. */
  async verifyReservationTableAmount(expectedAmount: string): Promise<void> {
    logger.info(`Verifying reservation table contains: ${expectedAmount}`);
    await expect(this.reservationTable).toContainText(expectedAmount);
  }

  // ──────────────────────────────────────────────────────────────
  //  Rate Override
  // ──────────────────────────────────────────────────────────────

  /**
   * Overrides the rate amount in the reservation room table.
   * Clicks the textbox in the specified cell, selects all, and fills the new amount.
   */
  async overrideRateAmount(cellName: string, newAmount: string): Promise<void> {
    logger.info(`Overriding rate amount from cell "${cellName}" to ${newAmount}`);

    const rateInput = this.page.getByRole('cell', { name: cellName }).getByRole('textbox');
    await this.elementActions.click(rateInput, `Rate input in cell ${cellName}`);
    await rateInput.press('ControlOrMeta+a');
    await rateInput.fill(newAmount);
  }

  /** Confirms the system rate change dialog. */
  async confirmSystemRateChange(): Promise<void> {
    logger.info('Confirming system rate change');
    
    await expect(this.systemRateChangedMessage).toContainText(
      'System Rate has been Changed. Do you want to modify the agreed rate.?',{ timeout: 5000   }
    );
    await this.elementActions.click(this.yesOverrideButton, 'Yes button for rate change');
    await this.elementActions.click(this.okOverrideButton, 'Ok button for rate change');

  }

  /** Verifies the overridden rate is visible in the table cell. */
  async verifyOverriddenRate(cellName: string): Promise<void> {
    logger.info(`Verifying overridden rate ${cellName} is visible`);
    await expect(
      this.page.getByRole('cell', { name: cellName }).getByRole('textbox')
    ).toBeVisible();
  }

  // ──────────────────────────────────────────────────────────────
  //  High-Level Flows
  // ──────────────────────────────────────────────────────────────

  /**
   * Flow 1: Set rate amount → Save → Enable "Rates Inclusive of Taxes" → Save
   */
  async runSetRateAndEnableTaxInclusive(): Promise<void> {
    logger.info('Running flow: Set rate and enable tax inclusive');

    await this.openRateManager();
    await this.page.locator('div:nth-child(7) > div:nth-child(2) > .rounded').click();
    await this.page.locator('div:nth-child(8) > .col-md-12 > .card > .text-warning > .mdi').click();
    await this.fillRateAmount(
      'tr:nth-child(4) > td:nth-child(4) > amount-control > .form-control',
      '5000'
    );
        await this.page.waitForTimeout(3000);

    await this.saveRateGrid();

    // Navigate to Sections > Advance Configuration
    // await this.elementActions.click(this.globalSearchInput, 'Global search input');
    // await this.elementActions.sendKeys(this.globalSearchInput, 'rate manager', 'Global search input');
    // await this.elementActions.click(this.rateManagerTopbarLink, 'Rate Manager topbar link');
    // await this.page.locator('div:nth-child(7) > div:nth-child(2) > .rounded').click();
    // await this.page.locator('div:nth-child(8) > .col-md-12 > .card > .text-warning > .mdi').click();
    await this.elementActions.click(this.sectionsButton, 'Sections button');
    await this.elementActions.click(this.advanceConfigurationLink, 'Advance Configuration link');

    await this.enableRatesInclusiveOfTaxes();
    await this.saveAdvanceConfiguration();
  }

  /**
   * Flow 2: Verify reservation with tax-inclusive rate.
   * Opens Guest Management → New Reservation → adds occupant → clicks Next → verifies amounts in grid.
   */
  async verifyTaxInclusiveReservation(expectedAmount: string): Promise<void> {
    logger.info(`Verifying tax-inclusive reservation shows amount: ${expectedAmount}`);

    await this.openGuestManagement();
    await this.openNewReservation();
    await this.addOccupant();

    // Click Next after adding occupant
    logger.info('Clicking Next after adding occupant');
    await this.elementActions.click(this.nextButton, 'Next button');

    // Verify the expected heading amounts are visible
    logger.info('Verifying heading amounts on the reservation summary');
    await expect(this.page.getByRole('heading', { name: '5,000.00' }).nth(1)).toBeVisible();
    await expect(this.page.getByRole('heading', { name: '4,464.29' }).first()).toBeVisible();
    await expect(this.page.getByRole('heading', { name: '267.86' }).first()).toBeVisible();
    await expect(this.page.getByRole('rowgroup').getByRole('heading', { name: '5,000.00' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: '5,000.00' }).nth(3)).toBeVisible();
    await expect(this.page.getByRole('heading', { name: '5,000.00' }).nth(4)).toBeVisible();

    // Interact with the dropdown search and dismiss it
    logger.info('Interacting with dropdown search input');
    const dropdownInput = this.page.locator('.row > div:nth-child(2) > drop-down-searchable > .custom-dropdown > .ng-select-container > .ng-value-container > .ng-input > input');
    await dropdownInput.click();
    const focusedDropdownInput = this.page.locator('.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-untouched.ng-pristine.ng-valid.ng-select-focused > .ng-select-container > .ng-value-container > .ng-input > input');
    await focusedDropdownInput.press('Escape');

    await this.closeReservation();
  }

  /**
   * Flow 7: Set rate amount → Save → Ensure "Rates Inclusive of Taxes" is disabled → Save
   */
  async runSetRateAndEnsureTaxExclusive(): Promise<void> {
    logger.info('Running flow: Set rate and ensure tax exclusive (toggle disabled)');

    await this.openRateManager();
    await this.page.locator('div:nth-child(7) > div:nth-child(2) > .rounded').click();
    await this.page.locator('div:nth-child(8) > .col-md-12 > .card > .text-warning > .mdi').click();
    await this.fillRateAmount(
      'tr:nth-child(4) > td:nth-child(4) > amount-control > .form-control',
      '5000'
    );
    await this.page.waitForTimeout(3000);

    await this.saveRateGrid();

    // Navigate to Sections > Advance Configuration
    await this.elementActions.click(this.sectionsButton, 'Sections button');
    await this.elementActions.click(this.advanceConfigurationLink, 'Advance Configuration link');

    // Ensure toggle is OFF (exclusive of taxes)
    await this.disableRatesInclusiveOfTaxes();
    await this.saveAdvanceConfiguration();
  }

  /**
   * Flow 8: Verify reservation with tax-exclusive rate.
   * Opens Guest Management → New Reservation → adds occupant → clicks Next → verifies exclusive amounts.
   */
  async verifyTaxExclusiveReservation(expectedAmount: string): Promise<void> {
    logger.info(`Verifying tax-exclusive reservation shows amount: ${expectedAmount}`);

    await this.openGuestManagement();
    await this.openNewReservation();
    await this.addOccupant();

    // Click Next after adding occupant
    logger.info('Clicking Next after adding occupant');
    await this.elementActions.click(this.nextButton, 'Next button');

    // Verify the expected heading amounts are visible (exclusive amounts)
    logger.info('Verifying heading amounts on the reservation summary (tax exclusive)');
    await expect(this.page.getByRole('heading', { name: expectedAmount }).first()).toBeVisible();
    await expect(this.page.getByRole('rowgroup').getByRole('heading', { name: expectedAmount })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: expectedAmount }).nth(3)).toBeVisible();

    // Interact with the dropdown search and dismiss it
    logger.info('Interacting with dropdown search input');
    const dropdownInput = this.page.locator('.row > div:nth-child(2) > drop-down-searchable > .custom-dropdown > .ng-select-container > .ng-value-container > .ng-input > input');
    await dropdownInput.click();
    const focusedDropdownInput = this.page.locator('.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-untouched.ng-pristine.ng-valid.ng-select-focused > .ng-select-container > .ng-value-container > .ng-input > input');
    await focusedDropdownInput.press('Escape');

    await this.closeReservation();
  }

  /**
   * Flow 3: Switch to Reservation Fixed Rate.
   */
  async switchToReservationFixedRate(): Promise<void> {
    logger.info('Switching to Reservation Fixed Rate configuration');

    // await this.openRateManager();
    // await this.page.locator('div:nth-child(7) > div:nth-child(2) > .rounded').click();
    // await this.page.locator('div:nth-child(8) > .col-md-12 > .card > .text-warning > .mdi').click();
    await this.elementActions.click(this.sectionsButton, 'Sections button');
    await this.elementActions.click(this.advanceConfigurationLink, 'Advance Configuration link');

    await this.disableRatesInclusiveOfTaxes();
    await this.enableReservationFixedRate();
    await this.saveAdvanceConfiguration();
  }

  /**
   * Flow 4: Verify reservation with fixed rate.
   */
  async verifyFixedRateReservation(expectedAmount: string): Promise<void> {
    logger.info(`Verifying fixed-rate reservation shows amount: ${expectedAmount}`);

    await this.openGuestManagement();
    await this.openNewReservation();
    await this.addOccupant();
    await this.expandRoomDetails();

    await this.verifyReservationTableAmount(expectedAmount);

    await this.closeReservation();
  }

  /**
   * Flow 5: Switch to Allow Override for Users.
   */
  async switchToAllowOverride(): Promise<void> {
    logger.info('Switching to Allow Override for Users configuration');

    // await this.openRateManager();
    // await this.page.locator('div:nth-child(7) > div:nth-child(2) > .rounded').click();
    // await this.page.locator('div:nth-child(8) > .col-md-12 > .card > .text-warning > .mdi').click();
    await this.elementActions.click(this.sectionsButton, 'Sections button');
    await this.elementActions.click(this.advanceConfigurationLink, 'Advance Configuration link');

    await this.disableReservationFixedRate();
    await this.enableAllowOverrideForUsers();
    await this.saveAdvanceConfiguration();
  }

  /**
   * Flow 6: Verify rate override in reservation.
   */
  async verifyRateOverride(
    originalAmount: string,
    overrideAmount: string
  ): Promise<void> {
    logger.info(`Verifying rate override from ${originalAmount} to ${overrideAmount}`);

    await this.openGuestManagement();
    await this.openNewReservation();
    await this.addOccupant();
    await this.expandRoomDetails();

    await this.overrideRateAmount(originalAmount, overrideAmount);
    await this.confirmSystemRateChange();

    await this.expandRoomDetails();
    await this.verifyOverriddenRate(overrideAmount);

    await this.closeReservation();
  }
}
