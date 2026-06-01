import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export interface SelectedFilterProperty {
  code: string;
  name: string;
  rawText: string;
}

export class BookingCalendarFilterPropertyValidationPage extends BasePage {
  private readonly elementActions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  private get frontDeskLink(): Locator {
    return this.page.getByRole('link', { name: /Front Desk/i });
  }

  private get bookingCalendarLink(): Locator {
    return this.page.getByRole('link', { name: /Booking Calendar/i });
  }

  private get dismissPopupCross(): Locator {
    return this.page.getByText('×').first();
  }

  private get filterButton(): Locator {
    return this.page.locator('button:has(i.mdi-filter), button[title*="Filter"], button:has(i.bx-filter)').first();
  }

  private get propertyFieldContainer(): Locator {
    return this.page.locator('div').filter({ hasText: /^Property Id\*/i }).first();
  }

  private get propertyTextbox(): Locator {
    return this.propertyFieldContainer.locator('ng-select').first().getByRole('textbox');
  }

  private get propertySelect(): Locator {
    return this.propertyFieldContainer.locator('ng-select').first();
  }

  private get searchButton(): Locator {
    return this.page.getByRole('button', { name: 'Search' });
  }

  private get topBar(): Locator {
    return this.page.locator('#page-topbar');
  }

  private get topPropertyTitle(): Locator {
    return this.page.locator('#page-topbar h5, #page-topbar h6, #page-topbar .header-item .fw-bold').first();
  }

  private get stickyRoomLabel(): Locator {
    return this.page.locator('div.sticky-col.room-label .stick-col-text-wid').first();
  }

  private get calendarViewport(): Locator {
    return this.page.locator('cdk-virtual-scroll-viewport, .cdk-virtual-scroll-viewport').first();
  }

  async navigateToBookingCalendar(): Promise<void> {
    logger.info('Navigating to Front Desk -> Booking Calendar');
    await this.elementActions.click(this.frontDeskLink, 'Front Desk menu');
    await this.elementActions.click(this.bookingCalendarLink, 'Booking Calendar menu');

    if (await this.dismissPopupCross.isVisible().catch(() => false)) {
      await this.elementActions.click(this.dismissPopupCross, 'Dismiss popup cross button');
    }

    await expect(this.page.getByRole('heading', { name: /Booking Calendar/i })).toBeVisible();
  }

  async openFilter(): Promise<void> {
    logger.info('Opening booking calendar filter panel');
    await this.elementActions.click(this.filterButton, 'Filter button');
    await expect(this.propertyTextbox).toBeVisible();
  }

  async selectPropertyAndCaptureValue(propertyQuery: string): Promise<SelectedFilterProperty> {
    logger.info(`Selecting property from filter using query: ${propertyQuery}`);
    await this.elementActions.click(this.propertyTextbox, 'Property filter textbox');
    await this.deselectPropertyUsingCross();
    await this.clearExistingPropertySelection();

    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await this.propertyTextbox.fill(propertyQuery);

    const option = this.page
      .locator('.ng-dropdown-panel .ng-option, [role="option"]')
      .filter({ hasText: new RegExp(propertyQuery, 'i') })
      .first();

    let selectedRawFromOption = '';

    if (await option.isVisible().catch(() => false)) {
      selectedRawFromOption = this.normalizeText(await option.innerText());
      await this.elementActions.click(option, `Property option matching ${propertyQuery}`);
    } else {
      await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('Enter');
    }

    const selectedRaw = selectedRawFromOption || (await this.getSelectedPropertyTextFromDropdown());
    const selectedProperty = this.parseSelectedProperty(selectedRaw, propertyQuery);

    logger.info(
      `Captured selected property from filter. Code: ${selectedProperty.code}, Name: ${selectedProperty.name}`
    );

    return selectedProperty;
  }

  async selectRandomPropertyAndCaptureValue(excludedTerms: string[] = []): Promise<SelectedFilterProperty> {
    logger.info('Selecting random property from filter');
    await this.elementActions.click(this.propertyTextbox, 'Property filter textbox');
    await this.deselectPropertyUsingCross();
    await this.clearExistingPropertySelection();

    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await this.page.waitForTimeout(300);

    const availableOptions = await this.getVisiblePropertyOptions();
    const excludedValues = excludedTerms.map((value) => this.normalizeText(value).toLowerCase()).filter(Boolean);

    const filteredOptions = availableOptions.filter((option) => {
      const normalizedText = option.text.toLowerCase();
      return !excludedValues.some((excludedValue) => normalizedText.includes(excludedValue));
    });

    const choicePool = filteredOptions.length > 0 ? filteredOptions : availableOptions;
    if (choicePool.length === 0) {
      throw new Error('No property options are available for random selection');
    }

    const randomChoice = choicePool[Math.floor(Math.random() * choicePool.length)];
    await this.elementActions.click(randomChoice.locator, `Random property option ${randomChoice.text}`);

    const selectedRaw = randomChoice.text || (await this.getSelectedPropertyTextFromDropdown());
    const selectedProperty = this.parseSelectedProperty(selectedRaw, randomChoice.text);

    logger.info(
      `Captured random property from filter. Code: ${selectedProperty.code}, Name: ${selectedProperty.name}`
    );

    return selectedProperty;
  }

