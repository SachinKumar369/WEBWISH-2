import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { GuestManagementPage } from '../../src/pages/FrontDesk/GuestManagementPage';
import { PostAdvancePage } from '../../src/pages/Cashiering/PostAdvancePage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe('Cashiering - Post Advance (Cash Collection)', () => {
  let postAdvancePage: PostAdvancePage;

  test.beforeEach(async ({ page, context }) => {
    postAdvancePage = new PostAdvancePage(page, context);
    logger.info(`Starting test: ${test.info().title}`);

    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.afterEach(async ({ page }) => {
    logger.info(`Test finished: ${test.info().title}`);

    // Take screenshot if test failed
    if (test.info().status === 'failed') {
      const screenshotPath = await page.screenshot({
        path: `screenshots/test_failure_${test.info().title}.png`,
        fullPage: true,
      });
      logger.error(`Test failed. Screenshot: ${screenshotPath}`);
    }

    // Check if browser should stay open
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';

    if (keepBrowserOpen) {
      logger.info('🔒 KEEP_BROWSER_OPEN is enabled. Browser will stay open. Press any key in console to continue...');
      await page.pause();
    } else {
      const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '5000', 10);
      logger.info(`⏸️  Pausing for ${pauseDuration}ms before browser closes... You can inspect the page.`);
      await page.waitForTimeout(pauseDuration);
      logger.info('✅ Resuming - Browser will close now');
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TC_CASH_ADV_001: Full Post Advance flow using page object convenience method
  // ═══════════════════════════════════════════════════════════════════════
  test('TC_CASH_ADV_001: Post advance via cash collection for first available guest', async ({ page, context }) => {
    try {
      logger.info('Starting Post Advance Cash Collection test (full flow)');

      // ── Login & Property Selection ────────────────────────────────────
      const loginPage = new LoginPage(page, context);
      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info('Step 1: Login and select property');
      await loginPage.loginWithPropertySelection(user.username, user.password, 1);
      await page.waitForTimeout(2000);

      // ── Navigate to Guest Management ──────────────────────────────────
      logger.info('Step 2: Navigate to Guest Management');
      await postAdvancePage.navigateToGuestManagement();
      await page.waitForTimeout(1000);

      // ── Perform complete Post Advance flow ────────────────────────────
      logger.info('Step 3-10: Perform Post Advance Cash Collection flow');
      await postAdvancePage.performPostAdvance(
        user.password, // Same password used for login
        '1000',        // Amount to collect
        'Test Payment' // Reference text
      );

      // ── Take success screenshot ───────────────────────────────────────
      await page.screenshot({
        path: 'screenshots/post_advance_success.png',
        fullPage: true,
      });

      logger.info('✅ Post Advance Cash Collection test completed successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TC_CASH_ADV_002: Post Advance with step-by-step execution and assertions
  // ═══════════════════════════════════════════════════════════════════════
  test('TC_CASH_ADV_002: Post advance step-by-step with individual validations', async ({ page, context }) => {
    try {
      logger.info('Starting Post Advance step-by-step test');

      // ── Login & Property Selection ────────────────────────────────────
      const loginPage = new LoginPage(page, context);
      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info('Step 1: Login and select property');
      await loginPage.loginWithPropertySelection(user.username, user.password, 2);
      await page.waitForTimeout(2000);

      // ── Navigate to Guest Management ──────────────────────────────────
      logger.info('Step 2: Navigate to Guest Management');
      await postAdvancePage.navigateToGuestManagement();
      await page.waitForTimeout(1000);

      // ── Verify Guest Management page loaded ───────────────────────────
      await expect(page.locator('h3:has-text("Guest Management")')).toBeVisible();
      logger.info('✅ Guest Management page verified');

      // ── Select first guest ────────────────────────────────────────────
      logger.info('Step 3: Select first guest');
      await postAdvancePage.selectFirstGuest();
      await expect(postAdvancePage['viewCashieringButton']).toBeVisible();
      logger.info('✅ Guest selected, View Cashiering button visible');

      // ── Click View Cashiering ─────────────────────────────────────────
      logger.info('Step 4: Click View Cashiering');
      await postAdvancePage.clickViewCashiering();

      // ── Validate password ─────────────────────────────────────────────
      logger.info('Step 5: Enter password');
      await postAdvancePage.validatePassword(user.password);

      // Verify Cashiering page loaded
      await expect(page.locator('h3:has-text("Cashiering")')).toBeVisible();
      logger.info('✅ Cashiering page verified');

      // ── Collect Payment ───────────────────────────────────────────────
      logger.info('Step 6: Click Collect Payment');
      await postAdvancePage.clickCollectPayment();

      // ── Select Cash Collection ────────────────────────────────────────
      logger.info('Step 7: Select Cash Collection');
      await postAdvancePage.selectCashCollection();

      // ── Click Next ────────────────────────────────────────────────────
      logger.info('Step 8: Click Next');
      await postAdvancePage.clickNext();

      // Verify Cash Collection form
      await expect(page.locator('h5:has-text("Cash Collection")')).toBeVisible();
      logger.info('✅ Cash Collection form verified');

      // ── Enter amount ──────────────────────────────────────────────────
      logger.info('Step 9: Enter amount 1000');
      await postAdvancePage.enterAmount('1000');

      // ── Enter reference ───────────────────────────────────────────────
      logger.info('Step 10: Enter reference');
      await postAdvancePage.enterReference();

      // ── Click Post ────────────────────────────────────────────────────
      logger.info('Step 11: Click Post');
      await postAdvancePage.clickPost();

      // ── Verify success message ────────────────────────────────────────
      logger.info('Step 12: Verify success message');
      await postAdvancePage.verifySuccessAndDismiss('Details created/updated successfully.');

      // ── Take success screenshot ───────────────────────────────────────
      await page.screenshot({
        path: 'screenshots/post_advance_step_by_step_success.png',
        fullPage: true,
      });

      logger.info('✅ Post Advance step-by-step test completed successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TC_CASH_ADV_003: Post Advance with validation error (missing reference)
  // ═══════════════════════════════════════════════════════════════════════
  test('TC_CASH_ADV_003: Post advance fails when reference field is empty', async ({ page, context }) => {
    try {
      logger.info('Starting Post Advance validation error test');

      // ── Login & Property Selection ────────────────────────────────────
      const loginPage = new LoginPage(page, context);
      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info('Step 1: Login and select property');
      await loginPage.loginWithPropertySelection(user.username, user.password, 2);
      await page.waitForTimeout(2000);

      // ── Navigate to Guest Management ──────────────────────────────────
      logger.info('Step 2: Navigate to Guest Management');
      await postAdvancePage.navigateToGuestManagement();
      await page.waitForTimeout(1000);

      // ── Select guest and open cashiering ──────────────────────────────
      logger.info('Step 3: Select guest and open cashiering');
      await postAdvancePage.selectFirstGuest();
      await postAdvancePage.clickViewCashiering();
      await postAdvancePage.validatePassword(user.password);

      // ── Collect Payment flow WITHOUT reference ────────────────────────
      logger.info('Step 4: Open Cash Collection without reference');
      await postAdvancePage.clickCollectPayment();
      await postAdvancePage.selectCashCollection();
      await postAdvancePage.clickNext();
      await postAdvancePage.enterAmount('1000');
      // Intentionally NOT entering reference

      // ── Click Post and expect validation error ────────────────────────
      logger.info('Step 5: Click Post and expect validation error');
      await postAdvancePage.clickPost();

      // Verify the mandatory fields error
      await postAdvancePage.verifyErrorAndDismiss('Please Fill All *Mandatory Fields..!');
      logger.info('✅ Validation error displayed as expected');

      // Take screenshot of the error state
      await page.screenshot({
        path: 'screenshots/post_advance_validation_error.png',
        fullPage: true,
      });

      // Close the dialog
      await postAdvancePage['closeButton'].click();

      logger.info('✅ Post Advance validation error test completed successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });
});
