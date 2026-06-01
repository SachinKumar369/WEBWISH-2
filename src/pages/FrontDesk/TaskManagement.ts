import { Page, BrowserContext, Locator, expect } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';
import { GlobalDataStore } from '../../utils/GlobalDataStore';


export class TaskManagement extends BasePage {
  /* ================= PAGE FACTORY LOCATORS ================= */

  private readonly elementActions: ElementActions;

  private readonly searchInput = this.page.locator('#search-options');
  private readonly searchResults = this.page.locator('//li[@tabindex="0"]');

  private readonly bookingCalendarHeading = this.page.getByRole('heading', { name: 'Booking Calendar' });
  private readonly filterButton = this.page.locator('button:has(i.mdi-filter)');
  private readonly customDropdown = this.page.locator('ng-select.custom-dropdown').first();
  private readonly customDropdown1 = this.page.locator('ng-select.custom-dropdown').nth(4);
  private readonly webwishIndiaLabel = this.page.getByText('WEBWISHINDIA', { exact: true });
  private readonly loaderOverlay = this.page.locator('.loader-overlay');
  private readonly searchButton = this.page.getByRole('button', { name: 'Search' });
  private readonly closeButton = this.page.getByRole('button', { name: 'Close' });

  private readonly swalDialog = this.page.locator('.swal2-container:visible');
  private readonly swalConfirmButton = this.page.locator('.swal2-confirm:visible');

  private readonly addButton = this.page.getByRole('button', { name: '󰐗' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
  private readonly saveAndAddNewButton = this.page.getByRole('button', { name: 'Save & Add New', exact: true });
  private readonly deleteButton = this.page.getByRole('button', { name: '󰚃' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });
  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });

  private readonly datefrom = this.page.getByText('Date From required');
  private readonly toastParagraph = this.page.getByRole('paragraph');
  private readonly businessDateText = this.page.locator('h6:has-text("Business Date")');
  private readonly formContainer = this.page.locator('app-task-management-input');

  private readonly monthSelect = this.page.getByLabel('Month');
  private readonly juneFirstDate = this.page.getByLabel('June 1,').first();
  private readonly julyFirstDate = this.page.getByLabel('July 1,').nth(1);
  private readonly optionsList = this.page.getByLabel('Options list');
  private readonly firstNgOption = this.page.locator("//div[@role='option' and contains(@class,'ng-option')]").first();
  private readonly descriptionInput = this.page.locator('input-control').getByRole('textbox');

  private readonly firstRowCheckbox = this.page.locator('.cell-chkbox.sticky.bg-light').first();
  private readonly tableRows = this.page.locator('tbody tr');
  private readonly taskTable = this.page.locator('table tbody').first();
  private readonly nextButton = this.page.getByRole('link', { name: 'Next' });

  private readonly searchTask = this.page.getByRole('textbox', { name: 'Search', exact: true });
  private readonly refereshButton = this.page.locator('app-task-assignment-list').getByRole('button', { name: '󰑐' });



  private readonly selectAllCheckbox = this.page
    .getByRole('row', { name: '󰍝 User Name 󰍠 󰍝 Department' })
    .locator('#checkAll');

  private readonly userDropdown = this.page
    .locator('div')
    .filter({ hasText: /^User\*--select--$/ })
    .getByRole('textbox');

  // private readonly userSelectDropdown = this.page
  //   .locator('ng-select')
  //   .filter({ hasText: '--select-- ALL All Users' })
  //   .getByRole('textbox'); 

private readonly userSelectDropdown = this.page
  .locator('ng-select')
  .filter({ hasText: '--select-- ALL All Users' })
  .getByRole('textbox')
  .or(this.page.getByRole('textbox').first());
 

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  /* ================= DYNAMIC LOCATOR HELPERS ================= */

  private dateField(label: 'Date From' | 'Date To'): Locator {
    return this.page.locator('div').filter({ hasText: new RegExp(`^${label}\\*$`) }).getByRole('textbox');
  }

  private statusField(): Locator {
    return this.page.locator('div').filter({ hasText: /^Status\*--select--$/ }).getByRole('textbox');
  }

