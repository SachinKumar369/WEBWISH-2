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

test.describe('Manager Function - Rate Manager Creation', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('MGR_RATE_001: Create and delete a rate from Manager Functions', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const rateManagerPage = new RateManagerPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    // Capture the selected property ID for database operations
    selectedPropertyId = (await loginPage.loginWithPropertySelection(user.username, user.password, 2)) ?? '';

    const rateData = {
      rateCode: `1235`,
      publishedRackRateArrowDowns: 6,
      rateCategoryArrowDowns: 3,
      description: 'description',
      notes: 'automation ,./?><;\'":[]\\|}{-=+_)(*&^%$#@!`~',
      marketSegmentKeys: ['ArrowDown', 'ArrowDown', 'ArrowUp'] as Array<'ArrowDown' | 'ArrowUp'>,
      closeAfterSave: true
    };

    logger.info('Opening Rate Manager and creating a new rate');
    await rateManagerPage.runRateManagerCreateFlow(rateData);
    createdRateCode = rateData.rateCode;

    // Add a small delay to ensure the rate is fully created
    await page.waitForTimeout(2000);

    // Now delete the created rate code from the backend
    if (!databaseClient.isConfigured()) {
      logger.info('Skipping database cleanup - DB not configured');
      return;
    }

    if (!selectedPropertyId || !createdRateCode) {
      throw new Error('Missing required data for database operation: selectedPropertyId or createdRateCode is missing');
    }

    const normalizedPropertyId = selectedPropertyId.toLowerCase();
    const normalizedRateCode = createdRateCode.toString();
    
    // Execute the deletion and validate it was successful
    const { sql, lookupSql } = buildDeleteRateSql();
    const deleteParams = [normalizedPropertyId, normalizedRateCode];
    
    // Add detailed logging
    logger.info(`Attempting to delete rate code ${normalizedRateCode} for property ${normalizedPropertyId}`);
    
    // Perform the deletion
    await databaseClient.query(sql, deleteParams);
    
    // Verify the deletion in the database
    const deletedRow = await databaseClient.queryOne(lookupSql, deleteParams);
    expect(deletedRow).toBeNull();
    
    logger.info('Successfully deleted rate code from database');

    await page.screenshot({
      path: 'screenshots/MGR_RATE_001.png',
      fullPage: true
    });
  });
});