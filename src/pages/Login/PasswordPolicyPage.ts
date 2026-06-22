
import { BrowserContext, expect, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';
import { GlobalSearchPage } from '../GlobalSearch/GlobalSearchPage';

export class PasswordPolicyPage extends BasePage {
  private readonly elementActions: ElementActions;
  private readonly globalSearchPage: GlobalSearchPage;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.globalSearchPage = new GlobalSearchPage(page, context);
  }

  async openPasswordPolicySection(): Promise<void> {
    logger.info('Opening Property General Setup from topbar search');

    const opened = await this.globalSearchPage.searchAndOpenModuleFromTopbar(
      'property general setup',
      'Property General Setup'
    );

    if (!opened) {
      throw new Error('Could not open Property General Setup from topbar search.');
    }

    await this.elementActions.click(this.page.getByRole('button', { name: /Sections/i }).first(), 'Sections button');
    await this.elementActions.click(this.page.getByRole('button', { name: /Password Policy/i }).first(), 'Password Policy button');

    //await expect(this.page.getByText('Password Policy')).toBeVisible();
  }

  private async setTextboxValueByIndex(index: number, value: string, description: string): Promise<void> {
    const input = this.page.getByRole('textbox').nth(index);
    await this.elementActions.click(input, `${description} input`);
    await input.press('ControlOrMeta+a');
    await input.fill(value);
  }

  async updateTopPolicyFields(): Promise<void> {
    await this.setTextboxValueByIndex(0, '1', 'Minimum password length');
    await this.setTextboxValueByIndex(1, '1', 'Password history check');
    await this.setTextboxValueByIndex(4, '1', 'Lock password after failed attempts');
    await this.setTextboxValueByIndex(5, '1', 'Release locked password after');
  }

//   async togglePasswordPolicySwitches(): Promise<void> {
//     const complexPolicy = this.page.getByRole('switch', { name: /Apply complex password policy/i });
//     const noUserId = this.page.getByRole('switch', { name: /Password must not contain/i });
//     const startWithAlphabet = this.page.getByRole('switch', { name: /Start password with alphabet/i });

//     await complexPolicy.uncheck();
//     await complexPolicy.check();

//     await noUserId.uncheck();
//     await noUserId.check();

//     await startWithAlphabet.uncheck();
//     await startWithAlphabet.check();
//   }

async togglePasswordPolicySwitches(): Promise<void> {
  const switches = [
    {
      locator: this.page.getByRole('switch', { name: /Apply complex password policy/i }),
      name: 'Apply complex password policy'
    },
    {
      locator: this.page.getByRole('switch', { name: /Password must not contain/i }),
      name: 'Password must not contain user id'
    },
    {
      locator: this.page.getByRole('switch', { name: /Start password with alphabet/i }),
      name: 'Start password with alphabet'
    }
  ];

  for (const item of switches) {
    const isEnabled = await item.locator.isChecked();

    if (!isEnabled) {
      logger.info(`${item.name} is disabled. Enabling it.`);
      await this.elementActions.click(item.locator, `${item.name} switch`);
      await expect(item.locator).toBeChecked();
      logger.info(`${item.name} enabled successfully`);
    } else {
      logger.info(`${item.name} is already enabled`);
    }
  }
}

  async updateComplexPolicyFields(): Promise<void> {
    const complexSelectors = [
      '#complexpasswordpolicy > div:nth-child(3) > .col-xxl-1 > webwish-input > .form-control',
      '#complexpasswordpolicy > div:nth-child(4) > .col-xxl-1 > webwish-input > .form-control',
      '#complexpasswordpolicy > div:nth-child(5) > .col-xxl-1 > webwish-input > .form-control',
      '#complexpasswordpolicy > div:nth-child(6) > .col-xxl-1 > webwish-input > .form-control',
      'div:nth-child(7) > .col-xxl-1 > webwish-input > .form-control'
    ];

    const values = ['15', '2', '2', '2', '2'];

    for (let index = 0; index < complexSelectors.length; index++) {
      const locator = this.page.locator(complexSelectors[index]).first();
      await this.elementActions.click(locator, `Complex policy field ${index + 1}`);
      await locator.press('ControlOrMeta+a');
      await locator.fill(values[index]);
    }
  }

  async updatePasswordPolicyAndConfirm(): Promise<void> {
    await this.updateTopPolicyFields();
    await this.togglePasswordPolicySwitches();
    await this.updateComplexPolicyFields();

    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update button');
    await expect(this.page.getByRole('paragraph')).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Success popup OK button');
  }
}