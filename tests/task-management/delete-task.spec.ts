import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test('Delete a Task', async ({ page }) => {
    // Step 1: Navigate to the Task Management page.
    await page.goto('https://qc2webwish.prologicfirst.in/#/task-management');

    // Step 2: Select an existing task from the task list.
    await page.click('text=Test Task');

    // Step 3: Click on the 'Delete' button.
    await page.click('button:has-text("Delete")');

    // Step 4: Confirm the deletion.
    await page.click('button:has-text("Confirm")');

    // Expect: The task is deleted and no longer appears in the task list.
    await expect(page.locator('text=Test Task')).not.toBeVisible();
  });
});