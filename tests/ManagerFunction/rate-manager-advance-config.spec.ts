import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { RateManagerAdvanceConfigPage } from '../../src/pages/ManagerFunction/RateManagerAdvanceConfigPage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe('Manager Function - Rate Manager Advance Configuration', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test.only('MGR_ADVCFG_001: Verify rates inclusive of taxes shows correct amount in reservation', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const advanceConfigPage = new RateManagerAdvanceConfigPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Step 1: Set rate to 1000 and enable "Rates Inclusive of Taxes"
    logger.info('Step 1: Setting rate amount and enabling tax-inclusive pricing');
    await advanceConfigPage.runSetRateAndEnableTaxInclusive();

    // Step 2: Verify reservation shows 1,000.00 (tax inclusive)
    logger.info('Step 2: Verifying reservation amount with tax-inclusive rate');
    await advanceConfigPage.verifyTaxInclusiveReservation('1,000.00');

    await page.screenshot({ path: 'screenshots/MGR_ADVCFG_001.png', fullPage: true });
  });

  test('MGR_ADVCFG_004: Verify rates exclusive of taxes shows correct amount in reservation', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const advanceConfigPage = new RateManagerAdvanceConfigPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Step 1: Set rate to 5000 and ensure "Rates Inclusive of Taxes" is disabled (exclusive)
    logger.info('Step 1: Setting rate amount and ensuring tax-exclusive pricing (toggle OFF)');
    await advanceConfigPage.runSetRateAndEnsureTaxExclusive();

    // Step 2: Verify reservation shows 5,600.00 (tax exclusive with taxes added on top)
    logger.info('Step 2: Verifying reservation amount with tax-exclusive rate');
    await advanceConfigPage.verifyTaxExclusiveReservation('5,600.00');

    await page.screenshot({ path: 'screenshots/MGR_ADVCFG_004.png', fullPage: true });
  });

  test.only('MGR_ADVCFG_002: Verify reservation fixed rate shows correct amount', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const advanceConfigPage = new RateManagerAdvanceConfigPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Step 1: Set rate to 1000 and enable "Rates Inclusive of Taxes"
    logger.info('Step 1: Setting rate amount and enabling tax-inclusive pricing');
    await advanceConfigPage.runSetRateAndEnableTaxInclusive();

    // Step 2: Switch to Reservation Fixed Rate
    logger.info('Step 2: Switching to Reservation Fixed Rate');
    await advanceConfigPage.switchToReservationFixedRate();

    // Step 3: Verify reservation shows 1,000.00 (fixed rate)
    logger.info('Step 3: Verifying reservation amount with fixed rate');
    await advanceConfigPage.verifyFixedRateReservation('5,000.00');

    await page.screenshot({ path: 'screenshots/MGR_ADVCFG_002.png', fullPage: true });
  });

  test('MGR_ADVCFG_003: Verify allow override for users enables rate modification', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const advanceConfigPage = new RateManagerAdvanceConfigPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Step 1: Set rate to 1000 and enable "Rates Inclusive of Taxes"
    logger.info('Step 1: Setting rate amount and enabling tax-inclusive pricing');
    await advanceConfigPage.runSetRateAndEnableTaxInclusive();

    // Step 2: Switch to Reservation Fixed Rate
    logger.info('Step 2: Switching to Reservation Fixed Rate');
    await advanceConfigPage.switchToReservationFixedRate();

    // Step 3: Switch to Allow Override for Users
    logger.info('Step 3: Switching to Allow Override for Users');
    await advanceConfigPage.switchToAllowOverride();

    // Step 4: Verify rate override from 1000 to 500
    logger.info('Step 4: Verifying rate override functionality');
    await advanceConfigPage.verifyRateOverride('1000.00', '500.00');

    await page.screenshot({ path: 'screenshots/MGR_ADVCFG_003.png', fullPage: true });
  });
});
