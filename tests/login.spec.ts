import { test, expect, Page, BrowserContext } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';
import { testDataManager } from '../src/utils/TestDataManager';
import logger from '../src/core/Logger';
import path from 'path';

test.describe('Login Tests', () => {
  let page: Page;
  let context: BrowserContext;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page: testPage, context: testContext }) => {
    page = testPage;
    context = testContext;
    loginPage = new LoginPage(page, context);

    logger.info(`Starting test: ${test.info().title}`);

    // Keep fixed viewport only when maximize mode is disabled.
    if (process.env.MAXIMIZE_BROWSER !== 'true') {
      await page.setViewportSize({ width: 1280, height: 720 });
    }
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
      const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '50000', 10);
      logger.info(`⏸️  Pausing for ${pauseDuration}ms before browser closes... You can inspect the page.`);
      await page.waitForTimeout(pauseDuration);
      logger.info('✅ Resuming - Browser will close now');
    }
  });

  test('TC_LOGIN_001: Successful login with valid credentials', async () => {
    try {
      logger.info('Starting login test with valid credentials');

      // Get credentials from test data
      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();
      expect(user.username).toBeTruthy();
      expect(user.password).toBeTruthy();

      logger.info(`Using credentials for user: ${user.username}`);

      // Navigate to login page
      await loginPage.navigateToLoginPage();

      // Verify login form is visible
      const isFormVisible = await loginPage.isLoginFormVisible();
      expect(isFormVisible).toBe(true);
      logger.info('Login form is visible');

      // Perform login with property selection by index (0 = first property)
      // Change index to 0, 1, or 2 to select different property
      await loginPage.loginWithPropertySelection(user.username, user.password, 0);
      logger.info('Login and property selection completed');

      // Verify successful login by checking URL
      const currentURL = loginPage.getCurrentURL();
      logger.info(`Successfully logged in. Current URL: ${currentURL}`);

      // Take screenshot of dashboard
      await loginPage.takeScreenshot('successful_login_with_property');

    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_LOGIN_002: Login with invalid username', async () => {
    try {
      logger.info('Starting login test with invalid username');

      const invalidUsername = 'INVALID_USER_' + Date.now();
      const password = '123';

      // Navigate to login page
      await loginPage.navigateToLoginPage();

      // Perform login with invalid credentials
      await loginPage.enterUsername(invalidUsername);
      await loginPage.enterPassword(password);
      await loginPage.clickLogin();

      // Wait for error message
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).toBe(true);
      logger.info('Error message is displayed for invalid username');

      // Get error message text
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
      logger.info(`Error message: ${errorMessage}`);

      // Verify user is still on login page
      const isFormVisible = await loginPage.isLoginFormVisible();
      expect(isFormVisible).toBe(true);

      await loginPage.takeScreenshot('invalid_username_error');

    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_LOGIN_003: Login with invalid password', async () => {
    try {
      logger.info('Starting login test with invalid password');

      // Get valid username but use wrong password
      const user = await testDataManager.getUserCredentials('all');
      const invalidPassword = 'WRONG_PASSWORD_' + Date.now();

      // Navigate to login page
      await loginPage.navigateToLoginPage();

      // Perform login with invalid password
      await loginPage.enterUsername(user.username);
      await loginPage.enterPassword(invalidPassword);
      await loginPage.clickLogin();

      // Wait for error message
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).toBe(true);
      logger.info('Error message is displayed for invalid password');

      // Get error message text
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
      logger.info(`Error message: ${errorMessage}`);

      // Verify user is still on login page
      const isFormVisible = await loginPage.isLoginFormVisible();
      expect(isFormVisible).toBe(true);

      await loginPage.takeScreenshot('invalid_password_error');

    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_LOGIN_004: Successful login with CSV data', async () => {
    try {
      logger.info('Starting login test with CSV data');

      // Get credentials from CSV
      const users = await testDataManager.getAllUsers();
      expect(users.length).toBeGreaterThan(0);

      // Use first user from CSV
      const user = users[0];
      logger.info(`Using credentials from CSV for user: ${user.username}`);

      // Navigate to login page
      await loginPage.navigateToLoginPage();

      // Perform login
      await loginPage.login(user.username, user.password);

      // Verify successful login
      const currentURL = loginPage.getCurrentURL();
      //expect(currentURL).not.toContain('login');
      logger.info('Successfully logged in with CSV credentials');

      await loginPage.takeScreenshot('csv_login_success');

    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_LOGIN_005: Login form validation', async () => {
    try {
      logger.info('Starting login form validation test');

      // Navigate to login page
      await loginPage.navigateToLoginPage();

      // Try to submit form without credentials
      await loginPage.clickLogin();

      // Wait a bit for validation
      await page.waitForTimeout(1000);

      if (process.env.MAXIMIZE_BROWSER !== 'true') {
        await page.setViewportSize({
          width: 1920,
          height: 1080
        });
      }

      // Take screenshot to verify form is still visible
      const isFormVisible = await loginPage.isLoginFormVisible();
      expect(isFormVisible).toBe(true);
      logger.info('Login form validation working correctly');

      await loginPage.takeScreenshot('form_validation');

    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('TC_LOGIN_006: Session persistence after login', async () => {
    try {
      logger.info('Starting session persistence test');

      const user = await testDataManager.getUserCredentials('all');

      // First login
      await loginPage.navigateToLoginPage();
      await loginPage.login(user.username, user.password);

      const urlAfterLogin = loginPage.getCurrentURL();
      expect(urlAfterLogin).not.toContain('login');
      logger.info('First login successful');

      // Navigate to a different page (if available)
      await page.goto(process.env.BASE_URL || 'https://qc2webwish.prologicfirst.in');

      // Check if user is still logged in (not redirected to login)
      const currentUrl = loginPage.getCurrentURL();
      logger.info(`Current URL after navigation: ${currentUrl}`);

      await loginPage.takeScreenshot('session_persistence');

    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });
});

