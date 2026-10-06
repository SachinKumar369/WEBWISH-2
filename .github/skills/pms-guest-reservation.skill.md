---
name: PMS Guest Reservation
description: "Complete automation knowledge for Guest Management in WebWish PMS — creating reservations (with/without profile linking), waitlist reservations (create → assign room → confirm → cancel lifecycle), modifying bookings, cancelling reservations (grid + booking detail page), sidebar navigation, room selection, ng-select dropdown handling, shared browser sessions, confirmation/success flows."
globs:
  - "tests/Regression/GuestManagement/**"
  - "tests/**/guest-reservation*"
  - "src/pages/Regression/GuestReservationPage.ts"
  - "src/pages/Regression/GuestReservationWaitlistPage.ts"
  - "src/core/PageFactory.ts"
  - "src/pages/FrontDesk/GuestManagementPage.ts"
applyTo: "all"
---

# WebWish PMS — Guest Reservation Automation Skill

> **Use this skill** when creating, modifying, debugging, or reviewing any test that involves Guest Management, guest reservation creation, profile linking, skipping profile linking, cancelling reservations, modifying bookings, or the Quick Reservation dialog in WebWish PMS.

> **Five flows are supported:**
1. **With Profile Linking** — Enter last name → Advance Search → link an existing profile (auto-fills name/email)
2. **Without Profile Linking** — Enter last name → Close Advance Search → manually fill First Name + dropdowns
3. **Cancel Reservation (grid)** — Arrivals tab → select guest checkbox → Cancel Confirm → reason → Ok
4. **Waitlist Reservation** — Quick Reservation dialog → switch Confirm → Waitlist → "Waitlist & Continue"
5. **Waitlist Booking Lifecycle** — booking detail page → Assign Room (IN & VA) → Confirm → Cancel

> **Page objects are instantiated via PageFactory:** `PageFactory.create(page, context, PageClass)` (`src/core/PageFactory.ts`).
> **Multi-test lifecycles share ONE browser session** — see Section 10 (login once, reuse context).

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

# Waitlist lifecycle — create → assign IN&VA room → confirm → cancel
# (ONE shared browser, login happens only in test 1 — --workers=1 is REQUIRED)
$env:ENV='stage'; npx playwright test tests/Regression/GuestManagement/guest-reservation-waitlist.spec.ts --project=chromium --workers=1
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
| `src/pages/Regression/GuestReservationWaitlistPage.ts` | Page Object for Waitlist lifecycle (extends GuestReservationPage) |
| `tests/Regression/GuestManagement/guest-reservation.spec.ts` | Test spec — **with profile linking** |
| `tests/Regression/GuestManagement/guest-reservation-no-profile.spec.ts` | Test spec — **without profile linking** |
| `tests/Regression/GuestManagement/guest-reservation-cancel.spec.ts` | Test spec — **cancel reservation** (from grid) |
| `tests/Regression/GuestManagement/guest-reservation-waitlist.spec.ts` | Test spec — **waitlist lifecycle** (create → assign room → confirm → cancel, shared browser) |
| `src/pages/FrontDesk/GuestManagementPage.ts` | Older Guest Management page object (reference) |
| `src/pages/LoginPage.ts` | Login + property selection |
| `src/utils/UserDataProvider.ts` | Excel-based user credentials |
| `src/utils/PropertyDataProvider.ts` | Excel-based property data |
| `src/utils/ElementActions.ts` | Retry click, sendKeys, hover with 3-attempt + JS fallback |
| `src/core/BasePage.ts` | Base class: page, context, baseURL, navigate, takeScreenshot |
| `src/core/PageFactory.ts` | Page Factory — `PageFactory.create(page, context, PageClass)` |
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

