import { Page, BrowserContext } from '@playwright/test';
import { BasePage } from '../core/BasePage';
import { ElementActions } from '../utils/ElementActions';
import logger from '../core/Logger';
import * as fs from 'fs';
import * as path from 'path';

export class PropertySelectionPage extends BasePage {
  private elementActions: ElementActions;
  private propertiesFilePath: string;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.propertiesFilePath = path.join(process.cwd(), 'test-data', 'properties.json');
  }

  /**
   * Read properties from JSON file
   */
  async readPropertiesFromFile(): Promise<Array<{ code: string; name: string; url: string }>> {
    try {
      if (!fs.existsSync(this.propertiesFilePath)) {
        logger.warn(`Properties file not found: ${this.propertiesFilePath}`);
        return [];
      }

      const fileContent = fs.readFileSync(this.propertiesFilePath, 'utf-8');
      const data = JSON.parse(fileContent);
      const properties = data.properties || [];

      logger.info(`✅ Read ${properties.length} properties from file`);
      return properties;
    } catch (error) {
      logger.error(`Failed to read properties from file: ${error}`);
      return [];
    }
  }

  /**
   * Select property by code from the page
   */
  async selectPropertyByCode(propertyCode: string): Promise<void> {
    try {
      logger.info(`🔎 Searching for property: ${propertyCode}`);

      // Get all buttons on the page
      const buttons = await this.page.locator('button').all();
      let found = false;

      for (const button of buttons) {
        const text = await button.textContent();

        if (text && text.toUpperCase().includes(propertyCode.toUpperCase())) {
          logger.info(`✅ Found matching property button, clicking...`);
          await button.click();
          await this.page.waitForTimeout(2000);
          logger.info(`✅ Successfully selected property: ${propertyCode}`);
          found = true;
          break;
        }
      }

      if (!found) {
        logger.warn(`Property button not found for code: ${propertyCode}`);
        throw new Error(`Could not find property with code: ${propertyCode}`);
      }
    } catch (error) {
      logger.error(`Failed to select property: ${error}`);
      throw error;
    }
  }

  /**
   * Select first available property from the page
   */
  async selectFirstProperty(): Promise<void> {
    try {
      logger.info('Selecting first available property...');

      const loginButton = this.page.locator('button').first();
      await loginButton.click();
      await this.page.waitForTimeout(2000);

      logger.info('✅ Selected first property');
    } catch (error) {
      logger.error(`Failed to select first property: ${error}`);
      throw error;
    }
  }

  /**
   * Get current URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * Wait for property selection page to load
   */
  async waitForPropertySelectionPageToLoad(timeout: number = 10000): Promise<void> {
    try {
      logger.info('Waiting for property selection page to load...');

      // Wait for the heading "Select a property to signin!"
      const heading = this.page.locator('text=Select a property');
      await heading.waitFor({ state: 'visible', timeout });

      logger.info('✅ Property selection page loaded');
    } catch (error) {
      logger.error(`Property selection page did not load: ${error}`);
      throw error;
    }
  }
}



