---
name: PMS Guest Reservation
description: "Complete automation knowledge for Guest Management in WebWish PMS — creating reservations (with/without profile linking), modifying bookings, cancelling reservations, sidebar navigation, room selection, ng-select dropdown handling, confirmation/success flows."
globs:
  - "tests/Regression/GuestManagement/**"
  - "tests/**/guest-reservation*"
  - "src/pages/Regression/GuestReservationPage.ts"
  - "src/pages/FrontDesk/GuestManagementPage.ts"
applyTo: "all"
---

# WebWish PMS — Guest Reservation Automation Skill

> **Use this skill** when creating, modifying, debugging, or reviewing any test that involves Guest Management, guest reservation creation, profile linking, skipping profile linking, cancelling reservations, modifying bookings, or the Quick Reservation dialog in WebWish PMS.

> **Three reservation flows are supported:**
1. **With Profile Linking** — Enter last name → Advance Search → link an existing profile (auto-fills name/email)
2. **Without Profile Linking** — Enter last name → Close Advance Search → manually fill First Name + dropdowns
3. **Cancel Reservation** — Select guest checkbox → Cancel Confirm → select reason → confirm

---

## 1. Environment Configuration

| Environment | URL | User | Password | Property |
|-------------|-----|------|----------|----------|
| **Stage** | `https://qc2.prologicfirst.in/Webwish_APP/login/VbVTQ%2BZtgWSQXorhA7ugdw%3D%3D` | CR01 | Sachin@578 | BDAR (auto-select, single property) |
| **Dev** | `https://qc2webwish.prologicfirst.in/Webwish_APP/login/z6cQJcxmrEbhhFXqdoj64Q%3D%3D` | SACH | Sachin@578 | Multiple — requires selection |

**Run with stage environment:**
```powershell
# Create reservation — with profile linking
$env:ENV='stage'; npx playwright test tests/Regression/GuestManagement/guest-reservation.spec.ts --project=chromium --workers=1

# Create reservation — without profile linking
$env:ENV='stage'; npx playwright test tests/Regression/GuestManagement/guest-reservation-no-profile.spec.ts --project=chromium --workers=1

# Cancel reservation
$env:ENV='stage'; npx playwright test tests/Regression/GuestManagement/guest-reservation-cancel.spec.ts --project=chromium --workers=1
```

**Config files:**
- `config/.env.stage` — loaded when `ENV=stage`
- `config/.env.dev` — loaded when `ENV=dev` (default)
- `playwright.config.ts` reads `process.env.ENV` to pick the correct file

**Test data (Excel-based):**
- `test-data/users.xlsx` — columns: `index, username, password, email, role, environment, enabled`
- `test-data/properties.xlsx` — columns: `code, name, index, module, enabled, url`
- Access via: `getUserByUsernameFromExcel('CR01')`, `getPropertyByIndexFromExcel(0)`

---

## 2. Reservation Flow A — With Profile Linking (Step by Step)

```
LOGIN → SIDEBAR → GUEST MANAGEMENT → NEW RESERVATION → STAY DETAILS
  → ROOM SELECTION → QUICK RESERVATION DIALOG → ENTER LAST NAME
  → ADVANCE SEARCH → LINK PROFILE → DROPDOWNS → CONFIRM & CONTINUE
  → CONFIRMATION PROMPT → SUCCESS
```

### Step 1: Login
```typescript
const user = getUserByUsernameFromExcel('CR01');
const loginPage = new LoginPage(page, context);
// Pass undefined for property if only 1 exists (auto-selects)
await loginPage.loginWithPropertySelection(user!.username, user!.password);
```

### Step 2: Navigate to Guest Management via Sidebar
```typescript
// CRITICAL: Sidebar is hidden — must hover left edge to reveal it
await page.mouse.move(0, 400);
await page.waitForTimeout(500);

// Click Front Desk (expands sub-menu)
await page.getByRole('link', { name: /Front Desk/ }).click();
await page.waitForTimeout(300);

// Click Guest Management
await page.getByRole('link', { name: /Guest Management/ }).click();
await page.waitForTimeout(2000);

// Verify page loaded
await expect(page.getByRole('heading', { name: 'Guest Management' })).toBeVisible();
```