### Template D — Waitlist Lifecycle (shared browser, 3 serial tests)
```typescript
import { test, expect, BrowserContext, Page } from '@playwright/test';
import logger from '../../../src/core/Logger';
import { PageFactory } from '../../../src/core/PageFactory';
import { LoginPage } from '../../../src/pages/LoginPage';
import { GuestReservationWaitlistPage } from '../../../src/pages/Regression/GuestReservationWaitlistPage';
import { getUserByUsernameFromExcel } from '../../../src/utils/UserDataProvider';

// ONE browser session for the whole suite — login happens only in test 1
let sharedContext: BrowserContext;
let sharedPage: Page;

// Cross-test hand-off (module-level — persists across serial tests in the worker)
let waitlistBookingUrl = '';
let waitlistBookingId = '';
let linkedGuestName = '';

test.describe.serial('Guest Waitlist Reservation - Regression', () => {

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
  });

  test.afterAll(async () => {
    // Framework convention — keep browser open for inspection when enabled
    if (process.env.KEEP_BROWSER_OPEN === 'true') await sharedPage.pause();
    await sharedContext?.close();
  });

  test('Create waitlist booking (ONLY login)', async () => {
    const page = sharedPage; const context = sharedContext;  // NOT the fixtures
    const loginPage = PageFactory.create(page, context, LoginPage);
    const waitlistPage = PageFactory.create(page, context, GuestReservationWaitlistPage);

    const user = getUserByUsernameFromExcel('CR01');
    await loginPage.loginWithPropertySelection(user!.username, user!.password);

    await waitlistPage.navigateToGuestManagement();
    await waitlistPage.clickNewReservation();
    await waitlistPage.clickNextOnStayDetailsWithRecovery();
    await waitlistPage.selectFirstAvailableRoom();
    await waitlistPage.clickNextOnRoomSelection();
    await waitlistPage.selectWaitlistOption();                  // ← Waitlist, not Confirm
    await waitlistPage.enterLastNameAndTriggerProfileSearch('Kumar');
    const name = await waitlistPage.linkFirstProfile();
    await waitlistPage.selectGuestClass();
    await waitlistPage.selectMarketSegment();
    await waitlistPage.selectBusinessSource();
    await waitlistPage.clickWaitlistAndContinue();             // ← "Waitlist & Continue"
    await waitlistPage.verifyWaitlistSuccess();                // ← "...waitlisted successfully"

    const booking = await waitlistPage.openBookingFromWaitlistSuccess();
    waitlistBookingUrl = booking.url;                          // hand off to tests 2 & 3
    waitlistBookingId = booking.bookingId;
    linkedGuestName = name;
  });

  test('Assign IN & VA room + confirm (same browser, NO login)', async () => {
    const page = sharedPage; const context = sharedContext;
    const waitlistPage = PageFactory.create(page, context, GuestReservationWaitlistPage);
    expect(waitlistBookingUrl).toBeTruthy();                   // guard: test 1 must have run

    await waitlistPage.openBookingByUrl(waitlistBookingUrl);
    expect((await waitlistPage.getBookingStatus()).toUpperCase()).toContain('WAIT');
    const room = await waitlistPage.assignRoomVacantInspected();  // first IN & VA tile
    expect(room.toUpperCase()).not.toBe('N/A');
    await waitlistPage.confirmWaitlistBooking();               // throws if room still N/A
    expect((await waitlistPage.getBookingStatus()).toUpperCase()).toContain('CONFIRMED');
  });

  test('Cancel the confirmed booking (same browser, NO login)', async () => {
    const page = sharedPage; const context = sharedContext;
    const waitlistPage = PageFactory.create(page, context, GuestReservationWaitlistPage);
    expect(waitlistBookingUrl).toBeTruthy();

    await waitlistPage.openBookingByUrl(waitlistBookingUrl);
    const msg = await waitlistPage.cancelConfirmedBooking();   // reason + remarks + Ok
    expect(msg.toLowerCase()).toContain('successfully');
    expect((await waitlistPage.getBookingStatus()).toUpperCase()).toContain('CANCEL');
  });
});
```

---

## 7. Reservation Flow C — Cancel Guest Reservation (from grid)

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

## 8. Waitlist Reservation Creation (Flow D)

> Same as Flow A until the Quick Reservation dialog — then switch **Confirm → Waitlist**.
> Verified live on stage (user CR01, property BDAR).

```
LOGIN → SIDEBAR → GUEST MANAGEMENT → NEW RESERVATION → STAY DETAILS
  → ROOM SELECTION → QUICK RESERVATION DIALOG → SELECT WAITLIST RADIO
  → ENTER LAST NAME → ADVANCE SEARCH → LINK PROFILE → DROPDOWNS
  → WAITLIST & CONTINUE → SUCCESS ("waitlisted successfully")
```

### Steps D1–D6: Same as Flow A Steps 1–6
(Login → sidebar → New Reservation → Next → select room via "+" → Next → dialog opens)

