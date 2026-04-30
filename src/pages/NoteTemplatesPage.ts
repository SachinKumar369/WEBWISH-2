// import { Page, BrowserContext } from '@playwright/test';
// import { BasePage } from '../core/BasePage';
// import { ElementActions } from '../utils/ElementActions';
// import logger from '../core/Logger';

// export class NoteTemplatesPage extends BasePage {
//   private elementActions: ElementActions;

//   // Search input selector as provided
//   private readonly SEARCH_INPUT = '#search-options';
//   // Dropdown item selector - general text match
//   private readonly DROPDOWN_ITEM_TEXT = 'Note Templates';
//   private readonly ADD_BUTTON = "button:has(i.mdi-plus-circle)";

//   constructor(page: Page, context: BrowserContext) {
//     super(page, context);
//     this.elementActions = new ElementActions(page);
//   }

//   async waitForSearchInput(timeout: number = 10000): Promise<void> {
//     try {
//       logger.info('Waiting for search input to be visible');
//       await this.page.locator(this.SEARCH_INPUT).waitFor({ state: 'visible', timeout });
//       logger.info('Search input visible');
//     } catch (error) {
//       logger.error(`Search input not visible: ${error}`);
//       throw error;
//     }
//   }

//   /**
//    * Search the given text in the search box and click the dropdown item 'Note Templates'
//    */
//   async searchAndSelect(templateSearchText: string = 'note templates'): Promise<void> {
//     try {
//       await this.waitForSearchInput();

//       logger.info(`Typing into search box: ${templateSearchText}`);
//       const input = this.page.locator(this.SEARCH_INPUT);

//       // Clear and type
//       await input.fill('');
//       await input.type(templateSearchText, { delay: 50 });

//       // small wait for dropdown to appear
//       await this.page.waitForTimeout(500);

//       // Click the dropdown item with text 'Note Templates'
//       const item = this.page.locator(`text=${this.DROPDOWN_ITEM_TEXT}`);
//       await item.first().click({ timeout: 5000 });

//       logger.info('Clicked Note Templates dropdown item');
//     } catch (error) {
//       logger.error(`Failed to search and select Note Templates: ${error}`);
//       throw error;
//     }
//   }

//   async waitForNoteTemplatesPage(timeout: number = 10000): Promise<void> {
//     try {
//       // Wait for a heading or breadcrumb that indicates Note Templates page loaded
//       const heading = this.page.locator('text=Note Templates').first();
//       await heading.waitFor({ state: 'visible', timeout });
//       logger.info('Note Templates page loaded');
//     } catch (error) {
//       logger.warn('Note Templates heading not found within timeout');
//       // do not throw - sometimes navigation is SPA and content loads differently
//     }
//   }

//   /**
//    * Create a new note template with given id and description
//    */
//   async createTemplate(templateId: string, description: string): Promise<void> {
//     try {
//       logger.info(`Creating template: id=${templateId}`);

//       // Click the plus icon button inside Note Templates area
//       // Use button that has an i.mdi-plus-circle icon
//       const plusButton = this.page.locator('button:has(i.mdi-plus-circle)').first();
//       await plusButton.waitFor({ state: 'visible', timeout: 5000 });
//       await plusButton.click();

//       // Wait for template id input to appear
//       const templateIdInput = this.page.locator('input.text-uppercase.form-control.form-control-sm');
//       await templateIdInput.waitFor({ state: 'visible', timeout: 5000 });

//       // Fill template id
//       await templateIdInput.fill(templateId);

//       // Fill description in CKEditor editable div
//       const ckEditable = this.page.locator('div.ck-editor__editable');
//       await ckEditable.first().waitFor({ state: 'visible', timeout: 5000 });

//       // Use evaluate to set innerHTML safely
//       await ckEditable.first().evaluate((el, value) => { (el as HTMLElement).innerText = value; }, description);

//       // Click Save button (type=submit or text=Save)
//       const saveBtn = this.page.locator('button:has-text("Save")').first();
//       await saveBtn.click();

//       // Wait for success modal and click OK
//       const okBtn = this.page.locator('button.swal2-confirm, button:has-text("OK")').first();
//       await okBtn.waitFor({ state: 'visible', timeout: 5000 });
//       await okBtn.click();

//       logger.info('Template created and confirmed');
//       // small wait for save to reflect in list
//       await this.page.waitForTimeout(1000);
//     } catch (error) {
//       logger.error(`Failed to create template: ${error}`);
//       throw error;
//     }
//   }