**Sidebar structure (Front Desk sub-menu):**
```
Front Desk
  ├─ Booking Calendar
  ├─ Guest Management      ← target
  ├─ Group Management
  ├─ Special Accounts
  └─ Task Management
```

### Step 3: Click New Reservation
```typescript
await page.getByRole('button', { name: 'New Reservation' }).click();
// Stay Details form opens with date range, pax, booked thru
```

### Step 4: Click Next on Stay Details
```typescript
await page.getByRole('button', { name: 'Next' }).click();
// Room selection grid loads — wait for table tbody
```

### Step 5: Select a Room
```typescript
// Wait for room grid to be visible
await page.locator('table tbody').waitFor({ state: 'visible', timeout: 20000 });

// Click "+" on the first room type
const addBtn = page.getByRole('button', { name: '+' }).first();
await addBtn.click();

// Verify count changed from 0 to 1 (room was selected)
// A tab appears: "08/09/2026-09/09/2026 Adult:1"

// Click Next
await page.getByRole('button', { name: 'Next' }).click();
```

### Step 6: Quick Reservation Dialog Opens
```typescript
// Wait for dialog
const dialog = page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Quick Reservation' });
await dialog.waitFor({ state: 'visible', timeout: 15000 });
```

**Dialog contents:**
- Radio buttons: Waitlist / **Confirm** (default) / Hold / Walkin
- Guest Details: Last Name*, First Name, Title, Contact, Email, Domicile Code, Guest Class*, Market Segment*, Business Source*, Booked Thru
- Stay Details: Arrival/Departure, Room No, Rate Code, Agreed Rate, Currency
- Bill Summary with Due Amount
- Buttons: **Confirm & Continue**, Close

### Step 7: Enter Last Name + Trigger Profile Search
```typescript
const lastNameInput = page.locator('#lst_nme').getByRole('textbox');
await lastNameInput.fill('Kumar');
await lastNameInput.press('Tab');  // ← Triggers Advance Search dialog
```

### Step 8: Profile Linking (Advance Search Dialog)
```typescript
// Wait for Advance Search dialog
const searchDialog = page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Advance Search' });
await searchDialog.waitFor({ state: 'visible', timeout: 10000 });

// Profile table has columns: Profile Id, Name, Firm Name, Phone No, City, [Actions]
// Actions column has TWO icons per row:
//   First icon (👁 eye/󰈈): Opens profile detail view — DO NOT CLICK
//   Second icon (🔗 link/󰌷): Links profile to reservation — CLICK THIS

const linkButton = searchDialog.locator('tbody tr').first()
  .locator('.d-flex.justify-content-end > div').nth(1);  // nth(1) = second icon = link

await linkButton.evaluate((el) => (el as HTMLElement).click());
// Advance Search dialog closes, Quick Reservation populates:
//   Last Name, First Name, Profile Id, Email from linked profile
```

> ⚠️ **Common mistake:** Clicking the first icon (eye) opens a Profile detail dialog instead of linking. Always use `.nth(1)`.

---

## 2B. Reservation Flow B — Without Profile Linking

After Step 7 (Enter Last Name + Trigger Profile Search), the flow diverges:

### Step 8B: Close Advance Search Dialog (Skip Profile Linking)
```typescript
// Instead of linking a profile, close the Advance Search dialog
// The close button is the × in the modal header, or a "Close" button
const closeBtn = advanceSearchDialog.locator('.btn-close, button[data-bs-dismiss="modal"], .modal-header button').first();
const closeVisible = await closeBtn.isVisible({ timeout: 3000 }).catch(() => false);

if (closeVisible) {
  await closeBtn.evaluate((el) => (el as HTMLElement).click());
} else {
  // Fallback: press Escape
  await page.keyboard.press('Escape');
}
await page.waitForTimeout(1000);

// Verify dialog is closed
const stillVisible = await advanceSearchDialog.isVisible({ timeout: 3000 }).catch(() => false);
if (stillVisible) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
}
```

