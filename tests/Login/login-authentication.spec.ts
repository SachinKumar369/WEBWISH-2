import { test } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginScenariosPage } from '../../src/pages/Login/LoginScenariosPage';
import { LoginPage } from '../../src/pages/LoginPage';
import { LoginDashboardPage } from '../../src/pages/Login/LoginDashboardPage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe.serial('Login Scenarios', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      //await page.pause();
    }
  });
  
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

  test('LOGIN_001: Correct ID and correct password', async ({ page, context }) => {
    const loginPage = new LoginScenariosPage(page, context);

    await loginPage.openLoginPage();
    await loginPage.loginWithFlowProvided({
      username: validUsername,
      password: validPassword
    });
    await loginPage.expectPropertySelectionPrompt();

    await page.screenshot({
      path: 'screenshots/LOGIN_001.png',
      fullPage: true
    });
  });

  test('LOGIN_002: Correct ID and incorrect password', async ({ page, context }) => {
    const loginPage = new LoginScenariosPage(page, context);

    await loginPage.openLoginPage();

    // Attempt 1: Invalid user with correct password
    await loginPage.loginSimple({
      username: 'Sach1',
      password: validPassword
    });
    await loginPage.expectInvalidUserIdError();
    await loginPage.clickFeedbackOk();

    await loginPage.expectLogoVisible();

    // Attempt 2: Valid user with invalid password (with eye toggle)
    await loginPage.loginWithEyeToggle({
      username: validUsername,
      password: `${validPassword}1`
    });
    await loginPage.expectInvalidPasswordError();
    await loginPage.clickFeedbackOk();

    await page.screenshot({
      path: 'screenshots/LOGIN_002.png',
      fullPage: true
    });
  });

  test('LOGIN_003: Incorrect ID and correct password', async ({ page, context }) => {
    const loginPage = new LoginScenariosPage(page, context);

    await loginPage.openLoginPage();
    await loginPage.loginSimple({
      username: 'Sach1',
      password: validPassword
    });
    await loginPage.expectInvalidUserIdError();

    await page.screenshot({
      path: 'screenshots/LOGIN_003.png',
      fullPage: true
    });
  });

  test('LOGIN_004: Password visibility toggle (eye icon)', async ({ page, context }) => {
    const loginPage = new LoginScenariosPage(page, context);

    await loginPage.openLoginPage();
    await loginPage.validatePasswordVisibilityToggle();

    await page.screenshot({
      path: 'screenshots/LOGIN_004.png',
      fullPage: true
    });
  });

  test('LOGIN_005: Forgot password flow', async ({ page, context }) => {
    const loginPage = new LoginScenariosPage(page, context);

    await loginPage.openLoginPage();

    await loginPage.clickForgotPassword();
    await loginPage.expectForgotPasswordUserIdPrompt();
    await loginPage.clickFeedbackOk();
    await loginPage.expectLogoVisible();

    await loginPage.enterUsernameWithCaps(validUsername);
    await loginPage.clickForgotPassword();
    await loginPage.expectForgotPasswordScreen();

    await page.screenshot({
      path: 'screenshots/LOGIN_005.png',
      fullPage: true
    });
  });

  test('LOGIN_006: Login with existing flow and validate dashboard after property selection', async ({ page, context }) => {
    const loginPage = new LoginPage(page, context);
    const dashboardPage = new LoginDashboardPage(page, context);

    await loginPage.loginWithPropertySelection(validUsername, validPassword, 0);
    await dashboardPage.expectDashboardLoaded();
    await dashboardPage.validateShiftSwitchFlow();

    await page.screenshot({
      path: 'screenshots/LOGIN_006.png',
      fullPage: true
    });
  });
});