### Step D7: Select WAITLIST (Confirm is selected by default)
```typescript
const dialog = page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Quick Reservation' });

// Radio group: Waitlist / Confirm (default checked) / Hold / Walkin
// Click the VISIBLE LABEL — the radio input itself may be visually hidden
await dialog.locator('label').filter({ hasText: 'Waitlist' }).click();
await page.waitForTimeout(1000);

// Verify Waitlist checked + Confirm unchecked
expect(await page.getByRole('radio', { name: 'Waitlist' }).isChecked()).toBe(true);
expect(await page.getByRole('radio', { name: 'Confirm' }).isChecked()).toBe(false);

// The footer action button CHANGES: "Confirm & Continue" → "Waitlist & Continue"
const btnText = await page.locator('button').filter({ hasText: /Continue/ }).last().textContent();
expect(btnText).toContain('Waitlist');
```

### Steps D8–D12: Same as Flow A Steps 7–11
(Last name + Tab → Advance Search → link profile via `i.icon-size.mdi.mdi-link.n-icon-sz` → Guest Class / Market Segment / Business Source — first available options)

### Step D13: Click "Waitlist & Continue"
```typescript
// Scroll dialog body to bottom, then JS click (button intercepted by overlay)
await dialog.evaluate((d) => { const b = d.querySelector('.modal-body'); if (b) b.scrollTop = b.scrollHeight; });
await page.locator('button').filter({ hasText: 'Waitlist & Continue' }).first()
  .evaluate((el) => (el as HTMLElement).click());
```

### Step D14: Verify Waitlist Success
```typescript
// NO confirmation-letter prompt appears for waitlist (unlike Flow A Step 11)
// Success alert appears INSIDE the dialog as [role="alert"]:
//   "Congratulations, your reservation for <Guest> has been waitlisted successfully"
const alert = page.locator('[role="alert"]').filter({ hasText: /waitlist/i }).first();
await alert.waitFor({ state: 'visible', timeout: 15000 });
expect((await alert.textContent()).toLowerCase()).toContain('waitlisted');

// Dialog STAYS OPEN with buttons: "Open Booking" / "Print Registration" / "Back"
```

### Waitlist-Specific Gotchas
| Observation | Detail |
|-------------|--------|
| Confirm is default | Radio group defaults to Confirm — must explicitly select Waitlist |
| Button text changes | "Confirm & Continue" → **"Waitlist & Continue"** after selecting Waitlist |
| Rate code switches | Waitlist applies a waitlist rate code (e.g. WLKRO) |
| "Due On" field appears | In Payment Details — **NOT required**, flow completes without filling it |
| No confirmation letter | The "send confirmation letter?" SweetAlert does NOT appear for waitlist |
| Success wording | "...has been **waitlisted** successfully" (not "confirmed") |
| Success location | Inside the dialog as `[role="alert"]` — not a SweetAlert; dialog stays open |
| Profile link icon | Link icon is `i.icon-size.mdi.mdi-link.n-icon-sz` (first) — NOT the eye/view icon |

---

## 9. Waitlist Booking Lifecycle — Assign Room → Confirm → Cancel (Flow E)

> Operates on the **booking detail page** of a waitlist reservation.
> **Business rule: a room must be allotted (vacant + inspected) BEFORE confirming** — the page object enforces this and throws otherwise.

### Opening the Booking (two ways)
1. **Open Booking button** — on the waitlist success dialog (same session as creation)
2. **Deep link** — `page.goto('<base>/pms/SystemSetup/<MODULE_CODE>/SE/<bookingId>')`
   - bookingId parsed from the "Guest Details \<id\>" heading (strip non-digits)
   - each Playwright test gets a fresh context, so lifecycle tests share ONE browser (Section 10)

### Detail Page Structure (verified live on stage)
```
URL:     .../pms/SystemSetup/FDSK_QWGST01/SE/<bookingId>
Heading: "Guest Details <bookingId>"
Badge:   WAIT-LISTED → CONFIRMED → CANCELLED     (⚠ hyphenated!)
Room box: <div class="room-info">
            .room-type    (e.g. DMK)
            .room-number  ("N/A" until a room is assigned)
            .guest-name
            button "Assign Room"  →  "Change Room" after assignment
Footer:  Assign Room | Confirm                       (while WAIT-LISTED)
         Cancel | Checkin | View Cashiering | Print Registration   (after CONFIRMED)
```

**Status badge locator** — badge text is hyphenated (`WAIT-LISTED`):
```typescript
const badge = page.locator('.badge, [class*="badge"]')
  .filter({ hasText: /WAIT-?LISTED|CONFIRMED|CANCELLED|HOLD|WALK-?IN/i }).first();
```

