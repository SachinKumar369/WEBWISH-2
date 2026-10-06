import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { PageFactory } from '../../../src/core/PageFactory';
import { LoginPage } from '../../../src/pages/LoginPage';
import { GuestManagementSharerPage } from '../../../src/pages/Regression/GuestManagementSharerPage';
import { getUserByIndexFromExcel } from '../../../src/utils/UserDataProvider';
import { getPropertyByIndexFromExcel } from '../../../src/utils/PropertyDataProvider';

const timestamp = Date.now();
/** Unique sharer last name per run (grid verification uses this) */
const sharerLastName = `SHR${String(timestamp).slice(-6)}`;
const sharerFirstName = 'RAHUL';
/** Times are REQUIRED by validation even though labels show no asterisk */
const arrivalTime = '12:00';
const departureTime = '11:30';

const modifyTimestamp = Date.now();
/** Unique contact number per run (persisted-value verification uses this) */
const newContactNumber = `98${String(modifyTimestamp).slice(-8)}`;
/** Email is READONLY for sharers by app design — applied as best-effort */
const newEmail = `sharer${String(modifyTimestamp).slice(-6)}@example.com`;

/**
 * Test: TEST_001_Sharer_Add — add a sharer to an existing reservation.
 *
 * Flow (verified live):
 *   Login (Excel user + property) → Front Desk → Guest Management
 *   → open first reservation → Sections → Sharers (modal)
 *   → ⊕ add button → Sharers form → fill details (Last Name*, First Name,
 *     arrival/departure times, Domicile Code* + Pay By* first options)
 *   → Save → "Details created/updated successfully." → OK
 *   → reopen Sections → Sharers → verify the sharer row in the grid.
 *
 * All user/property data is selected from Excel (never hardcoded).
 */
