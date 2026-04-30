import { Page, BrowserContext } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import { WaitUtils } from '../../utils/WaitUtils';
import logger from '../../core/Logger';
import { SelectProperty } from '.././SelectProperty';

export class LoginPage extends BasePage {
  private elementActions: ElementActions;
  private waitUtils: WaitUtils;

  // Locators - using test IDs and roles for better maintainability
  private readonly USERNAME_INPUT = '[data-testid=\'username-input\'], input[placeholder*=\'Username\'], input[placeholder*=\'username\'], input[name=\'username\']';
  private readonly PASSWORD_INPUT = '[data-testid=\'password-input\'], input[placeholder*=\'Password\'], input[placeholder*=\'password\'], input[name=\'password\']';
  private readonly LOGIN_BUTTON = '[data-testid=\'login-button\'], button:has-text(\'Login\'), button:has-text(\'Sign In\'), button[type=\'submit\']';
  private readonly ERROR_MESSAGE = '[data-testid=\'error-message\'], .error-message, .alert-danger, [role=\'alert\']';
  private readonly LOGIN_FORM = '[data-testid=\'login-form\'], form, .login-form, .login-container';
  private readonly LOADING_SPINNER = '[data-testid=\'loading\'], .spinner, .loader, .loading';


  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.waitUtils = new WaitUtils(page);
  }

  /**
   * Navigate to login page
   */
  async navigateToLoginPage(): Promise<void> {
    try {
      logger.info('Navigating to login page');
      await this.navigate(this.baseURL);
      await this.waitForLoginPageToLoad();
      logger.info('Login page loaded successfully');
    } catch (error) {
      logger.error(`Failed to navigate to login page: ${error}`);
      throw error;
    }
  }

  /**
   * Wait for login page to fully load
   */
  private async waitForLoginPageToLoad(): Promise<void> {
    try {
      logger.debug('Waiting for login page to load');

      // Wait for login form to be visible
      await this.elementActions.waitForElement(this.LOGIN_FORM, 10000, 'Login form');

      // Wait for username input to be visible
      await this.elementActions.waitForElement(this.USERNAME_INPUT, 10000, 'Username input');

      logger.debug('Login page loaded successfully');
    } catch (error) {
      logger.error(`Login page did not load properly: ${error}`);
      throw error;
    }
  }

  /**
   * Enter username
   */
  
  async enterUsername(username: string): Promise<void> {
    try {
      logger.info(`Entering username: ${username}`);
      await this.elementActions.sendKeys(
        this.USERNAME_INPUT,
        username,
        'Username input field',
        true
      );
      logger.info('Username entered successfully');
    } catch (error) {
      logger.error(`Failed to enter username: ${error}`);
      throw error;
    }
  }

  /**
   * Enter password
   */
  async enterPassword(password: string): Promise<void> {
    try {
      logger.info('Entering password');
      await this.elementActions.sendKeys(
        this.PASSWORD_INPUT,
        password,
        'Password input field',
        true
      );
      logger.info('Password entered successfully');
    } catch (error) {
      logger.error(`Failed to enter password: ${error}`);
      throw error;
    }
  }

  /**
   * Click login button
   */
  async clickLogin(): Promise<void> {
    try {
      //await this.page.waitForTimeout(5000); // Small delay to ensure inputs are processed before clicking
      logger.info('Clicking login button');
      await this.elementActions.click(this.LOGIN_BUTTON, 'Login button');
      logger.info('Login button clicked successfully');
    } catch (error) {
      logger.error(`Failed to click login button: ${error}`);
      throw error;
    }
  }

  /**
   * Wait for login to complete
   */
  async waitForLoginToComplete(): Promise<void> {
    try {
      logger.debug('Waiting for login to complete');

      // Wait for loading spinner to disappear
      try {
        await this.elementActions.waitForElementHidden(this.LOADING_SPINNER, 30000, 'Loading spinner');
      } catch (error) {
        logger.debug('Loading spinner not found or already hidden');
      }

      // Wait for network to be idle
      await this.waitUtils.waitForNetworkIdle(30000);

      logger.debug('Login completed');
    } catch (error) {
      logger.error(`Login did not complete properly: ${error}`);
      throw error;
    }
  }

  /**
   * Maximize browser window in headed mode.
   * Falls back gracefully if the browser/runtime blocks window resizing.
   */
  async maximizeBrowserWindow(): Promise<void> {
    try {
      logger.info('Maximizing browser window');

      await this.page.evaluate(() => {
        const win = globalThis as unknown as {
          moveTo?: (x: number, y: number) => void;
          resizeTo?: (w: number, h: number) => void;
          screen?: { availWidth: number; availHeight: number };
        };

        win.moveTo?.(0, 0);
        if (win.screen) {
          win.resizeTo?.(win.screen.availWidth, win.screen.availHeight);
        }
      });

      await this.page.waitForTimeout(300);
      logger.info('Browser window maximized successfully');
    } catch (error) {
      // Do not fail login if maximize is blocked by browser/OS policy.
      logger.warn(`Could not maximize browser window: ${error}`);
    }
  }

  /**
   * Perform complete login
   */
  async login(username: string, password: string): Promise<void> {
    try {
      logger.info('Starting login process');

      // Navigate to login page
      await this.navigateToLoginPage();

      // Enter credentials
      await this.enterUsername(username);
      await this.enterPassword(password);

      // Click login
      await this.clickLogin();

      // Wait for login to complete
      await this.waitForLoginToComplete();

      // Maximize browser window after login for all test flows
      await this.maximizeBrowserWindow();

      logger.info('Login process completed successfully');
    } catch (error) {
      logger.error(`Login failed: ${error}`);
      await this.takeScreenshot('login_failure');
      throw error;
    }
  }

  /**
   * Login and select property
   * @param username - Login username
   * @param password - Login password
   * @param propertyIdentifier - Optional: property index (0, 1, 2) or code ('WDUBI', 'WEBIN', 'WEBBE')
   */
  async loginWithPropertySelection(
    username: string,
    password: string,
    propertyIdentifier?: number | string
  ): Promise<void> {
    try {
      logger.info('Starting login process with property selection');

      // Perform regular login
      await this.login(username, password);

// await this.page.setViewportSize({
//     width: 1920,
//     height: 1200
//   });

      

      // Handle property selection
      await this.handlePropertySelection(propertyIdentifier);

      logger.info('✅ Login and property selection completed successfully');
    } catch (error) {
      logger.error(`Login with property selection failed: ${error}`);
      await this.takeScreenshot('login_property_selection_failure');
      throw error;
    }
  }

  /**
   * Handle property selection page
   * @param propertyIdentifier - Can be index (0, 1, 2) or code ('WDUBI', 'WEBIN', 'WEBBE')
   * If not provided, will select first property (index 0)
   */
  async handlePropertySelection(propertyIdentifier?: number | string): Promise<void> {
    try {
      logger.info('🏢 Handling property selection...');

      const selectProperty = new SelectProperty(this.page, this.context);

      // Wait for property selection page
      try {
        await selectProperty.waitForPropertySelectionPageToLoad(10000);
      } catch (error) {
        logger.warn('Property selection page did not appear, may already be logged in');
        return;
      }

      // List all available properties
      await selectProperty.listAllProperties();

      // Select property
      if (propertyIdentifier === undefined) {
        // Default: select first property (index 0)
        logger.info('📍 No property specified, selecting first property (index 0)');
        await selectProperty.selectPropertyAtIndex(0);
      } else if (typeof propertyIdentifier === 'number') {
        // Select by index
        await selectProperty.selectPropertyAtIndex(propertyIdentifier);
      } else {
        // Select by code
        await selectProperty.selectPropertyByCode(propertyIdentifier);
      }

      logger.info('✅ Property selected successfully');
    } catch (error) {
      logger.error(`Failed to handle property selection: ${error}`);
      throw error;
    }
  }

  /**
   * Check if login form is visible
   */
  async isLoginFormVisible(): Promise<boolean> {
    try {
      logger.debug('Checking if login form is visible');
      const isVisible = await this.elementActions.isElementVisible(this.LOGIN_FORM, 'Login form');
      logger.debug(`Login form visibility: ${isVisible}`);
      return isVisible;
    } catch (error) {
      logger.error(`Failed to check login form visibility: ${error}`);
      return false;
    }
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string> {
    try {
      logger.debug('Getting error message');
      const errorText = await this.elementActions.getText(this.ERROR_MESSAGE, 'Error message');
      logger.info(`Error message: ${errorText}`);
      return errorText;
    } catch (error) {
      logger.debug('Error message not found');
      return '';
    }
  }

  /**
   * Check if error message is displayed
   */
  async isErrorMessageDisplayed(): Promise<boolean> {
    try {
      logger.debug('Checking if error message is displayed');
      const isDisplayed = await this.elementActions.isElementVisible(this.ERROR_MESSAGE, 'Error message');
      logger.debug(`Error message displayed: ${isDisplayed}`);
      return isDisplayed;
    } catch (error) {
      logger.debug('Error message not found');
      return false;
    }
  }

  /**
   * Clear login form
   */
  async clearLoginForm(): Promise<void> {
    try {
      logger.info('Clearing login form');

      // Clear username
      const usernameLocator = this.page.locator(this.USERNAME_INPUT);
      await usernameLocator.clear();

      // Clear password
      const passwordLocator = this.page.locator(this.PASSWORD_INPUT);
      await passwordLocator.clear();

      logger.info('Login form cleared');
    } catch (error) {
      logger.error(`Failed to clear login form: ${error}`);
      throw error;
    }
  }

  /**
   * Get current page title
   */
  async getPageTitle(): Promise<string> {
    const title = await this.page.title();
    logger.debug(`Current page title: ${title}`);
    return title;
  }
}

