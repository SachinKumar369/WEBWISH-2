import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { PasswordPolicyPage } from '../../src/pages/SystemConfig/PasswordPolicyPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe.serial('System Config - Password Policy', () => {
  test.afterEach(async ({ page }) => {
    logger.info(`Test finished: ${test.info().title}`);

    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';

    if (keepBrowserOpen) {
      logger.info('🔒 KEEP_BROWSER_OPEN is enabled. Browser will stay open. Press resume in inspector to continue...');
      await page.pause();
    } else {
      const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '2000', 10);
      logger.info(`⏸️  Pausing for ${pauseDuration}ms before browser closes...`);
      await page.waitForTimeout(pauseDuration);
    }
  });

  test('SYS_PASSWORDPOLICY_001: update password policy with all fields and confirm', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const passwordPolicyPage = new PasswordPolicyPage(page, context);

    // ── Login ──
    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    await page.mouse.move(0, 300);

    // ── Navigate to Password Policy ──
    await passwordPolicyPage.openPasswordPolicySection();

    // ── Fill & update all fields ──
    await passwordPolicyPage.updatePasswordPolicyAndConfirm({
      minimumLength: '1',
      passwordHistory: '0',
      expiryDays: '365',
      alertDays: '10',
      lockAfterAttempts: '23',
      releaseLockMinutes: '1',
      maxPasswordLength: '20',
      minUpperCase: '1',
      minLowerCase: '1',
      minNumeric: '1',
      minSpecialChar: '1',
    });

    // ── Close the dialog ──
    await passwordPolicyPage.closePasswordPolicyDialog();

    // ── Screenshot ──
    await page.screenshot({
      path: `screenshots/systemconfig_password_policy_${Date.now()}.png`,
      fullPage: true,
    });

    logger.info('Password policy updated successfully');
  });
});
