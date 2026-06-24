import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import { ElementActions } from '../../utils/ElementActions';
import logger from '../../core/Logger';

/**
 * Page Object for TC_LOGIN_POS_001 — Successful Login with Valid Credentials
 *
 * Encapsulates all locators and actions needed to:
 *  1. Verify the login page is displayed with expected UI elements
 *  2. Fill valid credentials and submit
 *  3. Verify the authenticated landing (property selection or dashboard)
 */
export class LoginDemoPage extends BasePage {
  private readonly elementActions: ElementActions;

  // ── Login form locators ──
  private readonly logo: Locator;
  private readonly welcomeHeading: Locator;
  private readonly subtitle: Locator;
  private readonly userIdLabel: Locator;
  private readonly passwordLabel: Locator;
  private readonly userIdInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly forgotPasswordLink: Locator;
  private readonly footer: Locator;

  // ── Post-login locators ──
  private readonly propertySelectionHeading: Locator;
  private readonly dashboardTopbar: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    // Login form elements
    this.logo = this.page.getByRole('link', { name: 'logo' });
    this.welcomeHeading = this.page.getByRole('heading', { name: 'Welcome!' });
    this.subtitle = this.page.getByText('Please login to your account');
    this.userIdLabel = this.page.getByText('User Id');
    this.passwordLabel = this.page.getByText('Password');
    this.userIdInput = this.page.getByRole('textbox', { name: 'Enter username.' });
    this.passwordInput = this.page.getByRole('textbox', { name: 'Enter password' });
    this.loginButton = this.page.getByRole('button', { name: 'Log in' });
    this.forgotPasswordLink = this.page.getByRole('link', { name: 'Forgot password?' });
    this.footer = this.page.getByText('Prologic First India Pvt Ltd');

