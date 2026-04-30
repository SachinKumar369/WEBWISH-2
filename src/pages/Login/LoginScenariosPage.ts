import { expect, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export interface LoginCredentials {
  username: string;
  password: string;
}

export class LoginScenariosPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly logoLink: Locator;
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly passwordToggle: Locator;
  private readonly forgotPasswordLink: Locator;
  private readonly propertyHeading: Locator;
  private readonly feedbackParagraph: Locator;
  private readonly forgotPasswordPanel: Locator;
  private readonly formLocator: Locator;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);

    this.logoLink = this.page.getByRole('link', { name: 'logo' });
    this.usernameInput = this.page.getByRole('textbox', { name: 'Enter username.' });
    this.passwordInput = this.page.getByRole('textbox', { name: 'Enter password' });
    this.loginButton = this.page.getByRole('button', { name: 'Log in' });
    this.passwordToggle = this.page.locator('password-input label').first();
    this.forgotPasswordLink = this.page.getByRole('link', { name: 'Forgot password?' });
    this.propertyHeading = this.page.getByRole('heading');
    this.feedbackParagraph = this.page.getByRole('paragraph');
    this.forgotPasswordPanel = this.page.locator('app-forgot-password');
    this.formLocator = this.page.locator('form');
  }

  async openLoginPage(): Promise<void> {
    await this.page.goto(this.baseURL);
    await expect(this.logoLink).toBeVisible();
    logger.info('Login page opened and logo is visible');
  }

  async loginWithFlowProvided(credentials: LoginCredentials): Promise<void> {
    await this.elementActions.click(this.usernameInput, 'Username input');
    await this.usernameInput.fill(credentials.username);
    await this.usernameInput.press('Tab');

    await this.passwordInput.fill('S');
    await this.passwordInput.press('CapsLock');
    await this.passwordInput.fill(credentials.password);

    await this.elementActions.click(this.passwordToggle, 'Password eye toggle label');
    await this.elementActions.click(this.loginButton, 'Log in button');
  }

  async loginSimple(credentials: LoginCredentials): Promise<void> {
    await this.elementActions.click(this.usernameInput, 'Username input');
    await this.usernameInput.fill(credentials.username);

    await this.elementActions.click(this.passwordInput, 'Password input');
    await this.passwordInput.fill(credentials.password);

    await this.elementActions.click(this.loginButton, 'Log in button');
  }

  async expectPropertySelectionPrompt(): Promise<void> {
    await expect(this.propertyHeading).toContainText('Select a property to signin!');
  }

  async expectLoginRejected(): Promise<void> {
    await expect(this.page).toHaveURL(/login/i);
    await expect(this.propertyHeading).not.toContainText('Select a property to signin!');

    // In some environments an explicit error appears; keep this non-blocking.
    const hasFeedback = await this.feedbackParagraph.first().isVisible().catch(() => false);
    if (hasFeedback) {
      logger.info('Login feedback message displayed by application');
    }
  }

  async expectInvalidUserIdError(): Promise<void> {
    // await expect(this.feedbackParagraph).toContainText(getByText('Invalid User Id. (606)'));
    // await expect(this.feedbackParagraph).toContainText('Invalid User Id. (606)');
    await expect(this.page.getByText('Invalid User Id. (606)')).toBeVisible();
  }

  async expectInvalidPasswordError(): Promise<void> {
    await expect(this.page.getByText('Invalid Password. Your login')).toBeVisible();
    // await expect(this.feedbackParagraph).toContainText(getByText('Invalid Password. Your login will be deactivated after 23 unsuccessful attempts. (475)'));
    // await expect(this.feedbackParagraph).toContainText('Invalid Password. Your login will be deactivated after 23 unsuccessful attempts. (475)');
    // await expect(this.feedbackParagraph).toContainText(
    //   'Invalid Password. Your login will be deactivated after 23 unsuccessful attempts. (475)'
    // );
  }

  async clickFeedbackOk(): Promise<void> {
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Login feedback OK button');
  }

  async expectLogoVisible(): Promise<void> {
    await expect(this.logoLink).toBeVisible();
  }

  async loginWithEyeToggle(credentials: LoginCredentials): Promise<void> {
    await this.elementActions.click(this.usernameInput, 'Username input');
    await this.usernameInput.fill(credentials.username);

    await this.elementActions.click(this.passwordToggle, 'Password eye toggle label');
    await this.elementActions.click(this.passwordInput, 'Password input');
    await this.passwordInput.fill(credentials.password);

    await this.elementActions.click(this.loginButton, 'Log in button');
  }

  async validatePasswordVisibilityToggle(): Promise<void> {
    await this.elementActions.click(this.passwordInput, 'Password input');
    await this.passwordInput.fill('Sachin@578');

    const typeBefore = await this.passwordInput.getAttribute('type');
    await this.elementActions.click(this.passwordToggle, 'Password eye toggle click 1');
    const typeAfterFirstClick = await this.passwordInput.getAttribute('type');

    await expect(typeAfterFirstClick).not.toBe(typeBefore);

    await this.elementActions.click(this.passwordToggle, 'Password eye toggle click 2');
    const typeAfterSecondClick = await this.passwordInput.getAttribute('type');

    await expect(typeAfterSecondClick).toBe(typeBefore);
  }

  async clickForgotPassword(): Promise<void> {
    await this.elementActions.click(this.forgotPasswordLink, 'Forgot password link');
  }

  async expectForgotPasswordUserIdPrompt(): Promise<void> {
    await expect(this.feedbackParagraph).toContainText('Please input your user Id...!');
  }

  async enterUsernameWithCaps(username: string): Promise<void> {
    await this.elementActions.click(this.usernameInput, 'Username input');
    await this.usernameInput.press('CapsLock');
    await this.usernameInput.fill(username);
  }

  async expectForgotPasswordScreen(): Promise<void> {
    await expect(this.propertyHeading).toContainText('Welcome');
    await expect(this.forgotPasswordPanel).toContainText('Forgot Password !');
    await expect(this.formLocator).toContainText('OTP');
  }
}
