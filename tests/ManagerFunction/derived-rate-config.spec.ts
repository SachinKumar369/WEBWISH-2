import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { RateManagerPage } from '../../src/pages/ManagerFunction/RateManagerPage';
import { DerivedRateConfigPage } from '../../src/pages/ManagerFunction/DerivedRateConfigPage';
import { testDataManager } from '../../src/utils/TestDataManager';

function normalizeRoomType(value: string): string {
  return value.trim().toLowerCase();
}

test.describe('Manager Function - Derived Rate Configuration', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('MGR_DERIVED_RATE_001: Derived Rate Configuration - Discount and Add On with Rack Rate verification', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const rateManagerPage = new RateManagerPage(page, context);
    const derivedRateConfigPage = new DerivedRateConfigPage(page, context);

    // ── Login & Property Selection ──
    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    const selectedPropertyId =
      (await loginPage.loginWithPropertySelection(
        user.username,
        user.password,
        2,
      )) ?? '';

    expect(selectedPropertyId).not.toBe('');

    // ── Step 1: Capture room type codes from Rate Manager ──
    logger.info('Step 1: Opening Rate Manager and capturing room type codes');
    const rateManagerRoomTypeCodes =
      await rateManagerPage.runRateManagerSetupFlow();

    expect(rateManagerRoomTypeCodes.length).toBeGreaterThan(0);

    logger.info(
      `Rate Manager codes (${rateManagerRoomTypeCodes.length}): ${JSON.stringify(
        rateManagerRoomTypeCodes,
      )}`,
    );

    // ── Step 2: Capture room types from New Reservation ──
    logger.info(
      'Step 2: Navigating to Guest Management -> New Reservation via global search',
    );

    const newReservationRoomTypeCodes =
      await rateManagerPage.runNewReservationRoomTypeCapture();

    expect(newReservationRoomTypeCodes.length).toBeGreaterThan(0);

    logger.info(
      `New Reservation codes (${newReservationRoomTypeCodes.length}): ${JSON.stringify(
        newReservationRoomTypeCodes,
      )}`,
    );

    // ── Step 3: Compute common room type codes ──
    logger.info('Step 3: Computing common room type codes');

    const rateManagerNormalized = new Set(
      rateManagerRoomTypeCodes.map(normalizeRoomType),
    );

    const commonRoomTypeCodes = newReservationRoomTypeCodes.filter(code =>
      rateManagerNormalized.has(normalizeRoomType(code)),
    );

    logger.info(
      `Common codes (${commonRoomTypeCodes.length}): ${JSON.stringify(
        commonRoomTypeCodes,
      )}`,
    );

    expect(commonRoomTypeCodes.length).toBeGreaterThan(0);

    const targetRoomType = commonRoomTypeCodes[0];

    logger.info(
      `Selected target room type for Derived Rate Config: "${targetRoomType}"`,
    );

    // ── Step 4: Open Rate Manager, click business date cell, open Complimentary Rate ──
    logger.info(
      `Step 4: Opening Rate Manager from search and clicking the business-date cell for "${targetRoomType}"`,
    );

    const businessDate =
      await derivedRateConfigPage.openRateManagerFromGlobalSearch();

    const parsedBusinessDate = await derivedRateConfigPage.getBusinessDate();

    await derivedRateConfigPage.clickRateManagerCellForRoomType(
      targetRoomType,
      parsedBusinessDate,
    );

    logger.info(
      `Clicked Rate Manager cell for "${targetRoomType}" on business date ${parsedBusinessDate}`,
    );

    await page.screenshot({
      path: 'screenshots/DERIVED_RATE_001_rate_manager_click.png',
      fullPage: true,
    });

    // ── Step 5: Click eye icon for Complimentary Rate ──
    logger.info('Step 5: Clicking eye icon for Complimentary Rate');

    const selectedRateCode =
      await derivedRateConfigPage.openComplimentaryRateSettings();

    logger.info(`Opened settings for rate code: ${selectedRateCode}`);

    await page.screenshot({
      path: 'screenshots/DERIVED_RATE_001_eye_icon_clicked.png',
      fullPage: true,
    });

    // ── Step 6: Fetch all rates for all room types and all occupancies ──
    logger.info('Step 6: Fetching all Complimentary Rate values for all room types and occupancies');

    const complimentaryRates =
      await derivedRateConfigPage.captureCurrentRateGridValues();

    expect(complimentaryRates.length).toBeGreaterThan(0);

    logger.info(
      `Complimentary Rate snapshot (${complimentaryRates.length} room types): ${JSON.stringify(
        complimentaryRates,
      )}`,
    );

    await page.screenshot({
      path: 'screenshots/DERIVED_RATE_001_complimentary_rates_fetched.png',
      fullPage: true,
    });

    // ── Step 7: Derived Rate Configuration - First pass (Discount) ──
    logger.info('Step 7: Applying Derived Rate Configuration - Discount');

    await derivedRateConfigPage.openDerivedRateConfigAndApplyDiscount('100');

    await page.screenshot({
      path: 'screenshots/DERIVED_RATE_001_discount_applied.png',
      fullPage: true,
    });

    // ── Step 8: Derived Rate Configuration - Second pass (Add on + Save) ──
    logger.info('Step 8: Applying Derived Rate Configuration - Add on and Saving');

    await derivedRateConfigPage.openDerivedRateConfigAndApplyAddOn('100');

    await page.screenshot({
      path: 'screenshots/DERIVED_RATE_001_addon_saved.png',
      fullPage: true,
    });

    // ── Step 9: Fetch Derived Rate values ──
    logger.info('Step 9: Fetching Derived Rate values after configuration');

    // Wait for grid to update after save
    await page.waitForTimeout(5000);

    const derivedRates =
      await derivedRateConfigPage.captureCurrentRateGridValues();

    expect(derivedRates.length).toBeGreaterThan(0);

    logger.info(
      `Derived Rate snapshot (${derivedRates.length} room types): ${JSON.stringify(
        derivedRates,
      )}`,
    );

    await page.screenshot({
      path: 'screenshots/DERIVED_RATE_001_derived_rates_fetched.png',
      fullPage: true,
    });

    // ── Step 10: Open Rack Rate ──
    logger.info('Step 10: Opening Rack Rate from dropdown for comparison');

    await derivedRateConfigPage.openRackRateFromDropdown();

    await page.screenshot({
      path: 'screenshots/DERIVED_RATE_001_rack_rate_opened.png',
      fullPage: true,
    });

    // ── Step 11: Fetch Rack Rate values ──
    logger.info('Step 11: Fetching Rack Rate values for comparison');

    const rackRates =
      await derivedRateConfigPage.captureCurrentRateGridValues();

    expect(rackRates.length).toBeGreaterThan(0);

    logger.info(
      `Rack Rate snapshot (${rackRates.length} room types): ${JSON.stringify(
        rackRates,
      )}`,
    );

    await page.screenshot({
      path: 'screenshots/DERIVED_RATE_001_rack_rates_fetched.png',
      fullPage: true,
    });

    // ── Step 12: Compare Derived Rate with Rack Rate ──
    logger.info('Step 12: Comparing Derived Rate values against Rack Rate values');

    derivedRateConfigPage.assertDerivedRateMatchesRackRate(
      rackRates,
      derivedRates,
    );

    logger.info(
      'MGR_DERIVED_RATE_001 completed successfully - Derived Rate Configuration verified against Rack Rate',
    );

    await page.screenshot({
      path: 'screenshots/DERIVED_RATE_001_test_completed.png',
      fullPage: true,
    });
  });
});
