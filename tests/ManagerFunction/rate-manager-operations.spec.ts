import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { RateManagerPage, RateDetails, AdvanceConfigData, CopyRateData, DerivedRateData, RateStopSellData } from '../../src/pages/ManagerFunction/RateManagerPage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe.serial('Manager Function - Rate Manager Operations', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('MGR_RATE_001: Manager Rate flow step 1 (as provided)', async ({ page, context }) => {
    test.setTimeout(30 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const rateManagerPage = new RateManagerPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Step 1: Logging in and selecting property for Rate Manager flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    logger.info('Step 2: Running provided flow step 1');
    await rateManagerPage.runManagerRateFlowStep1();

    logger.info('Test completed successfully');
    await page.screenshot({
      path: 'screenshots/MGR_RATE_001.png',
      fullPage: true
    });
  });

  test('MGR_RATE_002: Create new rate with basic configuration', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const rateManagerPage = new RateManagerPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in for new rate creation');
    await loginPage.loginWithPropertySelection(user.username, user.password, 0);

    logger.info('Creating new rate with basic configuration');
    await rateManagerPage.runRateManagerCreateFlow({
      rateCode: 'TST_RATE_001',
      description: 'Test Rate Description'
    });

    logger.info('New rate created successfully');
    await page.screenshot({
      path: 'screenshots/MGR_RATE_002.png',
      fullPage: true
    });
  });

  test('MGR_RATE_003: Edit existing rate - Fill room type prices', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const rateManagerPage = new RateManagerPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in for rate editing');
    await loginPage.loginWithPropertySelection(user.username, user.password, 0);

    logger.info('Step 1: Opening Rate Manager');
    await rateManagerPage.openRateManagerFromManagerFunctions();

    logger.info('Step 2: Clicking existing rate to edit');
    await rateManagerPage.clickExistingRate();

    logger.info('Step 3: Filling room type prices');
    const rateDetails: RateDetails[] = [
      {
        roomType: 'Room Type 1',
        price1: '150',
        price2: '200'
      }
    ];
    await rateManagerPage.fillRoomTypePrices(rateDetails);

    logger.info('Room type prices configured successfully');
    await page.screenshot({
      path: 'screenshots/MGR_RATE_003.png',
      fullPage: true
    });
  });

  test('MGR_RATE_004: Configure advance settings with fixed occupancy and market segment', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const rateManagerPage = new RateManagerPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in for advance configuration');
    await loginPage.loginWithPropertySelection(user.username, user.password, 0);

    logger.info('Step 1: Opening Rate Manager');
    await rateManagerPage.openRateManagerFromManagerFunctions();

    logger.info('Step 2: Clicking existing rate');
    await rateManagerPage.clickExistingRate();

    logger.info('Step 3: Configuring advance settings');
    const advanceConfig: AdvanceConfigData = {
      description: 'Advanced Rate Configuration',
      marketSegmentIndex: 1,
      isFixedOccupancy: true
    };
    await rateManagerPage.configureAdvanceSettings(advanceConfig);

    logger.info('Advance settings configured successfully');
    await page.screenshot({
      path: 'screenshots/MGR_RATE_004.png',
      fullPage: true
    });
  });

  test('MGR_RATE_005: Configure copy rates with percentage markup', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const rateManagerPage = new RateManagerPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in for copy rates configuration');
    await loginPage.loginWithPropertySelection(user.username, user.password, 0);

    logger.info('Step 1: Opening Rate Manager');
    await rateManagerPage.openRateManagerFromManagerFunctions();

    logger.info('Step 2: Clicking existing rate');
    await rateManagerPage.clickExistingRate();

    logger.info('Step 3: Configuring copy rates');
    const businessDate = rateManagerPage.getTodayDate();
    const endDate = rateManagerPage.getOffsetDate(businessDate, 2);
    
    logger.info(`Using business date: ${businessDate}, end date: ${endDate}`);
    
    const copyRateData: CopyRateData = {
      fromDate: businessDate,
      toDate: endDate,
      allDays: true
    };
    await rateManagerPage.copyratesConfiguration(copyRateData);

    logger.info('Copy rates configured successfully');
    await page.screenshot({
      path: 'screenshots/MGR_RATE_005.png',
      fullPage: true
    });
  });

  test('MGR_RATE_006: Configure derived rates', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const rateManagerPage = new RateManagerPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in for derived rates configuration');
    await loginPage.loginWithPropertySelection(user.username, user.password, 0);

    logger.info('Step 1: Opening Rate Manager');
    await rateManagerPage.openRateManagerFromManagerFunctions();

    logger.info('Step 2: Clicking existing rate');
    await rateManagerPage.clickExistingRate();

    logger.info('Step 3: Configuring derived rates');
    const derivedRateData: DerivedRateData = {
      baseRateIndex: 1
    };
    await rateManagerPage.configureDerivedRate(derivedRateData);

    logger.info('Derived rates configured successfully');
    await page.screenshot({
      path: 'screenshots/MGR_RATE_006.png',
      fullPage: true
    });
  });

  test('MGR_RATE_007: Configure rate stop sell with date ranges', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const rateManagerPage = new RateManagerPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in for rate stop sell configuration');
    await loginPage.loginWithPropertySelection(user.username, user.password, 0);

    logger.info('Step 1: Opening Rate Manager');
    await rateManagerPage.openRateManagerFromManagerFunctions();

    logger.info('Step 2: Clicking existing rate');
    await rateManagerPage.clickExistingRate();

    logger.info('Step 3: Configuring rate stop sell');
    const stopSellData: RateStopSellData = {
      startDate: '05/15/2026',
      endDate: '12/31/2026'
    };
    await rateManagerPage.configureRateStopSell(stopSellData);

    logger.info('Rate stop sell configured successfully');
    await page.screenshot({
      path: 'screenshots/MGR_RATE_007.png',
      fullPage: true
    });
  });

  test('MGR_RATE_008: Delete Rate From Selected Dates', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const rateManagerPage = new RateManagerPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in for delete rate from selected dates flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    logger.info('Running delete rate from selected dates flow');
    await rateManagerPage.runDeleteRateFromSelectedDatesFlow();

    await page.screenshot({
      path: 'screenshots/MGR_RATE_008.png',
      fullPage: true
    });
  });
});
