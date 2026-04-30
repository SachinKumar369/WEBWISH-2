import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { AlertSetupPage } from '../../src/pages/SystemConfig/AlertSetupPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe.serial('System Config - Alert Setup', () => {
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

  test('SYS_ALERTSETUP_FLOW_001: create, deactivate and delete alert setup record', async ({ page, context }) => {
    test.setTimeout(45 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const alertSetupPage = new AlertSetupPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    await page.mouse.move(0, 300);

    const uniqueSuffix = Date.now().toString().slice(-6);
    const code = `A${uniqueSuffix.slice(-4)}`;
    const description = `automation-${uniqueSuffix}`;

    await alertSetupPage.runAlertSetupFlow({
      code,
      description,
      defaultMessage: 'default messages',
      searchText: description,
    });

    await page.screenshot({
      path: `screenshots/systemconfig_alert_setup_${uniqueSuffix}.png`,
      fullPage: true,
    });

    logger.info(`Alert setup flow completed successfully for code=${code}`);
  });
});
