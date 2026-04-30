import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { ChargeTaxTemplateSetupPage } from '../../../src/pages/FrontOfficeSetup/CashieringParameters/ChargeTaxTemplateSetupPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Cashiering Parameters - Charge Tax Template Setup', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_CASHIER_CHARGETAX_001: create and delete charge tax template', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const chargeTaxTemplatePage = new ChargeTaxTemplateSetupPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Charge Tax Template create/delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await chargeTaxTemplatePage.navigateToChargeTaxTemplateSetup();

    // Execute Create and Delete Flow
    const templateId = `T${Date.now().toString().slice(-9)}`;
    const description = 'Automation Charge Tax';
    const searchText = 'automation';

    await chargeTaxTemplatePage.createAndDeleteTemplate(templateId, description, searchText);

    // Screenshot for documentation
    await page.screenshot({ path: 'screenshots/charge-tax-template-setup-complete.png' });
  });
});