### Step E1: Assign a Vacant & Inspected (IN & VA) Room
```typescript
// 1. Click "Assign Room" inside the room-info box
await page.locator('.room-info').getByRole('button', { name: /Assign Room/i }).click();

// 2. "Choose Room (<room type>)" popup opens
const chooseRoom = page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Choose Room' });
await chooseRoom.waitFor({ state: 'visible', timeout: 15000 });

// Filter chips: Dirty / Maid-In / Clean / Inspected / T-OOO / P-OOO / Re-Check / ALL
// Room tiles: button.room-btn with text "<roomNo> IN VA"
//   IN = Inspected, VA = Vacant  ← ONLY these are assignable
//   Dirty tiles show e.g. "DI VA" — do NOT pick those
const tile = chooseRoom.locator('button.room-btn').filter({ hasText: /IN\s+VA/ }).first();
await tile.click();

// 3. Popup closes INSTANTLY + SweetAlert "Details created/updated successfully." → OK
// 4. ⚠ RELOAD REQUIRED — room box stays stale ("N/A") until refresh:
await page.reload();
// After reload: .room-info .room-number shows e.g. "206", button reads "Change Room"
```

### Step E2: Confirm the Waitlist Booking
```typescript
// Guard: room number must NOT be "N/A" (business rule — page object throws otherwise)
// Click Confirm (footer — EXACT name to avoid other buttons)
await page.getByRole('button', { name: 'Confirm', exact: true }).click();

// SweetAlert: "Please Confirm / Are u want to Confirm these Guests.?" → Yes
await page.locator('.swal2-popup').waitFor({ state: 'visible', timeout: 10000 });
await page.locator('.swal2-popup').getByRole('button', { name: 'Yes' }).click();

// Success SweetAlert: "Details created/updated successfully." → OK
// ⚠ RELOAD REQUIRED — badge stays stale (WAIT-LISTED) until refresh → becomes CONFIRMED
// After reload: Confirm button gone; footer = Cancel | Checkin | Print Registration
```

### Step E3: Cancel the Confirmed Booking (from detail page)
> DIFFERENT from Flow C (Section 7) which cancels from the Guest Management grid.
> Here we cancel from the booking detail page after confirming.

```typescript
// Cancel button is UNIQUE on the detail page (exact name avoids dialog Cancel/Close)
await page.getByRole('button', { name: 'Cancel', exact: true }).click();

// "Cancel Reservation" dialog — both fields REQUIRED:
const dlg = page.locator('ngb-modal-window[role="dialog"]').filter({ hasText: 'Cancel Reservation' });

// Cancellation Reason* — ng-select; options render at PAGE level (no hardcoded values)
await dlg.locator('ng-select').first().locator('.ng-arrow-wrapper').click({ force: true });
await page.locator('.ng-option').first().evaluate((el) => (el as HTMLElement).click());

// Remarks* — textbox. Dialog has TWO textboxes: ng-select search input FIRST, Remarks LAST
await dlg.getByRole('textbox').last().fill('Cancelled via automation');

// Click Ok → SweetAlert "Details created/updated successfully." → OK
// ✓ Badge flips to "CANCELLED" IMMEDIATELY — no reload needed (reload only as fallback)
```

### Lifecycle Gotchas
| Issue | Solution |
|-------|----------|
| Badge text is `WAIT-LISTED` (hyphen) | Regex `/WAIT-?LISTED/` — plain `WAITLIST` will NOT match |
| Room box stale after Assign Room | **Must reload** — `.room-number` stays "N/A" until page refresh |
| Badge stale after Confirm | **Must reload** — badge stays WAIT-LISTED until page refresh |
| Cancel badge updates live | No reload needed after cancel (reload only as fallback if stale) |
| Remarks textbox confusion | `getByRole('textbox').last()` — ng-select search input is the FIRST textbox |
| "Cancel" vs "Cancel Confirm" | Detail-page button is exact **"Cancel"**; grid flow (Flow C) uses **"Cancel Confirm"** |
| Confirm button ambiguity | Use `exact: true` — footer has only one "Confirm" button |
| beforeunload on reload/goto | Playwright auto-accepts it in test runs (framework reload precedent) |
| No IN & VA rooms available | Assignment throws — nothing assignable for that room type |
| Already-assigned room | "Change Room" button present → assignment skipped, returns current room no |

