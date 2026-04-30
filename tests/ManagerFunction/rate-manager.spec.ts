import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { RateManagerData, RateManagerPage } from '../../src/pages/ManagerFunction/RateManagerPage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe.serial('Manager Function - Rate Manager', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('MGR_RATE_001: Create new rate from manager functions', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const rateManagerPage = new RateManagerPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Rate Manager flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    const uniqueRateCode = (Date.now().toString().slice(-2) + Math.floor(Math.random() * 100)).padStart(4, '0');


    const uniqueSuffix = Date.now().toString().slice(-5);
    const rateData: RateManagerData = {
      rateCode: uniqueRateCode,
      description: `Description_${uniqueSuffix}`
    };

    await rateManagerPage.runRateManagerCreateFlow(rateData);

    await page.screenshot({
      path: 'screenshots/MGR_RATE_001.png',
      fullPage: true
    });
  });
});