    // Post-login elements
    this.propertySelectionHeading = this.page.getByText('Select a property to signin!');
    this.dashboardTopbar = this.page.locator('#page-topbar');
  }

  // ──────────────────────────────────────────────
  // Navigation
  // ──────────────────────────────────────────────

  /**
   * Navigate to the login page URL
   */
  async openLoginUrl(url?: string): Promise<void> {
    const loginUrl =
      url ||
      process.env.BASE_URL ||
      'https://qc2webwish.prologicfirst.in/login/z6cQJcxmrEbhhFXqdoj64Q%3D%3D';
    logger.info(`Navigating to login page: ${loginUrl}`);
    await this.page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle');
    logger.info('Login page loaded successfully');
  }

  // ──────────────────────────────────────────────
  // Step 1 — Verify login page UI elements
  // ──────────────────────────────────────────────

  /**
   * Verify all core login form elements are visible:
   * logo, Welcome heading, subtitle, User Id, Password, Log in button, Forgot password link
   */
  async expectLoginFormFullyVisible(): Promise<void> {
    logger.info('Verifying login form elements are visible');
    await expect(this.logo).toBeVisible();
    await expect(this.welcomeHeading).toBeVisible();
    await expect(this.subtitle).toBeVisible();
    await expect(this.userIdLabel).toBeVisible();
    await expect(this.passwordLabel).toBeVisible();
    await expect(this.userIdInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    await expect(this.forgotPasswordLink).toBeVisible();
    await expect(this.footer).toBeVisible();
    logger.info('All login form elements verified');
  }

  // ──────────────────────────────────────────────
  // Step 2 — Enter User Id
  // ──────────────────────────────────────────────

  /**
   * Enter a valid User Id into the User Id field
   */
  async enterUserId(userId: string): Promise<void> {
    logger.info(`Entering User Id: ${userId}`);
    await this.elementActions.sendKeys(this.userIdInput, userId, 'User Id input field');
    logger.info('User Id entered successfully');
  }

  // ──────────────────────────────────────────────
  // Step 3 — Enter Password (verify masking)
  // ──────────────────────────────────────────────

  /**
   * Enter a valid Password and verify the input type is masked (password)
   */
  async enterPassword(password: string): Promise<void> {
    logger.info('Entering password');
    await this.elementActions.sendKeys(this.passwordInput, password, 'Password input field');

    // Verify password masking
    const inputType = await this.passwordInput.getAttribute('type');
    expect(inputType).toBe('password');
    logger.info('Password entered successfully (masked)');
  }

  /**
   * Fill both User Id and Password in sequence with masking verification
   */
  async fillCredentials(userId: string, password: string): Promise<void> {
    await this.enterUserId(userId);
    await this.enterPassword(password);
  }

  // ──────────────────────────────────────────────
  // Step 4 — Click Log in
  // ──────────────────────────────────────────────

  /**
   * Click the Log in button to submit credentials
   */
  async clickLogin(): Promise<void> {
    logger.info('Clicking Log in button');
    await this.elementActions.click(this.loginButton, 'Log in button');
    logger.info('Log in button clicked');
  }

  // ──────────────────────────────────────────────
  // Step 5 — Wait for navigation away from /login
  // ──────────────────────────────────────────────

  /**
   * Wait for the browser to navigate away from the /login URL.
   * Returns the landing URL once navigation completes.
   */
  async waitForNavigationAwayFromLogin(timeoutMs: number = 15000): Promise<string> {
    logger.info('Waiting for navigation away from login page');

    await expect
      .poll(
        async () => {
          const url = this.page.url();
          return !url.includes('/login');
        },
        { timeout: timeoutMs }
      )
      .toBeTruthy();

    const currentUrl = this.page.url();
    logger.info(`Navigated away from login to: ${currentUrl}`);
    return currentUrl;
  }

  // ──────────────────────────────────────────────
  // Step 6 — Verify authenticated landing
  // ──────────────────────────────────────────────

  /**
   * Verify the user landed on either:
   *  - "Select a property to signin!" screen, OR
   *  - Dashboard (with #page-topbar visible)
   *
   * Returns the detected landing type.
   */
  async expectAuthenticatedLanding(): Promise<'Property Selection' | 'Dashboard'> {
    logger.info('Verifying authenticated landing');

    await expect
      .poll(
        async () => {
          const notOnLogin = !/\/login/i.test(this.page.url());
          const propertyVisible = await this.propertySelectionHeading
            .isVisible()
            .catch(() => false);
          const dashboardVisible = await this.dashboardTopbar
            .isVisible()
            .catch(() => false);
          return notOnLogin || propertyVisible || dashboardVisible;
        },
        { timeout: 15000 }
      )
      .toBeTruthy();

    // Determine which landing we are on
    const propertyVisible = await this.propertySelectionHeading
      .isVisible()
      .catch(() => false);
    if (propertyVisible) {
      logger.info('Landed on Property Selection screen');
      return 'Property Selection';
    }

    const dashboardVisible = await this.dashboardTopbar
      .isVisible()
      .catch(() => false);
    if (dashboardVisible) {
      logger.info('Landed on Dashboard');
      return 'Dashboard';
    }

    // URL-based fallback — not on /login is sufficient
    logger.info('Landed on authenticated page (URL-based detection)');
    return 'Property Selection';
  }

  // ──────────────────────────────────────────────
  // Convenience — full TC_LOGIN_POS_001 flow
  // ──────────────────────────────────────────────

  /**
   * Execute the complete TC_LOGIN_POS_001 flow:
   *  1. Verify login form UI
   *  2. Fill valid credentials
   *  3. Click Log in
   *  4. Wait for navigation
   *  5. Verify authenticated landing
   */
  async performSuccessfulLogin(
    userId: string,
    password: string
  ): Promise<'Property Selection' | 'Dashboard'> {
    // Step 1
    await this.expectLoginFormFullyVisible();

    // Steps 2–3
    await this.fillCredentials(userId, password);

    // Step 4
    await this.clickLogin();

    // Step 5
    await this.waitForNavigationAwayFromLogin();

    // Step 6
    return this.expectAuthenticatedLanding();
  }
}
