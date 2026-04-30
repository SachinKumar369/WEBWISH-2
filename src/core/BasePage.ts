import { Page, BrowserContext } from '@playwright/test';
import logger from './Logger';
import path from 'path';
import fs from 'fs';

export class BasePage {
  readonly page: Page;
  readonly context: BrowserContext;
  protected baseURL: string;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
    this.baseURL = process.env.BASE_URL || 'https://qc2webwish.prologicfirst.in';
  }

  /**
   * Navigate to a specific URL
   */
  async navigate(url?: string): Promise<void> {
    const navigationUrl = url || this.baseURL;
    try {
      logger.info(`Navigating to ${navigationUrl}`);
      await this.page.goto(navigationUrl, { waitUntil: 'domcontentloaded' });
      logger.info(`Successfully navigated to ${navigationUrl}`);
    } catch (error) {
      logger.error(`Failed to navigate to ${navigationUrl}: ${error}`);
      await this.takeScreenshot('navigation_failure');
      throw error;
    }
  }

  /**
   * Navigate to the application home page
   */
  async navigateToHome(): Promise<void> {
    await this.navigate(this.baseURL);
  }

  /**
   * Wait for URL to match a pattern
   */
  async waitForURL(urlPattern: string | RegExp): Promise<void> {
    try {
      logger.info(`Waiting for URL to match pattern: ${urlPattern}`);
      await this.page.waitForURL(urlPattern);
      logger.info(`URL matched pattern: ${urlPattern}`);
    } catch (error) {
      logger.error(`URL did not match pattern within timeout: ${error}`);
      throw error;
    }
  }

  /**
   * Wait for page to reach a load state
   */
  async waitForPageLoad(state: 'load' | 'domcontentloaded' | 'networkidle' = 'load'): Promise<void> {
    try {
      logger.debug(`Waiting for page to reach state: ${state}`);
      await this.page.waitForLoadState(state);
      logger.debug(`Page reached state: ${state}`);
    } catch (error) {
      logger.error(`Failed to reach page state ${state}: ${error}`);
      throw error;
    }
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(name: string, fullPage: boolean = false): Promise<string> {
    try {
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${name}_${timestamp}.png`;
      const filepath = path.join(screenshotsDir, filename);

      await this.page.screenshot({ path: filepath, fullPage });
      logger.info(`Screenshot saved: ${filepath}`);
      return filepath;
    } catch (error) {
      logger.error(`Failed to take screenshot: ${error}`);
      throw error;
    }
  }

  /**
   * Get current page URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * Get page title
   */
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(): Promise<void> {
    try {
      logger.debug('Waiting for network to be idle');
      await this.page.waitForLoadState('networkidle');
      logger.debug('Network is idle');
    } catch (error) {
      logger.warn(`Network did not reach idle state: ${error}`);
    }
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    try {
      //await this.page.close();
      logger.info('Page closed successfully');
    } catch (error) {
      logger.error(`Failed to close page: ${error}`);
    }
  }
}