**Key `GuestReservationWaitlistPage` methods (extends `GuestReservationPage`):**
| Method | Purpose |
|--------|---------|
| `selectWaitlistOption()` | Switch Confirm → Waitlist radio; verifies button text change |
| `clickWaitlistAndContinue()` | JS-click "Waitlist & Continue" (fallback: Confirm & Continue) |
| `verifyWaitlistSuccess()` | Reads "...waitlisted successfully" alert text |
| `openBookingFromWaitlistSuccess()` | Clicks Open Booking → returns `{ url, bookingId }` |
| `openBookingByUrl(url)` | Deep-link to detail page (goto with one retry for beforeunload) |
| `getBookingStatus()` | Reads WAIT-LISTED / CONFIRMED / CANCELLED badge text |
| `getAssignedRoomNumber()` | Reads `.room-info .room-number` ("N/A" when unassigned) |
| `assignRoomVacantInspected()` | Assign Room → first IN & VA tile → reload → returns room number |
| `confirmWaitlistBooking()` | Confirm → Yes → reload → asserts CONFIRMED (throws if room N/A) |
| `cancelConfirmedBooking(remarks?)` | Cancel → first reason + remarks → Ok → asserts CANCELLED |

---

## 10. Shared Browser Session Pattern (Multi-Test Lifecycle)

> Use when one test creates an entity and later tests act on it **without re-logging in**.
> Implemented in `guest-reservation-waitlist.spec.ts` (create → assign+confirm → cancel).

```typescript
import { test, expect, BrowserContext, Page } from '@playwright/test';

let sharedContext: BrowserContext;
let sharedPage: Page;

// Cross-test hand-off (module-level — persists across serial tests in the worker)
let bookingUrl = '';
let bookingId = '';
let guestName = '';

test.describe.serial('Lifecycle - Regression', () => {

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
  });

  test.afterAll(async () => {
    // Framework convention — keep browser open for inspection when enabled
    if (process.env.KEEP_BROWSER_OPEN === 'true') {
      await sharedPage.pause();
    }
    await sharedContext?.close();
  });

  test('1) Create entity — the ONLY login', async () => {
    const page = sharedPage;          // NOT the { page } fixture
    const context = sharedContext;
    const user = getUserByUsernameFromExcel('CR01');
    await loginPage.loginWithPropertySelection(user!.username, user!.password);
    // ... create flow ...
    bookingUrl = capturedUrl;         // hand off to later tests
  });

  test('2) Act on entity — same browser, NO login', async () => {
    const page = sharedPage;
    const context = sharedContext;
    expect(bookingUrl).toBeTruthy();  // guard: test 1 must have run
    // ... deep link + actions ...
  });
});
```

**Rules:**
- Never destructure `{ page, context }` fixtures — use `sharedPage` / `sharedContext`
- Only the FIRST test logs in (Excel-based user — never hardcode credentials)
- Later tests guard with `expect(bookingUrl).toBeTruthy()`
- Requires `--workers=1` so all tests run in the same worker
- Page objects via **PageFactory**: `PageFactory.create(page, context, PageClass)` (`src/core/PageFactory.ts`) — never `new` in new tests
- Cross-test state lives in module-level `let` variables (same worker = same module instance)

---

## 11. Framework Conventions to Follow

- **Base class:** All page objects extend `BasePage`
- **Logging:** Use `logger.info()`, `logger.warn()`, `logger.error()` — never `console.log()`
- **Element actions:** Use `this.elementActions.click(locator, description)` for standard clicks with retry
- **Screenshots:** `await page.screenshot({ path: 'screenshots/name.png', fullPage: true })`
- **Test steps:** Wrap in `await test.step('Description', async () => { ... })` for reporting
- **Test data:** Always use Excel-based providers, never hardcode credentials
- **Timeouts:** `test.setTimeout(10 * 60 * 1000)` for long business flows
- **Serial execution:** `test.describe.serial` for dependent tests
- **Checkbox selection:** Use `page.getByRole('checkbox')` — never `querySelector` for Angular checkboxes
- **PageFactory:** instantiate page objects via `PageFactory.create(page, context, PageClass)` — never `new` in new tests
- **Shared browser sessions:** for multi-test lifecycles see Section 10 — login once, reuse the context, `--workers=1`
- **Stale UI after actions:** Assign Room and Confirm on the detail page require a `page.reload()` before reading the badge/room number; Cancel updates the badge live
- **Status badge texts:** `WAIT-LISTED` (hyphenated), `CONFIRMED`, `CANCELLED` — match with `/WAIT-?LISTED|CONFIRMED|CANCELLED/i`