  private genericSelectField(): Locator {
    return this.page.locator('ng-select').filter({ hasText: /^--select--$/ }).getByRole('textbox');
  }

  private taskRowOpenIcon(row: Locator): Locator {
    return row.locator('i').first();
  }

  private async clickAndChooseWithKeyboard(locator: Locator, description: string, arrowDownCount: number = 1): Promise<void> {
    await this.elementActions.click(locator, description);

    for (let i = 0; i < arrowDownCount; i++) {
      await this.elementActions.pressKey('ArrowDown');
    }

    await this.elementActions.pressKey('Enter');
  }

  /* ================= SHARED ACTION HELPERS ================= */

  async customWait(seconds: number): Promise<void> {
    await this.page.waitForTimeout(seconds * 1000);
  }

  async waitForBookingCalendarPage(timeout = 5000): Promise<void> {
    await this.elementActions.waitForElement(this.bookingCalendarHeading, timeout, 'Booking Calendar heading');
  }

  async waitForLoaderToDisappear(timeout = 10000): Promise<void> {
    if (await this.elementActions.isElementVisible(this.loaderOverlay, 'Loader overlay')) {
      await this.elementActions.waitForElementHidden(this.loaderOverlay, timeout, 'Loader overlay');
    }
  }

  private async fillTaskManagementForm(): Promise<void> {
    // await this.dateField('Date From').click();
    // await this.monthSelect.first().selectOption('5');
    // await this.juneFirstDate.click();

     const footerText = await this.elementActions.getText(this.businessDateText, 'Business Date text');
      const match = footerText.match(/\d{2}\/\d{2}\/\d{4}/);
    const businessDate = match ? match[0] : undefined;
      logger.info(`Business Date: ${businessDate || 'Not found'}`);

    if (!businessDate) {
      throw new Error('Business Date not found on Task Management page');
    }


    // const [day, month, year] = businessDate.split('/');
    
//   await this.elementActions.click(this.dateField('Date From'), 'Date From field');
//   await this.elementActions.sendKeys(this.dateField('Date From'), businessDate, 'Date From field');
//   await this.monthSelect.first().selectOption(String(Number(month) - 1));
//   await this.page.locator(`//td[normalize-space()='${Number(day)}']`).click();


    // await this.elementActions.click(this.dateField('Date To'), 'Date To field');
    // await this.monthSelect.nth(1).selectOption('6');
    // await this.elementActions.click(this.julyFirstDate, 'July 1 date');



    await this.elementActions.click(this.dateField('Date From'), 'Date From field');
await this.elementActions.sendKeys(this.dateField('Date From'), businessDate, 'Date From field');

const [day, month, year] = businessDate.split('/').map(Number);

const dateObj = new Date(year, month - 1, day);
dateObj.setDate(dateObj.getDate() + 2);

const dateTo = `${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getMonth()+1).padStart(2,'0')}/${dateObj.getFullYear()}`;

await this.elementActions.click(this.dateField('Date To'), 'Date To field');
await this.elementActions.sendKeys(this.dateField('Date To'), dateTo, 'Date To field');

    await this.elementActions.click(this.statusField(), 'Status field');
    await this.elementActions.click(this.optionsList.getByText('Pending'), 'Pending status option');

    await this.elementActions.click(this.genericSelectField(), 'Generic select field');
    await this.elementActions.click(this.firstNgOption, 'First dropdown option');

    await this.elementActions.click(this.descriptionInput, 'Description input');
    //await this.elementActions.sendKeys(this.descriptionInput, 'Description', 'Description input');

    const uniqueDescription = `Description_${Date.now()}`;

    GlobalDataStore.set('taskDescription', uniqueDescription);
    await this.elementActions.sendKeys(
    this.descriptionInput,
    uniqueDescription,
    'Description input'
    );




  }


 async verifyCreatedTaskInTable(): Promise<void> {

  const description = GlobalDataStore.get('taskDescription');
  if (!description) {
    throw new Error('Task description not found in GlobalDataStore');
  }
  logger.info(`Searching for task with description: ${description}`);
  await this.elementActions.sendKeys(
    this.searchTask,
    description,
    'Search task input'
  );

  await expect(
  this.page.locator('td.tdPadding', { hasText: description })
).toBeVisible();

}




