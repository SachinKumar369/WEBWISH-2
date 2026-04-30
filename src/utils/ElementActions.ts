import { Page, Locator } from '@playwright/test';
import logger from '../core/Logger';
import path from 'path';
import fs from 'fs';

export class ElementActions {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Click an element with retry logic and screenshot on failure
   */
  async click(selector: string | Locator, description?: string): Promise<void> {
    const elementDesc = description || selector.toString();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        logger.info(`[Attempt ${attempt}/3] Clicking element: ${elementDesc}`);

        const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;

              await locator.scrollIntoViewIfNeeded();


        // Wait for element to be visible and stable
        await locator.waitFor({ state: 'visible', timeout: 10000 });
        await this.page.waitForTimeout(200); // Small delay for animation

        // Try Playwright click first
        await locator.click({ timeout: 5000 });
        logger.info(`Successfully clicked element: ${elementDesc}`);
        return;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Click attempt ${attempt} failed for ${elementDesc}: ${error}`);

        // Try JavaScript click as fallback on last attempt
        if (attempt === 3) {
          try {
            logger.info(`Attempting JavaScript click fallback for ${elementDesc}`);
            const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await locator.evaluate((element: any) => element.click());
            logger.info(`Successfully clicked element via JavaScript: ${elementDesc}`);
            return;
          } catch (jsError) {
            logger.error(`JavaScript click also failed: ${jsError}`);
            await this.takeScreenshotOnFailure('click_failure');
            throw jsError;
          }
        }

        // Wait before retry
        await this.page.waitForTimeout(500);
      }
    }

    if (lastError) {
      await this.takeScreenshotOnFailure('click_failure');
      throw lastError;
    }
  }

  /**
   * Send keys to an element
   */
  async sendKeys(selector: string | Locator, text: string, _description?: string, clear: boolean = true): Promise<void> {
    const elementDesc = _description || selector.toString();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        logger.info(`[Attempt ${attempt}/3] Sending keys to element: ${elementDesc}`);

        const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;

        // Wait for element to be visible
        await locator.waitFor({ state: 'visible', timeout: 10000 });

        // Clear existing text if needed
        if (clear) {
          await locator.clear();
          logger.debug(`Cleared existing text in ${elementDesc}`);
        }

        // Send keys
        await locator.type(text, { delay: 50 });
        logger.info(`Successfully sent keys to element: ${elementDesc}`);
        return;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Send keys attempt ${attempt} failed for ${elementDesc}: ${error}`);

        if (attempt === 3) {
          await this.takeScreenshotOnFailure('sendkeys_failure');
        } else {
          await this.page.waitForTimeout(500);
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  /**
   * Hover over an element
   */
  async hover(selector: string | Locator, description?: string): Promise<void> {
    const elementDesc = description || selector.toString();
    try {
      logger.info(`Hovering over element: ${elementDesc}`);

      const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
      await locator.waitFor({ state: 'visible', timeout: 10000 });
      await locator.hover();

      logger.info(`Successfully hovered over element: ${elementDesc}`);
    } catch (error) {
      logger.error(`Failed to hover over element: ${elementDesc}: ${error}`);
      await this.takeScreenshotOnFailure('hover_failure');
      throw error;
    }
  }

  /**
   * Upload a file
   */
  async uploadFile(selector: string | Locator, filePath: string, description?: string): Promise<void> {
    const elementDesc = description || selector.toString();
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      logger.info(`Uploading file: ${filePath} to element: ${elementDesc}`);

      const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
      await locator.setInputFiles(filePath);

      logger.info(`Successfully uploaded file: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to upload file: ${error}`);
      await this.takeScreenshotOnFailure('upload_failure');
      throw error;
    }
  }

  /**
   * Scroll to element
   */
  async scrollToElement(selector: string | Locator, description?: string): Promise<void> {
    const elementDesc = description || selector.toString();
    try {
      logger.info(`Scrolling to element: ${elementDesc}`);

      const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
      await locator.scrollIntoViewIfNeeded();

      logger.info(`Successfully scrolled to element: ${elementDesc}`);
    } catch (error) {
      logger.error(`Failed to scroll to element: ${elementDesc}: ${error}`);
      throw error;
    }
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string | Locator, timeout: number = 10000, description?: string): Promise<void> {
    const elementDesc = description || selector.toString();
    try {
      logger.debug(`Waiting for element to be visible: ${elementDesc}`);

      const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
      await locator.waitFor({ state: 'visible', timeout });

      logger.debug(`Element is visible: ${elementDesc}`);
    } catch (error) {
      logger.error(`Element did not appear within timeout (${timeout}ms): ${elementDesc}: ${error}`);
      await this.takeScreenshotOnFailure('wait_element_failure');
      throw error;
    }
  }

  /**
   * Wait for element to be hidden
   */
  async waitForElementHidden(selector: string | Locator, timeout: number = 10000, description?: string): Promise<void> {
    const elementDesc = description || selector.toString();
    try {
      logger.debug(`Waiting for element to be hidden: ${elementDesc}`);

      const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
      await locator.waitFor({ state: 'hidden', timeout });

      logger.debug(`Element is hidden: ${elementDesc}`);
    } catch (error) {
      logger.error(`Element did not hide within timeout (${timeout}ms): ${elementDesc}: ${error}`);
      throw error;
    }
  }

  /**
   * Get element text
   */
  async getText(selector: string | Locator, description?: string): Promise<string> {
    const elementDesc = description || selector.toString();
    try {
      const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
      const text = await locator.textContent();
      logger.debug(`Retrieved text from element: ${elementDesc}`);
      return text || '';
    } catch (error) {
      logger.error(`Failed to get text from element: ${elementDesc}: ${error}`);
      throw error;
    }
  }

  /**
   * Get element attribute
   */
  async getAttribute(selector: string | Locator, attribute: string, description?: string): Promise<string | null> {
    const elementDesc = description || selector.toString();
    try {
      const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
      const value = await locator.getAttribute(attribute);
      logger.debug(`Retrieved attribute ${attribute} from element: ${elementDesc}`);
      return value;
    } catch (error) {
      logger.error(`Failed to get attribute from element: ${elementDesc}: ${error}`);
      throw error;
    }
  }

  /**
   * Check if element is visible
   */
  async isElementVisible(selector: string | Locator, description?: string): Promise<boolean> {
    const elementDesc = description || selector.toString();
    try {
      const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
      const isVisible = await locator.isVisible();
      logger.debug(`Element visibility status for ${elementDesc}: ${isVisible}`);
      return isVisible;
    } catch (error) {
      logger.debug(`Element not found or not visible: ${elementDesc}`);
      return false;
    }
  }

  /**
   * Press keyboard key
   */
  async pressKey(key: string): Promise<void> {
    try {
      logger.info(`Pressing key: ${key}`);
      await this.page.keyboard.press(key);
      logger.info(`Successfully pressed key: ${key}`);
    } catch (error) {
      logger.error(`Failed to press key: ${error}`);
      throw error;
    }
  }

  /**
   * Take screenshot on failure
   */
  protected async takeScreenshotOnFailure(name: string): Promise<void> {
    try {
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${name}_${timestamp}.png`;
      const filepath = path.join(screenshotsDir, filename);

      await this.page.screenshot({ path: filepath, fullPage: true });
      logger.error(`Failure screenshot saved: ${filepath}`);
    } catch (screenshotError) {
      logger.error(`Failed to take failure screenshot: ${screenshotError}`);
    }
  }
}