### Step 9B: Enter First Name Manually
```typescript
// When no profile is linked, First Name must be filled manually
const firstNameInput = dialog.locator('div').filter({ hasText: /^First Name$/ }).getByRole('textbox');
await firstNameInput.click();
await firstNameInput.fill('Rahul');
```

### Step 10B–12B: Select Dropdowns + Confirm & Continue + Handle Prompt + Verify
> Same as Flow A — Steps 9–12 (Select Guest Class → Market Segment → Business Source → Confirm & Continue → Handle Confirmation Letter → Verify Success).

**Flow B complete flow:**
```
LOGIN → SIDEBAR → GUEST MANAGEMENT → NEW RESERVATION → STAY DETAILS
  → ROOM SELECTION → QUICK RESERVATION DIALOG → ENTER LAST NAME
  → ADVANCE SEARCH → CLOSE (no link) → ENTER FIRST NAME
  → DROPDOWNS → CONFIRM & CONTINUE → CONFIRMATION PROMPT → SUCCESS
```

---

### Step 9: Select Dropdowns — NO HARDCODED VALUES

**Always click the dropdown and pick the first available option. Never hardcode values.**

```typescript
private async selectFirstAvailableDropdownOption(dropdown: Locator, description: string): Promise<void> {
  const arrowWrapper = dropdown.locator('.ng-arrow-wrapper');
  await arrowWrapper.scrollIntoViewIfNeeded();
  await arrowWrapper.click({ force: true });
  await this.page.waitForTimeout(1500);

  // Options render at PAGE level, outside the dialog
  const selectors = ['.ng-option', '.ng-dropdown-panel-item', '[role="option"]'];
  for (const sel of selectors) {
    const firstOption = this.page.locator(sel).first();
    if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await firstOption.textContent().catch(() => 'Unknown');
      await firstOption.evaluate((el) => (el as HTMLElement).click());
      await this.page.waitForTimeout(500);
      logger.info(`✅ ${description} selected: ${text.trim()}`);
      return;
    }
  }
}
```

**ng-select dropdowns to fill (in order):**
| Dropdown | Label Text | Notes |
|----------|-----------|-------|
| Guest Class | `Guest Class*` | Often pre-filled from profile — skip if already set |
| Market Segment | `Market Segment*` | Required — must select |
| Business Source | `Business Source*` | Required — must select |

**Dropdown locator pattern:**
```typescript
const marketSegmentDropdown = dialog.locator('div')
  .filter({ hasText: /^Market Segment\*/ }).locator('ng-select');
```

### Step 10: Confirm & Continue
```typescript
// Scroll dialog to bottom to make button visible
await dialog.evaluate((d) => {
  const body = d.querySelector('.modal-body');
  if (body) body.scrollTop = body.scrollHeight;
});

// Use JS click — button is often intercepted by overlapping elements
await page.locator('button').filter({ hasText: 'Confirm & Continue' })
  .evaluate((el) => (el as HTMLElement).click());
```

### Step 11: Handle Confirmation Letter Prompt
```typescript
// SweetAlert popup: "Do you want to send the confirmation letter on save?"
const swalVisible = await page.locator('.swal2-popup').isVisible({ timeout: 5000 }).catch(() => false);
if (swalVisible) {
  const text = await page.locator('#swal2-html-container').textContent().catch(() => '');
  if (text.includes('confirmation letter')) {
    await page.locator('.swal2-popup').getByRole('button', { name: 'No' }).click();
  } else {
    await page.locator('.swal2-popup').getByRole('button', { name: 'OK' }).click();
  }
}
```

### Step 12: Verify Success
```typescript
// Success appears in [role="alert"] element
const alert = page.locator('[role="alert"]');
await alert.waitFor({ state: 'visible', timeout: 15000 });
const message = await alert.textContent();
expect(message).toContain('Congratulations');
expect(message).toContain('confirmed successfully');
// Full message: "Congratulations, your reservation for [Guest Name] has been confirmed successfully"
```

---

## 3. Critical Gotchas & Patterns

### ng-select Dropdowns Render Outside Dialogs
Angular `ng-select` renders option panels at the **document body level**, not inside `ngb-modal-window`. Dialog-scoped locators will NOT find options.

