import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export interface RateManagerData {
  rateCode: string;
  publishedRackRateArrowDowns: number;
  rateCategoryArrowDowns: number;
  description: string;
  notes: string;
  marketSegmentKeys: Array<'ArrowDown' | 'ArrowUp'>;
  closeAfterSave?: boolean;
}

export class RateManagerPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly managerFunctionsLink: Locator;
  private readonly rateManagerLink: Locator;
  private readonly newRateButton: Locator;
  private readonly saveButton: Locator;
  private readonly okButton: Locator;
  private readonly successMessage: Locator;
  private readonly closeButton: Locator;
  private readonly postSaveButtons: Locator;
  private readonly rateCodeInputLocator: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    this.rateCodeInputLocator = this.page.getByText('Code Already Exists');
    this.managerFunctionsLink = this.page.getByRole('link', { name: ' Manager Functions' });
    this.rateManagerLink = this.page.getByRole('link', { name: ' Rate Manager' });
    this.newRateButton = this.page.getByRole('button', { name: '󰐕 New Rate' });
    this.saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
    this.okButton = this.page.getByRole('button', { name: 'OK' });
    this.successMessage = this.page.getByRole('paragraph');
    this.closeButton = this.page.getByRole('button', { name: 'Close' });
    this.postSaveButtons = this.page.locator('.button-container > button');
  }

  rateCodeInput(): Locator {
    return this.page.getByRole('textbox').first();
  }

  publishedRackRateInput(): Locator {
    return this.page.getByRole('textbox').nth(1);
  }

  rateCategoryInput(): Locator {
    return this.page.getByRole('textbox').nth(2);
  }

  descriptionInput(): Locator {
    return this.page.getByRole('textbox').nth(3);
  }

  getTextArea(): Locator {
    return this.page.locator('textarea');
  }

  getMarketSegmentInput(): Locator {
    return this.page.getByRole('combobox').nth(2);
  }

  getSaveButton(): Locator {
    return this.saveButton;
  }

  getOkButton(): Locator {
    return this.okButton;
  }

  getNewRateButton(): Locator {
    return this.newRateButton;
  }

  private async selectByArrowDown(dropdown: Locator, arrowDownCount: number, fieldName: string): Promise<void> {
    await this.elementActions.click(dropdown, `${fieldName} dropdown`);

    for (let index = 0; index < arrowDownCount; index++) {
      await this.page.keyboard.press('ArrowDown');
    }

    await this.page.keyboard.press('Enter');
  }

  private async selectByKeySequence(dropdown: Locator, keySequence: Array<'ArrowDown' | 'ArrowUp'>, fieldName: string): Promise<void> {
    await this.elementActions.click(dropdown, `${fieldName} dropdown`);

    for (const key of keySequence) {
      await this.page.keyboard.press(key);
    }

    await this.page.keyboard.press('Enter');
  }

  async openRateManagerFromManagerFunctions(): Promise<void> {
    logger.info('Opening Rate Manager from Manager Functions');

    await this.page.mouse.move(0,400);

    await this.elementActions.click(this.managerFunctionsLink, 'Manager Functions link');
    await this.elementActions.click(this.rateManagerLink, 'Rate Manager link');
  }

  async createNewRate1(rateData: RateManagerData): Promise<void> {
    logger.info(`Creating rate with code ${rateData.rateCode}`);

    await this.elementActions.click(this.newRateButton, 'New Rate button');

    await this.elementActions.click(this.rateCodeInput(), 'Rate code input');
    await this.elementActions.sendKeys(this.rateCodeInput(), rateData.rateCode, 'Rate code input');

    await this.selectByArrowDown(this.publishedRackRateInput(), rateData.publishedRackRateArrowDowns, 'Published rack rate');
    await this.selectByArrowDown(this.rateCategoryInput(), rateData.rateCategoryArrowDowns, 'Rate category');

    await this.elementActions.click(this.descriptionInput(), 'Description input');
    await this.elementActions.sendKeys(this.descriptionInput(), rateData.description, 'Description input');

    await this.elementActions.click(this.getTextArea(), 'Rate notes textarea');
    await this.elementActions.sendKeys(this.getTextArea(), rateData.notes, 'Rate notes textarea');

    await this.selectByKeySequence(this.getMarketSegmentInput(), rateData.marketSegmentKeys, 'Market segment');

    await this.elementActions.click(this.saveButton, 'Save button');
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'Success dialog OK button');

    if (rateData.closeAfterSave) {
      await this.closeRate();
    }
  }

  async createNewRate(rateData: RateManagerData): Promise<void> {
  logger.info(`Creating rate with code ${rateData.rateCode}`);

  await this.elementActions.click(this.newRateButton, 'New Rate button');

  let currentRateCode = Number(rateData.rateCode);

  while (true) {
    await this.elementActions.click(this.rateCodeInput(), 'Rate code input');

    await this.rateCodeInput().clear();
    await this.elementActions.sendKeys(
      this.rateCodeInput(),
      currentRateCode.toString(),
      'Rate code input'
    );

    logger.info(`Trying Rate Code : ${currentRateCode}`);

    // Trigger validation by moving to next field
    await this.elementActions.click(
      this.publishedRackRateInput(),
      'Published Rack Rate input'
    );

    const duplicateMessage = this.page.getByText('Code Already Exists');

    try {
      await duplicateMessage.waitFor({
        state: 'visible',
        timeout: 2000
      });

      logger.info(`Rate Code ${currentRateCode} already exists`);

      await this.elementActions.click(
        this.okButton,
        'Duplicate Code OK button'
      );

      currentRateCode++;

      logger.info(`Trying next Rate Code : ${currentRateCode}`);
    } catch {
      logger.info(`Rate Code ${currentRateCode} is unique`);
      rateData.rateCode = currentRateCode.toString();
      break;
    }
  }

  await this.selectByArrowDown(
    this.publishedRackRateInput(),
    rateData.publishedRackRateArrowDowns,
    'Published rack rate'
  );

  await this.selectByArrowDown(
    this.rateCategoryInput(),
    rateData.rateCategoryArrowDowns,
    'Rate category'
  );

  await this.elementActions.click(
    this.descriptionInput(),
    'Description input'
  );

  await this.elementActions.sendKeys(
    this.descriptionInput(),
    rateData.description,
    'Description input'
  );

  await this.elementActions.click(
    this.getTextArea(),
    'Rate notes textarea'
  );

  await this.elementActions.sendKeys(
    this.getTextArea(),
    rateData.notes,
    'Rate notes textarea'
  );

  await this.selectByKeySequence(
    this.getMarketSegmentInput(),
    rateData.marketSegmentKeys,
    'Market segment'
  );

  await this.elementActions.click(
    this.saveButton,
    'Save button'
  );

  await expect(this.successMessage).toContainText(
    'Details created/updated successfully.'
  );

  await this.elementActions.click(
    this.okButton,
    'Success dialog OK button'
  );

  if (rateData.closeAfterSave) {
    await this.closeRate();
  }
}

  async closeRate(): Promise<void> {
    logger.info('Closing Rate Manager screen');

    const secondaryButton = this.postSaveButtons.nth(1);
    if (await secondaryButton.isVisible().catch(() => false)) {
      await this.elementActions.click(secondaryButton, 'Secondary post-save button');
    }

    if (await this.closeButton.isVisible().catch(() => false)) {
      await this.elementActions.click(this.closeButton, 'Close button');
    }
  }

  async runRateManagerCreateFlow(rateData: RateManagerData): Promise<void> {
    await this.openRateManagerFromManagerFunctions();
    await this.createNewRate(rateData);
  }

  async runManagerRateFlowStep1(rateData: RateManagerData): Promise<void> {
    await this.runRateManagerCreateFlow(rateData);
  }
}