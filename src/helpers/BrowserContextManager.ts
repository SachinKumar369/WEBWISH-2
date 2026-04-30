import { Browser, BrowserContext, Page } from '@playwright/test';
import logger from '../core/Logger';

export class BrowserContextManager {
  /**
   * Create a new context with custom settings
   */
  static async createContext(
    browser: Browser,
    options?: {
      locale?: string;
      timezone?: string;
      offline?: boolean;
      httpCredentials?: { username: string; password: string };
    }
  ): Promise<BrowserContext> {
    try {
      logger.info('Creating new browser context');

      const context = await browser.newContext({
        locale: options?.locale || 'en-US',
        timezoneId: options?.timezone || 'UTC',
        offline: options?.offline || false,
        httpCredentials: options?.httpCredentials,
        recordVideo: process.env.VIDEO_ON_FAILURE === 'true' ? { dir: 'videos' } : undefined,
      });

      logger.info('Browser context created successfully');
      return context;
    } catch (error) {
      logger.error(`Failed to create browser context: ${error}`);
      throw error;
    }
  }

  /**
   * Close context
   */
  static async closeContext(context: BrowserContext): Promise<void> {
    try {
      await context.close();
      logger.info('Browser context closed');
    } catch (error) {
      logger.error(`Failed to close context: ${error}`);
    }
  }

  /**
   * Add authentication cookies
   */
  static async addAuthCookies(
    context: BrowserContext,
    cookies: any[]
  ): Promise<void> {
    try {
      logger.info(`Adding ${cookies.length} authentication cookies`);
      await context.addCookies(cookies);
      logger.info('Authentication cookies added');
    } catch (error) {
      logger.error(`Failed to add cookies: ${error}`);
      throw error;
    }
  }

  /**
   * Add authentication headers
   */
  static async addAuthHeaders(
    context: BrowserContext,
    headers: Record<string, string>
  ): Promise<void> {
    try {
      logger.info('Adding authentication headers');
      await context.setExtraHTTPHeaders(headers);
      logger.info('Authentication headers added');
    } catch (error) {
      logger.error(`Failed to add headers: ${error}`);
      throw error;
    }
  }

  /**
   * Grant permissions
   */
  static async grantPermissions(
    context: BrowserContext,
    permissions: string[],
    origin?: string
  ): Promise<void> {
    try {
      logger.info(`Granting permissions: ${permissions.join(', ')}`);

      await context.grantPermissions(permissions, {
        origin: origin || 'https://example.com',
      });

      logger.info('Permissions granted');
    } catch (error) {
      logger.error(`Failed to grant permissions: ${error}`);
      throw error;
    }
  }

  /**
   * Set geolocation
   */
  static async setGeolocation(
    context: BrowserContext,
    latitude: number,
    longitude: number,
    accuracy?: number
  ): Promise<void> {
    try {
      logger.info(`Setting geolocation: ${latitude}, ${longitude}`);

      await context.setGeolocation({ latitude, longitude, accuracy: accuracy || 100 });
      await context.grantPermissions(['geolocation']);

      logger.info('Geolocation set');
    } catch (error) {
      logger.error(`Failed to set geolocation: ${error}`);
      throw error;
    }
  }

  /**
   * Intercept network requests
   */
  static async interceptRequests(
    page: Page,
    urlPattern: string | RegExp,
    handler: (route: any) => Promise<void>
  ): Promise<void> {
    try {
      logger.info(`Setting up request interception for: ${urlPattern}`);

      await page.route(urlPattern, async (route) => {
        await handler(route);
      });

      logger.info('Request interception configured');
    } catch (error) {
      logger.error(`Failed to setup request interception: ${error}`);
      throw error;
    }
  }

  /**
   * Clear all cookies
   */
  static async clearCookies(context: BrowserContext): Promise<void> {
    try {
      logger.info('Clearing all cookies');
      await context.clearCookies();
      logger.info('Cookies cleared');
    } catch (error) {
      logger.error(`Failed to clear cookies: ${error}`);
    }
  }

  /**
   * Clear all storage
   */
  static async clearStorage(context: BrowserContext): Promise<void> {
    try {
      logger.info('Clearing all storage');
      await context.clearCookies();

      logger.info('Storage cleared');
    } catch (error) {
      logger.error(`Failed to clear storage: ${error}`);
    }
  }
}

