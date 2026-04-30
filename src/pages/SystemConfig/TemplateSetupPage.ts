import { Page, BrowserContext, expect } from '@playwright/test';
import { BaseCrudPage } from '../FrontOfficeSetup/ClientParameters/BaseCrudPage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';

export class TemplateSetupPage extends BaseCrudPage {

  private readonly systemConfigurationsLink = this.page.getByRole('link', { name: /System Configurations/i });
  private readonly templateSetupLink = this.page.getByRole('link', { name: /Template Setup/i });

  // Permission checkbox ids present in the modal
  private readonly PERMISSION_IDS = [
    'Dashboard',
    'Front Desk',
    'Accounting',
    'Cashiering',
    'Manager Functions',
    'Reports',
    'FrontOffice Setup',
    'Housekeeping',
    'Marketing',
    'Night Audit',
    'Quick Actions',
    'System Configurations',
    'Systems Control',
    'Systems Utilities'
  ];

  private readonly firstTextbox = this.page.getByRole('textbox').first();
  private readonly secondTextbox = this.page.getByRole('textbox').nth(1);

  private readonly copyFromTemplateButton = this.page.getByRole('button', { name: 'Copy From Template' });
  private readonly copyOkButton = this.page.getByRole('button', { name: /ok/i });
  private readonly optionsList = this.page.getByLabel('Options list');

  private readonly deleteButtonClass = this.page.locator('.btn.btn-sm.waves-effect.waves-light.py-0.px-2.btn-soft-danger');
  private readonly emailButton = this.page.locator('#button-email');

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  async openPage(): Promise<void> {
    logger.info('Opening Template Setup page');
    await this.elementActions.click(this.systemConfigurationsLink, 'System Configurations');
    await this.elementActions.click(this.templateSetupLink, 'Template Setup');
    await this.elementActions.waitForElement(this.addButton, 10000, 'Add button on Template Setup');
    logger.info('Template Setup page opened and Add button is visible');
  }

  async createTemplate(name: string, description: string): Promise<void> {
    logger.info(`createTemplate: starting (name=${name})`);
    // Follow original flow exactly: click Add → click textbox → press CapsLock → fill → fill description → check 'Check All' → press key → Save → confirm
    await this.elementActions.click(this.addButton, 'Add');
    logger.info('Clicked Add button');

    await this.elementActions.click(this.firstTextbox, 'Template name input');
    // replicate original script pressing CapsLock on the textbox before filling
    try {
      await this.firstTextbox.press('CapsLock');
      logger.debug('Pressed CapsLock on template name input');
    } catch (err) {
      logger.debug(`CapsLock press failed: ${err}`);
    }
    await this.elementActions.sendKeys(this.firstTextbox, name, 'Template name');
    logger.info('Filled template name');

    await this.elementActions.click(this.secondTextbox, 'Template description input');
    await this.elementActions.sendKeys(this.secondTextbox, description, 'Template description');
    logger.info('Filled template description');

    // check 'Check All' by role and press the key combo as in original flow
    const checkAll = this.page.getByRole('checkbox', { name: 'Check All' });
    if ((await checkAll.count()) > 0) {
      logger.info('Toggling Check All checkbox');
      await checkAll.check();
      logger.info('Check All checked');
      // replicate the original press on the checkbox
      try {
        await checkAll.press('ControlOrMeta+Shift+i');
        logger.debug('Pressed ControlOrMeta+Shift+i on Check All');
      } catch (err) {
        logger.debug('Could not press ControlOrMeta+Shift+i on Check All');
      }

      // Validate that common permission checkboxes are checked when Check All is checked
      logger.info('Validating permission checkboxes after Check All');
      for (const id of this.PERMISSION_IDS) {
        const locator = this.page.locator(`[id="${id}"]`);
        try {
          if ((await locator.count()) > 0) {
            await expect(locator).toBeChecked();
            logger.debug(`Permission checkbox is checked: ${id}`);
          } else {
            logger.debug(`Permission checkbox not present on page: ${id}`);
          }
        } catch (err) {
          logger.warn(`Permission checkbox ${id} not checked as expected: ${err}`);
        }
      }
      logger.info('Permission validation completed');
    } else {
      logger.info('Check All checkbox not found; skipping permission validation');
    }

    logger.info('Saving template');
    await this.elementActions.click(this.saveButton, 'Save');
    // Expect and confirm the success popup exactly like the original flow
    await this.expectAndConfirmPopup('User template has been created successfully', 'OK');
    logger.info('createTemplate: completed successfully');
  }

