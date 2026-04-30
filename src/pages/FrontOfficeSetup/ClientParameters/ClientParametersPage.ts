import { BrowserContext, Page } from '@playwright/test';
import { BaseCrudPage } from './BaseCrudPage';

export class ClientParameterPage extends BaseCrudPage {

  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: 'Parameter Setup' });
  private readonly clientParametersLink = this.page.getByRole('link', { name: 'Client Parameters' });

  private readonly codeInput = this.page.getByRole('textbox', { name: 'Enter Code' });
  private readonly descriptionInput = this.page.getByRole('textbox', { name: 'Enter Description' });

  private readonly menuName: string;

  constructor(page: Page, context: BrowserContext, menuName: string) {
    super(page, context);
    this.menuName = menuName;
  }

  protected async openPage(): Promise<void> {
    await this.page.mouse.move(0, 300);

    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup');
    await this.elementActions.click(this.clientParametersLink, 'Client Parameters');

    const menu = this.page.locator('a').filter({ hasText: this.menuName });
    await this.elementActions.click(menu, this.menuName);
  }

  protected async fillForm(data: any): Promise<void> {
    await this.elementActions.click(this.codeInput, 'Code');
    await this.codeInput.fill(data.code);

    await this.elementActions.click(this.descriptionInput, 'Description');
    await this.descriptionInput.fill(data.description);
  }

  async runFlow(): Promise<void> {
    const data = [
      { code: this.generateUniqueCode(), description: 'AUTOMATION' },
      { code: this.generateUniqueCode(), description: 'AUTOMATION' },
      { code: this.generateUniqueCode(), description: 'AUTOMATION' }
    ];

    await this.runCrudFlow(data, 'AUTOMATION');
  }
}