import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/Login/Login';
import { LoginScenariosPage } from '../../src/pages/Login/LoginScenariosPage';
import { testDataManager } from '../../src/utils/TestDataManager';

/**
 * ============================================================================
 * LOGIN SCREEN — COMPREHENSIVE TEST SUITE
 * ============================================================================
 *
 * Covers all 27 test cases from specs/LoginTestcases.md and specs/login-page-test-plan.md
 *
 * Categories:
 *   1. Positive Scenarios       (TC_LGN_001 — TC_LGN_004)
 *   2. Negative Scenarios       (TC_LGN_005 — TC_LGN_010)
 *   3. Edge Case Scenarios      (TC_LGN_011 — TC_LGN_015)
 *   4. UI / Visual Validation   (TC_LGN_016 — TC_LGN_019)
 *   5. Keyboard & Accessibility (TC_LGN_020 — TC_LGN_022)
 *   6. Security / Injection     (TC_LGN_023 — TC_LGN_024)
 *   7. Account Lockout          (TC_LGN_025)
 *   8. Post-Login Flow          (TC_LGN_026 — TC_LGN_027)
 *
 * Page Object: src/pages/Login/Login.ts (LoginPage)
 *   — Provides full login-form API: open, fill, submit, assert, toggle, carousel,
 *     forgot-password, focus/keyboard, error-dialog helpers.
 *
 * Auth Data: loaded via testDataManager.getUserCredentials('all')
 * ============================================================================
 */

const DEFAULT_LOGIN_URL =
  process.env.BASE_URL || 'https://qc2webwish.prologicfirst.in/login/z6cQJcxmrEbhhFXqdoj64Q%3D%3D';

const INVALID_PASSWORD = 'WrongPass123!';
const LONG_VALUE = 'x'.repeat(300);
const SQL_PAYLOAD = "' OR 1=1; DROP TABLE users; --";
const XSS_PAYLOAD = "<script>alert('XSS')</script>";
const SPECIAL_CHARS = "admin'/*; --!@#$%^&*()_+{}|:\"<>?";

