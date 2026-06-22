import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { PasswordPolicyPage } from '../../src/pages/SystemConfig/PasswordPolicyPage';
import { UserSetupWithPolicyPage } from '../../src/pages/SystemConfig/UserSetupWithPolicyPage';
import { testDataManager } from '../../src/utils/TestDataManager';
import logger from '../../src/core/Logger';

test.describe.serial('System Config - User Creation with Password Policy', () => {
  test.afterEach(async ({ page }) => {
    logger.info(`Test finished: ${test.info().title}`);

    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';

    if (keepBrowserOpen) {
      logger.info('🔒 KEEP_BROWSER_OPEN is enabled. Browser will stay open. Press resume in inspector to continue...');
      await page.pause();
    } else {
      const pauseDuration = parseInt(process.env.PAUSE_ON_FINISH || '2000', 10);
      logger.info(`⏸️  Pausing for ${pauseDuration}ms before browser closes...`);
      await page.waitForTimeout(pauseDuration);
    }
  });

  // ─────────────────────────────────────────────────────────────
  //  POSITIVE: Update policy → Create compliant user
  // ─────────────────────────────────────────────────────────────

  test('SYS_USERPOLICY_001: update password policy then create user compliant with it', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const passwordPolicyPage = new PasswordPolicyPage(page, context);
    const userSetupPage = new UserSetupWithPolicyPage(page, context);

    // ── Step 1: Login ──
    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    await page.mouse.move(0, 300);

    // ── Step 2: Update password policy ──
    logger.info('Step 2: Updating password policy');
    await passwordPolicyPage.openPasswordPolicySection();

    await passwordPolicyPage.updatePasswordPolicyAndConfirm({
      minimumLength: '1',
      passwordHistory: '0',
      expiryDays: '365',
      alertDays: '10',
      lockAfterAttempts: '23',
      releaseLockMinutes: '1',
      maxPasswordLength: '20',
      minUpperCase: '1',
      minLowerCase: '1',
      minNumeric: '1',
      minSpecialChar: '1',
    });

    await passwordPolicyPage.closePasswordPolicyDialog();

    await page.screenshot({
      path: `screenshots/systemconfig_password_policy_updated_${Date.now()}.png`,
      fullPage: true,
    });

    logger.info('Password policy updated successfully');

    // ── Step 3: Create a user that complies with the new policy ──
    logger.info('Step 3: Creating user compliant with password policy');

    const result = await userSetupPage.runUserCreationWithPolicyFlow({
      description: 'random',
      invalidEmail: 'uniqueemail',
      password: 'Sachin@123',
    });

    await page.screenshot({
      path: `screenshots/systemconfig_user_with_policy_${result.userId}.png`,
      fullPage: true,
    });

    logger.info(`User created successfully: userId=${result.userId}, email=${result.email}`);
  });

  // ─────────────────────────────────────────────────────────────
  //  NEGATIVE: Password policy violation tests
  //
  //  These tests verify that the password policy rejects non-compliant
  //  passwords when creating a user. The app shows a validation error
  //  and prevents the save.
  // ─────────────────────────────────────────────────────────────

  test('SYS_USERPOLICY_NEG_001: reject password that starts with a number (must start with alphabet)', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const userSetupPage = new UserSetupWithPolicyPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    await page.mouse.move(0, 300);

    const { userId } = await userSetupPage.prepareFormForNegativeTest();

    // Password starts with digit → violates "Start password with alphabet"
    await userSetupPage.fillFormAndTrySave(
      userId, 'test@gmail.com', '1Sachin@abc',
      'Password must start with alphabet'
    );
  });

  test('SYS_USERPOLICY_NEG_002: reject password without uppercase letter', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const userSetupPage = new UserSetupWithPolicyPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    await page.mouse.move(0, 300);

    const { userId } = await userSetupPage.prepareFormForNegativeTest();

    // No uppercase → violates min 1 uppercase requirement
    await userSetupPage.fillFormAndTrySave(
      userId, 'test@gmail.com', 'sachin@123',
      'Password must have minimum 1 upper case character'
    );
  });

  test('SYS_USERPOLICY_NEG_003: reject password without lowercase letter', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const userSetupPage = new UserSetupWithPolicyPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    await page.mouse.move(0, 300);

    const { userId } = await userSetupPage.prepareFormForNegativeTest();

    // No lowercase → violates min 1 lowercase requirement
    await userSetupPage.fillFormAndTrySave(
      userId, 'test@gmail.com', 'SACHIN@123',
      'Password must have minimum 1 lower_case_character'
    );
  });

  test('SYS_USERPOLICY_NEG_004: reject password without numeric character', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const userSetupPage = new UserSetupWithPolicyPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    await page.mouse.move(0, 300);

    const { userId } = await userSetupPage.prepareFormForNegativeTest();

    // No numeric → violates min 1 numeric requirement
    await userSetupPage.fillFormAndTrySave(
      userId, 'test@gmail.com', 'Sachin@abc',
      'Password must have minimum 1 numeric character'
    );
  });

  test('SYS_USERPOLICY_NEG_005: reject password without special character', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const userSetupPage = new UserSetupWithPolicyPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    await page.mouse.move(0, 300);

    const { userId } = await userSetupPage.prepareFormForNegativeTest();

    // No special char → violates min 1 special character requirement
    await userSetupPage.fillFormAndTrySave(
      userId, 'test@gmail.com', 'Sachin123',
      'Password must have minimum 1 non alphanumeric(Special) character(s)'
    );
  });

  test('SYS_USERPOLICY_NEG_006: reject password that contains the user ID', async ({ page, context }) => {
    test.setTimeout(15 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const userSetupPage = new UserSetupWithPolicyPage(page, context);

    const user = await testDataManager.getUserCredentials('all');
    expect(user).toBeDefined();

    await loginPage.loginWithPropertySelection(user.username, user.password, 2);
    await page.mouse.move(0, 300);

    const { userId } = await userSetupPage.prepareFormForNegativeTest();

    // Password contains userId → violates "Password must not contain user id"
    const passwordWithUserId = `${userId}@Abc1`;
    await userSetupPage.fillFormAndTrySave(
      userId, 'test@gmail.com', passwordWithUserId,
      'Password must not contain'
    );
  });
});
