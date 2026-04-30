import { chromium, FullConfig } from '@playwright/test';
import { LoginPage } from './src/pages/LoginPage';
import { testDataManager } from './src/utils/TestDataManager';

async function globalSetup(config: FullConfig) {

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://qc2webwish.prologicfirst.in/#/login/z6cQJcxmrEbhhFXqdoj64Q%3D%3D');

  const loginPage = new LoginPage(page, context);

  const user = await testDataManager.getUserCredentials('all');

  await loginPage.loginWithPropertySelection(
    user.username,
    user.password,
    2
  );

  await page.waitForLoadState('networkidle');

  await context.storageState({ path: 'storageState.json' });

  await browser.close();
}

export default globalSetup;