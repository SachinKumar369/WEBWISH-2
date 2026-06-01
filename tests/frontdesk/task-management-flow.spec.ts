import { test, expect, Page, BrowserContext } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import { TaskManagementFlowPage } from '../../src/pages/FrontDesk/TaskManagementFlowPage';

const SPECIAL_DESCRIPTION = "automation special char ,./?><;'\":[]\\|}{-=+_)(*&^%$#@!1234567890";



//test.describe.serial('Frontdesk - Task Management Full Flow', () => {
test.describe('Frontdesk - Task Management Full Flow', () => {
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

  test('FD_TASK_FLOW_001_A: Blank save validations', async () => {
    await test.step('Verify blank save validation', async () => {
      await taskManagementPage.verifyBlankSaveValidation();
    });
    await test.step('Verify blank save and add-new validation', async () => {
      await taskManagementPage.verifyBlankSaveAndAddNewValidation();
    });
  });

  test('FD_TASK_FLOW_001_B: Create and search task', async () => {
    await test.step('Create task - Automation Save', async () => {
      await taskManagementPage.createTask('Automation Save');
    });
    await test.step('Search for created task', async () => {
      await taskManagementPage.searchTask('Automation Save');
    });
  });

  test('FD_TASK_FLOW_001_C: Create multiple tasks with Add New', async () => {
    await test.step('Create "Automation Save and add new 1"', async () => {
      await taskManagementPage.createTask('Automation Save and add new 1', true);
    });
    await test.step('Create "save and add new 2"', async () => {
      await taskManagementPage.createTask('save and add new 2', true);
    });
    await test.step('Create task with special description', async () => {
      await taskManagementPage.createTask(SPECIAL_DESCRIPTION, true);
    });
  });

  test.only('FD_TASK_FLOW_001_D: Search and update task', async () => {
    await test.step('Search tasks by keyword', async () => {
      await taskManagementPage.searchTask('Pending');
    });
    await test.step('Update first searched task', async () => {
      await taskManagementPage.updateFirstSearchedTask('Task Updated - automation');
    });
    await test.step('Verify updated task by searching', async () => {
      await taskManagementPage.searchTask('Task Updated - automation');
    });
  });

  test('FD_TASK_FLOW_001_E: Delete selected tasks', async () => {
    await test.step('Delete selected tasks', async () => {
      await taskManagementPage.deleteSelectedTasks();
    });
  });
});

