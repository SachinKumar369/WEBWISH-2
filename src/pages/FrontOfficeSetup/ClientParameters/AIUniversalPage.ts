import { BrowserContext, expect, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';
import { randomUUID } from 'crypto';

type ScreenType = 'CRUD' | 'FORM' | 'TABLE' | 'UNKNOWN';

export class AIUniversalPage extends BasePage {
  private readonly ea: ElementActions;

  // Navigation
  private readonly frontOfficeSetup = this.page.getByRole('link', { name: ' FrontOffice Setup' });
  private readonly parameterSetup = this.page.getByRole('link', { name: 'Parameter Setup' });

  // Common controls
  private readonly addBtn = this.page.locator('.btn.btn-sm.waves-effect.waves-light').first();
  private readonly saveBtn = this.page.getByRole('button', { name: 'Save', exact: true });
  private readonly saveNewBtn = this.page.getByRole('button', { name: 'Save & Add New' });
  private readonly updateBtn = this.page.getByRole('button', { name: 'Update' });
  private readonly deleteBtn = this.page.getByRole('button', { name: 'Delete' });

  private readonly popup = this.page.locator('#swal2-html-container');
  private readonly okBtn = this.page.getByRole('button', { name: 'OK' });
  private readonly yesBtn = this.page.getByRole('button', { name: 'Yes' });

  private readonly activeSwitch = this.page.getByRole('switch', { name: 'Active' });

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.ea = new ElementActions(page);
  }

  // ---------- Utils ----------
  private gen(): string {
    return randomUUID().replace(/-/g, '').slice(0, 8);
  }

  private async popupOK(text?: string) {
    if (text) await expect(this.popup).toContainText(text);
    await this.ea.click(this.okBtn, 'Popup OK');
  }

  private async popupYES(text?: string) {
    if (text) await expect(this.popup).toContainText(text);
    await this.ea.click(this.yesBtn, 'Popup Yes');
  }

  private async resolveSearch() {
    const candidates = [
      this.page.locator('#customerList').getByPlaceholder('Search').first(),
      this.page.getByPlaceholder('Search').first(),
      this.page.locator("#customerList input[placeholder='Search']").first(),
      this.page.locator('#customerList input').first()
    ];
    for (const c of candidates) {
      if (await c.count()) {
        await c.waitFor({ state: 'visible', timeout: 10000 });
        return c;
      }
    }
    throw new Error('Search input not found');
  }

  private async ensureInactive() {
    if ((await this.activeSwitch.count()) && await this.activeSwitch.isChecked()) {
      await this.ea.click(this.activeSwitch, 'Deactivate');
    }
  }

  // ---------- Detection ----------
  private async detect(): Promise<ScreenType> {
    const code = await this.page.getByRole('textbox', { name: 'Enter Code' }).count();
    const desc = await this.page.getByRole('textbox', { name: 'Enter Description' }).count();
    const table = await this.page.locator('#customerList').count();
    const inputs = await this.page.locator('input').count();

    if (code && desc) return 'CRUD';
    if (inputs > 2) return 'FORM';
    if (table) return 'TABLE';
    return 'UNKNOWN';
  }

  // ---------- Smart Form ----------
  private valueFor(label: string): string {
    const l = label.toLowerCase();
    if (l.includes('time')) return '10:00 AM';
    if (l.includes('date')) return '01/01/2025';
    return `AUTO_${Date.now().toString().slice(-5)}`;
  }

  private async fillSmartForm() {
    const labels = this.page.locator('label');
    const n = await labels.count();

    for (let i = 0; i < n; i++) {
      const lbl = labels.nth(i);
      const text = (await lbl.innerText()).trim();

      const input = lbl.locator('xpath=following::input[1]');
      if (!(await input.count())) continue;

      try {
        await input.fill(this.valueFor(text));
      } catch {
        logger.info(`Skip field: ${text}`);
      }
    }
  }

  // ---------- CRUD ----------
  private async crudFlow() {
    const data = [
      { code: this.gen(), description: 'AUTOMATION' },
      { code: this.gen(), description: 'AUTOMATION' },
      { code: this.gen(), description: 'AUTOMATION' }
    ];

    // 1st
    await this.ea.click(this.addBtn, 'Add');
    await this.page.getByRole('textbox', { name: 'Enter Code' }).fill(data[0].code);
    await this.page.getByRole('textbox', { name: 'Enter Description' }).fill(data[0].description);
    await this.ea.click(this.saveBtn, 'Save');
    await this.popupOK('Details created/updated successfully.');

    // 2nd
    await this.ea.click(this.addBtn, 'Add');
    await this.page.getByRole('textbox', { name: 'Enter Code' }).fill(data[1].code);
    await this.page.getByRole('textbox', { name: 'Enter Description' }).fill(data[1].description);
    await this.ea.click(this.saveNewBtn, 'Save & Add New');
    await this.popupOK('Details created/updated successfully.');

    // 3rd
    await this.page.getByRole('textbox', { name: 'Enter Code' }).fill(data[2].code);
    await this.page.getByRole('textbox', { name: 'Enter Description' }).fill(data[2].description);
    await this.ea.click(this.saveBtn, 'Save');
    await this.popupOK('Details created/updated successfully.');

    // Delete loop
    const search = await this.resolveSearch();
    while (true) {
      await this.ea.click(search, 'Search');
      await search.fill('');
      await search.type('AUTOMATION');
      await search.press('Enter');

      const row = this.page.locator('#customerList tbody tr').filter({ hasText: 'AUTOMATION' }).first();
      if (!(await row.count())) break;

      await row.locator('.bx-edit-alt').first().click();
      await this.ensureInactive();

      await this.ea.click(this.updateBtn, 'Update');
      await this.popupOK('Details created/updated successfully.');

      await this.ea.click(this.deleteBtn, 'Delete');
      await this.popupYES('Do you want to delete the selected record?');
      await this.popupOK('Data Deleted Successfully.');
    }
  }

  // ---------- Navigation ----------
  private async openRoot() {
    await this.page.mouse.move(0, 300);
    await this.ea.click(this.frontOfficeSetup, 'FrontOffice Setup');
    await this.ea.click(this.parameterSetup, 'Parameter Setup');
  }

  private async getModules(): Promise<string[]> {
    const items = this.page.locator('a.menu-module span');
    const n = await items.count();
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const t = (await items.nth(i).innerText()).trim();
      if (t) out.push(t);
    }
    return out;
  }

  private async expand(module: string) {
    const m = this.page.locator('a').filter({ hasText: module }).first();
    await this.ea.click(m, module);
    await this.page.waitForTimeout(500);
  }

  private async getSubMenus(): Promise<string[]> {
    const items = this.page.locator('a.menu-screen span');
    const n = await items.count();
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const t = (await items.nth(i).innerText()).trim();
      if (t) out.push(t);
    }
    return out;
  }

  private async openScreen(name: string) {
    const el = this.page.locator('a').filter({ hasText: name }).first();
    await this.ea.click(el, name);
  }

  // ---------- MASTER RUN ----------
 async runAll() {
  await this.openRoot();

  const modules = await this.getModules();

  for (const mod of modules) {
    logger.info(`Module: ${mod}`);

    try {
      await this.expand(mod);
    } catch (e) {
      logger.error(`Failed to expand module: ${mod} → ${e}`);
      continue; // ✅ move to next module
    }

    const subs = await this.getSubMenus();

    for (const sub of subs) {

      logger.info(`Screen: ${sub}`);

      try {
        await this.openScreen(sub);

        const type = await this.detect();
        logger.info(`Detected: ${type}`);

        if (type === 'CRUD') {
          await this.crudFlow();
        }
        else if (type === 'FORM') {
          await this.ea.click(this.addBtn, 'Add');
          await this.fillSmartForm();
          await this.ea.click(this.saveBtn, 'Save');
          await this.popupOK();
        }
        else {
          logger.info(`Skipping unsupported screen: ${sub}`);
        }

      } catch (err) {
        logger.error(`❌ Failed on screen: ${sub} → ${err}`);

        // ✅ Take screenshot for debugging
        await this.page.screenshot({
          path: `screenshots/error_${sub.replace(/\s/g, '_')}.png`,
          fullPage: true
        });

        // ✅ Continue execution
        continue;
      }
    }
  }
}
}