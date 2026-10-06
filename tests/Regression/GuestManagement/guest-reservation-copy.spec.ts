import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { PageFactory } from '../../../src/core/PageFactory';
import { LoginPage } from '../../../src/pages/LoginPage';
import { GuestReservationCopyPage } from '../../../src/pages/Regression/GuestReservationCopyPage';
import { getUserByIndexFromExcel } from '../../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../../src/utils/PropertyDataProvider';

/**
 * Test: Guest Reservation — Copy Details flow (Regression).
 *
 * Opens an existing CONFIRMED reservation from the Guest Management grid,
 * uses More → Copy Details to clone it into the Quick Reservation dialog,
 * submits via Confirm & Continue → Copy Options (Ok) → confirmation letter
 * prompt (No), and verifies that a NEW booking was created carrying the
 * source reservation's details (same guest last name, different confirmation
 * number, success alert shown).
 *
 * All user/property data is selected from Excel (never hardcoded).
 */
test.describe.serial('Guest Reservation Copy Details - Regression', () => {

  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (dialog) => {
      logger.info(`Handling dialog: ${dialog.type()} - ${dialog.message()}`);
      await dialog.accept();
    });
  });

  test('Create new booking by copying details from an existing reservation', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000);

    // Page objects created via PageFactory (framework convention)
    const loginPage = PageFactory.create(page, context, LoginPage);
    const copyPage = PageFactory.create(page, context, GuestReservationCopyPage);

    // ── Excel-based user + property selection (never hardcoded) ──
    const user = getUserByIndexFromExcel(0); // SACH
    expect(user, 'User at index 0 must exist in test-data/users.xlsx').toBeDefined();
    const prop = getPropertyByIndexFromExcel(3); // WEBWE (Webwish Hotel) on dev
    expect(prop, 'Property at index 3 must exist in test-data/properties.xlsx').toBeDefined();

    let sourceConfirmationNo = '';
    let sourceLastName = '';
    let sourceReservationId = '';
    let copyFromId = '';
    let successMessage = '';
    let newConfirmationNo = '';

    // ── Step 1: Login with user + property from Excel ──
    await test.step('Login with user + property from Excel', async () => {
      logger.info('Logging in for Guest Reservation Copy Details flow');
      await loginPage.loginWithPropertySelection(user!.username, user!.password, prop!.index);
    });

    // ── Step 2: Navigate to Guest Management via sidebar ──
    await test.step('Navigate to Guest Management', async () => {
      await copyPage.navigateToGuestManagement();
    });

    // ── Step 3: Open the first reservation from the grid ──
    // MULTI-GUEST bookings (green "M" badge) hide the More toolbar on the
    // summary view — the page class drills into the guest via Stay Details
    // ⋮ → Reservation Details (DE/ view) which has More, then the
    // More → Copy Details flow proceeds as usual.
    await test.step('Open first reservation from the grid', async () => {
      const source = await copyPage.openFirstReservation();
      sourceConfirmationNo = source.confirmationNo;
      sourceLastName = source.lastName;
      sourceReservationId = source.reservationId;

      expect(sourceConfirmationNo, 'Source confirmation number should be captured').not.toBe('');
      expect(sourceLastName, 'Source guest last name should be captured').not.toBe('');
      logger.info(
        `Source reservation — conf no: ${sourceConfirmationNo}, last name: ${sourceLastName}, id: ${sourceReservationId}`
      );
    });

    // ── Step 4: More → Copy Details ──
    await test.step('Open More menu and click Copy Details', async () => {
      await copyPage.clickMoreButton();
      copyFromId = await copyPage.clickCopyDetails();
      expect(copyFromId, 'Copy dialog should show "Being copy From <reservation id>"').not.toBe('');
    });

    // ── Step 5: Verify the copy dialog is prefilled from the source ──
    await test.step('Verify copy dialog prefilled from source reservation', async () => {
      const info = await copyPage.verifyCopyDialogPrefilled();
      expect(info.confirmSelected, 'Confirm radio should be preselected in the copy dialog').toBeTruthy();
      expect(info.lastName, 'Last Name should be prefilled from the source reservation').toBe(sourceLastName);
      logger.info('Copy dialog prefilled correctly from source reservation');
    });

    // ── Step 6: Confirm & Continue on the copy dialog ──
    await test.step('Click Confirm & Continue on the copy dialog', async () => {
      await copyPage.clickConfirmAndContinue();
    });

    // ── Step 7: Handle the Copy Options dialog (Select All → Ok) ──
    await test.step('Handle Copy Options dialog (select all, Ok)', async () => {
      await copyPage.handleCopyOptionsDialog();
    });

    // ── Step 8: Handle the confirmation letter prompt ──
    await test.step('Handle confirmation letter prompt', async () => {
      await copyPage.handleConfirmationLetterPrompt();
    });

    // ── Step 9: Verify the copy succeeded ──
    await test.step('Verify new booking created successfully', async () => {
      successMessage = await copyPage.verifyCopySuccess();
      expect(successMessage, 'Success alert should mention Congratulations').toContain('Congratulations');
      expect(successMessage, 'Success alert should mention successfully').toContain('successfully');
      logger.info(`Copy success: ${successMessage}`);
    });

    // ── Step 10: Verify a NEW confirmation number was issued ──
    await test.step('Verify new confirmation number differs from source', async () => {
      newConfirmationNo = await copyPage.extractNewConfirmationNumber();
      expect(newConfirmationNo, 'New confirmation number should be shown in the copy dialog').not.toBe('');
      expect(
        newConfirmationNo,
        'New booking must have a different confirmation number than the source'
      ).not.toBe(sourceConfirmationNo);
      logger.info(`New confirmation number: ${newConfirmationNo} (source was ${sourceConfirmationNo})`);
    });

    // ── Step 11: Open the NEW booking and verify copied guest details ──
    await test.step('Open new booking and verify copied guest details', async () => {
      const openedConfNo = await copyPage.openBookingFromCopyDialog();
      expect(openedConfNo, 'Opened booking should show the new confirmation number').toBe(newConfirmationNo);

      const newLastName = await copyPage.readLastNameFromGuestDetailsSection();
      expect(
        newLastName,
        'New booking should carry the same guest last name as the source reservation'
      ).toBe(sourceLastName);
      logger.info('✅ New booking verified — copied details match the source reservation');
    });
  });
});
