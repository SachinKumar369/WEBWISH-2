import { BrowserContext, Page } from '@playwright/test';
import { BaseCrudPage } from '../../FrontOfficeSetup/ClientParameters/BaseCrudPage';

export class MisGroupPage extends BaseCrudPage {

  private readonly frontOfficeSetupLink = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.getByRole('link', { name: 'Parameter Setup' });
  private readonly misGroupLink = this.page.getByRole('link', { name: 'MIS Group' });

  private readonly codeInput = this.page.getByRole('textbox', { name: 'Enter Code' });
  private readonly descriptionInput = this.page.getByRole('textbox', { name: 'Enter Description' });

  private readonly checkAll = this.page.locator('#checkAll');
  private readonly bulkDeleteButton = this.page.locator('.btn.btn-sm.waves-effect.waves-light.py-0.px-2.btn-soft-danger');

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
      await this.elementActions.click(this.misGroupLink, 'MIS Group');

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

  // ================= OVERRIDE DELETE (FIXED VISIBILITY) =================
  async deleteAll(searchText: string): Promise<void> {

    const searchInput = await this.resolveSearchInput();

    await this.elementActions.click(searchInput, 'Search');
    await searchInput.fill('');
    await searchInput.fill(searchText);

    await this.page.waitForTimeout(500);

    // Select all rows
    if ((await this.checkAll.count()) > 0) {
      await this.elementActions.click(this.checkAll, 'Select All Checkbox');
    }

    // Click bulk delete
    await this.elementActions.click(this.bulkDeleteButton, 'Bulk Delete Button');

    await this.expectAndConfirmPopup('Do you want to delete the selected record?', 'Yes');
    await this.expectAndConfirmPopup('Data Deleted Successfully.', 'OK');
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