```typescript
// ❌ WRONG — scoped to dialog, won't find options
const option = dialog.locator('.ng-option');

// ✅ CORRECT — page-level locator
const option = this.page.locator('.ng-option').first();
```

Always use JS click on dropdown options:
```typescript
await option.evaluate((el) => (el as HTMLElement).click());
```

### Loader Overlay May Block Interactions
```typescript
await page.locator('.loader-overlay').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
```

### Element Intercepted by Dialog Overlays
Buttons like "Confirm & Continue" are often covered by sibling elements. Use JS click:
```typescript
await element.evaluate((el) => (el as HTMLElement).click());
```

### Closing Advance Search Without Linking (Flow B)
When creating a reservation without profile linking, close the Advance Search dialog using:
- `.btn-close` or `button[data-bs-dismiss="modal"]` in the modal header
- Fallback: `page.keyboard.press('Escape')`
- Always verify the dialog is actually closed before proceeding

### First Name Required When No Profile Linked (Flow B)
When no profile is linked, the First Name field must be filled manually — it won't be auto-populated:
```typescript
const firstNameInput = dialog.locator('div').filter({ hasText: /^First Name$/ }).getByRole('textbox');
await firstNameInput.fill('Rahul');
```

### Single Property = Auto-Select
When only 1 property exists (e.g., stage), property selection is skipped. Pass `undefined`:
```typescript
await loginPage.loginWithPropertySelection(username, password);
```

---

## 4. File Locations

| File | Purpose |
|------|---------|
| `src/pages/Regression/GuestReservationPage.ts` | Page Object for Guest Reservation flow (create + modify) |
| `src/pages/Regression/GuestReservationCancelPage.ts` | Page Object for Cancel Guest Reservation flow |
| `tests/Regression/GuestManagement/guest-reservation.spec.ts` | Test spec — **with profile linking** |
| `tests/Regression/GuestManagement/guest-reservation-no-profile.spec.ts` | Test spec — **without profile linking** |
| `tests/Regression/GuestManagement/guest-reservation-cancel.spec.ts` | Test spec — **cancel reservation** |
| `src/pages/FrontDesk/GuestManagementPage.ts` | Older Guest Management page object (reference) |
| `src/pages/LoginPage.ts` | Login + property selection |
| `src/utils/UserDataProvider.ts` | Excel-based user credentials |
| `src/utils/PropertyDataProvider.ts` | Excel-based property data |
| `src/utils/ElementActions.ts` | Retry click, sendKeys, hover with 3-attempt + JS fallback |
| `src/core/BasePage.ts` | Base class: page, context, baseURL, navigate, takeScreenshot |
| `src/core/Logger.ts` | Winston logger (use `logger.info/warn/error`) |

---

## 5. Available Dropdown Options (Stage)

| Dropdown | Options (first ~10) |
|----------|---------------------|
| Guest Class | Regular Guest, Complimentary, VIP |
| Market Segment | AIRLINE GROUPS, COMPLIMENTARY, CONFERENCES, CORPORATE CONTRACT, CORPORATE FIT, CORPORATE GROUPS, DIRECT FIT, EDUCATIONAL, EXHIBITIONS, FIT VIA TOUR OPERATOR |
| Business Source | AGODA, Direct Booking, Walk In, and others |

---

## 6. Test Templates

### Template A — With Profile Linking
```typescript
import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { GuestReservationPage } from '../../../src/pages/Regression/GuestReservationPage';
import { getUserByUsernameFromExcel } from '../../../src/utils/UserDataProvider';

test.describe.serial('Guest Reservation - Regression', () => {

  test('Create guest reservation via Guest Management', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const guestReservation = new GuestReservationPage(page, context);

    // Login
    const user = getUserByUsernameFromExcel('CR01');
    await loginPage.loginWithPropertySelection(user!.username, user!.password);

    // Execute flow
    await test.step('Navigate to Guest Management', async () => {
      await guestReservation.navigateToGuestManagement();
    });

    await test.step('Create reservation', async () => {
      await guestReservation.clickNewReservation();
      await guestReservation.clickNextOnStayDetails();
      await guestReservation.selectFirstAvailableRoom();
      await guestReservation.clickNextOnRoomSelection();
      await guestReservation.enterLastNameAndTriggerProfileSearch('Kumar');
      await guestReservation.linkFirstProfile();  // ← LINKS profile
      await guestReservation.selectGuestClass();
      await guestReservation.selectMarketSegment();
      await guestReservation.selectBusinessSource();
      await guestReservation.clickConfirmAndContinue();
      await guestReservation.handleConfirmationLetterPrompt();
      const result = await guestReservation.verifyReservationSuccess();
      expect(result).toContain('Congratulations');
    });
  });
});
```