  /* ================= NAVIGATION METHODS ================= */

  async searchAndOpenBookingCalendar(searchText: string): Promise<boolean> {
    logger.info(`Searching for: ${searchText}`);
    await this.elementActions.sendKeys(this.searchInput, searchText, 'Global search input');
    await this.page.waitForTimeout(1000);

    const count = await this.searchResults.count();
    logger.info(`Found ${count} search result items`);

    for (let i = 0; i < count; i++) {
      const item = this.searchResults.nth(i);
      const text = (await this.elementActions.getText(item, `Booking Calendar search result ${i}`)).trim().toLowerCase();
      logger.debug(`Search result [${i}]: ${text}`);

      if (text.includes('booking') && text.includes('calendar')) {
        logger.info(`Clicking search result at index ${i} -> ${text}`);
        await this.elementActions.click(item, `Booking Calendar search result ${i}`);
        return true;
      }
    }

    logger.warn('Booking Calendar not found in search results');
    return false;
  }

  async openFilter(): Promise<void> {
    await this.page.waitForTimeout(2000);
    await this.waitForLoaderToDisappear();

    await this.elementActions.click(this.filterButton, 'Filter button');
    await this.waitForLoaderToDisappear();

    await this.clickAndChooseWithKeyboard(this.customDropdown, 'First custom dropdown');

    await this.clickAndChooseWithKeyboard(this.customDropdown1, 'Second custom dropdown');

    await this.elementActions.click(this.searchButton, 'Search button');
    await this.elementActions.click(this.filterButton, 'Filter button');
    await this.elementActions.click(this.closeButton, 'Close button');

    await this.customWait(10);
    await this.waitForLoaderToDisappear();

    await expect(this.webwishIndiaLabel).toBeVisible();
    await this.elementActions.click(this.webwishIndiaLabel, 'WEBWISHINDIA label');
  }

  async searchAndOpenTaskManagement(searchText: string, createNew = true): Promise<void> {
    try {
      await this.page.waitForTimeout(1000);
      logger.info(`Searching for: ${searchText}`);

      await this.elementActions.sendKeys(this.searchInput, searchText, 'Global search input');
      await this.page.waitForTimeout(1000);

      const count = await this.searchResults.count();
      logger.info(`Found ${count} search result items`);

      let found = false;
      for (let i = 0; i < count; i++) {
        const item = this.searchResults.nth(i);
        const text = (await this.elementActions.getText(item, `Task Management search result ${i}`)).trim().toLowerCase();
        logger.debug(`Search result [${i}]: ${text}`);

        if (text.includes('task') && text.includes('management')) {
          logger.info(`Clicking search result at index ${i} -> ${text}`);
          await this.elementActions.click(item, `Task Management search result ${i}`);
          found = true;
          break;
        }
      }

      if (!found) {
        logger.warn('Task Management not found in search results');
        throw new Error('Task Management not found in search results');
      }

      logger.info('Waiting for Task Management page to load...');
      await this.page.waitForTimeout(2000);

      if (await this.elementActions.isElementVisible(this.swalDialog, 'Swal dialog')) {
        logger.info('Swal dialog detected, dismissing it');
        if (await this.elementActions.isElementVisible(this.swalConfirmButton, 'Swal confirm button')) {
          await this.elementActions.click(this.swalConfirmButton, 'Swal confirm button');
          logger.info('Swal dialog dismissed');
          await this.page.waitForTimeout(500);
        }
      }

      logger.info('Task Management page loaded successfully');

      if (createNew) {
        logger.info('Clicking Add button to create new task...');
        await this.elementActions.click(this.addButton, 'Add button');
        logger.info('Add button clicked');
      }
    } catch (error) {
      logger.error(`Failed to search and open task management: ${error}`);
      throw error;
    }
  }

  /* ================= TASK ACTION METHODS ================= */

  async taskManagementSave(): Promise<void> {
    try {
     

      await this.fillTaskManagementForm();

      await this.elementActions.click(this.saveButton, 'Save button');
      await expect(this.toastParagraph).toContainText('Details created/updated successfully.');
      await this.elementActions.click(this.okButton, 'OK button');



    } catch (error) {
      logger.error(`Failed to save task management details: ${error}`);
      throw error;
    }
  }

