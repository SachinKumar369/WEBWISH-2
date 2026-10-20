import { test as base, BrowserContext, Page } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { testDataManager } from '../../src/utils/TestDataManager';

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ browser }, use) => {

    // viewport: null → page fills the maximized window (new contexts don't inherit the config viewport)
    const context: BrowserContext = await browser.newContext({ viewport: process.env.MAXIMIZE_BROWSER === 'true' ? null : undefined });
    const page: Page = await context.newPage();

    const loginPage = new LoginPage(page, context);

    const user = await testDataManager.getUserCredentials('all');

    await loginPage.loginWithPropertySelection(
      user.username,
      user.password,
      2
    );

    await page.waitForLoadState('networkidle');

    await use(page);

    await context.close();
  },
});

export { expect } from '@playwright/test';