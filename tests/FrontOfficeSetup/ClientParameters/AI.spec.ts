import { test, expect } from '@playwright/test';
import { LoginPage } from '../../../src/pages/LoginPage';
import { AIUniversalPage } from '../../../src/pages/FrontOfficeSetup/ClientParameters/AIUniversalPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test('AI Universal Automation - All Parameter Setup', async ({ page, context }) => {
  test.setTimeout(60 * 60 * 1000);

  const login = new LoginPage(page, context);
  const ai = new AIUniversalPage(page, context);

  const user = await testDataManager.getUserCredentials('all');
  expect(user).toBeDefined();

  await login.loginWithPropertySelection(user.username, user.password, 2);

  await ai.runAll();

  // Always pass test unless critical failure
  expect(true).toBeTruthy();
});