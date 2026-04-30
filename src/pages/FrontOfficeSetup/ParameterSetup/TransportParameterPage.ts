import { expect, BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class TransportParameterPage extends BasePage {
  private readonly elementActions: ElementActions;
  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: ' Parameter Setup' });
  private readonly transportParameterLink = this.page.getByRole('link', { name: ' Transport Parameter' });

  private readonly addButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
  private readonly codeInput = this.page.getByRole('textbox').nth(0);
  private readonly descriptionInput = this.page.getByRole('textbox').nth(1);
  private readonly fromInput = this.page.getByRole('textbox').nth(2);
  private readonly toInput = this.page.getByRole('textbox').nth(3);
  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });

  private readonly successMessage = this.page.getByRole('paragraph');
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });

  private readonly editButton = this.page.locator('.bx.bx-edit-alt').first();
  private readonly deleteButton = this.page.getByRole('button', { name: 'Delete' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  async navigateToTransportParameter(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Transport Parameter');
    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup link');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup link');
    await this.elementActions.click(this.transportParameterLink, 'Transport Parameter link');
  }

  async addTransportParameter(code: string, description: string, from: string, to: string): Promise<void> {
    logger.info(`Adding Transport Parameter with code ${code}`);
    await this.elementActions.click(this.addButton, 'Add Transport Parameter button');
    await this.elementActions.sendKeys(this.codeInput, code, 'Code input');
    await this.elementActions.sendKeys(this.descriptionInput, description, 'Description input');
    await this.elementActions.sendKeys(this.fromInput, from, 'From input');
    await this.elementActions.sendKeys(this.toInput, to, 'To input');
    await this.elementActions.click(this.saveButton, 'Save button');
  }

  async verifySuccessMessage(message: string): Promise<void> {
    await expect(this.successMessage).toContainText(message);
    await this.elementActions.click(this.okButton, 'OK button');
  }

  async editTransportParameter(): Promise<void> {
    await this.elementActions.click(this.editButton, 'Edit Transport Parameter button');
  }

  async deleteTransportParameter(): Promise<void> {
    await this.elementActions.click(this.deleteButton, 'Delete button');
    await this.elementActions.click(this.yesButton, 'Yes button');
  }

  async runTransportParameterCreateEditDeleteFlow(
    code: string,
    description: string,
    from: string,
    to: string
  ): Promise<void> {
    await this.navigateToTransportParameter();
    await this.addTransportParameter(code, description, from, to);
    await this.verifySuccessMessage('Details created/updated successfully.');
    await this.editTransportParameter();
    await this.deleteTransportParameter();
    await this.verifySuccessMessage('Data Deleted Successfully.');
  }
}