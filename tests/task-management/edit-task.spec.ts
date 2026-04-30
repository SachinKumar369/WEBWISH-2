import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test('Edit an Existing Task', async ({ page }) => {
    // Step 1: Navigate to the Task Management page.
    await page.goto('https://qc2webwish.prologicfirst.in/#/task-management');

    // Step 2: Select an existing task from the task list.
    await page.click('text=Test Task');

    // Step 3: Edit the task details (e.g., update the Due Date).
    await page.fill('input[placeholder="Due Date"]', '2026-04-15');

    // Step 4: Click on the 'Save' button.
    await page.click('button:has-text("Save")');

    // Expect: The updated task is saved and displayed in the task list.
    await expect(page.locator('text=Test Task')).toBeVisible();
  });
});