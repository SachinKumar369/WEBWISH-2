import { Page, BrowserContext, expect } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import { WaitUtils } from '../../utils/WaitUtils';
import logger from '../../core/Logger';

/**
 * PostAdvancePage - Page Object for Post Advance (Cash Collection) flow in Cashiering.
 *
 * Flow:
 * 1. From Guest Management, select a guest via checkbox
 * 2. Click "View Cashiering" button
 * 3. Enter password in Validate Password dialog
 * 4. Click "Collect Payment" on the Cashiering page
 * 5. Select "Cash Collection" payment method
 * 6. Click Next
 * 7. Enter amount and reference
 * 8. Click Post
 * 9. Verify success message and dismiss
 */
export class PostAdvancePage extends BasePage {
  private elementActions: ElementActions;
  private waitUtils: WaitUtils;

  // ── Sidebar Navigation ────────────────────────────────────────────────
  private get frontDeskLink() {
    return this.page.getByRole('link', { name: 'Front Desk' });
  }

  private get guestManagementLink() {
    return this.page.getByRole('link', { name: 'Guest Management' });
  }

  // ── Guest Management Page ─────────────────────────────────────────────
  private get guestManagementHeading() {
    return this.page.locator('h3:has-text("Guest Management")');
  }

  private get guestCheckbox() {
    return this.page.locator('cdk-virtual-scroll-viewport').getByRole('checkbox');
  }

  private get viewCashieringButton() {
    return this.page.getByRole('button', { name: 'View Cashiering' });
  }

  // ── Validate Password Dialog ──────────────────────────────────────────
  private get passwordDialog() {
    return this.page.getByRole('dialog').filter({ hasText: 'Validate Password' });
  }

  private get passwordInput() {
    return this.passwordDialog.getByRole('textbox', { name: 'Enter password' });
  }

  private get passwordOkButton() {
    return this.passwordDialog.getByRole('button', { name: 'Ok' });
  }

  // ── Cashiering Page ───────────────────────────────────────────────────
  private get cashieringHeading() {
    return this.page.locator('h3:has-text("Cashiering")');
  }

  private get collectPaymentButton() {
    return this.page.getByRole('button', { name: 'Collect Payment' });
  }

  // ── Collect Payment Dialog ────────────────────────────────────────────
  private get collectPaymentDialog() {
    return this.page.getByRole('dialog').filter({ hasText: 'Collect Payment' });
  }

  private get cashCollectionOption() {
    return this.collectPaymentDialog.getByText('Cash Collection', { exact: false });
  }

  private get collectPaymentNextButton() {
    return this.collectPaymentDialog.getByRole('button', { name: 'Next' });
  }

  // ── Cash Collection Form ──────────────────────────────────────────────
  private get cashCollectionHeading() {
    return this.collectPaymentDialog.locator('h5:has-text("Cash Collection")');
  }

  private get amountInput() {
    return this.collectPaymentDialog.locator('amount-control').getByRole('textbox');
  }

  private get amountDisplay() {
    return this.collectPaymentDialog.locator('amount-control').locator('h5');
  }

  private get referenceInput() {
    return this.collectPaymentDialog.locator('input-control').getByRole('textbox');
  }

  private get remarksInput() {
    return this.collectPaymentDialog.locator('input-control').nth(1).getByRole('textbox');
  }

  private get postButton() {
    return this.collectPaymentDialog.getByRole('button', { name: 'Post' });
  }

  private get backButton() {
    return this.collectPaymentDialog.getByRole('button', { name: 'Back' });
  }

  private get closeButton() {
    return this.collectPaymentDialog.getByRole('button', { name: 'Close' });
  }

  // ── SweetAlert / Success / Error ──────────────────────────────────────
  private get swalMessage() {
    return this.page.locator('#swal2-html-container');
  }

  private get swalOkButton() {
    return this.page.locator('button.swal2-confirm, button:has-text("OK")').first();
  }

