import { BrowserContext, Page } from '@playwright/test';
import { BaseCrudPage } from '../../FrontOfficeSetup/ClientParameters/BaseCrudPage';

export class ProfilesPage extends BaseCrudPage {

  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: 'Parameter Setup' });
  private readonly profilesLink = this.page.getByRole('link', { name: 'Profiles' });

  private readonly codeInput = this.page.getByRole('textbox', { name: 'Enter Code' });
  private readonly descriptionInput = this.page.getByRole('textbox', { name: 'Enter Description' });

  private readonly screenName: string;
  private isFirstTime = true;

  constructor(page: Page, context: BrowserContext, screenName: string) {
    super(page, context);
    this.screenName = screenName;
  }

  // ================= NAVIGATION =================
  protected async openPage(): Promise<void> {

    if (this.isFirstTime) {

      await this.page.mouse.move(0, 300);

      await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup');
      await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup');
      await this.elementActions.click(this.profilesLink, 'Profiles');

      this.isFirstTime = false;
    } else {
      await this.page.mouse.move(0, 300);
    }

    const menu = this.page.getByRole('link', { name: this.screenName });
    await this.elementActions.click(menu, this.screenName);
  }

  // ================= FORM =================
  protected async fillForm(data: any): Promise<void> {

    await this.elementActions.click(this.codeInput, 'Code');
    await this.codeInput.fill(data.code);

    await this.elementActions.click(this.descriptionInput, 'Description');
    await this.descriptionInput.fill(data.description);
  }

  // ================= FLOW =================
  async runFlow(): Promise<void> {

    const data = [
      { code: this.generateUniqueCode(), description: 'AUTOMATION' },
      { code: this.generateUniqueCode(), description: 'AUTOMATION' },
      { code: this.generateUniqueCode(), description: 'AUTOMATION' }
    ];

    await this.runCrudFlow(data, 'AUTOMATION');
  }
}