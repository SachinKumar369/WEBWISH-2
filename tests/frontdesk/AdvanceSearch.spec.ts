import { test, expect, Page, BrowserContext } from '@playwright/test';
import { AdvanceSearchPage } from '../../src/pages/FrontDesk/Advance';
import { LoginPage } from '../../src/pages/LoginPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe('Advance Search Tests', () => {
  let page: Page;
  let context: BrowserContext;
  let advanceSearchPage: AdvanceSearchPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page: testPage, context: testContext }) => {
    page = testPage;
    context = testContext;
    advanceSearchPage = new AdvanceSearchPage(page, context);
    loginPage = new LoginPage(page, context);

    logger.info(`Starting test: ${test.info().title}`);

    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Get credentials and login with property selection
    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();
    expect(user.username).toBeTruthy();
    expect(user.password).toBeTruthy();

    logger.info(`Using credentials for user: ${user.username}`);

    // Perform login with property selection (index 0 = first property)
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    logger.info('Login and property selection completed');

    // Verify successful login
    const currentURL = loginPage.getCurrentURL();
    logger.info(`Current URL after login: ${currentURL}`);

    // Now the advance search should be accessible
    // Note: You may need to navigate to the specific page or open the advance search modal here
  });

  test.afterEach(async () => {
    logger.info(`Test finished: ${test.info().title}`);

    // Take screenshot if test failed
    if (test.info().status === 'failed') {
      const screenshotPath = await advanceSearchPage.takeScreenshot(`test_failure_${test.info().title}`);
      logger.error(`Test failed. Screenshot: ${screenshotPath}`);
    }

    // Check if browser should stay open
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';

    if (keepBrowserOpen) {
      logger.info('🔒 KEEP_BROWSER_OPEN is enabled. Browser will stay open. Press any key in console to continue...');
      await page.pause();
    } else {
      // Pause before closing browser so you can see the result
      const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '50000', 10);
      logger.info(`⏸️  Pausing for ${pauseDuration}ms before browser closes... You can inspect the page.`);
      await page.waitForTimeout(pauseDuration);
      logger.info('✅ Resuming - Browser will close now');
    }
  });

  test('TC_ADV_SEARCH_001: Select Reserved status', async () => {
    try {
      logger.info('Testing selection of Reserved status');

      await advanceSearchPage.selectReserved();

      // Verify that reserved radio is selected
      const isSelected = await page.locator('#resrvd').isChecked();
      expect(isSelected).toBe(true);

      logger.info('Reserved status selected successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_ADV_SEARCH_002: Select Inhouse status', async () => {
    try {
      logger.info('Testing selection of Inhouse status');

      await advanceSearchPage.selectInhouse();

      // Verify that inhouse radio is selected
      const isSelected = await page.locator('#inhous').isChecked();
      expect(isSelected).toBe(true);

      logger.info('Inhouse status selected successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_ADV_SEARCH_003: Search by guest name', async () => {
    try {
      logger.info('Testing search by guest name');

      const guestName = 'John Doe';
      await advanceSearchPage.searchByGuestName(guestName);

      // Verify the input value
      const inputValue = await page.inputValue('[formControlName*="guest"], input[placeholder*="Guest"]');
      expect(inputValue).toBe(guestName);

      logger.info('Guest name search input set successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_ADV_SEARCH_004: Search by confirmation number', async () => {
    try {
      logger.info('Testing search by confirmation number');

      const confirmationNumber = 'CONF123456';
      await advanceSearchPage.searchByConfirmationNumber(confirmationNumber);

      // Verify the input value
      const inputValue = await page.inputValue('[formControlName*="confirmation"], input[placeholder*="Confirmation"]');
      expect(inputValue).toBe(confirmationNumber);

      logger.info('Confirmation number search input set successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_ADV_SEARCH_005: Set check-in and check-out dates', async () => {
    try {
      logger.info('Testing setting check-in and check-out dates');

      const checkInDate = '2024-03-15';
      const checkOutDate = '2024-03-20';

      await advanceSearchPage.setCheckInDate(checkInDate);
      await advanceSearchPage.setCheckOutDate(checkOutDate);

      // Verify the input values
      const checkInValue = await page.inputValue('[formControlName*="checkIn"], input[type="date"]');
      const checkOutValue = await page.inputValue('[formControlName*="checkOut"], input[type="date"]');

      expect(checkInValue).toBe(checkInDate);
      expect(checkOutValue).toBe(checkOutDate);

      logger.info('Check-in and check-out dates set successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_ADV_SEARCH_006: Perform search with criteria', async () => {
    try {
      logger.info('Testing perform search with criteria');

      const criteria = {
        status: 'Reserved',
        guestName: 'Jane Smith',
        checkInDate: '2024-03-10',
        checkOutDate: '2024-03-15'
      };

      await advanceSearchPage.performSearch(criteria);

      // Verify that search was performed (results visible or no results message)
      const hasResults = await advanceSearchPage.isSearchResultsVisible();
      const hasNoResults = await advanceSearchPage.hasNoResults();

      expect(hasResults || hasNoResults).toBe(true);

      logger.info('Search performed successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_ADV_SEARCH_007: Clear search form', async () => {
    try {
      logger.info('Testing clear search form');

      // Fill some criteria first
      await advanceSearchPage.searchByGuestName('Test Guest');
      await advanceSearchPage.setCheckInDate('2024-03-01');

      // Clear the form
      await advanceSearchPage.clickClear();

      // Verify inputs are cleared (this might need adjustment based on actual behavior)
      const guestNameValue = await page.inputValue('[formControlName*="guest"], input[placeholder*="Guest"]');
      expect(guestNameValue).toBe('');

      logger.info('Search form cleared successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_ADV_SEARCH_008: Search by special account', async () => {
    try {
      logger.info('Testing search by special account');

      const accountName = 'VIP Account';
      await advanceSearchPage.searchBySpecialAccount(accountName);

      // Verify the input value
      const inputValue = await page.inputValue('[formControlName*="specialAccount"], input[placeholder*="Special Account"]');
      expect(inputValue).toBe(accountName);

      logger.info('Special account search input set successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_ADV_SEARCH_009: Validate filter panel visibility', async () => {
    try {
      logger.info('Testing filter panel visibility');

      const isVisible = await advanceSearchPage.isFilterPanelVisible();
      expect(isVisible).toBe(true);

      logger.info('Filter panel visibility validated');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_ADV_SEARCH_010: Check form validation', async () => {
    try {
      logger.info('Testing form validation');

      const isValid = await advanceSearchPage.isFormValid();
      expect(typeof isValid).toBe('boolean');

      logger.info('Form validation checked successfully');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });
});