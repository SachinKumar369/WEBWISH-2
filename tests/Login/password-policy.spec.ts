import { expect, test } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { PasswordPolicyPage } from '../../src/pages/Login/PasswordPolicyPage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe.serial('Login Module - Password Policy', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('LOGIN_PASSWORD_POLICY_001: Update password policy through Property General Setup', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const passwordPolicyPage = new PasswordPolicyPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    await passwordPolicyPage.openPasswordPolicySection();
    await passwordPolicyPage.updatePasswordPolicyAndConfirm();

    await page.screenshot({
      path: 'screenshots/LOGIN_PASSWORD_POLICY_001.png',
      fullPage: true
    });
  });
});