import { Browser, BrowserContext, Page } from '@playwright/test';
import { LoginPage } from '../../src/pages/Login/LoginPage';
import { testDataManager } from '../../src/utils/TestDataManager';

export async function createLoggedInReportPage(browser: Browser, propertyIdentifier: number | string = 2): Promise<{
  context: BrowserContext;
  page: Page;
}> {
  // viewport: null → page fills the maximized window (new contexts don't inherit the config viewport)
  const context = await browser.newContext({ viewport: process.env.MAXIMIZE_BROWSER === 'true' ? null : undefined });
  const page = await context.newPage();
  const loginPage = new LoginPage(page, context);
  const user = await testDataManager.getUserCredentials('all');

  await loginPage.loginWithPropertySelection(user.username, user.password, propertyIdentifier);
  await page.waitForLoadState('networkidle');

  return { context, page };
}