import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { RateManagerPage } from '../../src/pages/ManagerFunction/RateManagerPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import { databaseClient } from '../../src/utils/DatabaseClient';

let createdRateCode = '';
let selectedPropertyId = '';

function buildDeleteRateSql() {
  const dbType = databaseClient.getDatabaseType();

  if (dbType === 'postgres') {
    return {
      sql: 'DELETE FROM prm_rate_code WHERE property_id = $1 AND rate_code = $2',
      lookupSql: 'SELECT 1 FROM prm_rate_code WHERE property_id = $1 AND rate_code = $2',
    };
  }

  if (dbType === 'mysql') {
    return {
      sql: 'DELETE FROM prm_rate_code WHERE property_id = ? AND rate_code = ?',
      lookupSql: 'SELECT 1 FROM prm_rate_code WHERE property_id = ? AND rate_code = ?',
    };
  }

  return {
    sql: 'DELETE FROM prm_rate_code WHERE property_id = @p1 AND rate_code = @p2',
    lookupSql: 'SELECT 1 FROM prm_rate_code WHERE property_id = @p1 AND rate_code = @p2',
  };
}

test.describe('Manager Function - Rate Manager Modify', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('MGR_RATE_MODIFY_001: Create a rate, then modify the same rate without deleting', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const rateManagerPage = new RateManagerPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    selectedPropertyId = (await loginPage.loginWithPropertySelection(user.username, user.password, 2)) ?? '';

    // ── Step 1: Create a new rate ──────────────────────────────────
    const rateData = {
      rateCode: `1235`,
      publishedRackRateArrowDowns: 6,
      rateCategoryArrowDowns: 3,
      description: 'Original Description',
      notes: 'Original Notes',
      marketSegmentKeys: ['ArrowDown', 'ArrowDown', 'ArrowUp'] as Array<'ArrowDown' | 'ArrowUp'>,
      closeAfterSave: true
    };

    logger.info('Step 1: Creating a new rate');
    await rateManagerPage.runRateManagerCreateFlow(rateData);
    createdRateCode = rateData.rateCode;

    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'screenshots/MGR_RATE_MODIFY_001_rate_created.png',
      fullPage: true
    });

    logger.info(`Rate created successfully with code: ${createdRateCode}`);

    // ── Step 2: Open Rate Manager from search and click business date cell ──
    logger.info('Step 2: Opening Rate Manager from search and clicking business date cell');

    await rateManagerPage.openRateManagerFromGlobalSearch();
    const businessDate = await rateManagerPage.getBusinessDate();
    logger.info(`Business date: ${businessDate}`);

    // Get room type codes from the grid
    const roomTypeCodes = await rateManagerPage.getRoomTypeCodes();
    expect(roomTypeCodes.length).toBeGreaterThan(0);
    const targetRoomType = roomTypeCodes[0];
    logger.info(`Target room type: ${targetRoomType}`);

    // Click the business date cell for the first room type
    await rateManagerPage.clickRateManagerCellForCommonRoomType(targetRoomType, businessDate);
    logger.info(`Clicked business date cell for room type "${targetRoomType}" on ${businessDate}`);

    await page.screenshot({
      path: 'screenshots/MGR_RATE_MODIFY_001_date_cell_clicked.png',
      fullPage: true
    });

    // ── Step 3: Click eye icon for the created rate code ────────────
    logger.info('Step 3: Clicking eye icon for the created rate code');

    const selectedRateCode = await rateManagerPage.selectFirstEditableRateCodeAndOpenSettings1();
    logger.info(`Opened settings for rate code: ${selectedRateCode}`);

    await page.screenshot({
      path: 'screenshots/MGR_RATE_MODIFY_001_eye_icon_clicked.png',
      fullPage: true
    });

    // ── Step 4: Fill rate amounts for all room types ────────────────
    logger.info('Step 4: Filling rate amounts for all room types');

    const singleRate = '100';
    const doubleRate = '120';
    const tripleRate = '130';
    const extraRate = '50';
    const youthRate = '0';
    const childRate = '0';

    await rateManagerPage.fillRatesForAllRoomTypes(singleRate, doubleRate, tripleRate, extraRate, youthRate, childRate);
    logger.info('Rate amounts filled for all room types');

    await page.screenshot({
      path: 'screenshots/MGR_RATE_MODIFY_001_rates_filled.png',
      fullPage: true
    });

    // ── Step 5: Apply Advance Date Selection ────────────────────────
    logger.info('Step 5: Applying Advance Date Selection');

    const endDate = '31/12/2025';
    const dateRange = `${businessDate} to ${endDate}`;
    logger.info(`Applying date range: ${dateRange}`);

    await rateManagerPage.applyAdvanceDateSelection(dateRange);
    logger.info('Advance Date Selection applied and saved successfully');

    await page.screenshot({
      path: 'screenshots/MGR_RATE_MODIFY_001_advance_date_applied.png',
      fullPage: true
    });

    logger.info('Rate modification completed successfully');

    // ── Cleanup: Delete the rate from database ──────────────────────
    if (!databaseClient.isConfigured()) {
      logger.info('Skipping database cleanup - DB not configured');
      return;
    }

    if (!selectedPropertyId || !createdRateCode) {
      throw new Error('Missing required data for database operation: selectedPropertyId or createdRateCode is missing');
    }

    const normalizedPropertyId = selectedPropertyId.toLowerCase();
    const normalizedRateCode = createdRateCode.toString();

    const { sql, lookupSql } = buildDeleteRateSql();
    const deleteParams = [normalizedPropertyId, normalizedRateCode];

    logger.info(`Attempting to delete rate code ${normalizedRateCode} for property ${normalizedPropertyId}`);

    await databaseClient.query(sql, deleteParams);

    const deletedRow = await databaseClient.queryOne(lookupSql, deleteParams);
    expect(deletedRow).toBeNull();

    logger.info('Successfully deleted rate code from database');
  });
});
