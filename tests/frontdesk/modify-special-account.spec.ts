// import { test, expect } from '@playwright/test';
// import { LoginPage } from '../../src/pages/LoginPage';
// import { SpecialAccountPage } from '../../src/pages/FrontDesk/SpecialAccountPage';
// import { testDataManager } from '../../src/utils/TestDataManager';
// import logger from '../../src/core/Logger';

// test.describe('Frontdesk - Modify Special Accounts', () => {
//   let specialAccountPage: SpecialAccountPage;

//   test.beforeEach(async ({ page, context }) => {
//     specialAccountPage = new SpecialAccountPage(page, context);
//     logger.info(`Starting test: ${test.info().title}`);
//     await page.setViewportSize({ width: 1280, height: 720 });
//   });

//   test.afterEach(async ({ page }) => {
//     logger.info(`Finished test: ${test.info().title}`);
//     if (test.info().status === 'failed') {
//       const path = await page.screenshot({
//         path: `screenshots/${test.info().title.replace(/\s+/g, '_')}.png`,
//         fullPage: true
//       });
//       logger.error(`Failure screenshot: ${path}`);
//     }

//     // Check if browser should stay open
//     const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
//     if (keepBrowserOpen) {
//       logger.info('🔒 KEEP_BROWSER_OPEN is enabled. Browser will stay open. Press any key in console to continue...');
//       await page.pause();
//     } else {
//       // Pause before closing browser so you can see the result
//       const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '5000', 10);
//       logger.info(`⏸️  Pausing for ${pauseDuration}ms before browser closes... You can inspect the page.`);
//       await page.waitForTimeout(pauseDuration);
//       logger.info('✅ Resuming - Browser will close now');
//     }
//   });

//   test('FD_MODIFY_SPECIAL_001: Modify header details of special account', async ({ page, context }) => {
//     // Login and property select
//     const loginPage = new LoginPage(page, context);
//     const user = await testDataManager.getUserCredentials('all');
//     expect(user).toBeDefined();

//     logger.info('Logging in and selecting property');
//     await loginPage.loginWithPropertySelection(user.username, user.password, 2);

//     // Wait for navigation
//     await page.waitForTimeout(2000);

//     // Navigate to special accounts
//     await specialAccountPage.searchAndOpenSpecialAccounts('Special Accounts');
//     await specialAccountPage.waitForPageLoad();

//     logger.info('Special Accounts page loaded');

//     // Click the first special account
//     await specialAccountPage.clickFirstSpecialAccount();

//     // Modify header details
//     const newAccountName = 'MODIFIED ACCOUNT';
//     await specialAccountPage.modifyHeaderDetails(newAccountName);

//     // Verify the changes
//     const isVerified = await specialAccountPage.verifyHeaderDetailsUpdated(newAccountName);
//     //expect(isVerified).toBeTruthy();
//    // expect(isVerified).toBe(true);

//     logger.info('Header details modification verified');
//     await page.screenshot({ path: 'screenshots/FD_MODIFY_SPECIAL_001.png', fullPage: true });
//   });

//   test('FD_MODIFY_SPECIAL_002: Modify billing details of special account', async ({ page, context }) => {
//     // Login and property select
//     const loginPage = new LoginPage(page, context);
//     const user = await testDataManager.getUserCredentials('all');
//     expect(user).toBeDefined();

//     logger.info('Logging in and selecting property');
//     await loginPage.loginWithPropertySelection(user.username, user.password, 2);

//     // Wait for navigation
//     await page.waitForTimeout(2000);

//     // Navigate to special accounts
//     await specialAccountPage.searchAndOpenSpecialAccounts('Special Accounts');
//     await specialAccountPage.waitForPageLoad();

//     logger.info('Special Accounts page loaded');

//     // Click the first special account
//     await specialAccountPage.clickFirstSpecialAccount();

//     // Modify billing details
//     const newBillTo = 'mODIFIED bILLING dETAILS';
//     const newCity = 'DELHI';
//     await specialAccountPage.modifyBillingDetails(newBillTo, '', newCity);

//     // Verify the changes
//     const isVerified = await specialAccountPage.verifyBillingDetailsUpdated(newBillTo);
//     expect(isVerified).toBeTruthy();

//     logger.info('Billing details modification verified');
//     await page.screenshot({ path: 'screenshots/FD_MODIFY_SPECIAL_002.png', fullPage: true });
//   });

//   test('FD_MODIFY_SPECIAL_003: Modify membership details of special account', async ({ page, context }) => {
//     // Login and property select
//     const loginPage = new LoginPage(page, context);
//     const user = await testDataManager.getUserCredentials('all');
//     expect(user).toBeDefined();

//     logger.info('Logging in and selecting property');
//     await loginPage.loginWithPropertySelection(user.username, user.password, 2);

//     // Wait for navigation
//     await page.waitForTimeout(2000);