### Template B — Without Profile Linking
```typescript
import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { GuestReservationPage } from '../../../src/pages/Regression/GuestReservationPage';
import { getUserByUsernameFromExcel } from '../../../src/utils/UserDataProvider';

test.describe.serial('Guest Reservation Without Profile - Regression', () => {

  test('Create guest reservation without linking profile', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const guestReservation = new GuestReservationPage(page, context);

    // Login
    const user = getUserByUsernameFromExcel('CR01');
    await loginPage.loginWithPropertySelection(user!.username, user!.password);

    // Execute flow
    await test.step('Navigate to Guest Management', async () => {
      await guestReservation.navigateToGuestManagement();
    });

    await test.step('Create reservation without profile', async () => {
      await guestReservation.clickNewReservation();
      await guestReservation.clickNextOnStayDetails();
      await guestReservation.selectFirstAvailableRoom();
      await guestReservation.clickNextOnRoomSelection();
      await guestReservation.enterLastNameAndTriggerProfileSearch('Kumar');
      await guestReservation.closeAdvanceSearchDialog();  // ← CLOSES search, no link
      await guestReservation.enterFirstName('Rahul');       // ← Manual first name
      await guestReservation.selectGuestClass();
      await guestReservation.selectMarketSegment();
      await guestReservation.selectBusinessSource();
      await guestReservation.clickConfirmAndContinue();
      await guestReservation.handleConfirmationLetterPrompt();
      const result = await guestReservation.verifyReservationSuccess();
      expect(result).not.toBe('No success message detected');
    });
  });
});
```

### Template C — Cancel Reservation
```typescript
import { test, expect } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { LoginPage } from '../../../src/pages/LoginPage';
import { GuestReservationCancelPage } from '../../../src/pages/Regression/GuestReservationCancelPage';
import { getUserByUsernameFromExcel } from '../../../src/utils/UserDataProvider';

test.describe.serial('Guest Reservation Cancel - Regression', () => {

  test('Cancel guest reservation via Guest Management', async ({ page, context }) => {
    test.setTimeout(10 * 60 * 1000);

    const loginPage = new LoginPage(page, context);
    const guestCancel = new GuestReservationCancelPage(page, context);

    // Login
    const user = getUserByUsernameFromExcel('CR01');
    await loginPage.loginWithPropertySelection(user!.username, user!.password);

    // Execute flow
    await test.step('Navigate to Guest Management', async () => {
      await guestCancel.navigateToGuestManagement();
    });

    await test.step('Cancel reservation', async () => {
      await guestCancel.switchToArrivals();
      await guestCancel.selectFirstGuestCard();   // ← Checkbox selection
      await guestCancel.clickCancelButton();       // ← "Cancel Confirm" button
      await guestCancel.selectCancellationReason(); // ← ng-select dropdown
      await guestCancel.confirmCancellation();      // ← Click OK
      const result = await guestCancel.verifyCancellationSuccess();
      expect(result).toContain('successfully');
    });
  });
});
```

---

## 7. Reservation Flow C — Cancel Guest Reservation

```
LOGIN → SIDEBAR → GUEST MANAGEMENT → ARRIVALS TAB → SELECT GUEST CHECKBOX
  → BOTTOM TOOLBAR APPEARS → CANCEL CONFIRM → CANCEL RESERVATION DIALOG
  → SELECT CANCELLATION REASON → OK → SUCCESS MESSAGE
```

### Step 1: Navigate to Guest Management (same as Flow A/B)

### Step 2: Switch to Arrivals Tab
```typescript
await page.getByText('Arrivals', { exact: true }).click();
await page.waitForTimeout(2000);
```

