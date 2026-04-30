import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test('Create a New Task', async ({ page }) => {
    // Step 1: Navigate to the Task Management page.
    await page.goto('https://qc2webwish.prologicfirst.in/#/task-management');

    // Step 2: Click on the 'Create Task' button.
    await page.click('button:has-text("Create Task")');

    // Step 3: Fill in the task details (e.g., Task Name, Description, Due Date).
    await page.fill('input[placeholder="Task Name"]', 'Test Task');
    await page.fill('textarea[placeholder="Description"]', 'This is a test task.');
    await page.fill('input[placeholder="Due Date"]', '2026-04-10');

    // Step 4: Click on the 'Save' button.
    await page.click('button:has-text("Save")');

    // Expect: The new task is created and displayed in the task list.
    await expect(page.locator('text=Test Task')).toBeVisible();
  });
});