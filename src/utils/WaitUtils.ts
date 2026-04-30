import { Page } from '@playwright/test';
import logger from '../core/Logger';

export class WaitUtils {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Wait for element to be stable (not animating)
   */
  async waitForElementStable(selector: string, timeout: number = 5000): Promise<void> {
    try {
      logger.debug(`Waiting for element to be stable: ${selector}`);

      const locator = this.page.locator(selector);
      await locator.waitFor({ state: 'visible', timeout });

      // Wait a bit for animations to complete
      await this.page.waitForTimeout(300);

      logger.debug(`Element is stable: ${selector}`);
    } catch (error) {
      logger.error(`Failed to wait for element to be stable: ${error}`);
      throw error;
    }
  }

  /**
   * Wait for network idle state
   */
  async waitForNetworkIdle(timeout: number = 30000): Promise<void> {
    try {
      logger.debug('Waiting for network to be idle');
      await this.page.waitForLoadState('networkidle', { timeout });
      logger.debug('Network is idle');
    } catch (error) {
      logger.warn(`Failed to reach network idle state: ${error}`);
    }
  }

  /**
   * Wait for specific HTTP response
   */
  async waitForResponse(urlPattern: string | RegExp, timeout: number = 10000): Promise<void> {
    try {
      logger.debug(`Waiting for response matching: ${urlPattern}`);

      const promise = this.page.waitForResponse(
        response => {
          const url = response.url();
          const matches = typeof urlPattern === 'string'
            ? url.includes(urlPattern)
            : urlPattern.test(url);
          return matches;
        },
        { timeout }
      );

      await promise;
      logger.debug(`Received response matching: ${urlPattern}`);
    } catch (error) {
      logger.error(`Failed to wait for response: ${error}`);
      throw error;
    }
  }

  /**
   * Wait for function to return true
   */
  async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 10000,
    pollInterval: number = 500,
    description?: string
  ): Promise<void> {
    const startTime = Date.now();
    const desc = description || 'Custom condition';

    try {
      logger.debug(`Waiting for condition: ${desc}`);

      while (Date.now() - startTime < timeout) {
        try {
          const result = await condition();
          if (result) {
            logger.debug(`Condition met: ${desc}`);
            return;
          }
        } catch (error) {
          logger.debug(`Condition check failed (will retry): ${error}`);
        }

        await this.page.waitForTimeout(pollInterval);
      }

      logger.error(`Condition not met within timeout: ${desc}`);
      throw new Error(`Timeout waiting for condition: ${desc}`);
    } catch (error) {
      logger.error(`Failed while waiting for condition: ${error}`);
      throw error;
    }
  }

  /**
   * Wait for element count to match
   */
  async waitForElementCount(selector: string, expectedCount: number): Promise<void> {
    try {
      logger.debug(`Waiting for ${expectedCount} elements matching: ${selector}`);

      const locator = this.page.locator(selector);
      await locator.evaluateAll((elements, count) => {
        return elements.length === count;
      }, expectedCount);

      logger.debug(`Found ${expectedCount} elements matching: ${selector}`);
    } catch (error) {
      logger.error(`Failed to find expected element count: ${error}`);
      throw error;
    }
  }

  /**
   * Wait for text in element
   */
  async waitForText(selector: string, expectedText: string, timeout: number = 10000): Promise<void> {
    try {
      logger.debug(`Waiting for text in ${selector}: "${expectedText}"`);

      const locator = this.page.locator(selector);
      await locator.waitFor({ state: 'visible', timeout });

      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        const text = await locator.textContent();
        if (text && text.includes(expectedText)) {
          logger.debug(`Found expected text: "${expectedText}"`);
          return;
        }
        await this.page.waitForTimeout(500);
      }

      logger.error(`Expected text not found within timeout: "${expectedText}"`);
      throw new Error(`Text not found: ${expectedText}`);
    } catch (error) {
      logger.error(`Failed while waiting for text: ${error}`);
      throw error;
    }
  }

  /**
   * Wait for specific milliseconds
   */
  async sleep(ms: number): Promise<void> {
    logger.debug(`Sleeping for ${ms}ms`);
    await this.page.waitForTimeout(ms);
  }

  /**
   * Wait for page navigation to complete
   */
  async waitForNavigation(timeout: number = 30000): Promise<void> {
    try {
      logger.debug('Waiting for page navigation');
      await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout });
      logger.debug('Page navigation completed');
    } catch (error) {
      logger.warn(`Navigation did not complete within timeout: ${error}`);
    }
  }
}

