import { test, expect, Page, BrowserContext } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';
import { testDataManager } from '../src/utils/TestDataManager';
import { visualRegressionUtil } from '../src/utils/VisualRegressionUtil';
import logger from '../src/core/Logger';

test.describe('Visual Regression Tests', () => {
  let page: Page;
  let context: BrowserContext;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page: testPage, context: testContext }) => {
    page = testPage;
    context = testContext;
    loginPage = new LoginPage(page, context);

    logger.info(`Starting test: ${test.info().title}`);

    // Set consistent viewport for visual testing
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.afterEach(async () => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('VR_LOGIN_001: Login page visual regression', async () => {
    try {
      logger.info('Starting login page visual regression test');

      // Navigate to login page
      await loginPage.navigateToLoginPage();
      await page.waitForTimeout(500); // Wait for animations

      // Compare with baseline
      const result = await visualRegressionUtil.compareWithBaseline(
        page,
        'login_page',
        false,
        0.1 // 10% threshold
      );

      logger.info(`Visual comparison result: Match=${result.match}, Different pixels=${result.pixelsDifferent}`);

      // Assert visual match
      expect(result.match).toBe(true);

    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('VR_LOGIN_002: Dashboard visual regression after login', async () => {
    try {
      logger.info('Starting dashboard visual regression test');

      const user = await testDataManager.getUserCredentials('all');

      // Navigate and login
      await loginPage.navigateToLoginPage();
      await loginPage.login(user.username, user.password);

      // Wait for page to stabilize
      await page.waitForTimeout(1000);

      // Compare dashboard with baseline
      const result = await visualRegressionUtil.compareWithBaseline(
        page,
        'dashboard_page',
        false,
        0.1 // 10% threshold
      );

      logger.info(`Visual comparison result: Match=${result.match}, Different pixels=${result.pixelsDifferent}`);

      // Assert visual match
      expect(result.match).toBe(true);

    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('VR_LOGIN_003: Create login page baseline', async () => {
    try {
      logger.info('Creating login page baseline for visual testing');

      // Navigate to login page
      await loginPage.navigateToLoginPage();
      await page.waitForTimeout(500);

      // Create baseline
      const baselineFile = await visualRegressionUtil.createBaseline(page, 'login_page', false);

      logger.info(`Baseline created: ${baselineFile}`);
      expect(baselineFile).toBeTruthy();

    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });

  test('VR_LOGIN_004: Create dashboard baseline', async () => {
    try {
      logger.info('Creating dashboard baseline for visual testing');

      const user = await testDataManager.getUserCredentials('all');

      // Navigate and login
      await loginPage.navigateToLoginPage();
      await loginPage.login(user.username, user.password);

      // Wait for page to stabilize
      await page.waitForTimeout(1000);

      // Create baseline
      const baselineFile = await visualRegressionUtil.createBaseline(page, 'dashboard_page', false);

      logger.info(`Baseline created: ${baselineFile}`);
      expect(baselineFile).toBeTruthy();

    } catch (error) {
      logger.error(`Test failed: ${error}`);
      throw error;
    }
  });
});
