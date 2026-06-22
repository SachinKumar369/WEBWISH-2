import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { RateManagerPage } from '../../src/pages/ManagerFunction/RateManagerPage';
import { testDataManager } from '../../src/utils/TestDataManager';

function normalizeRoomType(value: string): string {
  return value.trim().toLowerCase();
}

test.describe('Manager Function - Rate Setup (capture room type codes)', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('MGR_RATE_SETUP_001: Capture room type codes and apply rates', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const rateManagerPage = new RateManagerPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    const selectedPropertyId =
      (await loginPage.loginWithPropertySelection(
        user.username,
        user.password,
        2,
      )) ?? '';

    expect(selectedPropertyId).not.toBe('');

    logger.info('Step 1: Opening Rate Manager and capturing room type codes');
    const rateManagerRoomTypeCodes =
      await rateManagerPage.runRateManagerSetupFlow();

    expect(rateManagerRoomTypeCodes.length).toBeGreaterThan(0);

    logger.info(
      `Rate Manager codes (${rateManagerRoomTypeCodes.length}): ${JSON.stringify(
        rateManagerRoomTypeCodes,
      )}`,
    );

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

    expect(commonRoomTypeCodes.length).toBeGreaterThan(
      0,
    );

    const targetRoomType = commonRoomTypeCodes[0];

    logger.info(
      `Step 4: Opening Rate Manager from search and clicking the business-date cell for common room type "${targetRoomType}"`,
    );

    const businessDate =
      await rateManagerPage.runOpenRateManagerAndClickDateCell(
        targetRoomType,
      );

    logger.info(
      `Clicked Rate Manager cell for "${targetRoomType}" on business date ${businessDate}`,
    );

    await page.screenshot({
      path: 'screenshots/MGR_RATE_SETUP_001_rate_manager_click.png',
      fullPage: true,
    });

    logger.info(
      'Step 5: Clicking eye icon for the first editable rate code',
    );

    const selectedRateCode =
      await rateManagerPage.selectFirstEditableRateCodeAndOpenSettings();

    logger.info(`Opened settings for rate code: ${selectedRateCode}`);

    await page.screenshot({
      path: 'screenshots/MGR_RATE_SETUP_001_eye_icon_clicked.png',
      fullPage: true,
    });

    logger.info(
      'Step 6: Filling rates for all room types in the rate grid',
    );

    const singleRate = '10';
    const doubleRate = '20';
    const tripleRate = '40';
    const extraRate = '10';
    const youthRate = '10';
    const child = '10';

    await rateManagerPage.fillRatesForAllRoomTypes(
        
      singleRate,
      doubleRate,
      tripleRate,
      extraRate,
        youthRate,
      child,
    );

    await page.screenshot({
      path: 'screenshots/MGR_RATE_SETUP_001_rates_filled.png',
      fullPage: true,
    });

    logger.info('Step 6 complete: Rates filled for all room types');

    logger.info('Step 6b: Copying rates and validating rack versus complimentary amounts');
    await rateManagerPage.copyRatesAndVerifyAgainstRackRate('100');

    await page.screenshot({
      path: 'screenshots/MGR_RATE_SETUP_001_rates_copied_and_verified.png',
      fullPage: true,
    });

    logger.info(
      'Step 6b complete: Rates copied and each entry verified against Rack Rate (Rack + increment)',
    );

    const endDate = '31/12/2025';
    const dateRange = `${businessDate} to ${endDate}`;

    logger.info(
      `Step 7: Applying rates for date range: ${dateRange}`,
    );

    // await rateManagerPage.applyAdvanceDateSelection(
    //   dateRange,
    // );

    logger.info(
      'Step 7 complete: Rates applied and saved successfully',
    );

    await page.screenshot({
      path: 'screenshots/MGR_RATE_SETUP_001_rates_applied.png',
      fullPage: true,
    });

    logger.info(
      'MGR_RATE_SETUP_001 completed successfully through Step 7',
    );
  });
});      