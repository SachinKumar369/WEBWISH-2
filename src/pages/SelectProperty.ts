import { Page, BrowserContext } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import { ElementActions } from '../utils/ElementActions';
import logger from '../core/Logger';

export class SelectProperty extends BasePage {
  private elementActions: ElementActions;

  // XPath locator that matches ALL property selection icons/buttons
  // This will get all instances: [0] = first property, [1] = second property, etc.
  private readonly PROPERTY_ICON_LOCATOR = "//i[@class='mdi mdi-login text-info font-size-20']";

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  /**
   * Wait for property selection page to load
   */
  async waitForPropertySelectionPageToLoad(timeout: number = 10000): Promise<void> {
    try {
      logger.info('⏳ Waiting for property selection page to load...');

      // Wait for the heading "Select a property to signin!"
      const heading = this.page.locator('text=Select a property');
      await heading.waitFor({ state: 'visible', timeout });

      logger.info('✅ Property selection page loaded');
    } catch (error) {
      logger.error(`Property selection page did not load: ${error}`);
      throw error;
    }
  }

  /**
   * Get all available properties from the page using the property icon locator
   */
  async getAllPropertiesFromPage(): Promise<Array<{ index: number; code: string; name: string }>> {
    try {
      logger.info('📋 Fetching all properties from the page...');

      // Get all property icon elements using XPath
      const propertyIcons = await this.page.locator(this.PROPERTY_ICON_LOCATOR).all();
      const properties: Array<{ index: number; code: string; name: string }> = [];

      logger.info(`Found ${propertyIcons.length} property icons`);

      for (let i = 0; i < propertyIcons.length; i++) {
        try {
          const icon = propertyIcons[i];

          // Get the parent button element (usually the icon is inside a button)
          const button = await icon.locator('ancestor::button | ancestor::div[contains(@class, "btn")] | ancestor::a');

          // Get text content from the button or its children
          let text = await button.textContent();
          if (!text) {
            // Fallback: try to get text from sibling elements
            const parent = await icon.locator('parent::*');
            text = await parent.textContent();
          }

          if (!text) continue;

          const cleanText = text.trim();
          if (cleanText.length === 0) continue;

          // Split by newline to get code and name
          const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

          if (lines.length >= 1) {
            const code = lines[0];
            const name = lines.length > 1 ? lines.slice(1).join(' ') : code;

            // Validate if it looks like a property code
            if (code.length >= 3 && code.length <= 10 && /^[A-Z0-9]+$/i.test(code)) {
              properties.push({
                index: i,
                code: code.toUpperCase(),
                name: name,
              });
              logger.info(`[${i}] ${code} - ${name}`);
            }
          }
        } catch (error) {
          logger.debug(`Error processing property at index ${i}: ${error}`);
        }
      }

      if (properties.length === 0) {
        logger.warn('⚠️ No properties found on the page');
      } else {
        logger.info(`✅ Found ${properties.length} properties`);
      }

      return properties;
    } catch (error) {
      logger.error(`Failed to get all properties: ${error}`);
      throw error;
    }
  }

  /**
   * Select property by index number using the XPath locator
   * Example: selectPropertyAtIndex(0) - selects 1st property icon
   *          selectPropertyAtIndex(1) - selects 2nd property icon
   *          selectPropertyAtIndex(2) - selects 3rd property icon
   */
  async selectPropertyAtIndex(index: number): Promise<void> {
    try {
      logger.info(`🔍 Selecting property at index: ${index}`);

      // Get all property icons
      const propertyIcons = await this.page.locator(this.PROPERTY_ICON_LOCATOR).all();

      if (index < 0 || index >= propertyIcons.length) {
        throw new Error(
          `❌ Invalid index ${index}. Available properties: ${propertyIcons.length} (0-${propertyIcons.length - 1})`
        );
      }

      logger.info(`📍 Found ${propertyIcons.length} properties. Selecting property at index [${index}]`);

      // Get the icon at the specific index
      const selectedIcon = propertyIcons[index];

      // Click on the icon
      logger.info(`🖱️ Clicking property icon at index ${index}...`);
      await selectedIcon.click();
      await this.page.waitForTimeout(2000);

      logger.info(`✅ Successfully clicked property at index: ${index}`);
    } catch (error) {
      logger.error(`Failed to select property by index: ${error}`);
      throw error;
    }
  }

  /**
   * Select property by code/initials
   * Example: selectPropertyByCode('WDUBI') or selectPropertyByCode('WEBIN')
   */
  async selectPropertyByCode(code: string): Promise<void> {
    try {
      logger.info(`🔍 Selecting property by code: ${code}`);

      // Get all properties from the page
      const properties = await this.getAllPropertiesFromPage();

      const property = properties.find(p => p.code.toUpperCase() === code.toUpperCase());

      if (!property) {
        const availableCodes = properties.map(p => p.code).join(', ');
        throw new Error(`❌ Property '${code}' not found. Available: ${availableCodes}`);
      }

      logger.info(`📍 Found property at index [${property.index}]: ${property.code} - ${property.name}`);

      // Click the property at the found index
      await this.selectPropertyAtIndex(property.index);
    } catch (error) {
      logger.error(`Failed to select property by code: ${error}`);
      throw error;
    }
  }

  /**
   * List all available properties
   */
  async listAllProperties(): Promise<void> {
    try {
      const properties = await this.getAllPropertiesFromPage();

      if (properties.length === 0) {
        logger.info('📭 No properties available');
        return;
      }

      logger.info('📋 Available Properties:');
      logger.info('─'.repeat(60));
      properties.forEach((prop) => {
        logger.info(`[${prop.index}] ${prop.code.padEnd(10)} - ${prop.name}`);
      });
      logger.info('─'.repeat(60));
    } catch (error) {
      logger.error(`Failed to list properties: ${error}`);
      throw error;
    }
  }

  /**
   * Get all properties from page
   */
  async getAllPropertiesForTest(): Promise<Array<{ index: number; code: string; name: string }>> {
    return this.getAllPropertiesFromPage();
  }

  /**
   * Get current URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }
}