### Step 3: Select Guest by Checkbox
**CRITICAL:** In grid/table view, select guests by clicking the checkbox — NOT by clicking the row itself.
```typescript
// Use getByRole('checkbox') — nth(0) is header "select all", nth(1) is first data row
const checkboxes = page.getByRole('checkbox');
await checkboxes.nth(1).click();
await page.waitForTimeout(2000);
```

> ⚠️ Angular custom checkboxes — `querySelector('input[type="checkbox"]')` does NOT work. Always use `page.getByRole('checkbox')`.

### Step 4: Click Cancel Confirm in Bottom Toolbar
After selecting a checkbox, a **bottom action toolbar** appears with action buttons.

**Button text is "Cancel Confirm"** (not just "Cancel"). Must NOT confuse with the "Cancelled" legend filter button.

```typescript
// Find button containing "Cancel" that is NOT the legend filter
await page.evaluate(() => {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    const text = btn.textContent?.trim() || '';
    if (text.toLowerCase().includes('cancel') && btn.offsetParent !== null) {
      const isLegend = btn.closest('[aria-label="Shape legend"]') !== null ||
                      btn.className.includes('legend');
      if (!isLegend) {
        (btn as HTMLElement).click();
        return;
      }
    }
  }
});
await page.waitForTimeout(2000);
```

### Step 5: Cancel Reservation Dialog
The dialog contains:
- **"Cancellation Reason*"** — ng-select dropdown (required)
- **"Remarks*"** — text field (required)
- **"Ok"** / **"Close"** buttons

```typescript
const dialog = page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Cancel Reservation' });
await dialog.waitFor({ state: 'visible', timeout: 10000 });
```

### Step 6: Select Cancellation Reason
```typescript
// ng-select dropdown — options render at PAGE level, not inside dialog
const dropdown = dialog.locator('ng-select').first();
await dropdown.locator('.ng-arrow-wrapper').click({ force: true });
await page.waitForTimeout(1500);

// Pick first option from page-level selector
const firstOption = page.locator('.ng-option').first();
await firstOption.evaluate((el) => (el as HTMLElement).click());
await page.waitForTimeout(500);
```

### Step 7: Click OK to Confirm
```typescript
await dialog.getByRole('button', { name: 'Ok' }).evaluate((el) => (el as HTMLElement).click());
await page.waitForTimeout(2000);
```

### Step 8: Verify Success
```typescript
// SweetAlert popup: "Details created/updated successfully."
const swal = page.locator('#swal2-html-container');
await swal.waitFor({ state: 'visible', timeout: 15000 });
const message = await swal.textContent();
expect(message).toContain('Details created/updated successfully');
```

### Cancel Flow Gotchas

| Issue | Solution |
|-------|----------|
| Checkboxes not found with `querySelector` | Use `page.getByRole('checkbox')` — Angular custom checkboxes |
| "Cancelled" legend button clicked instead of Cancel Confirm | Filter by `!btn.className.includes('legend')` |
| Cancel button text is "Cancel Confirm" | Match with `.includes('cancel')` not exact match |
| ng-select options not found in dialog | Options render at **page level** — use `page.locator('.ng-option')` |
| Bottom toolbar not appearing | Ensure checkbox is actually clicked — wait 2s after click |

---

## 8. Framework Conventions to Follow

- **Base class:** All page objects extend `BasePage`
- **Logging:** Use `logger.info()`, `logger.warn()`, `logger.error()` — never `console.log()`
- **Element actions:** Use `this.elementActions.click(locator, description)` for standard clicks with retry
- **Screenshots:** `await page.screenshot({ path: 'screenshots/name.png', fullPage: true })`
- **Test steps:** Wrap in `await test.step('Description', async () => { ... })` for reporting
- **Test data:** Always use Excel-based providers, never hardcode credentials
- **Timeouts:** `test.setTimeout(10 * 60 * 1000)` for long business flows
- **Serial execution:** `test.describe.serial` for dependent tests
- **Checkbox selection:** Use `page.getByRole('checkbox')` — never `querySelector` for Angular checkboxes
