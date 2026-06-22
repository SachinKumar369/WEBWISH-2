import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { RateManagerPage } from '../../src/pages/ManagerFunction/RateManagerPage';
import { testDataManager } from '../../src/utils/TestDataManager';

interface RoomTypeSnapshot {
  capturedAt: string;
  selectedPropertyId: string;
  rateManagerRoomTypeCodes: string[];
  newReservationRoomTypeCodes: string[];
  commonRoomTypeCodes: string[];
}

const ROOM_TYPES_FILE = 'room-types.json';

function normalizeRoomType(value: string): string {
  return value.trim().toLowerCase();
}

test.describe('Manager Function - Rate Setup (capture room type codes)', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  test('MGR_RATE_SETUP_001: Capture room type codes from Rate Manager and New Reservation, persist common set', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const rateManagerPage = new RateManagerPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    const selectedPropertyId = (await loginPage.loginWithPropertySelection(user.username, user.password, 2)) ?? '';
    expect(selectedPropertyId).not.toBe('');

    // Step 1: Capture rate manager room types
    logger.info('Step 1: Opening Rate Manager and capturing room type codes');
    const rateManagerRoomTypeCodes = await rateManagerPage.runRateManagerSetupFlow();
    expect(rateManagerRoomTypeCodes.length).toBeGreaterThan(0);
    logger.info(`Rate Manager codes (${rateManagerRoomTypeCodes.length}): ${JSON.stringify(rateManagerRoomTypeCodes)}`);

    // Step 2: Navigate to Guest Management -> New Reservation -> room selection page
    logger.info('Step 2: Navigating to Guest Management -> New Reservation via global search');
    const newReservationRoomTypeCodes = await rateManagerPage.runNewReservationRoomTypeCapture();
    expect(newReservationRoomTypeCodes.length).toBeGreaterThan(0);
    logger.info(`New Reservation codes (${newReservationRoomTypeCodes.length}): ${JSON.stringify(newReservationRoomTypeCodes)}`);

    // Step 3: Compute the intersection (common room types) using case-insensitive comparison
    logger.info('Step 3: Computing common room type codes');
    const rateManagerNormalized = new Set(rateManagerRoomTypeCodes.map(normalizeRoomType));
    const commonRoomTypeCodes = newReservationRoomTypeCodes.filter(code =>
      rateManagerNormalized.has(normalizeRoomType(code))
    );

    logger.info(`Common codes (${commonRoomTypeCodes.length}): ${JSON.stringify(commonRoomTypeCodes)}`);

    if (commonRoomTypeCodes.length === 0) {
      logger.warn('No common room type codes were found between Rate Manager and New Reservation pages');
    }

    // Step 4: Open Rate Manager from global search, fetch the business date from
    // the property header, and click the cell at the intersection of one of the
    // common room type rows and the business date column.
    if (commonRoomTypeCodes.length > 0) {
      const targetRoomType = commonRoomTypeCodes[0];
      logger.info(
        `Step 4: Opening Rate Manager from search and clicking the business-date cell for common room type "${targetRoomType}"`,
      );

      const businessDate = await rateManagerPage.runOpenRateManagerAndClickDateCell(targetRoomType);
      logger.info(
        `Clicked Rate Manager cell for "${targetRoomType}" on business date ${businessDate}`,
      );

      await page.screenshot({
        path: 'screenshots/MGR_RATE_SETUP_001_rate_manager_click.png',
        fullPage: true,
      });

      // Step 5: Click eye icon for the first editable rate code to open the rate grid
      logger.info('Step 5: Clicking eye icon for the first editable rate code');
      const selectedRateCode = await rateManagerPage.selectFirstEditableRateCodeAndOpenSettings();
      logger.info(`Opened settings for rate code: ${selectedRateCode}`);

      await page.screenshot({
        path: 'screenshots/MGR_RATE_SETUP_001_eye_icon_clicked.png',
        fullPage: true,
      });

      // Step 6: Open Sections → Advance Configuration → enable toggles → save
      logger.info('Step 6: Opening Sections → Advance Configuration and enabling toggles');
      await rateManagerPage.openAdvanceConfigurationFromSections();

      // Step 7: Enable Advance Configuration toggles
      logger.info('Step 7: Enabling Advance Configuration toggles');
      await rateManagerPage.enableAdvanceConfigurationToggles();

      await page.screenshot({
        path: 'screenshots/MGR_RATE_SETUP_001_advance_config_toggles.png',
        fullPage: true,
      });

      // Step 8: Save Advance Configuration and confirm success
      logger.info('Step 8: Saving Advance Configuration');
      await rateManagerPage.saveAndConfirmAdvanceConfiguration();

      await page.screenshot({
        path: 'screenshots/MGR_RATE_SETUP_001_advance_config_saved.png',
        fullPage: true,
      });

      // Step 9: Re-open Sections → Advance Configuration and Close
      logger.info('Step 9: Re-opening Advance Configuration and verifying toggles persist');
      await rateManagerPage.openAdvanceConfigurationFromSections();

      const toggleStates = await rateManagerPage.getAdvanceConfigurationToggleStates();
      for (const [name, state] of Object.entries(toggleStates)) {
        logger.info(`Verifying toggle "${name}" is enabled -> ${state}`);
        expect(state).toBe(true);
      }

      await rateManagerPage.closeAdvanceConfiguration();
    } else {
      logger.error('Cannot proceed to Steps 4 and 5 because there are no common room type codes');
    }   
});
});

    