// import { BrowserContext, Page } from '@playwright/test';
// import { BaseCrudPage } from '../../FrontOfficeSetup/ClientParameters/BaseCrudPage';

// export class MessagesPage extends BaseCrudPage {

//   private readonly frontOfficeSetupLink = this.page.locator('a').filter({ hasText: 'FrontOffice Setup' });
//   private readonly parameterSetupLink = this.page.locator('a').filter({ hasText: 'Parameter Setup' });
//   private readonly messagesLink = this.page.locator('a').filter({ hasText: 'Messages' });

//   private readonly codeInput = this.page.getByRole('textbox', { name: 'Enter Code' });
//   private readonly descriptionInput = this.page.getByRole('textbox', { name: 'Enter Description' });

//   private isFirstTime = true;

//   constructor(page: Page, context: BrowserContext) {
//     super(page, context);
//   }

//   // ================= OPEN PAGE (SMART NAVIGATION) =================
//   protected async openPage(): Promise<void> {

//     // First time → full navigation
//     if (this.isFirstTime) {

//       await this.page.mouse.move(0, 300);

//       await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup');
//       await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup');
//       await this.elementActions.click(this.messagesLink, 'Messages');

//       this.isFirstTime = false;
//       return;
//     }

//     // Next iterations → only hover
//     await this.page.mouse.move(0, 300);
//   }

//   // ================= GET ALL SCREENS =================
//   private async getAllScreens(): Promise<string[]> {

//     const elements = this.page.locator('ul.nav.nav-sm.flex-column.show span.text-capitalize');

//     const count = await elements.count();
//     const screens: string[] = [];

//     for (let i = 0; i < count; i++) {
//       const text = (await elements.nth(i).innerText()).trim();
//       if (text) screens.push(text);
//     }

//     return screens;
//   }

//   // ================= FORM =================
//   protected async fillForm(data: any): Promise<void> {

//     await this.elementActions.click(this.codeInput, 'Code');
//     await this.codeInput.fill(data.code);

//     await this.elementActions.click(this.descriptionInput, 'Description');
//     await this.descriptionInput.fill(data.description);
//   }

//   // ================= MAIN FLOW =================
//   async runFlowForAllScreens(): Promise<void> {

//     // First open (needed to load menu)
//     await this.openPage();

//     const screens = await this.getAllScreens();

//     for (const screen of screens) {

//       if (!screen || screen.length < 3) continue;

//       // Click submenu screen
//       const menu = this.page.locator('a').filter({ hasText: screen });
//       await this.elementActions.click(menu, screen);

//       const data = [
//         { code: this.generateUniqueCode(), description: 'AUTOMATION' },
//         { code: this.generateUniqueCode(), description: 'AUTOMATION' },
//         { code: this.generateUniqueCode(), description: 'AUTOMATION' }
//       ];

//       await this.runCrudFlow(data, 'AUTOMATION');
//     }
//   }
// }

import { BrowserContext, Page } from '@playwright/test';
import { BaseCrudPage } from '../../FrontOfficeSetup/ClientParameters/BaseCrudPage';

export class MessagesPage extends BaseCrudPage {

  private readonly frontOfficeSetupLink = this.page.locator('a').filter({ hasText: 'FrontOffice Setup' });
  private readonly parameterSetupLink = this.page.locator('a').filter({ hasText: 'Parameter Setup' });
  private readonly messagesLink = this.page.locator('a').filter({ hasText: 'Messages' });

  private readonly codeInput = this.page.getByRole('textbox', { name: 'Enter Code' });
  private readonly descriptionInput = this.page.getByRole('textbox', { name: 'Enter Description' });

  private readonly screenName: string;
  private isFirstTime = true;

  constructor(page: Page, context: BrowserContext, screenName: string) {
    super(page, context);
    this.screenName = screenName;
  }

  // ================= OPEN PAGE =================
  protected async openPage(): Promise<void> {

    if (this.isFirstTime) {

      await this.page.mouse.move(0, 300);

      await this.elementActions.click(this.frontOfficeSetupLink, 'FrontOffice Setup');
      await this.elementActions.click(this.parameterSetupLink, 'Parameter Setup');
      await this.elementActions.click(this.messagesLink, 'Messages');

      this.isFirstTime = false;
    } else {
      // Only hover for next usage
      await this.page.mouse.move(0, 300);
    }

    // Always click target screen
    const menu = this.page.locator('a').filter({ hasText: this.screenName });
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