import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { TemplateSetupPage } from '../../src/pages/SystemConfig/TemplateSetupPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.afterEach(async ({ page }) => {
  logger.info('Test finished: SYS_TEMPLATE_FLOW_001');

  const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';

  if (keepBrowserOpen) {
    logger.info('🔒 KEEP_BROWSER_OPEN is enabled. Browser will stay open. Press any key in console to continue...');
    await page.pause();
  } else {
    const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '2000', 10);
    logger.info(`⏸️  Pausing for ${pauseDuration}ms before browser closes...`);
    await page.waitForTimeout(pauseDuration);
  }
});

test('SYS_TEMPLATE_FLOW_001: Template setup end-to-end', async ({ page, context }) => {
  const loginPage = new LoginPage(page, context);
  const tplPage = new TemplateSetupPage(page, context);

  const user = await testDataManager.getUserCredentials('all');
  expect(user).toBeDefined();

  // Login and select property
  await loginPage.loginWithPropertySelection(user.username, user.password, 2);
      //await this.page.mouse.move(0, 300);
      await page.mouse.move(0, 300);


  // Open Template Setup
  await tplPage.openPage();

  // 1) Create a template
  await tplPage.createTemplate('SACHIN', 'AUTOMATION');

  // 2) Create by copying from existing template
  await tplPage.copyFromTemplate('SACh', 'automation', 'SACHIN');

  // 3) Create with specific permissions checked
  await tplPage.createWithChecks('SACHINK', 'automation');

  // 4) Search and delete created automation templates
  await tplPage.search('automation');
  await tplPage.deleteSelected();

  // 5) Click email button (as in original flow)
  //await tplPage.clickEmailButton();

  await page.screenshot({ path: `screenshots/template_setup_flow_${Date.now()}.png`, fullPage: true });

  logger.info('Template setup flow completed');
});
