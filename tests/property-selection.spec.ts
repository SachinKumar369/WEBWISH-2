import { test, expect, Page, BrowserContext } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';
import { SelectProperty } from '../src/pages/SelectProperty';
import { testDataManager } from '../src/utils/TestDataManager';
import logger from '../src/core/Logger';

test.describe('Property Selection Tests', () => {
  let page: Page;
  let context: BrowserContext;
  let loginPage: LoginPage;
  let selectProperty: SelectProperty;

  test.beforeEach(async ({ page: testPage, context: testContext }) => {
    page = testPage;
    context = testContext;
    loginPage = new LoginPage(page, context);
    selectProperty = new SelectProperty(page, context);

    logger.info(`Starting test: ${test.info().title}`);

    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.afterEach(async () => {
    logger.info(`Test finished: ${test.info().title}`);

    // Take screenshot if test failed
    if (test.info().status === 'failed') {
      const screenshotPath = await loginPage.takeScreenshot(`test_failure_${test.info().title}`);
      logger.error(`Test failed. Screenshot: ${screenshotPath}`);
    }

    // Check if browser should stay open
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';

    if (keepBrowserOpen) {
      logger.info('🔒 KEEP_BROWSER_OPEN is enabled. Browser will stay open. Press any key in console to continue...');
      await page.pause();
    } else {
      // Pause before closing browser so you can see the result
      const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '5000', 10);
      logger.info(`⏸️  Pausing for ${pauseDuration}ms before browser closes... You can inspect the page.`);
      await page.waitForTimeout(pauseDuration);
      logger.info('✅ Resuming - Browser will close now');
    }
  });

  test('PROP_001: List all properties and select by index 0', async () => {
    try {
      logger.info('Starting property selection test - Index 0');

      // Get credentials
      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      // Login
      logger.info('Performing login...');
      await loginPage.loginWithPropertySelection(user.username, user.password, 0);
      logger.info('✅ Login completed with property selection (index 0)');

      // Verify
      const currentURL = loginPage.getCurrentURL();
      logger.info(`Current URL: ${currentURL}`);

      await loginPage.takeScreenshot('property_selection_index_0');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('PROP_002: Select property by index 1', async () => {
    try {
      logger.info('Starting property selection test - Index 1');

      // Get credentials
      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      // Login with property index 1
      logger.info('Performing login...');
      await loginPage.loginWithPropertySelection(user.username, user.password, 1);
      logger.info('✅ Login completed with property selection (index 1)');

      // Verify
      const currentURL = loginPage.getCurrentURL();
      logger.info(`Current URL: ${currentURL}`);

      await loginPage.takeScreenshot('property_selection_index_1');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('PROP_003: Select property by code (WDUBI)', async () => {
    try {
      logger.info('Starting property selection test - Code: WDUBI');

      // Get credentials
      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      // Login with property code
      logger.info('Performing login...');
      await loginPage.loginWithPropertySelection(user.username, user.password, 'WDUBI');
      logger.info('✅ Login completed with property selection (WDUBI)');

      // Verify
      const currentURL = loginPage.getCurrentURL();
      logger.info(`Current URL: ${currentURL}`);

      await loginPage.takeScreenshot('property_selection_code_wdubi');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('PROP_004: Select property by code (WEBIN)', async () => {
    try {
      logger.info('Starting property selection test - Code: WEBIN');

      // Get credentials
      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      // Login with property code
      logger.info('Performing login...');
      await loginPage.loginWithPropertySelection(user.username, user.password, 'WEBIN');
      logger.info('✅ Login completed with property selection (WEBIN)');

      // Verify
      const currentURL = loginPage.getCurrentURL();
      logger.info(`Current URL: ${currentURL}`);

      await loginPage.takeScreenshot('property_selection_code_webin');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('PROP_005: View all available properties', async () => {
    try {
      logger.info('Starting test - View all available properties');

      // Get credentials
      const user = await testDataManager.getUserCredentials('all');

      // Login
      await loginPage.navigateToLoginPage();
      await loginPage.enterUsername(user.username);
      await loginPage.enterPassword(user.password);

      // Wait for captcha
      logger.info('⏳ Waiting for manual captcha entry...');
      await page.waitForTimeout(5000);

      // Click login
      await loginPage.clickLogin();
      await loginPage.waitForLoginToComplete();

      // Wait for property selection page
      await selectProperty.waitForPropertySelectionPageToLoad();

      // List all properties
      logger.info('📋 Listing all available properties...');
      await selectProperty.listAllProperties();

      // Get all properties
      const properties = await selectProperty.getAllPropertiesFromPage();
      logger.info(`✅ Total properties found: ${properties.length}`);

      properties.forEach((prop) => {
        expect(prop.code).toBeTruthy();
        expect(prop.name).toBeTruthy();
        expect(prop.index).toBeGreaterThanOrEqual(0);
      });

      await loginPage.takeScreenshot('all_properties_listed');
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });
});
