import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { testDataManager } from '../../src/utils/TestDataManager';
import { SuccessfulLoginPage } from '../../src/pages/Login/SuccessfulLoginPage';

const DEFAULT_LOGIN_URL =
  process.env.BASE_URL ||
  'https://qc2webwish.prologicfirst.in/login/z6cQJcxmrEbhhFXqdoj64Q%3D%3D';

/**
 * TC_LGN_001 — Successful Login with Valid Credentials
 *
 * Priority: High
 * Precondition: Fresh browser session; valid User Id and Password available
 */
test.describe('TC_LGN_001 — Successful Login with Valid Credentials', () => {
  let validUsername = '';
  let validPassword = '';

  test.beforeAll(async () => {
    try {
      const user = await testDataManager.getUserCredentials('all');
      validUsername = user.username;
      validPassword = user.password;
      logger.info(`Test credentials loaded — Username: ${validUsername}`);
    } catch (error) {
      logger.warn(`Failed to load test data, using defaults: ${error}`);
      validUsername = 'SACH';
      validPassword = 'Sachin@578';
    }
  });

  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN enabled. Browser remains open.');
    }
    await page.waitForTimeout(200);
  });

  test.beforeEach(async ({ page }) => {
    const loginPage = new SuccessfulLoginPage(page, page.context());
    await loginPage.openLoginUrl(DEFAULT_LOGIN_URL);
  });

  // ─────────────────────────────────────────────────────────
  // TC_LGN_001 — Step-by-step validation
  // ─────────────────────────────────────────────────────────
  test('TC_LGN_001: Successful Login with Valid Credentials', async ({ page }) => {
    const loginPage = new SuccessfulLoginPage(page, page.context());

    // ── Step 1: Verify login page is displayed with all expected UI elements ──
    logger.info('=== Step 1: Verify login page UI elements ===');
    await loginPage.expectLoginFormFullyVisible();

    // ── Step 2: Enter a valid User Id ──
    logger.info('=== Step 2: Enter valid User Id ===');
    await loginPage.enterUserId(validUsername);

    // ── Step 3: Enter the matching valid Password ──
    logger.info('=== Step 3: Enter valid Password (verify masking) ===');
    await loginPage.enterPassword(validPassword);

    // ── Step 4: Click the Log in button ──
    logger.info('=== Step 4: Click Log in ===');
    await loginPage.clickLogin();

    // ── Step 5: Wait for navigation away from /login ──
    logger.info('=== Step 5: Wait for navigation ===');
    const landingUrl = await loginPage.waitForNavigationAwayFromLogin();
    expect(landingUrl).not.toContain('/login');

    // ── Step 6: Verify authenticated landing (property selection or dashboard) ──
    logger.info('=== Step 6: Verify authenticated landing ===');
    const landingType = await loginPage.expectAuthenticatedLanding();
    expect(['Property Selection', 'Dashboard']).toContain(landingType);

    logger.info(`TC_LGN_001 PASSED — Landed on: ${landingType}`);
  });

  // ─────────────────────────────────────────────────────────
  // TC_LGN_001 — Full flow convenience method
  // ─────────────────────────────────────────────────────────
  test('TC_LGN_001 (convenience): Full login flow in one call', async ({ page }) => {
    const loginPage = new SuccessfulLoginPage(page, page.context());

    const landingType = await loginPage.performSuccessfulLogin(validUsername, validPassword);

    expect(['Property Selection', 'Dashboard']).toContain(landingType);
    logger.info(`TC_LGN_001 (convenience) PASSED — Landed on: ${landingType}`);
  });
});