  async taskManagementFill(): Promise<void> {
    try {
      await this.fillTaskManagementForm();
    } catch (error) {
      logger.error(`Failed to fill task management form: ${error}`);
      throw error;
    }
  }

  async SaveAndAddNew(): Promise<void> {
    try {
      await this.taskManagementFill();
      await this.elementActions.click(this.saveAndAddNewButton, 'Save & Add New button');
      await expect(this.toastParagraph).toContainText('Details created/updated successfully.');
      await this.elementActions.click(this.okButton, 'OK button');
      await this.elementActions.click(this.closeButton, 'Close button');
    } catch (error) {
      logger.error(`Failed to save and add new task: ${error}`);
      throw error;
    }
  }

  async deleteTask(): Promise<void> {
    try {
      await this.elementActions.click(this.deleteButton, 'Delete button');
      await expect(this.toastParagraph).toContainText('Please select at least one record from list to delete.');
      await this.elementActions.click(this.okButton, 'OK button');

      await this.elementActions.click(this.firstRowCheckbox, 'First row checkbox');

      await this.elementActions.click(this.deleteButton, 'Delete button');
      await expect(this.toastParagraph).toContainText('Do you want to delete the selected record?');
      await this.elementActions.click(this.yesButton, 'Yes button');
      await expect(this.toastParagraph).toContainText('Reuqested data has been deleted successfully.');
      await this.elementActions.click(this.okButton, 'OK button');
    } catch (error) {
      logger.error(`Failed to delete task: ${error}`);
      throw error;
    }
  }

  async findAndEditPendingTask(): Promise<boolean> {
    try {
      logger.info('Searching for pending task to edit');

      while (true) {
        const rowCount = await this.tableRows.count();
        logger.info(`Found ${rowCount} tasks in current page`);

        for (let i = 0; i < rowCount; i++) {
          const row = this.tableRows.nth(i);
          const rowText = await this.elementActions.getText(row, `Task row ${i + 1}`);

          if (rowText?.includes('Completed')) {
            logger.debug(`Row ${i + 1} is Completed. Skipping.`);
            continue;
          }

          if (rowText?.includes('Pending')) {
            logger.info(`Row ${i + 1} is Pending. Opening task for edit.`);

            await this.elementActions.click(this.taskRowOpenIcon(row), `Pending task row ${i + 1} open icon`);
            logger.info('Task opened successfully');

            await this.elementActions.click(this.addButton, 'Edit button');
            logger.info('Edit button clicked');

            await this.elementActions.click(this.userDropdown, 'User dropdown');
            logger.info('User dropdown opened');

            await this.elementActions.pressKey('ArrowDown');
            await this.elementActions.pressKey('ArrowDown');
            await this.elementActions.pressKey('ArrowDown');
            await this.elementActions.pressKey('Enter');
            logger.info('User selected from dropdown');

            await this.elementActions.click(this.saveButton, 'Save button');
            logger.info('Task saved successfully');

            await expect(this.taskTable).toContainText('Pending');
            logger.info('Verified task still shows as Pending');

            return true;
          }
        }

        logger.info('No Pending task found on this page. Checking next page.');

        if ((await this.nextButton.isVisible()) && (await this.nextButton.isEnabled())) {
          await this.elementActions.click(this.nextButton, 'Next button');
          logger.info('Navigated to next page');
          await this.waitForNetworkIdle();
        } else {
          logger.error('No Pending task found in any page');
          throw new Error('No Pending task found in the table across all pages');
        }
      }
    } catch (error) {
      logger.error(`Failed to find and edit pending task: ${error}`);
      throw error;
    }
  }

  async selectAllRecords(): Promise<void> {
    try {
      logger.info('Selecting all records in task table');

      await this.elementActions.click(this.refereshButton, 'Refresh button');
      await this.selectAllCheckbox.check();
      logger.info('All records selected successfully');
    } catch (error) {
      logger.error(`Failed to select all records: ${error}`);
      throw error;
    }
  }