//   /**
//    * Search for a template id in the templates list and validate items with specific style
//    * Returns true if a matching element with the required style and text is found
//    */
//   async searchAndValidateTemplate(templateId: string): Promise<boolean> {
//     try {
//       // search input under templates (provided selector)
//       const listSearchInput = this.page.locator('input.form-control.form-control-sm.search');
//       await listSearchInput.waitFor({ state: 'visible', timeout: 5000 });
//       await listSearchInput.fill('');
//       await listSearchInput.type(templateId, { delay: 50 });

//       // small wait for results filter
//       await this.page.waitForTimeout(500);

//       // Find elements with the exact style attribute
//       const styledItems = this.page.locator('[style="min-width: 250px; text-align: left;"]');
//       const count = await styledItems.count();
//       logger.info(`Found ${count} styled items to validate`);

//       for (let i = 0; i < count; i++) {
//         const txt = (await styledItems.nth(i).textContent())?.trim() || '';
//         logger.info(`Styled item [${i}] text='${txt}'`);
//         if (txt === templateId) {
//           logger.info('Validation successful: matched template id');
//           return true;
//         }
//       }

//       logger.warn('Validation failed: no styled item matched the template id');
//       return false;
//     } catch (error) {
//       logger.error(`Failed to search/validate template: ${error}`);
//       throw error;
//     }
//   }
// }

import { Page, BrowserContext, expect } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import { ElementActions } from '../utils/ElementActions';
import logger from '../core/Logger';

export class NoteTemplatesPage extends BasePage {
  private elementActions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  /* ================= LOCATORS ================= */

  private readonly searchInput = this.page.locator('#search-options');

  private readonly noteTemplatesDropdownItem = this.page.getByText('Note Templates', { exact: false });

  private readonly pageHeading =   this.page.getByRole('heading', { name: /note templates/i });

  private readonly addButton =   this.page.locator('button:has(i.mdi-plus-circle)').first();

  private readonly templateIdInput =   this.page.locator('input.text-uppercase.form-control-sm').first();

  private readonly descriptionEditor =  this.page.locator('[aria-label*="Editor editing area"]');

  private readonly saveButton =  this.page.locator('//button[text()="Save"]');

  

  private readonly okButton =   this.page.locator('button.swal2-confirm, button:has-text("OK")').first();

  private readonly tableSearchInput =    this.page.locator('input.form-control.form-control-sm.search');

  /* ================= SEARCH NAVIGATION ================= */

  async waitForSearchInput(timeout: number = 10000): Promise<void> {
    logger.info('Waiting for search input to be visible');
    await expect(this.searchInput).toBeVisible({ timeout });
    logger.info('Search input visible');
  }

  async searchAndSelect(templateSearchText: string = 'note templates'): Promise<void> {
    await this.waitForSearchInput();

    logger.info(`Typing into search box: ${templateSearchText}`);
    await this.searchInput.fill(templateSearchText);

    await this.noteTemplatesDropdownItem.first().click();

    logger.info('Clicked Note Templates dropdown item');
  }

  async waitForNoteTemplatesPage(timeout: number = 10000): Promise<void> {
    logger.info('Waiting for Note Templates page to load');
    await expect(this.pageHeading).toBeVisible({ timeout });
    logger.info('Note Templates page loaded');
  }

  /* ================= CREATE TEMPLATE ================= */

  async createTemplate(templateId: string, description: string): Promise<void> {
    logger.info(`Creating template with id: ${templateId}`);

    await expect(this.addButton).toBeVisible();
    await this.addButton.click();

    await expect(this.templateIdInput).toBeVisible();
    await this.templateIdInput.fill(templateId);

    await expect(this.descriptionEditor).toBeVisible();
    await this.descriptionEditor.fill(description);

    await this.saveButton.click();

    await expect(this.okButton).toBeVisible();
    await this.okButton.click();

    logger.info('Template created successfully');
  }

  /* ================= VALIDATION ================= */

  async searchAndValidateTemplate(templateId: string): Promise<boolean> {
    logger.info(`Searching for template id: ${templateId}`);

    await expect(this.tableSearchInput).toBeVisible();
    await this.tableSearchInput.fill(templateId);

    const templateRow = this.page.locator(`text=${templateId}`).first();

    try {
      await expect(templateRow).toBeVisible({ timeout: 5000 });
      logger.info('Validation successful: template found');
      return true;
    } catch {
      logger.warn('Validation failed: template not found');
      return false;
    }
  }
}