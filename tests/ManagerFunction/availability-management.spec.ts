import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { AvailabilityManagementPage } from '../../src/pages/ManagerFunction/AvailabilityManagementPage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe('Manager Function - Availability Management', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('MGR_AVAIL_001: Set Close for Arrival and verify in reservation', async ({ page, context }) => {
    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const availabilityPage = new AvailabilityManagementPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    // Step 1: Login with property selection
    logger.info('Step 1: Logging in with property selection');
    await loginPage.loginWithPropertySelection(user.username, user.password, 2);

    // Step 2–7: Run the full availability close-for-arrival flow
    // Business date is fetched dynamically from the header; end date = Dec 31 of that year
    logger.info('Step 2: Running availability Close for Arrival flow');
    await availabilityPage.runAvailabilityCloseForArrivalFlow({
      propertyName: 'DGT',
    });

    await page.screenshot({ path: 'screenshots/MGR_AVAIL_001.png', fullPage: true });
  });
});
