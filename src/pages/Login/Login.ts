import { BrowserContext, expect, Locator, Page } from '@playwright/test';

export class LoginPage {
  private readonly page: Page;
  private readonly context: BrowserContext;

  private readonly logo: Locator;
  private readonly welcomeHeading: Locator;
  private readonly subtitle: Locator;
  private readonly userIdLabel: Locator;
  private readonly passwordLabel: Locator;
  private readonly userIdInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly forgotPasswordLink: Locator;
  private readonly passwordToggle: Locator;
  private readonly footer: Locator;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;

    this.logo = this.page.getByRole('link', { name: 'logo' });
    this.welcomeHeading = this.page.getByRole('heading', { name: 'Welcome!' });
    this.subtitle = this.page.getByText('Please login to your account');
    this.userIdLabel = this.page.getByText('User Id');
    this.passwordLabel = this.page.getByText('Password');

    this.userIdInput = this.page.getByRole('textbox', { name: 'Enter username.' });
    this.passwordInput = this.page.getByRole('textbox', { name: 'Enter password' });

    this.loginButton = this.page.getByRole('button', { name: 'Log in' });
    this.forgotPasswordLink = this.page.getByRole('link', { name: 'Forgot password?' });

    this.passwordToggle = this.page.locator('password-input i, password-input .mdi').first();
    this.footer = this.page.getByText('Prologic First India Pvt Ltd');
  }

  async open(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async expectLoginFormVisible(): Promise<void> {
    await expect(this.logo).toBeVisible();
    await expect(this.welcomeHeading).toBeVisible();
    await expect(this.subtitle).toBeVisible();
    await expect(this.userIdInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    await expect(this.forgotPasswordLink).toBeVisible();
  }

  async expectCoreStaticUiVisible(): Promise<void> {
    await expect(this.userIdLabel).toBeVisible();
    await expect(this.passwordLabel).toBeVisible();
    await expect(this.userIdInput).toHaveAttribute('placeholder', 'Enter username.');
    await expect(this.passwordInput).toHaveAttribute('placeholder', 'Enter password');
    await expect(this.footer).toBeVisible();
  }

  async fillUserId(value: string): Promise<void> {
    await this.userIdInput.fill(value);
  }

  async fillPassword(value: string): Promise<void> {
    await this.passwordInput.fill(value);
  }

  async fillCredentials(userId: string, password: string): Promise<void> {
    await this.fillUserId(userId);
    await this.fillPassword(password);
  }

  async clearUserId(): Promise<void> {
    await this.userIdInput.fill('');
  }

  async clearPassword(): Promise<void> {
    await this.passwordInput.fill('');
  }

  async clearCredentials(): Promise<void> {
    await this.clearUserId();
    await this.clearPassword();
  }

  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  async doubleClickLogin(): Promise<void> {
    await this.loginButton.dblclick();
  }

  async submitWithEnterFromPassword(): Promise<void> {
    await this.passwordInput.focus();
    await this.page.keyboard.press('Enter');
  }

  async togglePasswordVisibility(): Promise<void> {
    await this.passwordToggle.click();
  }

  async getPasswordInputType(): Promise<string | null> {
    return this.passwordInput.getAttribute('type');
  }

  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  async clickBackToLogin(): Promise<void> {
    await this.page.getByRole('link', { name: 'Back to login' }).click();
  }

  async expectForgotPasswordScreen(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
    await expect(this.page.getByText('Forgot Password !')).toBeVisible();
    await expect(this.page.getByText('Email')).toBeVisible();
    await expect(this.page.getByRole('textbox', { name: 'email address' })).toBeDisabled();
    await expect(this.page.getByRole('textbox', { name: 'otp' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Resend OTP' })).toBeVisible();
    await expect(this.page.getByRole('textbox', { name: 'captcha' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Request Password' })).toBeDisabled();
    await expect(this.page.getByRole('link', { name: 'Back to login' })).toBeVisible();
  }

  async expectAuthenticatedLanding(): Promise<void> {
    await expect
      .poll(async () => {
        const notOnLoginUrl = !/\/login/i.test(this.page.url());
        const propertySelectionVisible = await this.page
          .getByText('Select a property to signin!')
          .isVisible()
          .catch(() => false);
        const dashboardVisible = await this.page.locator('#page-topbar').isVisible().catch(() => false);

        return notOnLoginUrl || propertySelectionVisible || dashboardVisible;
      }, { timeout: 15000 })
      .toBeTruthy();
  }

  async isAuthenticatedLanding(): Promise<boolean> {
    const notOnLoginUrl = !/\/login/i.test(this.page.url());
    const propertySelectionVisible = await this.page
      .getByText('Select a property to signin!')
      .isVisible()
      .catch(() => false);
    const dashboardVisible = await this.page.locator('#page-topbar').isVisible().catch(() => false);

    return notOnLoginUrl || propertySelectionVisible || dashboardVisible;
  }

  async expectStillOnLogin(): Promise<void> {
    await expect
      .poll(async () => /\/login/i.test(this.page.url()), { timeout: 5000 })
      .toBeTruthy();
    await expect(this.loginButton).toBeVisible();
  }

  async expectStillOnLoginOrErrorDialog(): Promise<void> {
    const onLogin = /\/login/i.test(this.page.url());
    const hasDialog = await this.page.getByRole('dialog').isVisible().catch(() => false);
    const hasOkButton = await this.page.getByRole('button', { name: 'OK' }).isVisible().catch(() => false);
    expect(onLogin || hasDialog || hasOkButton).toBeTruthy();
  }

  async expectAuthOrErrorDialog(): Promise<void> {
    await expect
      .poll(async () => {
        const authenticated = await this.isAuthenticatedLanding();
        const hasDialog = await this.page.getByRole('dialog').isVisible().catch(() => false);
        return authenticated || hasDialog;
      }, { timeout: 15000 })
      .toBeTruthy();
  }

  async expectErrorDialogVisible(): Promise<void> {
    await expect(this.page.getByRole('dialog')).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'OK' })).toBeVisible();
  }

  async expectErrorDialogContains(text: string): Promise<void> {
    await this.expectErrorDialogVisible();
    await expect(this.page.getByRole('dialog')).toContainText(text);
  }

  async clickDialogOk(): Promise<void> {
    await this.page.getByRole('button', { name: 'OK' }).click();
  }

  async clickDialogOkIfVisible(): Promise<void> {
    const okButton = this.page.getByRole('button', { name: 'OK' });
    if (await okButton.isVisible().catch(() => false)) {
      await okButton.click();
    }
  }

  async expectNoUnhandledClientError(): Promise<void> {
    await expect(this.userIdInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    //await expect(this.loginButton).toBeVisible();
  }

  async expectCarouselVisible(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Slide 1' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Slide 2' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Slide 3' })).toBeVisible();
  }

  async clickSlideIndicator(index: 1 | 2 | 3): Promise<void> {
    await this.page.getByRole('button', { name: `Slide ${index}` }).click();
  }

  async expectSlideIndicatorActive(index: 1 | 2 | 3): Promise<void> {
    await expect(this.page.getByRole('button', { name: `Slide ${index}` })).toBeFocused();
  }

  async focusUserId(): Promise<void> {
    await this.userIdInput.focus();
  }

  async focusPassword(): Promise<void> {
    await this.passwordInput.focus();
  }

  async pressTab(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async expectPasswordFocused(): Promise<void> {
    await expect(this.passwordInput).toBeFocused();
  }

  async expectLoginButtonFocused(): Promise<void> {
    await expect(this.loginButton).toBeFocused();
  }

  async expectForgotPasswordFocused(): Promise<void> {
    await expect(this.forgotPasswordLink).toBeFocused();
  }

  async expectDialogOkFocused(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'OK' })).toBeFocused();
  }
}