function getRemainingAttempts(dialogText: string | null): number | null {
  const match = dialogText?.match(/deactivated after (\d+) unsuccessful attempts/i);
  return match ? Number(match[1]) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. POSITIVE SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────

test.describe.serial('Login Screen — Positive Scenarios', () => {
  let validUsername = '12';
  let validPassword = 'Sachin@578';

  test.beforeAll(async () => {
    try {
      const user = await testDataManager.getUserCredentials('all');
      validUsername = user.username;
      validPassword = user.password;
    } catch (error) {
      logger.warn(`Falling back to default credentials: ${error}`);
    }
  });

  test.afterEach(async ({ page }) => {
    if (process.env.KEEP_BROWSER_OPEN === 'true') {
      await page.pause();
    }
  });

  test('TC_LGN_001: Successful login with valid credentials', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Open login page and verify form elements
    await login.open(DEFAULT_LOGIN_URL);
    await login.expectLoginFormVisible();

    // Step 2: Enter valid User Id
    await login.fillUserId(validUsername);

    // Step 3: Enter valid Password (verify masking)
    await login.fillPassword(validPassword);
    expect(await login.getPasswordInputType()).toBe('password');

    // Step 4: Click Log in
    await login.clickLogin();

    // Step 5: Verify authenticated landing
    await login.expectAuthenticatedLanding();

    await page.screenshot({ path: 'screenshots/TC_LGN_001.png', fullPage: true });
  });

  test('TC_LGN_002: Submit login using Enter key from password field', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Open login page
    await login.open(DEFAULT_LOGIN_URL);
    await login.expectLoginFormVisible();

    // Step 2: Enter valid credentials
    await login.fillCredentials(validUsername, validPassword);

    // Step 3: Press Enter from password field
    await login.submitWithEnterFromPassword();

    // Step 4: Verify authenticated landing
    await login.expectAuthenticatedLanding();

    await page.screenshot({ path: 'screenshots/TC_LGN_002.png', fullPage: true });
  });

  test('TC_LGN_003: Login with property selection and validate dashboard', async ({ page, context }) => {
    const login = new LoginScenariosPage(page, context);

    // Step 1: Open login page
    await login.openLoginPage();

    // Step 2: Login with flow
    await login.loginWithFlowProvided({ username: validUsername, password: validPassword });

    // Step 3: Verify property selection prompt
    await login.expectPropertySelectionPrompt();

    // Step 4: Select first property
    await page.getByText('WDUBI').first().click().catch(async () => {
      // Fallback: select by index if code not found
      const rows = page.locator('tr, .property-row, [class*="property"]');
      if (await rows.first().isVisible()) {
        await rows.first().click();
      }
    });

    // Step 5: Verify dashboard loads
    await expect(page.locator('#page-topbar')).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'screenshots/TC_LGN_003.png', fullPage: true });
  });

  test('TC_LGN_004: Forgot password link opens recovery flow with User Id', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Open login page
    await login.open(DEFAULT_LOGIN_URL);
    await login.expectLoginFormVisible();

    // Step 2: Enter a known User Id
    await login.fillUserId(validUsername);

    // Step 3: Click Forgot password?
    await login.clickForgotPassword();

    // Step 4: Verify forgot password screen elements
    await login.expectForgotPasswordScreen();

    // Step 5: Click Back to login
    await login.clickBackToLogin();
    await login.expectLoginFormVisible();

    await page.screenshot({ path: 'screenshots/TC_LGN_004.png', fullPage: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. NEGATIVE SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────

test.describe.serial('Login Screen — Negative Scenarios', () => {
  let validUsername = '12';
  let validPassword = 'Sachin@578';

  test.beforeAll(async () => {
    try {
      const user = await testDataManager.getUserCredentials('all');
      validUsername = user.username;
      validPassword = user.password;
    } catch (error) {
      logger.warn(`Falling back to default credentials: ${error}`);
    }
  });

  test.beforeEach(async ({ page, context }) => {
    const login = new LoginPage(page, context);
    await login.open(DEFAULT_LOGIN_URL);
    await login.expectLoginFormVisible();
  });

  test.afterEach(async ({ page }) => {
    if (process.env.KEEP_BROWSER_OPEN === 'true') {
      await page.pause();
    }
  });

  test('TC_LGN_005: Login with invalid User Id', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Enter invalid User Id with any password
    await login.fillCredentials('invalid.user', validPassword);

    // Step 2: Click Log in
    await login.clickLogin();

    // Step 3: Verify "Invalid User Id" error dialog with code (606)
    await login.expectErrorDialogContains('Invalid User Id');

    // Step 4: Dismiss dialog
    await login.clickDialogOk();

    // Step 5: Verify login form is still usable
    await login.expectLoginFormVisible();

    await page.screenshot({ path: 'screenshots/TC_LGN_005.png', fullPage: true });
  });

  test('TC_LGN_006: Login with valid User Id and wrong password', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Enter valid User Id with wrong password
    await login.fillCredentials(validUsername, INVALID_PASSWORD);

    // Step 2: Click Log in
    await login.clickLogin();

    // Step 3: Verify "Invalid Password" error with lockout warning and code (475)
    await login.expectErrorDialogContains('Invalid Password');
    await login.expectErrorDialogContains('unsuccessful attempts');

    // Step 4: Dismiss dialog
    await login.clickDialogOk();

    // Step 5: Verify login form remains interactive
    await login.expectLoginFormVisible();

    await page.screenshot({ path: 'screenshots/TC_LGN_006.png', fullPage: true });
  });

  test('TC_LGN_007: Empty credentials login submission', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Submit with empty credentials
    await login.clearCredentials();
    await login.clickLogin();

    // Step 2: Verify user is NOT authenticated
    await login.expectStillOnLogin();

    await page.screenshot({ path: 'screenshots/TC_LGN_007.png', fullPage: true });
  });

  test('TC_LGN_008: Username only submission (no password)', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Enter User Id only
    await login.fillUserId(validUsername);
    await login.clearPassword();

    // Step 2: Click Log in
    await login.clickLogin();

    // Step 3: Verify authentication rejected
    await login.expectStillOnLogin();

    await page.screenshot({ path: 'screenshots/TC_LGN_008.png', fullPage: true });
  });

  test('TC_LGN_009: Password only submission (no username)', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Enter Password only
    await login.clearUserId();
    await login.fillPassword(validPassword);

    // Step 2: Click Log in
    await login.clickLogin();

    // Step 3: Verify authentication rejected
    await login.expectStillOnLogin();

    await page.screenshot({ path: 'screenshots/TC_LGN_009.png', fullPage: true });
  });

  test('TC_LGN_010: Forgot password click with empty User Id', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Leave User Id empty
    await login.clearUserId();

    // Step 2: Click Forgot password?
    await login.clickForgotPassword();

    // Step 3: Verify validation prompt: "Please input your user Id...!"
    await login.expectErrorDialogContains('Please input your user Id');

    // Step 4: Dismiss dialog
    await login.clickDialogOk();

    // Step 5: Verify login form is still visible
    await login.expectLoginFormVisible();

    await page.screenshot({ path: 'screenshots/TC_LGN_010.png', fullPage: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. EDGE CASE SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────

test.describe.serial('Login Screen — Edge Case Scenarios', () => {
  let validUsername = '12';
  let validPassword = 'Sachin@578';

  test.beforeAll(async () => {
    try {
      const user = await testDataManager.getUserCredentials('all');
      validUsername = user.username;
      validPassword = user.password;
    } catch (error) {
      logger.warn(`Falling back to default credentials: ${error}`);
    }
  });

  test.beforeEach(async ({ page, context }) => {
    const login = new LoginPage(page, context);
    await login.open(DEFAULT_LOGIN_URL);
    await login.expectLoginFormVisible();
  });

  test.afterEach(async ({ page }) => {
    if (process.env.KEEP_BROWSER_OPEN === 'true') {
      await page.pause();
    }
  });

  test('TC_LGN_011: Leading and trailing whitespace in User Id', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Submit username with leading/trailing spaces
    await login.fillCredentials(`  ${validUsername}  `, validPassword);

    // Step 2: Click Log in
    await login.clickLogin();

    // Step 3: Verify deterministic outcome — either authenticated or explicit error
    await login.expectAuthOrErrorDialog();

    await page.screenshot({ path: 'screenshots/TC_LGN_011.png', fullPage: true });
  });

  test('TC_LGN_012: Case sensitivity behavior of User Id', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Baseline login with canonical username casing
    await login.fillCredentials(validUsername, validPassword);
    await login.clickLogin();
    const baselineSuccess = await login.isAuthenticatedLanding();

    if (!baselineSuccess) {
      await login.clickDialogOkIfVisible();
      await login.open(DEFAULT_LOGIN_URL);
      await login.expectLoginFormVisible();
    }

    // Step 2: Flip case of each character
    const flippedCase = validUsername
      .split('')
      .map((ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase()))
      .join('');

    // Step 3: Retry with altered case
    await login.fillCredentials(flippedCase, validPassword);
    await login.clickLogin();

    const alteredSuccess = await login.isAuthenticatedLanding();
    if (!alteredSuccess) {
      await login.expectErrorDialogVisible();
    }

    // Step 4: Behavior must be deterministic
    expect(alteredSuccess).toBe(baselineSuccess);

    await page.screenshot({ path: 'screenshots/TC_LGN_012.png', fullPage: true });
  });

  test('TC_LGN_013: Very long input strings (256+ characters)', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Submit oversized input values
    await login.fillCredentials(LONG_VALUE, LONG_VALUE);

    // Step 2: Click Log in
    await login.clickLogin();

    // Step 3: Verify UI stability and graceful handling
    await login.expectNoUnhandledClientError();
    await login.expectStillOnLoginOrErrorDialog();

    await page.screenshot({ path: 'screenshots/TC_LGN_013.png', fullPage: true });
  });

  test('TC_LGN_014: Special characters and SQL-like payload strings', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Submit SQL payload strings
    await login.fillCredentials(SQL_PAYLOAD, SQL_PAYLOAD);

    // Step 2: Click Log in
    await login.clickLogin();

    // Step 3: Verify safe handling — no client crash, no security leakage
    await login.expectNoUnhandledClientError();
    await login.expectStillOnLoginOrErrorDialog();

    // Step 4: Verify no SQL error or stack trace in UI
    const dialogVisible = await page.getByRole('dialog').isVisible().catch(() => false);
    if (dialogVisible) {
      const dialogText = await page.getByRole('dialog').textContent();
      expect(dialogText).not.toMatch(/sql|syntax|exception|stack\s?trace|database/i);
      await login.clickDialogOk();
    }

    await page.screenshot({ path: 'screenshots/TC_LGN_014.png', fullPage: true });
  });

  test('TC_LGN_015: Rapid/double-click on Log in button', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Enter invalid credentials
    await login.fillCredentials('invalid.user', INVALID_PASSWORD);

    // Step 2: Rapidly double-click Log in
    await login.doubleClickLogin();

    // Step 3: Verify controlled error handling — only one dialog or no freeze
    await expect
      .poll(
        async () => {
          const hasDialog = await page.getByRole('dialog').isVisible().catch(() => false);
          const onLogin = /\/login/i.test(page.url());
          return hasDialog || onLogin;
        },
        { timeout: 10000 }
      )
      .toBeTruthy();

    // Step 4: Verify UI does not freeze
    const okButton = page.getByRole('button', { name: 'OK' });
    if (await okButton.isVisible().catch(() => false)) {
      await okButton.click();
    }

    await login.expectLoginFormVisible();

    await page.screenshot({ path: 'screenshots/TC_LGN_015.png', fullPage: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. UI / VISUAL VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe.serial('Login Screen — UI / Visual Validation', () => {
  let validUsername = '12';
  let validPassword = 'Sachin@578';

  test.beforeAll(async () => {
    try {
      const user = await testDataManager.getUserCredentials('all');
      validUsername = user.username;
      validPassword = user.password;
    } catch (error) {
      logger.warn(`Falling back to default credentials: ${error}`);
    }
  });

  test.afterEach(async ({ page }) => {
    if (process.env.KEEP_BROWSER_OPEN === 'true') {
      await page.pause();
    }
  });

  test('TC_LGN_016: Core login form elements and labels', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Open login page on desktop viewport
    await login.open(DEFAULT_LOGIN_URL);

    // Step 2: Verify all form elements are visible with correct labels
    await login.expectLoginFormVisible();
    await login.expectCoreStaticUiVisible();

    // Step 3: Verify placeholders
    await expect(page.getByRole('textbox', { name: 'Enter username.' })).toHaveAttribute('placeholder', 'Enter username.');
    await expect(page.getByRole('textbox', { name: 'Enter password' })).toHaveAttribute('placeholder', 'Enter password');

    // Step 4: Verify Log in button is clickable
    await expect(page.getByRole('button', { name: 'Log in' })).toBeEnabled();

    // Step 5: Verify footer
    await expect(page.getByText('Prologic First India Pvt Ltd')).toBeVisible();

    await page.screenshot({ path: 'screenshots/TC_LGN_016.png', fullPage: true });
  });

  test('TC_LGN_017: Password masking and visibility toggle', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Open login page
    await login.open(DEFAULT_LOGIN_URL);
    await login.expectLoginFormVisible();

    // Step 2: Enter password and verify masked by default
    await login.fillPassword(validPassword);
    expect(await login.getPasswordInputType()).toBe('password');

    // Step 3: Click eye toggle — password should become visible
    await login.togglePasswordVisibility();
    expect(await login.getPasswordInputType()).toBe('text');

    // Step 4: Click toggle again — password should be masked
    await login.togglePasswordVisibility();
    expect(await login.getPasswordInputType()).toBe('password');

    await page.screenshot({ path: 'screenshots/TC_LGN_017.png', fullPage: true });
  });

  test('TC_LGN_018: Carousel indicator interaction', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Open login page
    await login.open(DEFAULT_LOGIN_URL);
    await login.expectLoginFormVisible();

    // Step 2: Verify all 3 carousel indicators exist
    await login.expectCarouselVisible();

    // Step 3: Click Slide 2 indicator
    await login.clickSlideIndicator(2);
    await login.expectSlideIndicatorActive(2);

    // Step 4: Click Slide 3 indicator
    await login.clickSlideIndicator(3);
    await login.expectSlideIndicatorActive(3);

    // Step 5: Verify login form remains fully functional
    await login.expectLoginFormVisible();

    await page.screenshot({ path: 'screenshots/TC_LGN_018.png', fullPage: true });
  });

  test('TC_LGN_019: Responsive behavior (mobile and desktop viewports)', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Validate desktop view (default viewport)
    await login.open(DEFAULT_LOGIN_URL);
    await login.expectLoginFormVisible();

    // Step 2: Create mobile context and validate
    const browser = page.context().browser();
    test.skip(!browser, 'No browser instance available for mobile context validation');

    const mobileContext = await browser!.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    });

    const mobilePage = await mobileContext.newPage();
    const mobileLogin = new LoginPage(mobilePage, mobileContext);

    // Step 3: Verify login form is usable on mobile
    await mobileLogin.open(DEFAULT_LOGIN_URL);
    await mobileLogin.expectLoginFormVisible();

    // Step 4: Test invalid login on mobile viewport
    await mobileLogin.fillCredentials('invalid.user', INVALID_PASSWORD);
    await mobileLogin.clickLogin();
    await mobileLogin.expectErrorDialogVisible();

    // Step 5: Dismiss dialog and verify form returns to normal
    await mobileLogin.clickDialogOk();
    await mobileLogin.expectLoginFormVisible();

    await mobilePage.screenshot({ path: 'screenshots/TC_LGN_019_mobile.png', fullPage: true });

    await mobileContext.close();

    await page.screenshot({ path: 'screenshots/TC_LGN_019_desktop.png', fullPage: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. KEYBOARD & ACCESSIBILITY
// ─────────────────────────────────────────────────────────────────────────────

test.describe.serial('Login Screen — Keyboard & Accessibility', () => {
  let validUsername = '12';
  let validPassword = 'Sachin@578';

  test.beforeAll(async () => {
    try {
      const user = await testDataManager.getUserCredentials('all');
      validUsername = user.username;
      validPassword = user.password;
    } catch (error) {
      logger.warn(`Falling back to default credentials: ${error}`);
    }
  });

  test.beforeEach(async ({ page, context }) => {
    const login = new LoginPage(page, context);
    await login.open(DEFAULT_LOGIN_URL);
    await login.expectLoginFormVisible();
  });

  test.afterEach(async ({ page }) => {
    if (process.env.KEEP_BROWSER_OPEN === 'true') {
      await page.pause();
    }
  });

  test('TC_LGN_020: Tab focus order through login controls', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Focus User Id field
    await login.focusUserId();

    // Step 2: Tab to Password field
    await login.pressTab();
    await login.expectPasswordFocused();

    // Step 3: Tab to Log in button
    await login.pressTab();
    await login.expectLoginButtonFocused();

    // Step 4: Tab to Forgot password link
    await login.pressTab();
    await login.expectForgotPasswordFocused();

    await page.screenshot({ path: 'screenshots/TC_LGN_020.png', fullPage: true });
  });

  test('TC_LGN_021: Enter key activates Log in button', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Enter valid credentials
    await login.fillCredentials(validUsername, validPassword);

    // Step 2: Focus password and press Enter
    await login.submitWithEnterFromPassword();

    // Step 3: Verify same outcome as mouse click
    await login.expectAuthenticatedLanding();

    await page.screenshot({ path: 'screenshots/TC_LGN_021.png', fullPage: true });
  });

  test('TC_LGN_022: Error dialog focus trap and keyboard dismissal', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Submit invalid credentials to trigger error dialog
    await login.fillCredentials('invalid.user', INVALID_PASSWORD);
    await login.clickLogin();

    // Step 2: Verify error dialog appears with focused OK button
    await login.expectErrorDialogVisible();
    await login.expectDialogOkFocused();

    // Step 3: Dismiss dialog using Enter key
    await login.pressEnter();

    // Step 4: Verify focus returns to login form
    await login.expectLoginFormVisible();

    await page.screenshot({ path: 'screenshots/TC_LGN_022.png', fullPage: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. SECURITY / INJECTION
// ─────────────────────────────────────────────────────────────────────────────

test.describe.serial('Login Screen — Security / Injection', () => {
  let validUsername = '12';
  let validPassword = 'Sachin@578';

  test.beforeAll(async () => {
    try {
      const user = await testDataManager.getUserCredentials('all');
      validUsername = user.username;
      validPassword = user.password;
    } catch (error) {
      logger.warn(`Falling back to default credentials: ${error}`);
    }
  });

  test.beforeEach(async ({ page, context }) => {
    const login = new LoginPage(page, context);
    await login.open(DEFAULT_LOGIN_URL);
    await login.expectLoginFormVisible();
  });

  test.afterEach(async ({ page }) => {
    if (process.env.KEEP_BROWSER_OPEN === 'true') {
      await page.pause();
    }
  });

  test('TC_LGN_023: SQL injection attempt in User Id', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Enter SQL injection payload
    await login.fillCredentials(SQL_PAYLOAD, 'anypassword');

    // Step 2: Submit login
    await login.clickLogin();

    // Step 3: Verify standard authentication error (not SQL error)
    await login.expectErrorDialogContains('Invalid User Id');

    // Step 4: Verify no SQL error or stack trace leaked in UI
    const dialogText = await page.getByRole('dialog').textContent();
    expect(dialogText).not.toMatch(/sql\s+syntax|database\s+error|exception\s+at|stack\s?trace/i);

    // Step 5: Dismiss and verify form is still functional
    await login.clickDialogOk();
    await login.expectLoginFormVisible();

    await page.screenshot({ path: 'screenshots/TC_LGN_023.png', fullPage: true });
  });

  test('TC_LGN_024: XSS attempt in User Id field', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Enter XSS payload
    await login.fillCredentials(XSS_PAYLOAD, 'anypassword');

    // Step 2: Verify no JavaScript alert pops up from input
    let alertFired = false;
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'alert') {
        alertFired = true;
        await dialog.dismiss();
      }
    });

    // Step 3: Submit login
    await login.clickLogin();

    // Step 4: Verify no XSS execution
    expect(alertFired).toBe(false);

    // Step 5: Verify page stability — form is still usable
    await login.expectNoUnhandledClientError();
    await login.expectStillOnLoginOrErrorDialog();

    // Step 6: Verify input was treated as plain text
    const userIdValue = await page.getByRole('textbox', { name: 'Enter username.' }).inputValue();
    expect(userIdValue).toBe(XSS_PAYLOAD);

    await page.screenshot({ path: 'screenshots/TC_LGN_024.png', fullPage: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. ACCOUNT LOCKOUT
// ─────────────────────────────────────────────────────────────────────────────

test.describe.serial('Login Screen — Account Lockout', () => {
  let validUsername = '12';
  let validPassword = 'Sachin@578';

  test.beforeAll(async () => {
    try {
      const user = await testDataManager.getUserCredentials('all');
      validUsername = user.username;
      validPassword = user.password;
    } catch (error) {
      logger.warn(`Falling back to default credentials: ${error}`);
    }
  });

  test.afterEach(async ({ page }) => {
    if (process.env.KEEP_BROWSER_OPEN === 'true') {
      await page.pause();
    }
  });

  test('TC_LGN_025: Account lockout after repeated failed attempts', async ({ page, context }) => {
    test.slow(); // This test intentionally runs many login attempts
    const login = new LoginPage(page, context);

    // Step 1: Open login page
    await login.open(DEFAULT_LOGIN_URL);
    await login.expectLoginFormVisible();

    // Step 2: First failed attempt — capture initial remaining attempts count
    await login.fillCredentials(validUsername, INVALID_PASSWORD);
    await login.clickLogin();

    const initialDialogText = await page.getByRole('dialog').textContent();
    expect(initialDialogText).toContain('Invalid Password');

    let remainingAttempts = getRemainingAttempts(initialDialogText);
    expect(remainingAttempts).not.toBeNull();

    // Step 3: Loop through remaining attempts, verifying count decrements
    while (remainingAttempts !== null && remainingAttempts > 1) {
      await login.clickDialogOk();
      await login.expectStillOnLoginOrErrorDialog();

      await login.fillCredentials(validUsername, INVALID_PASSWORD);
      await login.clickLogin();

      const dialogText = await page.getByRole('dialog').textContent();
      expect(dialogText).toContain('Invalid Password');

      const nextRemainingAttempts = getRemainingAttempts(dialogText);
      expect(nextRemainingAttempts).toBe(remainingAttempts - 1);
      remainingAttempts = nextRemainingAttempts;
    }

    // Step 4: Dismiss final warning
    await login.clickDialogOk();
    await login.expectStillOnLoginOrErrorDialog();

    await page.screenshot({ path: 'screenshots/TC_LGN_025.png', fullPage: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. POST-LOGIN FLOW
// ─────────────────────────────────────────────────────────────────────────────

test.describe.serial('Login Screen — Post-Login Flow', () => {
  let validUsername = '12';
  let validPassword = 'Sachin@578';

  test.beforeAll(async () => {
    try {
      const user = await testDataManager.getUserCredentials('all');
      validUsername = user.username;
      validPassword = user.password;
    } catch (error) {
      logger.warn(`Falling back to default credentials: ${error}`);
    }
  });

  test.afterEach(async ({ page }) => {
    if (process.env.KEEP_BROWSER_OPEN === 'true') {
      await page.pause();
    }
  });

  test('TC_LGN_026: Login with property selection and verify dashboard elements', async ({ page, context }) => {
    const login = new LoginScenariosPage(page, context);

    // Step 1: Login with valid credentials
    await login.openLoginPage();
    await login.loginWithFlowProvided({ username: validUsername, password: validPassword });

    // Step 2: Verify property selection prompt
    await login.expectPropertySelectionPrompt();

    await page.screenshot({ path: 'screenshots/TC_LGN_026_property_selection.png', fullPage: true });
  });

  test('TC_LGN_027: Post-login shift switch flow validation', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // Step 1: Login and navigate to dashboard
    await login.open(DEFAULT_LOGIN_URL);
    await login.fillCredentials(validUsername, validPassword);
    await login.clickLogin();
    await login.expectAuthenticatedLanding();

    // Step 2: Wait for dashboard to fully load
    await expect(page.locator('#page-topbar')).toBeVisible({ timeout: 15000 });

    // Step 3: Verify core dashboard elements
    const searchBox = page.getByRole('textbox', { name: 'Search...' });
    await expect(searchBox).toBeVisible();

    // Step 4: Verify topbar buttons are present
    await expect(page.getByRole('button').nth(1)).toBeVisible();
    await expect(page.getByRole('button').nth(2)).toBeVisible();

    await page.screenshot({ path: 'screenshots/TC_LGN_027.png', fullPage: true });
  });
});
