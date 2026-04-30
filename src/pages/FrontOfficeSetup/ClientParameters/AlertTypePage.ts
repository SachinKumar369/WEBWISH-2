import { BrowserContext, Page } from '@playwright/test';
import { BaseCrudPage } from './BaseCrudPage';

export class AlertTypePage extends BaseCrudPage {

  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: 'Parameter Setup' });
  private readonly clientParametersLink = this.page.getByRole('link', { name: 'Client Parameters' });
  private readonly alertTypeLink = this.page.getByRole('link', { name: 'Alert Types' });

  private readonly codeInput = this.page.getByRole('textbox', { name: 'Enter Code' });
  private readonly descriptionInput = this.page.getByRole('textbox', { name: 'Enter Description' });

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  protected async openPage(): Promise<void> {
    // ✅ Required for menu visibility
    await this.page.mouse.move(0, 300);

    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup');
    await this.elementActions.click(this.clientParametersLink, 'Client Parameters');
    await this.elementActions.click(this.alertTypeLink, 'Alert Types');
  }

  protected async fillForm(data: any): Promise<void> {
    await this.elementActions.click(this.codeInput, 'Code input');
    await this.codeInput.fill(data.code);

    await this.elementActions.click(this.descriptionInput, 'Description input');
    await this.descriptionInput.fill(data.description);
  }

  // ✅ Wrapper method (keeps test simple)
  async runAlertTypeCreateDeleteFlow(): Promise<void> {
    const data = [
      { code: this.generateUniqueCode(), description: 'AUTOMATION' },
      { code: this.generateUniqueCode(), description: 'AUTOMATION' },
      { code: this.generateUniqueCode(), description: 'AUTOMATION' }
    ];

    await this.runCrudFlow(data, 'AUTOMATION');
  }
}