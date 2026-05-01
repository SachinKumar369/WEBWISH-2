import { test, expect, Page, BrowserContext } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import { TaskManagementFlowPage } from '../../src/pages/FrontDesk/TaskManagementFlowPage';

const SPECIAL_DESCRIPTION = "automation special char ,./?><;'\":[]\\|}{-=+_)(*&^%$#@!1234567890";

test.describe.serial('Frontdesk - Task Management Full Flow', () => {
  let page: Page;
  let context: BrowserContext;
  let loginPage: LoginPage;
  let taskManagementPage: TaskManagementFlowPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    loginPage = new LoginPage(page, context);
    taskManagementPage = new TaskManagementFlowPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    await page.waitForLoadState('networkidle');

    await taskManagementPage.openFromFrontDesk();
  });

  test('FD_TASK_FLOW_001: blank save validations, save, save & add new, search, modify, delete', async () => {
    await taskManagementPage.verifyBlankSaveValidation();
    await taskManagementPage.verifyBlankSaveAndAddNewValidation();

    await taskManagementPage.createTask('Automation Save');
    await taskManagementPage.searchTask('Automation Save');

    await taskManagementPage.createTask('Automation Save and add new 1', true);
    await taskManagementPage.createTask('save and add new 2', true);
    await taskManagementPage.createTask(SPECIAL_DESCRIPTION, true);

    await taskManagementPage.searchTask('Automation');
    await taskManagementPage.updateFirstSearchedTask('Task Updated - automation');
    await taskManagementPage.searchTask('Task Updated - automation');

    await taskManagementPage.deleteSelectedTasks();
  });
});