test.describe.serial('Sharer Management - Regression', () => {

  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (dialog) => {
      logger.info(`Handling dialog: ${dialog.type()} - ${dialog.message()}`);
      await dialog.accept();
    });
  });

  test('TEST_001_Sharer_Add', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000);

    // Page objects created via PageFactory (framework convention)
    const loginPage = PageFactory.create(page, context, LoginPage);
    const sharerPage = PageFactory.create(page, context, GuestManagementSharerPage);

    // ── Excel-based user + property selection (never hardcoded) ──
    const user = getUserByIndexFromExcel(0); // SACH
    expect(user, 'User at index 0 must exist in test-data/users.xlsx').toBeDefined();
    const prop = getPropertyByIndexFromExcel(3); // WEBWE (Webwish Hotel) on dev
    expect(prop, 'Property at index 3 must exist in test-data/properties.xlsx').toBeDefined();

    let sourceConfirmationNo = '';

    // ── Step 1: Login with user + property from Excel ──
    await test.step('Login with user + property from Excel', async () => {
      logger.info('Logging in for TEST_001_Sharer_Add');
      await loginPage.loginWithPropertySelection(user!.username, user!.password, prop!.index);
    });

    // ── Step 2: Navigate to Guest Management via sidebar ──
    await test.step('Navigate to Guest Management', async () => {
      await sharerPage.navigateToGuestManagement();
    });

    // ── Step 3: Find a reservation that supports sharer add ──
    // Scans grid rows. MULTI-GUEST bookings (green "M" badge) hide Sections
    // on the summary view — the page class drills into a guest via Stay
    // Details ⋮ → Reservation Details (DE/ view). If the Sharer Details
    // modal shows NO + button the reservation cannot take more guests —
    // modals close and the NEXT reservation is tried via Guest Management.
    // Leaves the Sharer Details modal open with the + button visible.
    await test.step('Find a reservation that supports sharer add', async () => {
      const source = await sharerPage.openReservationWithSharerAddSupport();
      sourceConfirmationNo = source.confirmationNo;
      expect(sourceConfirmationNo, 'Source confirmation number should be captured').not.toBe('');
      logger.info(`Source reservation — conf no: ${sourceConfirmationNo}, guest: ${source.lastName}`);
    });

    // ── Step 4: Click the ⊕ add button (Sharers form opens) ──
    await test.step('Click + add sharer button', async () => {
      await sharerPage.clickAddSharerButton();
    });

    // ── Step 5: Fill sharer details ──
    await test.step('Fill sharer details', async () => {
      await sharerPage.fillSharerDetails({
        lastName: sharerLastName,
        firstName: sharerFirstName,
        arrivalTime,
        departureTime,
      });
    });

    // ── Step 6: Save and verify the success popup ──
    await test.step('Save sharer and verify success', async () => {
      await sharerPage.clickSaveInAddModal();
      const message = await sharerPage.handleSharerSuccessPopup();
      expect(message, 'Success popup should confirm the save').toContain('Details created/updated successfully');
    });

    // ── Step 7: Verify the sharer row appears in the grid ──
    await test.step('Verify sharer in the Sharer Details grid', async () => {
      const expectedName = `${sharerLastName} ${sharerFirstName}`;
      const found = await sharerPage.verifySharerInGrid(expectedName);
      expect(found, `Sharer "${expectedName}" should appear in the Sharer Details grid`).toBeTruthy();
      logger.info(`✅ TEST_001_Sharer_Add complete — sharer "${expectedName}" added to reservation ${sourceConfirmationNo}`);
    });
  });

  /**
   * Test: TEST_002_Sharer_Modify — modify an EXISTING sharer (no creation).
   *
   * Verified-live flow:
   *   Login → Guest Management → find a reservation that ALREADY has sharers
   *   (if a sharer exists there is NO need to create one) → close the Sharer
   *   Details popup → SE summary view → the sharer's own stay (Stay #N) →
   *   its ⋮ → Reservation Details → the SHARER's per-guest view → pencil
   *   next to Guest Details → dialog → modify Contact Number (+ Email
   *   best-effort — readonly for sharers by app design) → Update →
   *   "Details created/updated successfully." → verify contact persisted.
   */
  test('TEST_002_Sharer_Modify', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000);

    const loginPage = PageFactory.create(page, context, LoginPage);
    const sharerPage = PageFactory.create(page, context, GuestManagementSharerPage);

    const user = getUserByIndexFromExcel(0); // SACH
    expect(user, 'User at index 0 must exist in test-data/users.xlsx').toBeDefined();
    const prop = getPropertyByIndexFromExcel(3); // WEBWE
    expect(prop, 'Property at index 3 must exist in test-data/properties.xlsx').toBeDefined();

    let reservationConfNo = '';
    let sharerName = '';

    // ── Step 1: Login with user + property from Excel ──
    await test.step('Login with user + property from Excel', async () => {
      logger.info('Logging in for TEST_002_Sharer_Modify');
      await loginPage.loginWithPropertySelection(user!.username, user!.password, prop!.index);
    });

    // ── Step 2: Navigate to Guest Management via sidebar ──
    await test.step('Navigate to Guest Management', async () => {
      await sharerPage.navigateToGuestManagement();
    });

    // ── Step 3: Find a reservation that ALREADY has an existing sharer ──
    // (no need to CREATE a sharer — scan grid rows until one with sharers opens;
    //  multi-guest M-badge bookings drill down via ⋮ → Reservation Details)
    await test.step('Find a reservation with an existing sharer', async () => {
      const source = await sharerPage.openReservationWithExistingSharer();
      reservationConfNo = source.confirmationNo;
      sharerName = source.sharerName;
      expect(reservationConfNo, 'Reservation confirmation number should be captured').not.toBe('');
      expect(sharerName, 'An existing sharer name should be captured from the grid').not.toBe('');
      logger.info(`Existing sharer found — "${sharerName}" on reservation ${reservationConfNo}`);
    });

    // ── Step 4: Close the Sharer Details popup ──
    await test.step('Close the Sharer Details popup', async () => {
      await sharerPage.closeVisibleSharerModals();
    });

    // ── Step 5: Open the SHARER's Reservation Details (stay ⋮ → Reservation Details) ──
    await test.step("Open the sharer's Reservation Details via stay ⋮", async () => {
      await sharerPage.openSharerReservationDetails(sharerName, reservationConfNo);
    });

    // ── Step 6: Modify the sharer's Contact Number (+ email best-effort) and save ──
    await test.step('Modify sharer contact number and save', async () => {
      const result = await sharerPage.modifySharerDetails({
        contactNumber: newContactNumber,
        email: newEmail,
      });
      expect(result.successMessage, 'Success popup should confirm the update').toContain(
        'Details created/updated successfully'
      );
      expect(
        result.contactPersisted,
        `Contact Number ${newContactNumber} should be visible on the sharer's page after save`
      ).toBeTruthy();
    });

    // ── Step 7: Completion log ──
    await test.step('Log completion', async () => {
      logger.info(
        `✅ TEST_002_Sharer_Modify complete — sharer "${sharerName}" contact updated to ${newContactNumber} on reservation ${reservationConfNo}`
      );
    });
  });
});
