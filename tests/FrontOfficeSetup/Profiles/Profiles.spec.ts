import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { ProfilesPage } from '../../../src/pages/FrontOfficeSetup/Profiles/ProfilesPage';
import { testDataManager } from '../../../src/utils/TestDataManager';

test.describe.serial('Profiles - All Screens', () => {

  const screens = [
    'Social Media Type',
    'Address Types',
    'Event Types',
    'Identity Types',
    'Marital Status',
    'Profile Types',
    'Relation Types'
    
  ];

  for (const screen of screens) {

    test(`CRUD - ${screen}`, async ({ page, context }) => {

      test.setTimeout(20 * 60 * 1000);

      const loginPage = new LoginPage(page, context);
      const profilePage = new ProfilesPage(page, context, screen);

      const user = await testDataManager.getUserCredentials('all');
      expect(user).toBeDefined();

      logger.info(`Executing Profiles for: ${screen}`);

      await loginPage.loginWithPropertySelection(user.username, user.password, 2);

      await profilePage.runFlow();

      await page.screenshot({
        path: `screenshots/profile_${screen.replace(/\s/g, '_')}.png`,
        fullPage: true
      });
    });

  }
});