//     // Navigate to special accounts
//     await specialAccountPage.searchAndOpenSpecialAccounts('Special Accounts');
//     await specialAccountPage.waitForPageLoad();

//     logger.info('Special Accounts page loaded');

//     // Click the first special account
//     await specialAccountPage.clickFirstSpecialAccount();

//     // Modify membership details
//     await specialAccountPage.modifyMembershipDetails();

//     logger.info('Membership details modification completed');
//     await page.screenshot({ path: 'screenshots/FD_MODIFY_SPECIAL_003.png', fullPage: true });
//   });

//   test('FD_MODIFY_SPECIAL_004: Modify all special account details in sequence', async ({ page, context }) => {
//     // Login and property select
//     const loginPage = new LoginPage(page, context);
//     const user = await testDataManager.getUserCredentials('all');
//     expect(user).toBeDefined();

//     logger.info('Logging in and selecting property');
//     await loginPage.loginWithPropertySelection(user.username, user.password, 2);

//     // Wait for navigation
//     await page.waitForTimeout(2000);

//     // Navigate to special accounts
//     await specialAccountPage.searchAndOpenSpecialAccounts('Special Accounts');
//     await specialAccountPage.waitForPageLoad();

//     logger.info('Special Accounts page loaded');

//     // Click the first special account
//     await specialAccountPage.clickFirstSpecialAccount();

//     // Step 1: Modify header details
//     logger.info('Step 1: Modifying header details');
//     const newAccountName = 'mODIFIED ACCOUNT';
//     await specialAccountPage.modifyHeaderDetails(newAccountName);

//     // Step 2: Modify billing details
//     logger.info('Step 2: Modifying billing details');
//     const newBillTo = 'mODIFIED bILLING dETAILS';
//     const newCity = 'DELHI';
//     await specialAccountPage.modifyBillingDetails(newBillTo, '', newCity);

//     // Step 3: Modify membership details
//     logger.info('Step 3: Modifying membership details');
//     await specialAccountPage.modifyMembershipDetails();

//     // Verify all changes
//     logger.info('Verifying all modifications');
//     const headerVerified = await specialAccountPage.verifyHeaderDetailsUpdated(newAccountName);
//     const billingVerified = await specialAccountPage.verifyBillingDetailsUpdated(newBillTo);

//     expect(headerVerified).toBeTruthy();
//     expect(billingVerified).toBeTruthy();

//     logger.info('All modifications verified successfully');
//     await page.screenshot({ path: 'screenshots/FD_MODIFY_SPECIAL_004.png', fullPage: true });
//   });
// });




import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { SpecialAccountPage } from '../../src/pages/FrontDesk/SpecialAccountPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe.serial('Frontdesk - Modify Special Accounts', () => {
  let specialAccountPage: SpecialAccountPage;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    specialAccountPage = new SpecialAccountPage(page, context);

    const loginPage = new LoginPage(page, context);
    const user = await testDataManager.getUserCredentials('all');

    logger.info('Logging in and selecting property');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await page.waitForTimeout(2000);
    await specialAccountPage.searchAndOpenSpecialAccounts('Special Accounts');
    await specialAccountPage.waitForPageLoad();
    await specialAccountPage.clickFirstSpecialAccount();

    logger.info('Initial navigation completed');
  });

  test('FD_MODIFY_SPECIAL_001: Modify header details', async () => {
    const newAccountName = 'MODIFIED ACCOUNT';
    await specialAccountPage.modifyHeaderDetails(newAccountName);

    const isVerified = await specialAccountPage.verifyHeaderDetailsUpdated(newAccountName);
    expect(isVerified).toBeTruthy();

    logger.info('Header modification verified');
  });

  test('FD_MODIFY_SPECIAL_002: Modify billing details', async () => {
    const newBillTo = 'MODIFIED BILLING DETAILS';
    const newCity = 'DELHI';

    await specialAccountPage.modifyBillingDetails(newBillTo, '', newCity);

    const isVerified = await specialAccountPage.verifyBillingDetailsUpdated(newBillTo);
    expect(isVerified).toBeTruthy();

    logger.info('Billing modification verified');
  });

  test('FD_MODIFY_SPECIAL_003: Modify membership details', async () => {
    await specialAccountPage.modifyMembershipDetails();
    logger.info('Membership modification completed');
  });

  test('FD_MODIFY_SPECIAL_004: Verify all modifications', async () => {
    const headerVerified = await specialAccountPage.verifyHeaderDetailsUpdated('MODIFIED ACCOUNT');
    const billingVerified = await specialAccountPage.verifyBillingDetailsUpdated('MODIFIED BILLING DETAILS');

    expect(headerVerified).toBeTruthy();
    expect(billingVerified).toBeTruthy();

    logger.info('All modifications verified successfully');
  });

  test.afterAll(async () => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after suite...');
      await specialAccountPage.page.pause();
    }
  });
});