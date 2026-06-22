import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import { GlobalSearchPage } from '../GlobalSearch/GlobalSearchPage';
import logger from '../../core/Logger';

export interface PasswordPolicyData {
  minimumLength: string;
  passwordHistory: string;
  expiryDays: string;
  alertDays: string;
  lockAfterAttempts: string;
  releaseLockMinutes: string;
  maxPasswordLength: string;
  minUpperCase: string;
  minLowerCase: string;
  minNumeric: string;
  minSpecialChar: string;
}

export class PasswordPolicyPage extends BasePage {
  private readonly elementActions: ElementActions;
  private readonly globalSearchPage: GlobalSearchPage;

  // ── Top-level policy textboxes (index-based on the page) ──
  private readonly minimumLengthInput = this.page.getByRole('textbox').nth(0);
  private readonly passwordHistoryInput = this.page.getByRole('textbox').nth(1);
  private readonly expiryDaysInput = this.page.getByRole('textbox').nth(2);
  private readonly alertDaysInput = this.page.getByRole('textbox').nth(3);
  private readonly lockAfterAttemptsInput = this.page.getByRole('textbox').nth(4);
  private readonly releaseLockMinutesInput = this.page.getByRole('textbox').nth(5);

  // ── Toggle switches ──
  private readonly complexPolicySwitch = this.page.getByRole('switch', {
    name: /Apply complex password policy/i,
  });
  private readonly noUserIdSwitch = this.page.getByRole('switch', {
    name: /Password must not contain/i,
  });
  private readonly startWithAlphabetSwitch = this.page.getByRole('switch', {
    name: /Start password with alphabet/i,
  });

  // ── Complex policy section selectors ──
  private readonly complexPolicySection = this.page.locator('#complexpasswordpolicy');

  // ── Action buttons ──
  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });
  private readonly closeButton = this.page.getByRole('button', { name: 'Close' });
  private readonly sectionsButton = this.page.getByRole('button', { name: /Sections/i }).first();
  private readonly passwordPolicyButton = this.page.getByRole('button', { name: /Password Policy/i }).first();
  private readonly popupMessage = this.page.getByRole('paragraph');

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.globalSearchPage = new GlobalSearchPage(page, context);
  }

  // ────────────────────────────────────────────────────────
  //  Navigation
  // ────────────────────────────────────────────────────────

  async openPasswordPolicySection(): Promise<void> {
    logger.info('Opening Property General Setup via topbar search');

    const opened = await this.globalSearchPage.searchAndOpenModuleFromTopbar(
      'property general setup',
      'Property General Setup'
    );

    if (!opened) {
      throw new Error('Could not open Property General Setup from topbar search.');
    }

    await this.elementActions.click(this.sectionsButton, 'Sections button');
    await this.elementActions.click(this.passwordPolicyButton, 'Password Policy button');
  }

  // ────────────────────────────────────────────────────────
  //  Helper – set a textbox value by its nth() index
  // ────────────────────────────────────────────────────────

  private async setTextboxByIndex(
    index: number,
    value: string,
    description: string
  ): Promise<void> {
    const input = this.page.getByRole('textbox').nth(index);
    await this.elementActions.click(input, `${description} input`);
    await input.press('ControlOrMeta+a');
    await input.fill(value);
    logger.info(`Set ${description} = ${value}`);
  }

  // ────────────────────────────────────────────────────────
  //  Top policy fields
  // ────────────────────────────────────────────────────────

  async updateTopPolicyFields(data: PasswordPolicyData): Promise<void> {
    await this.setTextboxByIndex(0, data.minimumLength, 'Minimum password length');
    await this.setTextboxByIndex(1, data.passwordHistory, 'Password history check');
    await this.setTextboxByIndex(2, data.expiryDays, 'Password expiry days');
    await this.setTextboxByIndex(3, data.alertDays, 'Alert user before (days)');
    await this.setTextboxByIndex(4, data.lockAfterAttempts, 'Lock password after attempts');
    await this.setTextboxByIndex(5, data.releaseLockMinutes, 'Release locked password after (min)');
  }

  // ────────────────────────────────────────────────────────
  //  Toggle switches – ensure all are ON
  // ────────────────────────────────────────────────────────

  async ensureAllSwitchesEnabled(): Promise<void> {
    const switches: { locator: Locator; name: string }[] = [
      { locator: this.complexPolicySwitch, name: 'Apply complex password policy' },
      { locator: this.noUserIdSwitch, name: 'Password must not contain user id' },
      { locator: this.startWithAlphabetSwitch, name: 'Start password with alphabet' },
    ];

    for (const sw of switches) {
      const isChecked = await sw.locator.isChecked();

      if (!isChecked) {
        logger.info(`${sw.name} is OFF – enabling it`);
        await this.elementActions.click(sw.locator, `${sw.name} switch`);
        await expect(sw.locator).toBeChecked();
        logger.info(`${sw.name} enabled successfully`);
      } else {
        logger.info(`${sw.name} is already ON`);
      }
    }
  }

  // ────────────────────────────────────────────────────────
  //  Complex policy fields (inside #complexpasswordpolicy)
  // ────────────────────────────────────────────────────────

  async updateComplexPolicyFields(data: PasswordPolicyData): Promise<void> {
    // Selectors follow the same DOM structure shown in the existing PasswordPolicyPage
    const complexInputs = [
      this.complexPolicySection.locator('div:nth-child(3) .col-xxl-1 webwish-input .form-control').first(),
      this.complexPolicySection.locator('div:nth-child(4) .col-xxl-1 webwish-input .form-control').first(),
      this.complexPolicySection.locator('div:nth-child(5) .col-xxl-1 webwish-input .form-control').first(),
      this.complexPolicySection.locator('div:nth-child(6) .col-xxl-1 webwish-input .form-control').first(),
      this.complexPolicySection.locator('div:nth-child(7) .col-xxl-1 webwish-input .form-control').first(),
    ];

    const values = [
      data.maxPasswordLength,
      data.minUpperCase,
      data.minLowerCase,
      data.minNumeric,
      data.minSpecialChar,
    ];

    for (let i = 0; i < complexInputs.length; i++) {
      await this.elementActions.click(complexInputs[i], `Complex policy field ${i + 1}`);
      await complexInputs[i].press('ControlOrMeta+a');
      await complexInputs[i].fill(values[i]);
      logger.info(`Complex policy field ${i + 1} = ${values[i]}`);
    }
  }

  // ────────────────────────────────────────────────────────
  //  Full update flow
  // ────────────────────────────────────────────────────────

  async updatePasswordPolicyAndConfirm(data: PasswordPolicyData): Promise<void> {
    await this.updateTopPolicyFields(data);
    await this.ensureAllSwitchesEnabled();
    await this.updateComplexPolicyFields(data);

    await this.elementActions.click(this.updateButton, 'Update button');
    await expect(this.popupMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Success popup OK button');
  }

  async closePasswordPolicyDialog(): Promise<void> {
    await this.elementActions.click(this.closeButton, 'Close button');
  }
}
