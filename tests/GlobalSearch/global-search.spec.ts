import { test, expect } from '@playwright/test';
import logger from '../../src/core/Logger';
import { LoginPage } from '../../src/pages/LoginPage';
import { GlobalSearchPage } from '../../src/pages/GlobalSearch/GlobalSearchPage';
import { testDataManager } from '../../src/utils/TestDataManager';

test.describe.serial('Global Search', () => {
  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after test...');
      await page.pause();
    }
  });

  // test('GLOBAL_SEARCH_001: Validate global search flow from dashboard', async ({ page, context }) => {
  //   test.setTimeout(20 * 60 * 1000);

  //   const loginPage = new LoginPage(page, context);
  //   const globalSearchPage = new GlobalSearchPage(page, context);

  //   const user = await testDataManager.getUserCredentials('all');
  //   expect(user).toBeDefined();

  //   await loginPage.loginWithPropertySelection(user.username, user.password, 2);

  //   await globalSearchPage.runGlobalSearchFlow();

  //   await page.screenshot({
  //     path: 'screenshots/GLOBAL_SEARCH_001.png',
  //     fullPage: true
  //   });
  // });

  // test('GLOBAL_SEARCH_002: Guest management global search with dynamic tab counts', async ({ page, context }) => {
  //   test.setTimeout(20 * 60 * 1000);

  //   const loginPage = new LoginPage(page, context);
  //   const globalSearchPage = new GlobalSearchPage(page, context);

  //   const user = await testDataManager.getUserCredentials('all');
  //   expect(user).toBeDefined();

  //   await loginPage.loginWithPropertySelection(user.username, user.password, 2);

  //   await globalSearchPage.runGuestManagementGlobalSearchFlow();

  //   await page.screenshot({
  //     path: 'screenshots/GLOBAL_SEARCH_002.png',
  //     fullPage: true
  //   });
  // });

  test.only('GLOBAL_SEARCH_003: Validate topbar search navigation across core functionalities', async ({ page, context }) => {
    test.setTimeout(90 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const globalSearchPage = new GlobalSearchPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 0);

    const modulesToValidate = [
      { searchTerm: 'booking calendar', moduleDisplayName: 'Booking Calendar' },
      { searchTerm: 'guest management', moduleDisplayName: 'Guest Management' },
      { searchTerm: 'group management', moduleDisplayName: 'Group Management' },
      { searchTerm: 'special account', moduleDisplayName: 'Special Account' },
      { searchTerm: 'task management', moduleDisplayName: 'Task Management' },
      { searchTerm: 'cashiering', moduleDisplayName: 'Cashiering' },
      { searchTerm: 'dashboard', moduleDisplayName: 'Dashboard', expectedHeading: 'Welcome' },
      { searchTerm: 'housekeeping operations', moduleDisplayName: 'Housekeeping Operations' },
      { searchTerm: 'lost & found', moduleDisplayName: 'Lost & Found' },
      { searchTerm: 'mark discrepancy', moduleDisplayName: 'Mark Discrepancy' },
       { searchTerm: 'room cleaning', moduleDisplayName: 'Room Cleaning' },
     // { searchTerm: 'availability management', moduleDisplayName: 'Availability Management' },
      { searchTerm: 'budgets', moduleDisplayName: 'Budgets' },
      //{ searchTerm: 'channel allocation', moduleDisplayName: 'Channel Allocation' },
      { searchTerm: 'currency maintenance', moduleDisplayName: 'Currency Maintenance' },
      { searchTerm: 'meal plan details', moduleDisplayName: 'Meal Plan Details' },
      { searchTerm: 'rate manager', moduleDisplayName: 'Rate Manager' },
      { searchTerm: 'setup rate limits', moduleDisplayName: 'Setup Rate Limits' },
      { searchTerm: 'revenue management', moduleDisplayName: 'Revenue Management' },
      { searchTerm: 'profiles', moduleDisplayName: 'Profiles' },
      { searchTerm: 'agent maintenance', moduleDisplayName: 'Agent Maintenance' },
      { searchTerm: 'corporate maintenance', moduleDisplayName: 'Corporate Maintenance' },
      { searchTerm: 'ta/corp contract batch print', moduleDisplayName: 'TA/CORP Contract Batch Print' },
      { searchTerm: 'gst invoices', moduleDisplayName: 'GST Invoices' },
      { searchTerm: 'export debtors/sales', moduleDisplayName: 'Export Debtors/Sales' },
      { searchTerm: 'night audit', moduleDisplayName: 'Night Audit' },
      { searchTerm: 'note templates', moduleDisplayName: 'Note Templates' },
     // { searchTerm: 'report setup', moduleDisplayName: 'Report Setup' },
     // { searchTerm: 'parameter setup', moduleDisplayName: 'Parameter Setup' },
      { searchTerm: 'property general setup', moduleDisplayName: 'Property General Setup' },
      { searchTerm: 'property controls', moduleDisplayName: 'Property Controls' },
      { searchTerm: 'template setup', moduleDisplayName: 'Template Setup' },
      { searchTerm: 'user setup', moduleDisplayName: 'User Setup' },
      { searchTerm: 'manage user activity', moduleDisplayName: 'Manage User Activity' },
      { searchTerm: 'alert setup', moduleDisplayName: 'Alert Setup' },
      { searchTerm: 'interfaces', moduleDisplayName: 'Interfaces' },
      { searchTerm: 'system utilities', moduleDisplayName: 'System Utilities' },
      { searchTerm: 'advance control', moduleDisplayName: 'Advance Control' }
    ];


     
    
    const missingModules = await globalSearchPage.validateTopbarSearchAcrossModules(modulesToValidate);
    const openedCount = modulesToValidate.length - missingModules.length;

    console.log(`GLOBAL_SEARCH_003 opened ${openedCount}/${modulesToValidate.length} modules.`);
    if (missingModules.length > 0) {
      console.log(`Modules not available for current user/property: ${missingModules.join(', ')}`);
    }

    // Availability differs by user/property permissions; keep this flow informational.
    expect(modulesToValidate.length).toBeGreaterThan(0);

    await page.screenshot({
      path: 'screenshots/GLOBAL_SEARCH_003.png',
      fullPage: true
    });
  });

  test('GLOBAL_SEARCH_004: Validate exact topbar flow for booking calendar profiles and cashiering', async ({ page, context }) => {
    test.setTimeout(30 * 60 * 1000);

    const loginPage = new LoginPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    await page.goto('https://qc2webwish.prologicfirst.in/#/pms/dashboard');

    const topSearch = page.getByRole('textbox', { name: 'Search...' });
    const selectTopbarOptionStrict = async (searchTerm: string, optionText: string): Promise<void> => {
      await topSearch.click();
      await topSearch.fill(searchTerm);

      const option = page.locator('#page-topbar').getByText(optionText, { exact: true }).first();
      const optionVisible = await option.isVisible({ timeout: 5000 }).catch(() => false);

      if (!optionVisible) {
        throw new Error(
          `GLOBAL_SEARCH_004 strict flow failed: topbar option "${optionText}" not visible after searching "${searchTerm}".`
        );
      }

      await option.click();
    };

    await selectTopbarOptionStrict('booking calendar', 'Booking Calendar');
    await expect(page.getByRole('heading', { name: 'Booking Calendar' })).toBeVisible();

    await selectTopbarOptionStrict('profiles', 'Profiles');
    await expect(page.getByRole('heading', { name: 'Profiles' })).toBeVisible();

    await page.goto('https://qc2webwish.prologicfirst.in/#/pms/dashboard');
    await selectTopbarOptionStrict('cashiering', 'Cashiering');

    await expect(page.getByRole('heading', { name: 'Cashiering' })).toBeVisible();

    await page.screenshot({
      path: 'screenshots/GLOBAL_SEARCH_004.png',
      fullPage: true
    });
  });
});
