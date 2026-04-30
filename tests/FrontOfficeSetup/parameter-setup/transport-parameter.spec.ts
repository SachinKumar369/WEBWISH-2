import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { TransportParameterPage } from '../../../src/pages/FrontOfficeSetup/ParameterSetup/TransportParameterPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Parameter Setup - Transport Parameter', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_PARAM_TRANSPORT_001: create, edit, and delete transport parameter', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const transportParameterPage = new TransportParameterPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Transport Parameter flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    //const code = `A${Date.now()}`;
    const code = `A${Date.now()}${Math.floor(Math.random() * 1000)}`;
    await transportParameterPage.runTransportParameterCreateEditDeleteFlow(
      code,
      'DELHI TO MUMBAI',
      'DELHI',
      'MUMBAI'
    );

    await page.screenshot({
      path: 'screenshots/FOS_PARAM_TRANSPORT_001.png',
      fullPage: true
    });
  });
});