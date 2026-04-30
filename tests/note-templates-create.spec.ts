import { test, expect } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';
import { NoteTemplatesPage } from '../src/pages/NoteTemplatesPage';
import { testDataManager } from '../src/utils/TestDataManager';
import logger from '../src/core/Logger';

test.afterEach(async ({ page }) => {
  logger.info('Test finished: NT_CREATE_001');

  // Check if browser should stay open
  const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';

  if (keepBrowserOpen) {
    logger.info('🔒 KEEP_BROWSER_OPEN is enabled. Browser will stay open. Press any key in console to continue...');
    await page.pause();
  } else {
    // Pause before closing browser so you can see the result
    const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '5000', 10);
    logger.info(`⏸️  Pausing for ${pauseDuration}ms before browser closes... You can inspect the page.`);
    await page.waitForTimeout(pauseDuration);
    logger.info('✅ Resuming - Browser will close now');
  }
});

test('NT_CREATE_001: Create and validate note template', async ({ page, context }) => {
  const loginPage = new LoginPage(page, context);
  const notePage = new NoteTemplatesPage(page, context);

  const user = await testDataManager.getUserCredentials('all');
  expect(user).toBeDefined();


  // Login and select first property
  await loginPage.loginWithPropertySelection(user.username, user.password, 0);

  // Wait for Note Templates search
  await notePage.searchAndSelect('note templates');
  await notePage.waitForNoteTemplatesPage(5000);

  // Create a unique template id
  const templateId = `AUTO_${Date.now().toString().slice(-6)}`;
  const description = 'Automated template description';

  // Create template
  await notePage.createTemplate(templateId, description);

  // Search and validate
  const valid = await notePage.searchAndValidateTemplate(templateId);
  expect(valid).toBe(true);

  await page.screenshot({ path: `screenshots/note_template_${templateId}.png`, fullPage: true });

  logger.info('Note template creation and validation test completed');
});
