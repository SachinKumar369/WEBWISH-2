import { expect, test } from '@playwright/test';
import logger from '../../src/core/Logger';
import { testDataManager } from '../../src/utils/TestDataManager';
import { LoginPage } from '../../src/pages/Login/Login';

const DEFAULT_LOGIN_URL =
  process.env.BASE_URL || 'https://qc2webwish.prologicfirst.in/#/login/z6cQJcxmrEbhhFXqdoj64Q%3D%3D';

const INVALID_PASSWORD = 'WrongPass123!';
const LONG_VALUE = 'x'.repeat(300);
const SPECIAL_VALUE = "' OR 1=1; DROP TABLE users; --";

function getRemainingAttempts(dialogText: string | null): number | null {
  const match = dialogText?.match(/deactivated after (\d+) unsuccessful attempts/i);
  return match ? Number(match[1]) : null;
}

test.describe('Login', () => {
  let validUsername = '12';
  let validPassword = 'Sachin@578';

  test.beforeAll(async () => {
    try {
      const user = await testDataManager.getUserCredentials('all');
      validUsername = user.username;
      validPassword = user.password;
    } catch (error) {
      logger.warn(`Falling back to default credentials for Login suite: ${error}`);
    }
  });

  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN enabled. Browser remains open after test execution.');
    }
    await page.waitForTimeout(200);
  });

  test.beforeEach(async ({ page, context }) => {
    const login = new LoginPage(page, context);
    await login.open(DEFAULT_LOGIN_URL);
    await login.expectLoginFormVisible();
  });

  test('Positive - Successful Login with Valid Credentials', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Enter valid credentials and submit with login button
    await login.fillCredentials(validUsername, validPassword);
    await login.clickLogin();

    // 2. Verify user lands on authenticated flow
    await login.expectAuthenticatedLanding();
  });

  test('Positive - Submit Login with Enter Key from Password Field', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Enter valid credentials
    await login.fillCredentials(validUsername, validPassword);

    // 2. Submit form using keyboard Enter
    await login.submitWithEnterFromPassword();

    // 3. Verify successful authenticated landing
    await login.expectAuthenticatedLanding();
  });

  test('Positive - Forgot Password Link Opens Recovery Flow with User Id', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Enter known user id
    await login.fillUserId(validUsername);

    // 2. Open forgot password flow and verify controls
    await login.clickForgotPassword();
    await login.expectForgotPasswordScreen();

    // 3. Go back to login
    await login.clickBackToLogin();
    await login.expectLoginFormVisible();
  });

  test('Negative - Login Attempt with Invalid User Id', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Submit invalid user id credentials
    await login.fillCredentials('invalid.user', INVALID_PASSWORD);
    await login.clickLogin();

    // 2. Verify invalid user id feedback and dismiss
    await login.expectErrorDialogContains('Invalid User Id');
    await login.clickDialogOk();

    // 3. Verify login form still usable
    await login.expectLoginFormVisible();
  });

  test('Negative - Login Attempt with Valid User Id and Wrong Password', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Submit known user with wrong password
    await login.fillCredentials(validUsername, INVALID_PASSWORD);
    await login.clickLogin();

    // 2. Verify invalid password feedback with lockout warning
    await login.expectErrorDialogContains('Invalid Password');
    await login.expectErrorDialogContains('unsuccessful attempts');

    // 3. Dismiss dialog
    await login.clickDialogOk();
    await login.expectLoginFormVisible();
  });

  test('TC_LGN_017 - Account Lockout (Stable Loop)', async ({ page, context }) => {
    test.slow();

    const login = new LoginPage(page, context);

    // 1. Repeatedly submit the same invalid credentials until the countdown reaches the blocked threshold.
    await login.fillCredentials(validUsername, INVALID_PASSWORD);
    await login.clickLogin();

    const initialDialogText = await page.getByRole('dialog').textContent();
    expect(initialDialogText).toContain('Invalid Password');

    let remainingAttempts = getRemainingAttempts(initialDialogText);
    expect(remainingAttempts).not.toBeNull();

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

    // 2. Dismiss the final warning after the account reaches the blocked threshold.
    await login.clickDialogOk();
    await login.expectStillOnLoginOrErrorDialog();
  });

  test('Negative - Forgot Password Click with Empty User Id', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Click forgot password without user id
    await login.clickForgotPassword();

    // 2. Verify user id prompt
    await login.expectErrorDialogContains('Please input your user Id');

    // 3. Dismiss prompt
    await login.clickDialogOk();
    await login.expectLoginFormVisible();
  });

  test('Negative - Empty Credentials Login Submission', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Submit with empty credentials
    await login.clearCredentials();
    await login.clickLogin();

    // 2. Verify user is not authenticated
    await login.expectStillOnLogin();
  });

  test('Negative - Username Only Submission', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Submit with only user id
    await login.fillUserId(validUsername);
    await login.clearPassword();
    await login.clickLogin();

    // 2. Verify authentication rejected
    await login.expectStillOnLogin();
  });

  test('Negative - Password Only Submission', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Submit with only password
    await login.clearUserId();
    await login.fillPassword(INVALID_PASSWORD);
    await login.clickLogin();

    // 2. Verify authentication rejected
    await login.expectStillOnLogin();
  });

  test('Edge Case - Leading and Trailing Whitespace in User Id', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Submit username with leading and trailing spaces
    await login.fillCredentials(`  ${validUsername}  `, validPassword);
    await login.clickLogin();

    // 2. Verify deterministic outcome: authenticated or explicit error
    await login.expectAuthOrErrorDialog();
  });

  // test('Edge Case - Case Sensitivity Behavior of User Id', async ({ page, context }) => {
  //   const login = new LoginPage(page, context);

  //   // 1. Baseline with canonical username case
  //   await login.fillCredentials(validUsername, validPassword);
  //   await login.clickLogin();
  //   const baselineSuccess = await login.isAuthenticatedLanding();

  //   if (!baselineSuccess) {
  //     await login.clickDialogOkIfVisible();
  //     await login.open(DEFAULT_LOGIN_URL);
  //     await login.expectLoginFormVisible();
  //   }

  //   // 2. Retry with altered case and verify behavior is deterministic
  //   const flippedCase = validUsername
  //     .split('')
  //     .map((ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase()))
  //     .join('');

  //   await login.fillCredentials(flippedCase, validPassword);
  //   await login.clickLogin();

  //   const alteredSuccess = await login.isAuthenticatedLanding();
  //   if (!alteredSuccess) {
  //     await login.expectErrorDialogVisible();
  //   }

  //   expect(alteredSuccess).toBe(baselineSuccess);

  //   // expect(typeof baselineSuccess).toBe('boolean');
  //   // expect(typeof alteredSuccess).toBe('boolean');
  // });

  test('Edge Case - Very Long Input Strings', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Submit oversized input values
    await login.fillCredentials(LONG_VALUE, LONG_VALUE);
    await login.clickLogin();

    // 2. Verify graceful handling
    await login.expectNoUnhandledClientError();
    await login.expectStillOnLoginOrErrorDialog();

  });

  test('Edge Case - Special Characters and SQL-like Payload Strings', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Submit special character payload-like values
    await login.fillCredentials(SPECIAL_VALUE, SPECIAL_VALUE);
    await login.clickLogin();

    // 2. Verify safe handling and stable UI
    await login.expectNoUnhandledClientError();
    await login.expectStillOnLoginOrErrorDialog();
  });

  // test('Edge Case - Rapid Repeated Submit Clicks', async ({ page, context }) => {
  //   const login = new LoginPage(page, context);

  //   // 1. Enter invalid credentials
  //   await login.fillCredentials('invalid.user', INVALID_PASSWORD);

  //   // 2. Rapidly click submit
  //   await login.doubleClickLogin();

  //   // 3. Verify controlled error handling
  //   await login.expectErrorDialogVisible();
  // });

  // test('UI Validation - Core Login Form Elements and Labels', async ({ page, context }) => {
  //   const login = new LoginPage(page, context);

  //   // 1. Validate core login controls and labels
  //   await login.expectLoginFormVisible();
  //   await login.expectCoreStaticUiVisible();
  // });

  test('UI Validation - Password Masking and Visibility Toggle', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Verify password is masked by default
    await login.fillPassword(validPassword);
    expect(await login.getPasswordInputType()).toBe('password');

    // 2. Toggle once and verify password is visible
    await login.togglePasswordVisibility();
    expect(await login.getPasswordInputType()).toBe('text');

    // 3. Toggle again and verify masked state restored
    await login.togglePasswordVisibility();
    expect(await login.getPasswordInputType()).toBe('password');
  });

  test('UI Validation - Carousel Indicator Interaction on Login Page', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Validate indicator controls exist
    await login.expectCarouselVisible();

    // 2. Switch active indicator to slide 2
    await login.clickSlideIndicator(2);
    await login.expectSlideIndicatorActive(2);

    // 3. Switch active indicator to slide 3
    await login.clickSlideIndicator(3);
    await login.expectSlideIndicatorActive(3);
  });

  // test('UI Validation - Responsive Behavior (Mobile and Desktop)', async ({ page, context }) => {
  //   const login = new LoginPage(page, context);

  //   // 1. Validate desktop view
  //   await login.expectLoginFormVisible();

  //   // 2. Validate mobile behavior in a dedicated mobile context
  //   const browser = page.context().browser();
  //   test.skip(!browser, 'No browser instance available for mobile context validation');

  //   const mobileContext = await browser!.newContext({
  //     viewport: { width: 390, height: 844 },
  //     userAgent:
  //       'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  //   });

  //   const mobilePage = await mobileContext.newPage();
  //   const mobileLogin = new LoginPage(mobilePage, mobileContext);

  //   await mobileLogin.open(DEFAULT_LOGIN_URL);
  //   await mobileLogin.expectLoginFormVisible();
  //   await mobileLogin.fillCredentials('invalid.user', INVALID_PASSWORD);
  //   await mobileLogin.clickLogin();
  //   await mobileLogin.expectErrorDialogVisible();

  //   await mobileContext.close();
  // });

  test('UI Validation - Focus Order and Keyboard Accessibility', async ({ page, context }) => {
    const login = new LoginPage(page, context);

    // 1. Validate keyboard focus order
    await login.focusUserId();
    await login.pressTab();
    await login.expectPasswordFocused();

    await login.pressTab();
    await login.expectLoginButtonFocused();

    await login.pressTab();
    await login.expectForgotPasswordFocused();

    // 2. Trigger submit with keyboard Enter
    await login.fillCredentials('invalid.user', INVALID_PASSWORD);
    await login.focusPassword();
    await login.submitWithEnterFromPassword();

    // 3. Verify dialog keyboard handling
    await login.expectErrorDialogVisible();
    await login.expectDialogOkFocused();
    await login.pressEnter();
    await login.expectLoginFormVisible();
  });








});