import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { ProfilesPage, ProfileData } from '../../src/pages/Marketing/ProfilesPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe('Marketing - Profiles', () => {
  let profilesPage: ProfilesPage;

  test.beforeEach(async ({ page, context }) => {
    profilesPage = new ProfilesPage(page, context);
    logger.info(`Starting test: ${test.info().title}`);
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.afterEach(async ({ page }) => {
    logger.info(`Finished test: ${test.info().title}`);
    if (test.info().status === 'failed') {
      const path = await page.screenshot({ path: `screenshots/${test.info().title.replace(/\s+/g, '_')}.png`, fullPage: true });
      logger.error(`Failure screenshot: ${path}`);
    }

    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing to keep browser open');
      await page.pause();
    } else {
      const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '2000000', 10000);
      await page.waitForTimeout(pauseDuration);
    }
  });

  test('MK_PROFILE_001: Create and verify profile', async ({ page, context }) => {
    const loginPage = new LoginPage(page, context);
    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    logger.info('Logging in and selecting property');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Open Profiles
    //await profilesPage.openProfilesFromGlobalSearch();
    await profilesPage.filesFromGlobalSearch();
    await profilesPage.waitForProfilesPage();

    // Generate unique profile data
    const firstNames = ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    const lastNames = ['Doe', 'Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor'];
    const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const uniqueMobile = `9${Math.floor(Math.random() * 900000000 + 100000000)}`; // 10-digit mobile starting with 9

    const profile: ProfileData = {
      lastName: randomLastName,
      firstName: randomFirstName,
      title: 'AMB Ambassador',
      mobileNumber: uniqueMobile
    };

    await profilesPage.createProfile(profile);
    await expect(profilesPage.successParagraph).toContainText('Details created/updated successfully.');

    // Save profile data to Excel for reference and traceability
    await profilesPage.saveProfileDataToExcel(randomFirstName, uniqueMobile);

    // Confirm success
    await profilesPage.confirmSuccess();

    // Close create dialog
    await profilesPage.closeProfileDialog();

    // Search in list and open the created profile
    await profilesPage.searchProfile(uniqueMobile);
    await profilesPage.verifySearchResult(uniqueMobile);
    //await profilesPage.openProfile();

    // Modify the profile
    await profilesPage.clickEditButton();
    const modifiedLastName = `${randomLastName}Modified`;
    await profilesPage.modifyLastName(modifiedLastName);
    await profilesPage.updateProfile();

    // Confirm update success
    await expect(profilesPage.successParagraph).toContainText('Details created/updated successfully.');
    await profilesPage.confirmSuccess();

    // Close modify dialog
    await profilesPage.closeProfileDialog();

    // Verify the modified last name in profile details
    //await profilesPage.verifyProfileDetails(modifiedLastName);

    await page.screenshot({ path: `screenshots/MK_PROFILE_001_${uniqueMobile}.png`, fullPage: true });
  });
});

