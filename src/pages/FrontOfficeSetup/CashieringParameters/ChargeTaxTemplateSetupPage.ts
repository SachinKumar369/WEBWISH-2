import { expect, BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class ChargeTaxTemplateSetupPage extends BasePage {
  private readonly elementActions: ElementActions;

  /* ================= PAGE FACTORY LOCATORS ================= */
  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: ' Parameter Setup' });
  private readonly cashieringParametersLink = this.page.getByRole('link', { name: ' Cashiering Parameters' });
  private readonly chargeTaxTemplateSetupLink = this.page.getByRole('link', { name: ' Charge Tax Template Setup' });

  private readonly addButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
  private readonly idInput = this.page.getByRole('textbox', { name: 'Enter Id' });
  private readonly descriptionInput = this.page.getByRole('textbox', { name: 'Enter Description' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });
  private readonly searchBox = this.page.locator('#customerList').getByPlaceholder('Search');
  private readonly editIcon = this.page.locator('.bx.bx-edit-alt').first();
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });
  
  private readonly popupMessage = this.page.locator('#swal2-html-container');

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  async navigateToChargeTaxTemplateSetup(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Cashiering Parameters > Charge Tax Template Setup');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup link');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup link');
    await this.elementActions.click(this.cashieringParametersLink, 'Cashiering Parameters link');
    await this.elementActions.click(this.chargeTaxTemplateSetupLink, 'Charge Tax Template Setup link');
  }

  async clickAddButton(): Promise<void> {
    await this.elementActions.click(this.addButton, 'Add Charge Tax Template button');
  }

  async fillTemplateId(id: string): Promise<void> {
    await this.elementActions.click(this.idInput, 'Template ID input');
    await this.elementActions.sendKeys(this.idInput, id, 'Template ID');
  }

  async fillDescription(description: string): Promise<void> {
    await this.elementActions.click(this.descriptionInput, 'Description input');
    await this.elementActions.sendKeys(this.descriptionInput, description, 'Description');
  }

  async clickSave(): Promise<void> {
    logger.info('Clicking Save button');
    await this.elementActions.click(this.saveButton, 'Save button');
    await this.page.waitForLoadState('networkidle');
  }

  async verifySuccessMessage(): Promise<void> {
    logger.info('Verifying success message');
    await expect(this.popupMessage).toContainText('Details created/updated successfully.');
  }

  async clickOk(): Promise<void> {
    await this.elementActions.click(this.okButton, 'OK button');
    await this.page.waitForLoadState('networkidle');
  }

  async searchTemplate(searchText: string): Promise<void> {
    logger.info(`Searching for template: ${searchText}`);
    await this.elementActions.click(this.searchBox, 'Search box');
    await this.searchBox.fill('');
    await this.searchBox.fill(searchText);
    await this.page.waitForLoadState('networkidle');
  }

  async clickEditIcon(): Promise<void> {
    await this.elementActions.click(this.editIcon, 'Edit icon');
    await this.page.waitForLoadState('networkidle');
  }

  async clickDelete(): Promise<void> {
    logger.info('Clicking Delete button');
    await this.elementActions.click(this.deleteButton, 'Delete button');
    await this.page.waitForLoadState('networkidle');
  }

  async verifyDeleteConfirmation(): Promise<void> {
    logger.info('Verifying delete confirmation message');
    await expect(this.popupMessage).toContainText('Do you want to delete the selected record?');
  }

  async confirmDelete(): Promise<void> {
    await this.elementActions.click(this.yesButton, 'Yes button');
    await this.page.waitForLoadState('networkidle');
  }

  async verifyDeleteSuccess(): Promise<void> {
    logger.info('Verifying delete success message');
    await expect(this.popupMessage).toContainText('Data Deleted Successfully.');
  }

  async createAndDeleteTemplate(templateId: string, description: string, searchText: string): Promise<void> {
    logger.info(`Creating and deleting Charge Tax Template with ID: ${templateId}`);
    
    // Create
    await this.clickAddButton();
    await this.fillTemplateId(templateId);
    await this.fillDescription(description);
    await this.clickSave();
    await this.verifySuccessMessage();
    await this.clickOk();

    // Search and Delete
    await this.searchTemplate(searchText);
    await this.clickEditIcon();
    await this.clickDelete();
    await this.verifyDeleteConfirmation();
    await this.confirmDelete();
    await this.verifyDeleteSuccess();
    await this.clickOk();
  }
}
