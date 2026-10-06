import { Page, BrowserContext } from '@playwright/test';

/**
 * Constructor signature shared by all page objects in the framework:
 * every page class extends BasePage and takes (page, context).
 */
type PageObjectConstructor<T> = new (page: Page, context: BrowserContext) => T;

/**
 * Page Factory — single entry point for instantiating page objects in tests.
 *
 * Usage in specs:
 *   const loginPage = PageFactory.create(page, context, LoginPage);
 *   const waitlistPage = PageFactory.create(page, context, GuestReservationWaitlistPage);
 */
export class PageFactory {
  /**
   * Create a page object instance for the given Playwright page/context.
   * @param page - Playwright Page instance
   * @param context - Playwright BrowserContext instance
   * @param PageClass - Page object class extending BasePage
   * @returns Instance of the requested page object
   */
  static create<T>(page: Page, context: BrowserContext, PageClass: PageObjectConstructor<T>): T {
    return new PageClass(page, context);
  }
}
