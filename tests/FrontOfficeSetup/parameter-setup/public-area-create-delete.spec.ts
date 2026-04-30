import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { PublicAreaPage } from '../../../src/pages/FrontOfficeSetup/ParameterSetup/PublicAreaPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('FrontOffice Setup - Parameter Setup - Public Area Create/Delete', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('FOS_PARAM_PUBLICAREA_002: create and delete public area', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const publicAreaPage = new PublicAreaPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Public Area create/delete flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await publicAreaPage.runPublicAreaCreateDeleteFlow();

    await page.screenshot({
      path: 'screenshots/FOS_PARAM_PUBLICAREA_002.png',
      fullPage: true
    });
  });

  test('FOS_PARAM_PUBLICAREA_003: save and add new multiple entries', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const publicAreaPage = new PublicAreaPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Public Area Save & Add New flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await publicAreaPage.runPublicAreaSaveAndAddNewFlow();

    await page.screenshot({
      path: 'screenshots/FOS_PARAM_PUBLICAREA_003.png',
      fullPage: true
    });
  });

  test('FOS_PARAM_PUBLICAREA_004: validate mandatory fields', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const publicAreaPage = new PublicAreaPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property for Public Area mandatory fields validation flow');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    await publicAreaPage.runPublicAreaMandatoryFieldsValidationFlow();

    await page.screenshot({
      path: 'screenshots/FOS_PARAM_PUBLICAREA_004.png',
      fullPage: true
    });
  });
});
