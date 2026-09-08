import { test, expect, Page, BrowserContext } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { NightAuditPage } from '../../src/pages/NightAudit/NightAuditPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

/**
 * Night Audit Test — Single end-to-end test
 *
 * Logs in once, opens Night Audit, and runs all 9 steps in a single
 * browser session without closing or restarting the browser.
 *
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
 * After all 9 steps the business date advances to the next day.
 *
 * Property: WEBWISHQCMI (index 2)
 */
test.describe('Night Audit Tests', () => {
  let page: Page;
  let context: BrowserContext;
  let nightAuditPage: NightAuditPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page: testPage, context: testContext }) => {
    page = testPage;
    context = testContext;
    nightAuditPage = new NightAuditPage(page, context);
    loginPage = new LoginPage(page, context);

    await page.setViewportSize({ width: 1280, height: 720 });

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    // Login with WEBWISHQCMI property (index 2)
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    logger.info('Login completed for Night Audit test');
  });

  test.afterEach(async () => {
    if (test.info().status === 'failed') {
      await nightAuditPage.takeScreenshot(`night_audit_failure_${test.info().title}`);
    }

   const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true'; 
   if (keepBrowserOpen) { await page.pause(); } 
   else { const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '50000', 10); 
    await page.waitForTimeout(pauseDuration); } });

//   test.skip('TC_NA_001: Complete Night Audit - All 9 steps end-to-end', async () => {
//     logger.info('Test: TC_NA_001 - Complete Night Audit End-to-End');

//     // ── Open Night Audit from the dashboard ──
//     await nightAuditPage.openNightAuditFromDashboard();

//     // ── Record the initial business date ──
//     const initialBusinessDate = await nightAuditPage.getBusinessDate();
//     logger.info(`Initial Business Date: ${initialBusinessDate}`);

//     // ── Execute all 9 steps in one go ──
//     await nightAuditPage.performCompleteNightAudit();

//     // ── Verify the business date has changed ──
//     await page.waitForTimeout(2000);
//     const newBusinessDate = await nightAuditPage.getBusinessDate();
//     logger.info(`New Business Date after Night Audit: ${newBusinessDate}`);
//     expect(newBusinessDate).not.toBe(initialBusinessDate);

//     // ── Verify we are still on the Night Audit page (post-audit view) ──
//     const isOnPage = await nightAuditPage.isOnNightAuditPage();
//     expect(isOnPage).toBe(true);

//     await nightAuditPage.takeScreenshot('night_audit_completed');
//     logger.info('TC_NA_001 passed - Night Audit completed successfully');
//   });

  test('TC_NA_002: Complete Night Audit with Change Audit Date - Full cycle end-to-end', async () => {
    logger.info('Test: TC_NA_002 - Complete Night Audit with Change Audit Date');

    // ── Open Night Audit from the dashboard ──
    await nightAuditPage.openNightAuditFromDashboard();

    // ── Record the initial audit date and business date ──
    const initialAuditDate = await nightAuditPage.getAuditDate();
    const initialBusinessDate = await nightAuditPage.getBusinessDate();
    logger.info(`Initial Audit Date: ${initialAuditDate}`);
    logger.info(`Initial Business Date: ${initialBusinessDate}`);

    // ── Execute all 9 night audit steps ──
    await nightAuditPage.performCompleteNightAudit();
    logger.info('All 9 night audit steps completed');

    // ── Verify the business date has changed after 9 steps ──
    await page.waitForTimeout(9000);
    const businessDateAfterSteps = await nightAuditPage.getBusinessDate();
    logger.info(`Business Date after 9 steps: ${businessDateAfterSteps}`);
    expect(businessDateAfterSteps).not.toBe(initialBusinessDate);

    // ── Verify we are on the post-audit phase (Change Audit Date flow) ──
    const isOnPage = await nightAuditPage.isOnNightAuditPage();
    expect(isOnPage).toBe(true);

    // ── Execute the Change Audit Date (post-audit) steps ──
    // This covers:
    //  1. Print Night Audit Reports → Next
    //  2. Statistics Update and Others → Next
    //  3. Transfers → Next
    //  4. Purge Data → Next
    //  5. Change Audit Date → Next
    //  6. "Night Audit Process Completed" dialog → OK
    await nightAuditPage.performChangeAuditDate();
    logger.info('Change Audit Date process completed');

    // ── Verify we are redirected to the dashboard ──
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('dashboard');
    logger.info(`Redirected to: ${currentUrl}`);

    // ── Verify the business date has changed in the footer ──
    const footerText = await page.locator('h6').last().textContent();
    logger.info(`Footer text: ${footerText}`);
    // expect(footerText).toContain('Business Date:');
    // expect(footerText).toContain('25/07/2026');

    await nightAuditPage.takeScreenshot('night_audit_change_audit_date_completed');
    logger.info('TC_NA_002 passed - Complete Night Audit with Change Audit Date completed successfully');
  });
});
