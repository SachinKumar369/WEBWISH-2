import { test, expect, Page, BrowserContext } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { SelectProperty } from '../../src/pages/SelectProperty';
import { BookingCalendarPage } from '../../src/pages/FrontDesk/BookingCalendarPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';
import { TaskManagement } from '../../src/pages/FrontDesk/TaskManagement';

test.describe.serial('Frontdesk - Task Management', () => {

  let page: Page;
  let context: BrowserContext;

  let loginPage: LoginPage;
  let selectProperty: SelectProperty;
  let bookingCalendar: BookingCalendarPage;
  let taskManagement: TaskManagement;

  test.beforeAll(async ({ browser }) => {

    context = await browser.newContext();
    page = await context.newPage();

    loginPage = new LoginPage(page, context);
    selectProperty = new SelectProperty(page, context);
    bookingCalendar = new BookingCalendarPage(page, context);
    taskManagement = new TaskManagement(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(
      user.username,
      user.password,
      2
    );

    await page.waitForLoadState('networkidle');

    logger.info('Login completed successfully');

  });

  test('FD_TASK_001: Task Management and Save', async () => {

    await taskManagement.searchAndOpenTaskManagement('Task Management');
    await taskManagement.taskManagementSave();
    await taskManagement.verifyCreatedTaskInTable();

    await page.screenshot({
      path: 'screenshots/FD_TASK_001.png',
      fullPage: true
    });

    logger.info('FD_TASK_001 completed');

  });

  test('FD_TASK_002: Task Management and Save and Add New', async () => {

    await taskManagement.searchAndOpenTaskManagement('Task Management');
    await taskManagement.SaveAndAddNew();
        await taskManagement.verifyCreatedTaskInTable();


    // Yaha tumhara Add New method call karo
    // Example:
    // await taskManagement.addNewTask();

    await page.screenshot({
      path: 'screenshots/FD_TASK_002.png',
      fullPage: true
    });

    logger.info('FD_TASK_002 completed');

    await taskManagement.deleteTask();

  });

  test('FD_TASK_003: Edit Pending Task Workflow', async () => {
    
    logger.info('Starting FD_TASK_003: Edit Pending Task Workflow');

    // Navigate to Task Management without opening Add modal
    await taskManagement.searchAndOpenTaskManagement('Task Management', false);
    
    await taskManagement.editPendingTaskWorkflow();

    await page.screenshot({
      path: 'screenshots/FD_TASK_003.png',
      fullPage: true
    });

    logger.info('FD_TASK_003 completed');

  });

  // test.afterAll(async () => {
  //  // await context.close();
  //   //logger.info('Browser context closed');
  // });

  test.afterAll(async () => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN is enabled. Pausing browser after suite...');
      await page.pause();
    }
  });

});



