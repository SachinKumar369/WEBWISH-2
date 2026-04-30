import { BrowserContext, Page } from '@playwright/test';
import { BaseCrudPage } from './BaseCrudPage';

export class ARAccountTypePage extends BaseCrudPage {

  protected getSearchKeyword(data: any): string {
  return data.description;
}

  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: 'Parameter Setup' });
  private readonly clientParametersLink = this.page.getByRole('link', { name: 'Client Parameters' });

  // ✅ Your provided locator
  private readonly arAccountTypeLink = this.page.locator('a').filter({ hasText: 'AR Account Type' });

  private readonly codeInput = this.page.getByRole('textbox', { name: 'Enter Code' });
  private readonly descriptionInput = this.page.getByRole('textbox', { name: 'Enter Description' });

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }

  protected async openPage(): Promise<void> {
    // ✅ Required hover
    await this.page.mouse.move(0, 300);

    await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup');
    await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup');
    await this.elementActions.click(this.clientParametersLink, 'Client Parameters');
    await this.elementActions.click(this.arAccountTypeLink, 'AR Account Type');
  }

  protected async fillForm(data: any): Promise<void> {
    await this.elementActions.click(this.codeInput, 'Code input');
    await this.codeInput.fill(data.code);

    await this.elementActions.click(this.descriptionInput, 'Description input');
    await this.descriptionInput.fill(data.description);
  }

  // ✅ Wrapper (same pattern)
  async runARAccountTypeCreateDeleteFlow(): Promise<void> {
    const data = [
      { code: this.generateUniqueCode(), description: 'AUTOMATION' },
      { code: this.generateUniqueCode(), description: 'AUTOMATION' },
      { code: this.generateUniqueCode(), description: 'AUTOMATION' }
    ];

    await this.runCrudFlow(data, 'AUTOMATION');
  }
}