import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { PaymentMethodPage } from '../../../src/pages/FrontOfficeSetup/CashieringParameters/PaymentMethodPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Cashiering Parameters - Payment Method', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_CASHIER_PAYMETHOD_001: create and delete payment method automation records', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const paymentMethodPage = new PaymentMethodPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Payment Method create/delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await paymentMethodPage.runPaymentMethodCreateDeleteFlow();

    await page.screenshot({
      path: 'screenshots/FOS_CASHIER_PAYMETHOD_001.png',
      fullPage: true
    });
  });
});