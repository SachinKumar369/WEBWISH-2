import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { CorporateMaintenanceData, CorporateMaintenancePage } from '../../src/pages/Marketing/CorporateMaintenancePage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe.serial('Marketing - Corporate Maintenance', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('MKT_CORP_001: complete corporate maintenance workflow', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const corporateMaintenancePage = new CorporateMaintenancePage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for corporate maintenance flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    const uniqueCorporateId = `${Date.now()}`.slice(-8);

    const data: CorporateMaintenanceData = {
      id: uniqueCorporateId,
      name: 'Corporate',
      legalName: 'Legal Name',
      modifiedLegalName: 'Modified Legal Name',
      address1: 'New Delhi',
      contactFirstName: 'sachin',
      contactLastName: 'sachin',
      contactAddress: 'delhi',
      callLogPurpose: 'purpose'
    };

    await corporateMaintenancePage.runCorporateMaintenanceFlow(data);

    await page.screenshot({
      path: 'screenshots/MKT_CORP_001.png',
      fullPage: true
    });
  });
});
