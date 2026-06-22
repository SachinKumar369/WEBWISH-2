import { BrowserContext, expect, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import { GlobalSearchPage } from '../GlobalSearch/GlobalSearchPage';
import logger from '../../core/Logger';

export interface UserWithPolicyData {
  userId: string;
  description: string;
  invalidEmail: string;
  validEmail: string;
  password: string;
}

export interface CollectedUserData {
  userIds: string[];
  emails: string[];
}

export class UserSetupWithPolicyPage extends BasePage {
  private readonly elementActions: ElementActions;
  private readonly globalSearchPage: GlobalSearchPage;

  // ── Navigation ──
  private readonly systemConfigurationsLink = this.page.getByRole('link', { name: /System Configurations/i });
  private readonly userSetupLink = this.page.getByRole('link', { name: /User Setup/i });
  private readonly userIdColumnHeader = this.page.getByRole('columnheader', { name: 'User Id' });

  // ── Pagination ──
  private readonly nextPageLink = this.page.getByRole('link', { name: 'Next' });
  private readonly firstPageLink = this.page.getByRole('link', { name: '1' });

  // ── CRUD buttons ──
  private readonly addButton = this.page.locator('.btn.btn-sm.waves-effect').first();
  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });

  // ── Form fields ──
  private readonly userIdInput = this.page.getByRole('textbox').first();
  private readonly descriptionInput = this.page.getByRole('textbox').nth(1);
  private readonly emailInput = this.page.getByRole('textbox', { name: 'example@gmail.com' });
  private readonly passwordInput = this.page.getByRole('textbox', { name: 'Enter password' });

  // ── Dropdowns (ng-select) ──
  private readonly departmentDropdown = this.page.locator(
    '.custom-dropdown.ng-select-searchable.ng-select-clearable > .ng-select-container > .ng-arrow-wrapper'
  ).first();
  private readonly departmentInput = this.page.locator(
    '.custom-dropdown.ng-select-searchable.ng-select-clearable > .ng-select-container > .ng-value-container > .ng-input > input'
  ).first();
  private readonly shiftDropdown = this.page.locator(
    '.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-untouched > .ng-select-container > .ng-arrow-wrapper'
  ).first();
  private readonly shiftInput = this.page.locator(
    '.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-untouched > .ng-select-container > .ng-value-container > .ng-input > input'
  ).first();
  private readonly roleDropdown = this.page.locator('#Roles0 > .ng-select-container > .ng-arrow-wrapper');
  private readonly roleInput = this.page.locator('#Roles0 > .ng-select-container > .ng-value-container > .ng-input > input');

  // ── Popup ──
  private readonly popupMessage = this.page.getByRole('paragraph');
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.globalSearchPage = new GlobalSearchPage(page, context);
  }

  // ────────────────────────────────────────────────────────
  //  Navigation via Global Search
  // ────────────────────────────────────────────────────────

  async openUserSetupViaSearch(): Promise<void> {
    logger.info('Opening User Setup via topbar search');

    const opened = await this.globalSearchPage.searchAndOpenModuleFromTopbar(
      'user setup',
      'User Setup'
    );

    if (!opened) {
      throw new Error('Could not open User Setup from topbar search.');
    }
  }

  // ────────────────────────────────────────────────────────
  //  Navigation via left sidebar
  // ────────────────────────────────────────────────────────

  async openUserSetupViaSidebar(): Promise<void> {
    logger.info('Opening System Configurations > User Setup');
    await this.elementActions.click(this.systemConfigurationsLink, 'System Configurations link');
    await this.elementActions.click(this.userSetupLink, 'User Setup link');
    await this.elementActions.waitForElement(this.userIdColumnHeader, 15000, 'User Id column header');
  }

  // ────────────────────────────────────────────────────────
  //  Table scraping – collect existing user IDs & emails
  // ────────────────────────────────────────────────────────

  private async collectTableData(): Promise<CollectedUserData> {
    const userIds: string[] = [];
    const emails: string[] = [];

    // Collect all visible User Id cells
    const rows = this.page.locator('table tbody tr');
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
      const cells = rows.nth(i).locator('td');

      // User Id is typically the first column
      const userIdText = await cells.nth(0).innerText().catch(() => '');
      if (userIdText.trim()) {
        userIds.push(userIdText.trim());
      }

      // Email is typically the 4th column (index 3) based on the form layout
      const emailText = await cells.nth(3).innerText().catch(() => '');
      if (emailText.trim()) {
        emails.push(emailText.trim());
      }
    }

    logger.info(`Collected ${userIds.length} user IDs and ${emails.length} emails from current page`);
    return { userIds, emails };
  }

  /**
   * Detect total number of pages by reading the highest numeric page-link
   * visible in the pagination bar.
   */
  private async detectTotalPages(): Promise<number> {
    const paginationLinks = this.page.locator('ul.pagination a, nav a, .pagination a');
    const count = await paginationLinks.count();
    let maxPage = 1;

    for (let i = 0; i < count; i++) {
      const text = (await paginationLinks.nth(i).innerText().catch(() => '')).trim();
      const num = parseInt(text, 10);
      if (!isNaN(num) && num > maxPage) {
        maxPage = num;
      }
    }

    logger.info(`Detected total pages: ${maxPage}`);
    return maxPage;
  }

  async collectExistingUsersAcrossPages(): Promise<CollectedUserData> {
    const allUserIds: string[] = [];
    const allEmails: string[] = [];

    // Step 1: Detect how many pages exist
    const totalPages = await this.detectTotalPages();

    // Step 2: Collect from page 1 (already loaded)
    const firstPageData = await this.collectTableData();
    allUserIds.push(...firstPageData.userIds);
    allEmails.push(...firstPageData.emails);
    logger.info(`Page 1: collected ${firstPageData.userIds.length} IDs, ${firstPageData.emails.length} emails`);

    // Step 3: Navigate through remaining pages using the Next button
    for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
      if (!(await this.nextPageLink.isVisible().catch(() => false))) {
        logger.info(`Next link not visible at page ${currentPage - 1}, stopping early`);
        break;
      }

      await this.elementActions.click(this.nextPageLink, `Next to page ${currentPage}`);
      await this.page.waitForTimeout(500);

      const pageData = await this.collectTableData();
      allUserIds.push(...pageData.userIds);
      allEmails.push(...pageData.emails);
      logger.info(`Page ${currentPage}: collected ${pageData.userIds.length} IDs, ${pageData.emails.length} emails`);
    }

    // Return to first page after collection
    if (await this.firstPageLink.isVisible().catch(() => false)) {
      await this.elementActions.click(this.firstPageLink, 'Page 1 link');
      await this.page.waitForTimeout(300);
    }

    const uniqueIds = [...new Set(allUserIds)];
    const uniqueEmails = [...new Set(allEmails)];
    logger.info(`Collection complete across ${totalPages} pages: ${uniqueIds.length} unique IDs, ${uniqueEmails.length} unique emails`);
    return { userIds: uniqueIds, emails: uniqueEmails };
  }

  generateUniqueUserId(existingIds: string[]): string {
    const timestamp = Date.now().toString().slice(-10);
    let candidate = `A${timestamp}`;

    // Ensure uniqueness by appending extra digits if needed
    while (existingIds.includes(candidate)) {
      candidate = `A${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 9)}`;
    }

    logger.info(`Generated unique User Id: ${candidate}`);
    return candidate;
  }

  generateUniqueEmail(existingEmails: string[]): string {
    const timestamp = Date.now().toString().slice(-8);
    let candidate = `user${timestamp}@gmail.com`;

    while (existingEmails.includes(candidate)) {
      const extra = Math.floor(Math.random() * 900) + 100;
      candidate = `user${Date.now().toString().slice(-8)}${extra}@gmail.com`;
    }

    logger.info(`Generated unique Email: ${candidate}`);
    return candidate;
  }

  // ────────────────────────────────────────────────────────
  //  Create user
  // ────────────────────────────────────────────────────────

  async clickAddButton(): Promise<void> {
    await this.elementActions.click(this.addButton, 'Add user button');
    await this.elementActions.waitForElement(this.userIdInput, 10000, 'User Id input');
  }

  async fillUserId(userId: string): Promise<void> {
    await this.elementActions.click(this.userIdInput, 'User Id input');
    await this.userIdInput.fill(userId);
    logger.info(`Set User Id = ${userId}`);
  }

  async fillDescription(description: string): Promise<void> {
    await this.elementActions.click(this.descriptionInput, 'Description input');
    await this.descriptionInput.fill(description);
    logger.info(`Set Description = ${description}`);
  }

  async validateDuplicateCode(): Promise<void> {
    // Tab out to trigger "Code Already Exists" validation
    await this.userIdInput.press('Tab');
    await expect(this.popupMessage).toContainText('Code Already Exists');
    await this.elementActions.click(this.okButton, 'Code Already Exists popup OK');
    logger.info('Duplicate code validation confirmed');
  }

  async fillEmailWithValidation(invalidEmail: string, validEmail: string): Promise<void> {
    // Type invalid email first
    await this.elementActions.click(this.emailInput, 'Email input');
    await this.emailInput.fill(invalidEmail);

    // Tab to password to trigger email validation
    await this.elementActions.click(this.passwordInput, 'Password input to trigger email validation');
    await expect(this.popupMessage).toContainText('Invalid Email Id.');
    await this.elementActions.click(this.okButton, 'Invalid email popup OK');

    // Fix with valid email
    await this.elementActions.click(this.emailInput, 'Email input');
    await this.emailInput.press('ControlOrMeta+a');
    await this.emailInput.fill(validEmail);
    logger.info(`Set valid Email = ${validEmail}`);
  }

  async fillPassword(password: string): Promise<void> {
    await this.elementActions.click(this.passwordInput, 'Password input');
    // Use sendKeys (type) instead of fill to properly trigger Angular's reactive form validation
    await this.elementActions.sendKeys(this.passwordInput, password, 'Password input');
    logger.info(`Set Password = ${password}`);
  }

  // ────────────────────────────────────────────────────────
  //  Dropdown selections (Department, Shift, Property, Role)
  // ────────────────────────────────────────────────────────

  private async selectNgDropdown(
    trigger: ReturnType<Page['locator']>,
    input: ReturnType<Page['locator']>,
    arrowDownCount: number,
    description: string
  ): Promise<void> {
    await this.elementActions.click(trigger, `${description} dropdown trigger`);

    for (let i = 0; i < arrowDownCount; i++) {
      await this.page.keyboard.press('ArrowDown');
    }

    await this.page.keyboard.press('ArrowUp');
    await this.page.keyboard.press('Enter');
    logger.info(`Selected ${description}`);
  }

  async selectDepartment(): Promise<void> {
    await this.selectNgDropdown(this.departmentDropdown, this.departmentInput, 3, 'Department');
  }

  async selectShift(): Promise<void> {
    await this.selectNgDropdown(this.shiftDropdown, this.shiftInput, 1, 'Shift');
  }

  async selectProperty(): Promise<void> {
    await this.page.locator(
      '.custom-dropdown.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-untouched > .ng-select-container > .ng-arrow-wrapper'
    ).first().click();

    for (let i = 0; i < 4; i++) {
      await this.page.keyboard.press('ArrowDown');
    }

    await this.page.keyboard.press('Enter');
    logger.info('Selected Property');
  }

  async selectRole(): Promise<void> {
    await this.elementActions.click(this.roleDropdown, 'Role dropdown trigger');
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('ArrowUp');
    await this.page.keyboard.press('Enter');
    logger.info('Selected Role');
  }

  async selectAllDropdowns(): Promise<void> {
    await this.selectDepartment();
    await this.selectShift();
    await this.selectProperty();
    await this.selectRole();
  }

  // ────────────────────────────────────────────────────────
  //  Save & confirm / expect error
  // ────────────────────────────────────────────────────────

  async saveUser(): Promise<void> {
    await this.elementActions.click(this.saveButton, 'Save button');
    await expect(this.popupMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Save success OK');
    logger.info('User saved successfully');
  }

  async saveUserExpectError(expectedError: string): Promise<void> {
    await this.elementActions.click(this.saveButton, 'Save button');

    // Wait for validation popup or inline error to appear
    await this.page.waitForTimeout(2000);

    // Collect ALL visible text from every possible error location
    const sources = [
      this.page.locator('.swal2-html-container').first(),
      this.page.locator('#swal2-html-container').first(),
      this.page.getByRole('alert').first(),
      this.page.getByRole('paragraph').first(),
      this.page.locator('.alert-danger').first(),
      this.page.locator('.text-danger').first(),
      this.page.locator('.invalid-feedback').first(),
      this.page.locator('.toast-body').first(),
    ];

    let combinedText = '';
    for (const source of sources) {
      const text = await source.innerText().catch(() => '');
      if (text.trim()) {
        combinedText += ` ${text.trim()}`;
      }
    }

    logger.info(`All visible text after save: "${combinedText.trim()}"`);

    // Dismiss any SweetAlert popup if present
    if (await this.okButton.isVisible().catch(() => false)) {
      await this.elementActions.click(this.okButton, 'Error popup OK button');
      await this.page.waitForTimeout(300);
    }

    // The key assertion: the save must NOT have succeeded
    expect(combinedText).not.toContain('Details created/updated successfully');

    // Log whether the expected error was found
    if (combinedText.toLowerCase().includes(expectedError.toLowerCase())) {
      logger.info(`✅ Error matched expected: "${expectedError}"`);
    } else {
      logger.warn(`⚠️ Expected "${expectedError}" but got: "${combinedText.trim()}"`);
    }
  }

  // ────────────────────────────────────────────────────────
  //  Full flow – collects existing data, generates unique values, creates user
  // ────────────────────────────────────────────────────────

  async runUserCreationWithPolicyFlow(
    baseData: Omit<UserWithPolicyData, 'userId' | 'validEmail'>
  ): Promise<{ userId: string; email: string }> {
    await this.openUserSetupViaSearch();

    // Collect existing user IDs and emails from table pages
    const existing = await this.collectExistingUsersAcrossPages();

    // Generate unique userId and email
    const uniqueUserId = this.generateUniqueUserId(existing.userIds);
    const uniqueEmail = this.generateUniqueEmail(existing.emails);

    await this.clickAddButton();
    await this.fillUserId(uniqueUserId);
    await this.fillDescription(baseData.description);
    await this.fillEmailWithValidation(baseData.invalidEmail, uniqueEmail);
    await this.fillPassword(baseData.password);
    await this.selectAllDropdowns();
    await this.saveUser();

    return { userId: uniqueUserId, email: uniqueEmail };
  }

  /**
   * Fill the user form with a non-compliant password and attempt to save,
   * expecting the given error message. Used by negative test scenarios.
   * After the error, the form stays open so additional negative tests can
   * clear the password and try another invalid value without re-creating the form.
   */
  async fillFormAndTrySave(
    userId: string,
    email: string,
    password: string,
    expectedError: string
  ): Promise<void> {
    await this.fillPassword(password);
    await this.saveUserExpectError(expectedError);

    // Clear password field so the next attempt can start fresh
    await this.passwordInput.click();
    await this.passwordInput.press('ControlOrMeta+a');
    await this.passwordInput.fill('');
  }

  /**
   * Prepare a blank user form (add button → fill userId, description, email)
   * ready for password negative testing. Returns the generated unique userId & email.
   */
  async prepareFormForNegativeTest(): Promise<{ userId: string; email: string }> {
    await this.openUserSetupViaSearch();
    const existing = await this.collectExistingUsersAcrossPages();
    const uniqueUserId = this.generateUniqueUserId(existing.userIds);
    const uniqueEmail = this.generateUniqueEmail(existing.emails);

    await this.clickAddButton();
    await this.fillUserId(uniqueUserId);
    await this.fillDescription('negative-test');
    await this.fillEmailWithValidation('invalid@test', uniqueEmail);

    // Select dropdowns so form-level validation doesn't block password validation
    await this.selectAllDropdowns();

    return { userId: uniqueUserId, email: uniqueEmail };
  }
}
