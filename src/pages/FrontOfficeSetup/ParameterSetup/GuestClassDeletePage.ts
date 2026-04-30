import { expect, BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import logger from '../../../core/Logger';
import { ElementActions } from '../../../utils/ElementActions';

export class GuestClassDeletePage extends BasePage {
  private readonly elementActions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  private getListSearchInput() {
    return this.page.locator('input[placeholder="Search"]').first();
  }

  private getRowsByText(text: string) {
    return this.page.locator('tbody tr').filter({ hasText: new RegExp(text, 'i') });
  }

  private async clickRowEditButton(rowLocator: ReturnType<Page['locator']>): Promise<void> {
    const editCandidates = [
      rowLocator.locator("xpath=.//i[contains(@class,'edit') or contains(@class,'pencil') or contains(@class,'bx-edit-alt')]").first(),
      rowLocator.locator("xpath=.//button[.//i[contains(@class,'edit') or contains(@class,'pencil') or contains(@class,'bx-edit-alt')]]").first(),
      rowLocator.locator("xpath=.//a[.//i[contains(@class,'edit') or contains(@class,'pencil') or contains(@class,'bx-edit-alt')]]").first(),
      rowLocator.locator('i').first()
    ];

    for (const candidate of editCandidates) {
      if ((await candidate.count()) === 0) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded();
      await this.elementActions.click(candidate, 'Edit Guest Class row button');
      return;
    }

    throw new Error('Edit Guest Class row button not found for matching row');
  }

  private async expectPopupAndConfirm(expectedText: string, confirmLabel: 'OK' | 'Yes'): Promise<void> {
    await expect(this.page.locator('#swal2-html-container')).toContainText(expectedText);
    await this.elementActions.click(this.page.getByRole('button', { name: confirmLabel }), `Popup ${confirmLabel} button`);
  }

  private async ensureActiveOff(): Promise<void> {
    const modal = this.page.locator('ngb-modal-window').last();

    const activeCheckbox = modal
      .locator(
        "input#actv[type='checkbox'], input[type='checkbox'][role='switch'], input[type='checkbox'][formcontrolname*='active' i], input[type='checkbox'][name*='active' i]"
      )
      .first();
    if (await activeCheckbox.count()) {
      if (await activeCheckbox.isChecked()) {
        await activeCheckbox.uncheck();
      } else {
        await activeCheckbox.click();
        await activeCheckbox.uncheck();
      }
      return;
    }

    const activeSwitch = modal.getByRole('switch', { name: /Active/i }).first();
    if (await activeSwitch.count()) {
      const isChecked = await activeSwitch.getAttribute('aria-checked');
      if (isChecked === 'true') {
        await this.elementActions.click(activeSwitch, 'Active switch off');
        await expect(activeSwitch).toHaveAttribute('aria-checked', 'false');
      }
    }
  }

  async openGuestClassPage(): Promise<void> {
    logger.info('Opening FrontOffice Setup > Parameter Setup > Guest Class');

    await this.page.mouse.move(0, 300);
    await this.elementActions.click(this.page.getByRole('link', { name: ' FrontOffice Setup' }), 'FrontOffice Setup link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Parameter Setup' }), 'Parameter Setup link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Guest Class' }), 'Guest Class link');
  }

  async deleteAllAutomationGuestClasses(searchText: string = 'automation'): Promise<void> {
    logger.info(`Deleting Guest Class records matching: ${searchText}`);

    let loops = 0;
    while (loops < 50) {
      loops += 1;

      const searchInput = this.getListSearchInput();
      await this.elementActions.click(searchInput, 'Guest Class search input');
      await searchInput.fill('');
      await searchInput.fill(searchText);

      const rows = this.getRowsByText(searchText);
      if ((await rows.count()) === 0) {
        logger.info('No more matching Guest Class records found');
        break;
      }

      const row = rows.first();
      await this.clickRowEditButton(row);

      await this.ensureActiveOff();
      await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update Guest Class button');
      await this.expectPopupAndConfirm('Details created/updated successfully.', 'OK');

      await this.elementActions.click(this.page.getByRole('button', { name: 'Delete' }), 'Delete Guest Class button');
      await this.expectPopupAndConfirm('Do you want to delete the selected record?', 'Yes');
      await this.expectPopupAndConfirm('Data Deleted Successfully.', 'OK');
    }

    if (loops >= 50) {
      throw new Error('Stopped after 50 delete attempts to avoid an infinite loop.');
    }
  }
}