  async deleteSelectedRecords(): Promise<void> {
    try {
      logger.info('Deleting selected records');

      await this.elementActions.click(this.deleteButton, 'Delete button');
      logger.info('Delete button clicked');

      await expect(this.toastParagraph).toContainText('Do you want to delete the selected record?');
      logger.info('Delete confirmation dialog appeared');

      await this.elementActions.click(this.yesButton, 'Yes button');
      logger.info('Deletion confirmed');
    } catch (error) {
      logger.error(`Failed to delete selected records: ${error}`);
      throw error;
    }
  }

  async updateAndClose(): Promise<void> {
    try {
      logger.info('Updating and closing task management');

      await this.elementActions.click(this.updateButton, 'Update button');
      logger.info('Update button clicked');

      await this.elementActions.click(this.okButton, 'OK button');
      logger.info('OK button clicked');

    //   await this.elementActions.click(this.closeButton, 'Close button');
    //   logger.info('Task management dialog closed successfully');
    } catch (error) {
      logger.error(`Failed to update and close: ${error}`);
      throw error;
    }
  }

  async editPendingTaskWorkflow(): Promise<void> {
    try {
      logger.info('Starting edit pending task workflow');

      await this.findAndEditPendingTask();
    //   await this.selectAllRecords();
    //   await this.deleteSelectedRecords();
      await this.updateAndClose();

      logger.info('Edit pending task workflow completed successfully');
    } catch (error) {
      logger.error(`Edit pending task workflow failed: ${error}`);
      throw error;
    }
  }

  /**
   * Perform the post-creation follow-up flow for a Pending task.
   * - search for the pending task by stored description
   * - open the row and perform user assignment edits similar to manual flow
   * - handle 'Already Exists.' toast and fallback to keyboard selection
   * - save changes and close dialogs, verify expected messages
   */
  async pendingTaskPostCreationFlow(): Promise<void> {
    try {
      const description = GlobalDataStore.get('pendingTaskDescription');
      if (!description) throw new Error('Pending task description not found in GlobalDataStore');

      logger.info(`Starting pending follow-up flow for: ${description}`);

      // Search for the pending task
      await this.elementActions.click(this.searchTask, 'Search field');
      await this.elementActions.sendKeys(this.searchTask, description, 'Search task input');
      await this.page.waitForTimeout(500);

      // Find the row containing the description
      const rows = await this.tableRows.count();
      let targetRow: Locator | undefined;
      for (let i = 0; i < rows; i++) {
        const row = this.tableRows.nth(i);
        const text = await this.elementActions.getText(row, `Row ${i + 1} text`);
        if (text && text.includes(description)) {
          targetRow = row;
          break;
        }
      }

      if (!targetRow) throw new Error('Pending task row not found after search');

      // Click edit icon in the row
      const editIcon = targetRow.locator('.bx.bx-edit-alt');
      await this.elementActions.click(editIcon, 'Edit icon in task row');

      // Click first button in dialog (matches manual flow)
      await this.elementActions.click(this.page.getByRole('button').first(), 'First dialog button');

      // Open assign-to dropdown and attempt to add 'Sachin Kumar'
      await this.elementActions.click(this.userSelectDropdown, 'Assign-to dropdown');
      await this.elementActions.sendKeys(this.userSelectDropdown, 'sachin', 'Assign-to search');

      // Try to click the option by title if present
      const sachinOption = this.page.locator('[title="Sachin Kumar"]');
      if (await sachinOption.count() > 0) {
        await this.elementActions.click(sachinOption.first(), 'Select Sachin Kumar');
      }

      // Save & Add New
      await this.elementActions.click(this.saveAndAddNewButton, 'Save & Add New');

      // Attempt to add again to reproduce 'Already Exists.' behavior
      await this.elementActions.click(this.userSelectDropdown, 'Assign-to dropdown');
      await this.elementActions.sendKeys(this.userSelectDropdown, 'sac', 'Assign-to search short');
      if (await sachinOption.count() > 0) {
        await this.elementActions.click(sachinOption.first(), 'Select Sachin Kumar again');
      }
      await this.elementActions.click(this.saveAndAddNewButton, 'Save & Add New - duplicate');

      // If Already Exists toast appears, acknowledge it
      if (await this.elementActions.isElementVisible(this.toastParagraph, 'Toast paragraph')) {
        const toastText = await this.elementActions.getText(this.toastParagraph, 'Toast text');
        if (toastText.includes('Already Exists')) {
          logger.info('Already Exists toast detected, clicking OK');
          await this.elementActions.click(this.okButton, 'OK button on Already Exists');
        }
      }

      // Fallback: select via keyboard (arrow downs then Enter)
      await this.elementActions.click(this.userSelectDropdown, 'Assign-to dropdown for keyboard selection');
      for (let i = 0; i < 6; i++) {
        await this.elementActions.pressKey('ArrowDown');
      }
      await this.elementActions.pressKey('Enter');

      // Save twice then close as per manual flow
      await this.elementActions.click(this.saveAndAddNewButton, 'Save & Add New (final)');
      await this.elementActions.click(this.saveAndAddNewButton, 'Save & Add New (final 2)');
      await this.elementActions.click(this.closeButton, 'Close dialog');
      await this.elementActions.click(this.updateButton, 'Update button after close');
      await this.elementActions.click(this.okButton, 'OK button after update');

      // Optionally open the row again and verify statuses present
      // Search for the pending task
      await this.elementActions.click(this.searchTask, 'Search field');
      await this.elementActions.sendKeys(this.searchTask, description, 'Search task input');

      
      await this.elementActions.click(editIcon, 'Open edit icon again');
      await expect(this.taskTable).toContainText('Cancelled');
      await expect(this.taskTable).toContainText('Pending');

      // Select all and delete (match manual flow)
      await this.elementActions.click(this.selectAllCheckbox, 'Select all checkbox');
      await this.elementActions.click(this.deleteButton, 'Delete button');
      await expect(this.toastParagraph).toContainText('Do you want to delete the selected record?');
      await this.elementActions.click(this.yesButton, 'Yes to delete');
      await this.elementActions.click(this.closeButton, 'Close after delete');
      

      // Open history and close
      await this.elementActions.click(this.page.locator('.bx.bx-history'), 'History icon');
      await this.elementActions.click(this.closeButton, 'Close history dialog');

      logger.info('Pending follow-up flow completed');
    } catch (error) {
      logger.error(`pendingTaskPostCreationFlow failed: ${error}`);
      throw error;
    }
  }

