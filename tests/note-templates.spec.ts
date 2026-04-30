import { test, expect } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';
import { NoteTemplatesPage } from '../src/pages/NoteTemplatesPage';
import { testDataManager } from '../src/utils/TestDataManager';
import logger from '../src/core/Logger';

test.describe('Note Templates Tests', () => {
  test.afterEach(async ({ page }) => {
    logger.info('Test finished: NT_001');

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

  test('NT_001: Open Note Templates after login and property select', async ({ page, context }) => {
    const loginPage = new LoginPage(page, context);
    const noteTemplates = new NoteTemplatesPage(page, context);

    // Get credentials
    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    // Navigate to login and login + select first property (index 0)
    await loginPage.loginWithPropertySelection(user.username, user.password, 0);

    // Wait for property selection navigation
    await page.waitForTimeout(1000);

    // Now search for Note Templates using the search input
    await noteTemplates.searchAndSelect('note templates');

    // Wait for Note Templates page
    await noteTemplates.waitForNoteTemplatesPage(5000);

    // Verify that the Note Templates heading or page content is visible
    const heading = page.locator('text=Note Templates');
    expect(await heading.count()).toBeGreaterThan(0);

    await page.screenshot({ path: 'screenshots/note_templates_result.png', fullPage: true });

    logger.info('Note Templates test completed');
  });
});