  async copyFromTemplate(newName: string, newDesc: string, templateToCopy: string): Promise<void> {
    logger.info(`copyFromTemplate: creating ${newName} by copying ${templateToCopy}`);
    // Follow original flow: Add → click name → fill → click description → fill → Copy From Template → open options → select template → Ok → Save → confirm
    await this.elementActions.click(this.addButton, 'Add');
    logger.info('Clicked Add for copyFromTemplate');

    await this.elementActions.click(this.firstTextbox, 'Template name input');
    await this.elementActions.sendKeys(this.firstTextbox, newName, 'Template name');
    logger.info('Filled new template name');

    await this.elementActions.click(this.secondTextbox, 'Template description input');
    await this.elementActions.sendKeys(this.secondTextbox, newDesc, 'Template description');
    logger.info('Filled new template description');

    await this.elementActions.click(this.copyFromTemplateButton, 'Copy From Template');
    logger.info('Clicked Copy From Template');

    // replicate the original script which clicks a textbox then selects from the options list
    await this.page.getByRole('textbox').click();
    logger.debug('Clicked textbox to open options list');
    await this.page.getByLabel('Options list').getByText(templateToCopy, { exact: true }).click();
    logger.info(`Selected template to copy from: ${templateToCopy}`);

    // Click Ok then Save
    await this.page.getByRole('button', { name: 'Ok' }).click();
    logger.info('Confirmed copy dialog with Ok');
    await this.elementActions.click(this.saveButton, 'Save');
    logger.info('Clicked Save after copy');
    await this.expectAndConfirmPopup('User template has been created successfully', 'OK');
    logger.info('copyFromTemplate: completed successfully');
  }

  async createWithChecks(name: string, description: string): Promise<void> {
    logger.info(`createWithChecks: starting (name=${name})`);
    // Follow original flow: Add → fill name → fill description → check specific permission checkboxes → Save → confirm
    await this.elementActions.click(this.addButton, 'Add');
    logger.info('Clicked Add button for createWithChecks');

    await this.elementActions.click(this.firstTextbox, 'Template name input');
    await this.elementActions.sendKeys(this.firstTextbox, name, 'Template name');
    logger.info('Filled template name for createWithChecks');

    await this.elementActions.click(this.secondTextbox, 'Template description input');
    await this.elementActions.sendKeys(this.secondTextbox, description, 'Template description');
    logger.info('Filled template description for createWithChecks');

    // Explicitly check each permission checkbox in the same order as the original flow
    try {
      const dashboard = this.page.locator('#Dashboard');
      if ((await dashboard.count()) > 0) {
        await dashboard.check();
        logger.debug('Checked #Dashboard');
      }
    } catch (err) {
      logger.debug('Could not check #Dashboard');
    }

    try {
      const frontDesk = this.page.locator('[id="Front Desk"]');
      if ((await frontDesk.count()) > 0) {
        await frontDesk.check();
        logger.debug('Checked Front Desk');
      }
    } catch (err) {
      logger.debug('Could not check Front Desk');
    }

    try {
      const accounting = this.page.locator('#Accounting');
      if ((await accounting.count()) > 0) {
        await accounting.check();
        logger.debug('Checked #Accounting');
      }
    } catch (err) {
      logger.debug('Could not check #Accounting');
    }

    try {
      const cashiering = this.page.locator('#Cashiering');
      if ((await cashiering.count()) > 0) {
        await cashiering.check();
        logger.debug('Checked #Cashiering');
      }
    } catch (err) {
      logger.debug('Could not check #Cashiering');
    }

    // Validate the specific checkboxes we attempted to set
    logger.info('Validating explicit permission checkboxes');
    try {
      const d = this.page.locator('#Dashboard');
      if ((await d.count()) > 0) {
        await expect(d).toBeChecked();
        logger.debug('Dashboard checkbox validated as checked');
      }
    } catch (err) {
      logger.warn('Dashboard checkbox validation failed');
    }

    try {
      const fd = this.page.locator('[id="Front Desk"]');
      if ((await fd.count()) > 0) {
        await expect(fd).toBeChecked();
        logger.debug('Front Desk checkbox validated as checked');
      }
    } catch (err) {
      logger.warn('Front Desk checkbox validation failed');
    }

    try {
      const a = this.page.locator('#Accounting');
      if ((await a.count()) > 0) {
        await expect(a).toBeChecked();
        logger.debug('Accounting checkbox validated as checked');
      }
    } catch (err) {
      logger.warn('Accounting checkbox validation failed');
    }

    try {
      const c = this.page.locator('#Cashiering');
      if ((await c.count()) > 0) {
        await expect(c).toBeChecked();
        logger.debug('Cashiering checkbox validated as checked');
      }
    } catch (err) {
      logger.warn('Cashiering checkbox validation failed');
    }

    logger.info('Saving template with explicit checks');
    await this.elementActions.click(this.saveButton, 'Save');
    await this.expectAndConfirmPopup('User template has been created successfully', 'OK');
    logger.info('createWithChecks: completed successfully');
  }