  async createCancelledTaskWithValidation(): Promise<void> {
    await this.createTaskWithValidation('Cancelled', 'cancelledTaskDescription');
  }

  async createCompletedTaskWithValidation(): Promise<void> {
    await this.createTaskWithValidation('Completed', 'completedTaskDescription');
  }

  async createPendingTaskWithValidation(): Promise<void> {
    await this.createTaskWithValidation('Pending', 'pendingTaskDescription');
  }

  async verifyCancelledTaskInSearch(): Promise<void> {
    await this.verifyTaskInSearch('cancelledTaskDescription', 'Cancelled');
  }

  async verifyCompletedTaskInSearch(): Promise<void> {
    await this.verifyTaskInSearch('completedTaskDescription', 'Completed');
  }

  async verifyPendingTaskInSearch(): Promise<void> {
    await this.verifyTaskInSearch('pendingTaskDescription', 'Pending');
  }

  private async createTaskWithValidation(status: 'Cancelled' | 'Completed' | 'Pending', descriptionKey: string): Promise<void> {
    try {
      logger.info(`Starting ${status.toLowerCase()} task creation with blank validation`);

      logger.info('Attempting to save blank form for validation');
      await this.elementActions.click(this.saveButton, 'Save button');
      await expect(this.formContainer).toContainText('Date From required');
      logger.info('Blank form validation verified - Date From required error shown');

      const businessDate = await this.getBusinessDate();
      const dateTo = this.addDaysToDate(businessDate, 4);
      logger.info(`Date From: ${businessDate}, Date To: ${dateTo}`);

      const dateFromField = this.page.getByRole('textbox', { name: 'Select' }).first();
      await this.elementActions.click(dateFromField, 'Date from field');
      await this.elementActions.sendKeys(dateFromField, businessDate, 'Date from input');
      logger.info(`Date from filled with business date: ${businessDate}`);

      const dateToField = this.page.getByRole('textbox', { name: 'Select' }).nth(1);
      await this.elementActions.click(dateToField, 'Date to field');
      await this.elementActions.sendKeys(dateToField, dateTo, 'Date to input');
      logger.info(`Date to filled: ${dateTo}`);

      await this.selectStatus(status);
      logger.info(`Status set to ${status}`);

      await this.selectAssignToByArrowDowns(9);
      logger.info('Assign-to selected');

      const uniqueDescription = this.createUniqueDescription(status);
      await this.elementActions.sendKeys(this.descriptionInput, uniqueDescription, 'Description input');
      logger.info(`Description filled with unique timestamp: ${uniqueDescription}`);

      await this.elementActions.click(this.saveButton, 'Save button');
      await expect(this.toastParagraph).toContainText('Details created/updated successfully.');
      await this.elementActions.click(this.okButton, 'OK button');

      GlobalDataStore.set(descriptionKey, uniqueDescription);
      logger.info(`${status} task created successfully with validation flow`);
    } catch (error) {
      logger.error(`Failed to create ${status.toLowerCase()} task with validation: ${error}`);
      throw error;
    }
  }