  async clickSearch(): Promise<void> {
    logger.info('Applying filter by clicking Search');
    await this.elementActions.click(this.searchButton, 'Filter Search button');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1500);
  }

  async validatePropertyOnBookingCalendar(selectedProperty: SelectedFilterProperty): Promise<void> {
    logger.info('Validating selected property on booking calendar main page');

    const normalizedCode = this.normalizeText(selectedProperty.code);
    const normalizedName = this.normalizeText(selectedProperty.name);

    if (normalizedCode) {
      const propertyIdRegex = new RegExp(
        `Property\\s*Id\\s*:\\s*.*\\b${this.escapeRegex(normalizedCode)}\\b`,
        'i'
      );
      await expect(this.page.getByText(propertyIdRegex).first()).toBeVisible();
    }

    await expect(this.stickyRoomLabel).toContainText(new RegExp(this.escapeRegex(normalizedName), 'i'));

    if (await this.topPropertyTitle.isVisible().catch(() => false)) {
      await expect(this.topPropertyTitle).toBeVisible();
    } else {
      await expect(this.topBar).toBeVisible();
    }

    logger.info(`Property validation passed for code ${normalizedCode} and name ${normalizedName}`);
  }

  private parseSelectedProperty(rawText: string, fallbackQuery: string): SelectedFilterProperty {
    const sanitized = this.normalizeText(rawText.replace('Property Id*', '').replace(/×/g, ' '));

    const parts = sanitized.split(' ').filter(Boolean);
    const firstToken = parts[0] ?? '';
    const isCodeLikeToken = /^[A-Z0-9]{4,}$/.test(firstToken);

    const fallback = this.normalizeText(fallbackQuery).toUpperCase();
    const fallbackIsCodeLike = /^[A-Z0-9]{4,}$/.test(fallback);

    const code = isCodeLikeToken ? firstToken : fallbackIsCodeLike ? fallback : '';

    const nameFromRaw = code
      ? this.normalizeText(sanitized.replace(new RegExp(`^${this.escapeRegex(code)}\\s*`), '').trim())
      : sanitized;
    const name = nameFromRaw || this.normalizeText(fallbackQuery);

    return {
      code,
      name,
      rawText: sanitized
    };
  }

  private async getSelectedPropertyTextFromDropdown(): Promise<string> {
    const valueLabels = this.propertySelect.locator('.ng-value-label');
    const labelsCount = await valueLabels.count();

    if (labelsCount > 0) {
      const labelTexts: string[] = [];
      for (let index = 0; index < labelsCount; index += 1) {
        const text = this.normalizeText(await valueLabels.nth(index).innerText());
        if (text) {
          labelTexts.push(text);
        }
      }

      if (labelTexts.length > 0) {
        return this.normalizeText(labelTexts.join(' '));
      }
    }

    return this.normalizeText(await this.propertySelect.innerText());
  }

  private async getVisiblePropertyOptions(): Promise<Array<{ locator: Locator; text: string }>> {
    const optionLocator = this.page.locator('.ng-dropdown-panel .ng-option, [role="option"]');
    const optionCount = await optionLocator.count();
    const options: Array<{ locator: Locator; text: string }> = [];

    for (let index = 0; index < optionCount; index += 1) {
      const locator = optionLocator.nth(index);
      if (!(await locator.isVisible().catch(() => false))) {
        continue;
      }

      const text = this.normalizeText(await locator.innerText());
      if (text) {
        options.push({ locator, text });
      }
    }

    return options;
  }

  private async clearExistingPropertySelection(): Promise<void> {
    const removeButtons = this.propertySelect.locator('.ng-value-icon.left, .ng-clear-wrapper');

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const count = await removeButtons.count();
      if (count === 0) {
        return;
      }

      await removeButtons.first().click();
      await this.page.waitForTimeout(150);
    }
  }

  private async deselectPropertyUsingCross(): Promise<void> {
    // First clear existing selection using the visible "×" token, as required by the UI flow.
    const propertyScopedCross = this.propertyFieldContainer.getByText('×').first();
    const globalCross = this.page.getByText('×').first();

    if (await propertyScopedCross.isVisible().catch(() => false)) {
      await propertyScopedCross.click();
      await this.page.waitForTimeout(150);
      return;
    }

    if (await globalCross.isVisible().catch(() => false)) {
      await globalCross.click();
      await this.page.waitForTimeout(150);
    }
  }

  private normalizeText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}