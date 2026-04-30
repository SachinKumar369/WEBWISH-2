# Task Management Test Plan

## Application Overview

This test plan covers all scenarios under the Task Management module of the PMS website.

## Test Scenarios

### 1. Task Management

**Seed:** `tests/seed.spec.ts`

#### 1.1. Navigate to Task Management

**File:** `tests/task-management/navigation.spec.ts`

**Steps:**
  1. Login with valid credentials (User ID: SACH, Password: Sachin@578).
    - expect: User is successfully logged in and redirected to the dashboard.
  2. Select the property from the property selection screen.
    - expect: The selected property is loaded successfully.
  3. Hover over the leftmost menu and click on 'Front Desk'.
    - expect: The 'Front Desk' menu expands.
  4. Click on 'Task Management'.
    - expect: The Task Management page is displayed.

#### 1.2. Create a New Task

**File:** `tests/task-management/create-task.spec.ts`

**Steps:**
  1. Navigate to the Task Management page.
    - expect: The Task Management page is displayed.
  2. Click on the 'Create Task' button.
    - expect: The Create Task form is displayed.
  3. Fill in the task details (e.g., Task Name, Description, Due Date).
    - expect: The task details are entered successfully.
  4. Click on the 'Save' button.
    - expect: The new task is created and displayed in the task list.

#### 1.3. Edit an Existing Task

**File:** `tests/task-management/edit-task.spec.ts`

**Steps:**
  1. Navigate to the Task Management page.
    - expect: The Task Management page is displayed.
  2. Select an existing task from the task list.
    - expect: The task details are displayed.
  3. Edit the task details (e.g., update the Due Date).
    - expect: The task details are updated successfully.
  4. Click on the 'Save' button.
    - expect: The updated task is saved and displayed in the task list.

#### 1.4. Delete a Task

**File:** `tests/task-management/delete-task.spec.ts`

**Steps:**
  1. Navigate to the Task Management page.
    - expect: The Task Management page is displayed.
  2. Select an existing task from the task list.
    - expect: The task details are displayed.
  3. Click on the 'Delete' button.
    - expect: A confirmation dialog is displayed.
  4. Confirm the deletion.
    - expect: The task is deleted and no longer appears in the task list.