  private async verifyTaskInSearch(descriptionKey: string, expectedStatus: 'Cancelled' | 'Completed' | 'Pending'): Promise<void> {
    try {
      const description = GlobalDataStore.get(descriptionKey);
      if (!description) {
        throw new Error(`${expectedStatus} task description not found in GlobalDataStore`);
      }

      logger.info(`Verifying ${expectedStatus.toLowerCase()} task in search: ${description}`);

      const searchField = this.page.getByRole('textbox', { name: 'Search', exact: true });
      await this.elementActions.click(searchField, 'Search field');
      await this.elementActions.sendKeys(searchField, description, 'Task search input');

      await expect(this.taskTable).toContainText(description);
      await expect(this.taskTable).toContainText(expectedStatus);

      logger.info(`${expectedStatus} task verified in search results with unique description`);
    } catch (error) {
      logger.error(`Failed to verify ${expectedStatus.toLowerCase()} task: ${error}`);
      throw error;
    }
  }

  private async getBusinessDate(): Promise<string> {
    const footerText = await this.elementActions.getText(this.businessDateText, 'Business Date text');
    const match = footerText.match(/\d{2}\/\d{2}\/\d{4}/);
    const businessDate = match ? match[0] : undefined;

    if (!businessDate) {
      throw new Error('Business Date not found on Task Management page');
    }

    logger.info(`Extracted Business Date: ${businessDate}`);
    return businessDate;
  }

  private addDaysToDate(dateString: string, days: number): string {
    const [day, month, year] = dateString.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);
    dateObj.setDate(dateObj.getDate() + days);

    return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
  }

  private createUniqueDescription(status: string): string {
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    return `${status.toLowerCase()} current date ${timestamp}`;
  }

  private async selectStatus(status: 'Cancelled' | 'Completed' | 'Pending'): Promise<void> {
    try {
      const statusInputField = this.page.getByRole('textbox').nth(2);
      await this.elementActions.click(statusInputField, 'Status input field');
      await statusInputField.fill(status.toLowerCase());
      await this.page.keyboard.press('Enter');
      logger.info(`Status set to ${status}`);
    } catch (error) {
      logger.error(`Failed to select status ${status.toLowerCase()}: ${error}`);
      throw error;
    }
  }

  private async selectAssignToByArrowDowns(count: number): Promise<void> {
    try {
      const assignToInputField = this.page.getByRole('textbox').nth(3);
      await this.elementActions.click(assignToInputField, 'Assign-to input field');
      
      for (let i = 0; i < count; i++) {
        await this.page.keyboard.press('ArrowDown');
      }
      await this.page.keyboard.press('Enter');
      logger.info(`Assign-to selected after ${count} arrow downs`);
    } catch (error) {
      logger.error(`Failed to select assign-to by arrow downs: ${error}`);
      throw error;
    }
  }
}