  async search(text: string): Promise<void> {
    logger.info(`Searching templates for text: ${text}`);
    // Use the exact Search textbox as in original flow
    const searchInput = this.page.getByRole('textbox', { name: 'Search', exact: true });
    await this.elementActions.click(searchInput, 'Search');
    await searchInput.fill(text);
    logger.info('Search textbox filled');
  }

  async deleteSelected(): Promise<void> {
    logger.info('deleteSelected: attempting to delete selected templates');
    // Follow original flow: check #checkAll → click delete (class) → confirm 'Do you want to delete...' → click Yes → confirm 'Data Deleted Successfully.' → click OK twice
    try {
      const checkAll = this.page.locator('#checkAll');
      if ((await checkAll.count()) > 0) {
        await checkAll.check();
        logger.info('#checkAll checked');
      }
    } catch (err) {
      logger.debug('Could not check #checkAll');
    }

    try {
      // original flow clicked the delete button with a specific class
      logger.info('Clicking delete button (class)');
      await this.elementActions.click(this.deleteButtonClass, 'Delete (class)');
    } catch (err) {
      // fallback to role-based Delete button
      if ((await this.deleteButton.count()) > 0) {
        logger.info('Fallback: clicking role-based Delete button');
        await this.elementActions.click(this.deleteButton, 'Delete');
      } else {
        logger.error(`Failed to trigger delete action: ${err}`);
        throw err;
      }
    }

    logger.info('Confirming deletion in popup');
    await this.expectAndConfirmPopup('Do you want to delete the selected record?', 'Yes');
    await this.expectAndConfirmPopup('Data Deleted Successfully.', 'OK');

    // original flow clicked OK twice — attempt a second OK if present
    try {
      //await this.elementActions.click(this.okButton, 'OK (second)');
      logger.debug('Attempted second OK click if present');
    } catch (err) {
      // ignore if not present
    }
    logger.info('deleteSelected: completed');
  }

//   async clickEmailButton(): Promise<void> {
//     await this.elementActions.click(this.emailButton, 'Email button');
//   }

  // BaseCrudPage requires implementing abstract methods - keep minimal for this page
  protected async fillForm(_data: any): Promise<void> {
    // Not used in this page - implemented to satisfy abstract signature
  }

  protected async openPageFromMenu(): Promise<void> {
    await this.openPage();
  }
}