  // ── Constructor ───────────────────────────────────────────────────────
  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.waitUtils = new WaitUtils(page);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Navigation Methods
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Hover on left sidebar to expand the menu and click Front Desk → Guest Management.
   */
  async navigateToGuestManagement(): Promise<void> {
    try {
      logger.info('Navigating to Guest Management via Front Desk sidebar');

      // Hover on left sidebar area to expand the menu icons
    //   const sidebarRegion = this.page.locator('.scrollable-content, [class*="scrollable"]').first();
    //   await sidebarRegion.hover();
    //   await this.page.waitForTimeout(500);

    await this.page.mouse.move(0, 500);

      // Click Front Desk to expand submenu
      await this.elementActions.click(this.frontDeskLink, 'Front Desk menu');
      await this.page.waitForTimeout(500);

      // Click Guest Management
      await this.elementActions.click(this.guestManagementLink, 'Guest Management menu');

      // Wait for Guest Management heading
      await this.elementActions.waitForElement(this.guestManagementHeading, 15000, 'Guest Management heading');
      logger.info('✅ Guest Management page loaded');
    } catch (error) {
      logger.error(`Failed to navigate to Guest Management: ${error}`);
      await this.takeScreenshot('nav_guest_mgmt_failure');
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Guest Selection
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Select the first available guest by clicking the checkbox next to the guest row.
   */
  async selectFirstGuest(): Promise<void> {
    try {
      logger.info('Selecting first available guest by clicking checkbox');

      // Wait for guest list to be visible
      await this.page.waitForTimeout(1000);

      // Click the first row checkbox (not the header checkbox)
      const firstRowCheckbox = this.page
        .locator('cdk-virtual-scroll-viewport')
        .getByRole('checkbox')
        .first();

      await this.elementActions.click(firstRowCheckbox, 'First guest row checkbox');

      // Verify the View Cashiering button is now visible
      await this.elementActions.waitForElement(
        this.viewCashieringButton,
        5000,
        'View Cashiering button'
      );
      logger.info('✅ Guest selected, View Cashiering button is visible');
    } catch (error) {
      logger.error(`Failed to select guest: ${error}`);
      await this.takeScreenshot('select_guest_failure');
      throw error;
    }
  }

  /**
   * Click the "View Cashiering" button for the selected guest.
   */
  async clickViewCashiering(): Promise<void> {
    try {
      logger.info('Clicking View Cashiering button');
      await this.elementActions.click(this.viewCashieringButton, 'View Cashiering button');
      logger.info('✅ View Cashiering button clicked');
    } catch (error) {
      logger.error(`Failed to click View Cashiering: ${error}`);
      await this.takeScreenshot('view_cashiering_failure');
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Password Validation
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Enter password in the Validate Password dialog and click OK.
   * @param password - The login password to validate cashiering access
   */
  async validatePassword(password: string): Promise<void> {
    try {
      logger.info('Entering password in Validate Password dialog');

      // Wait for the password dialog to appear
      await this.elementActions.waitForElement(this.passwordDialog, 10000, 'Validate Password dialog');

      // Enter password
      await this.elementActions.sendKeys(this.passwordInput, password, 'Password field');

      // Click OK
      await this.elementActions.click(this.passwordOkButton, 'Password OK button');

      // Wait for Cashiering page to load
      await this.elementActions.waitForElement(this.cashieringHeading, 15000, 'Cashiering heading');
      logger.info('✅ Password validated, Cashiering page loaded');
    } catch (error) {
      logger.error(`Failed to validate password: ${error}`);
      await this.takeScreenshot('validate_password_failure');
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Collect Payment Flow
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Click "Collect Payment" on the Cashiering page.
   */
  async clickCollectPayment(): Promise<void> {
    try {
      logger.info('Clicking Collect Payment button');
      await this.elementActions.click(this.collectPaymentButton, 'Collect Payment button');

      // Wait for Collect Payment dialog
      await this.elementActions.waitForElement(
        this.collectPaymentDialog,
        10000,
        'Collect Payment dialog'
      );
      logger.info('✅ Collect Payment dialog opened');
    } catch (error) {
      logger.error(`Failed to click Collect Payment: ${error}`);
      await this.takeScreenshot('collect_payment_failure');
      throw error;
    }
  }

  /**
   * Select "Cash Collection" from the payment method options.
   */
  async selectCashCollection(): Promise<void> {
    try {
      logger.info('Selecting Cash Collection payment method');

      // Wait for SweetAlert overlay to clear if present
      try {
        const swalOverlay = this.page.locator('.swal2-container');
        if (await swalOverlay.isVisible({ timeout: 1000 })) {
          logger.warn('SweetAlert overlay detected, waiting for it to disappear');
          await swalOverlay.waitFor({ state: 'hidden', timeout: 5000 });
        }
      } catch {
        // No overlay, proceed
      }

      await this.elementActions.click(this.cashCollectionOption, 'Cash Collection option');

      // Verify Next button is now enabled
      await this.page.waitForTimeout(500);
      const nextButton = this.collectPaymentNextButton;
      await expect(nextButton).toBeEnabled({ timeout: 5000 });

      logger.info('✅ Cash Collection selected, Next button enabled');
    } catch (error) {
      logger.error(`Failed to select Cash Collection: ${error}`);
      await this.takeScreenshot('select_cash_collection_failure');
      throw error;
    }
  }

  /**
   * Click the "Next" button in the Collect Payment dialog.
   */
  async clickNext(): Promise<void> {
    try {
      logger.info('Clicking Next button in Collect Payment dialog');
      await this.elementActions.click(this.collectPaymentNextButton, 'Next button');

      // Wait for Cash Collection form to appear
      await this.elementActions.waitForElement(this.cashCollectionHeading, 5000, 'Cash Collection heading');
      logger.info('✅ Cash Collection form loaded');
    } catch (error) {
      logger.error(`Failed to click Next: ${error}`);
      await this.takeScreenshot('click_next_failure');
      throw error;
    }
  }

  /**
   * Enter the payment amount in the Cash Collection form.
   * @param amount - The amount to enter (e.g., '1000')
   */
  async enterAmount(amount: string): Promise<void> {
    try {
      logger.info(`Entering amount: ${amount}`);

      const amountField = this.amountInput;
      await amountField.click();

      // Clear and type using pressSequentially for accurate input
      await amountField.press('Control+a');
      await amountField.pressSequentially(amount, { delay: 50 });

      // Verify the amount display
      await this.page.waitForTimeout(300);
      const formattedAmount = parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    //   await expect(this.amountDisplay).toContainText(formattedAmount);
    //   logger.info(`✅ Amount entered: ${formattedAmount}`);
    } catch (error) {
      logger.error(`Failed to enter amount: ${error}`);
      await this.takeScreenshot('enter_amount_failure');
      throw error;
    }
  }

  /**
   * Enter a reference text in the Reference field.
   * @param reference - Reference text for the payment
   */
//   async enterReference(reference: string): Promise<void> {
//     try {
//       logger.info(`Entering reference: ${reference}`);
//       await this.elementActions.sendKeys(this.referenceInput, reference, 'Reference field');
//       logger.info(`✅ Reference entered: ${reference}`);
//     } catch (error) {
//       logger.error(`Failed to enter reference: ${error}`);
//       await this.takeScreenshot('enter_reference_failure');
//       throw error;
//     }
//   }

async enterReference(): Promise<string> {
  try {
    const reference = `REF_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    logger.info(`Entering unique reference: ${reference}`);

    await this.elementActions.sendKeys(
      this.referenceInput,
      reference,
      'Reference field'
    );

    logger.info(`✅ Reference entered: ${reference}`);

    return reference;
  } catch (error) {
    logger.error(`Failed to enter reference: ${error}`);
    await this.takeScreenshot('enter_reference_failure');
    throw error;
  }
}

  /**
   * Click the "Post" button to submit the payment.
   */
  async clickPost(): Promise<void> {
    try {
      logger.info('Clicking Post button');
      await this.elementActions.click(this.postButton, 'Post button');
      logger.info('✅ Post button clicked');
    } catch (error) {
      logger.error(`Failed to click Post: ${error}`);
      await this.takeScreenshot('click_post_failure');
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Success / Error Handling
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Verify the success message and click OK.
   * @param expectedMessage - Expected success message text
   */
  async verifySuccessAndDismiss(expectedMessage: string = 'Details created/updated successfully.'): Promise<void> {
    try {
      logger.info(`Verifying success message: "${expectedMessage}"`);
      await this.elementActions.waitForElement(this.swalMessage, 10000, 'Success message');
      await expect(this.swalMessage).toContainText(expectedMessage);
      logger.info(`✅ Success message verified: "${expectedMessage}"`);

      // Click OK to dismiss
      await this.elementActions.click(this.swalOkButton, 'Success OK button');
      logger.info('✅ Success dialog dismissed');
    } catch (error) {
      logger.error(`Failed to verify success message: ${error}`);
      await this.takeScreenshot('verify_success_failure');
      throw error;
    }
  }

  /**
   * Verify the error message and click OK.
   * @param expectedMessage - Expected error message text
   */
  async verifyErrorAndDismiss(expectedMessage: string): Promise<void> {
    try {
      logger.info(`Verifying error message: "${expectedMessage}"`);
      await this.elementActions.waitForElement(this.swalMessage, 10000, 'Error message');
      await expect(this.swalMessage).toContainText(expectedMessage);
      logger.info(`✅ Error message verified: "${expectedMessage}"`);

      // Click OK to dismiss
      await this.elementActions.click(this.swalOkButton, 'Error OK button');
      logger.info('✅ Error dialog dismissed');
    } catch (error) {
      logger.error(`Failed to verify error message: ${error}`);
      await this.takeScreenshot('verify_error_failure');
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Convenience: Full Post Advance Flow
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Execute the complete Post Advance (Cash Collection) flow.
   * Assumes the user is already logged in and on the Guest Management page.
   *
   * @param password - The login password for cashiering validation
   * @param amount - The amount to collect (e.g., '1000')
   * @param reference - Reference text for the payment
   */
  async performPostAdvance(
    password: string,
    amount: string,
    reference: string = 'Test Payment'
  ): Promise<void> {
    try {
      logger.info('Starting Post Advance (Cash Collection) flow');

      // Step 1: Select first guest
      await this.selectFirstGuest();

      // Step 2: Click View Cashiering
      await this.clickViewCashiering();

      // Step 3: Enter password
      await this.validatePassword(password);

      // Step 4: Click Collect Payment
      await this.clickCollectPayment();

      // Step 5: Select Cash Collection
      await this.selectCashCollection();

      // Step 6: Click Next
      await this.clickNext();

      // Step 7: Enter amount
      await this.enterAmount(amount);

      // Step 8: Enter reference
      await this.enterReference(reference);

      // Step 9: Click Post
      await this.clickPost();

      // Step 10: Verify success
      await this.verifySuccessAndDismiss('Details created/updated successfully.');

      logger.info('✅ Post Advance (Cash Collection) flow completed successfully');
    } catch (error) {
      logger.error(`Post Advance flow failed: ${error}`);
      await this.takeScreenshot('post_advance_flow_failure');
      throw error;
    }
  }
}
