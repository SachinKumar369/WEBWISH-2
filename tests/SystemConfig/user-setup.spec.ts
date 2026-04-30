import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { UserSetupPage } from '../../src/pages/SystemConfig/UserSetupPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe.serial('System Config - User Setup', () => {
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

  test('SYS_USERSETUP_FLOW_001: create, update, deactivate and delete user setup record', async ({ page, context }) => {
    test.setTimeout(45 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const userSetupPage = new UserSetupPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    await page.mouse.move(0, 300);

    const uniqueUserId = `A${Date.now().toString().slice(-8)}`;

    await userSetupPage.runUserSetupFlow({
      userId: uniqueUserId,
      description: 'AUTOMATION',
      invalidEmail: '!@#4@gmail.com',
      validEmail: 'abc@gmail.com',
      mobile: '9999999999',
      password: 'Password@123',
      designation: 'Manager',
      employeeCode: 'EMP1234567',
      languageSearchText: 'ENGLI',
    });

    await page.screenshot({
      path: `screenshots/systemconfig_user_setup_${uniqueUserId}.png`,
      fullPage: true,
    });

    logger.info(`User setup flow completed successfully for userId=${uniqueUserId}`);
  });
});
