# PMS Website Test Plan

## Application Overview

Comprehensive functional test plan for Web Wish PMS (qc2webwish.prologicfirst.in), covering authentication, property selection, dashboard access, and FrontOffice Setup > Parameter Setup > Predefined Charges workflows with positive, negative, and validation scenarios. All tests assume a fresh session state and independent execution.

## Test Scenarios

### 1. Authentication And Session

**Seed:** `tests/seed.spec.ts`

#### 1.1. AUTH_001 Valid Login With Registered User

**File:** `tests/Login/auth-001-valid-login.spec.ts`

**Steps:**
  1. Navigate to PMS login URL.
    - expect: Login page loads with User Id field, Password field, Log in button, and Forgot password link visible.
    - expect: No blocking script/runtime error is shown to user.
  2. Enter valid credentials: User Id = SACH and Password = Sachin@578.
    - expect: Credentials are accepted by inputs.
    - expect: Password remains masked.
  3. Click Log in.
    - expect: User is redirected to Select Property screen.
    - expect: Session is established without authentication error popup.

#### 1.2. AUTH_002 Invalid Password Shows Error

**File:** `tests/Login/auth-002-invalid-password.spec.ts`

**Steps:**
  1. Navigate to PMS login URL.
    - expect: Login page is displayed.
  2. Enter User Id = SACH and an invalid password.
    - expect: Inputs accept text.
  3. Click Log in.
    - expect: Login is rejected with validation/error message.
    - expect: User remains on login page and no property selection page is opened.

#### 1.3. AUTH_003 Empty Credentials Validation

**File:** `tests/Login/auth-003-empty-credentials.spec.ts`

**Steps:**
  1. Navigate to PMS login URL.
    - expect: Login page is displayed.
  2. Leave User Id and Password empty.
    - expect: Both fields remain blank.
  3. Click Log in.
    - expect: Required field validation appears for missing credentials.
    - expect: No navigation occurs.

#### 1.4. AUTH_004 Forgot Password Link Behavior

**File:** `tests/Login/auth-004-forgot-password.spec.ts`

**Steps:**
  1. Open login page and click Forgot password link.
    - expect: Forgot password flow is triggered (popup/page/notice based on implementation).
    - expect: No application crash or dead-end state occurs.

### 2. Property Selection And Entry

**Seed:** `tests/seed.spec.ts`

#### 2.1. PROP_001 Select Property From List

**File:** `tests/frontdesk/prop-001-select-property.spec.ts`

**Steps:**
  1. Login with valid credentials and wait for Select Property page.
    - expect: Property selection grid is shown with searchable list.
    - expect: At least one property row is displayed.
  2. Click login/action icon for a valid property (example: WEBIN).
    - expect: User is redirected to PMS dashboard.
    - expect: Header shows selected property context (property name/id).

#### 2.2. PROP_002 Property Search Filters Results

**File:** `tests/frontdesk/prop-002-property-search.spec.ts`

**Steps:**
  1. On Select Property page, type a partial property code/name in Search.
    - expect: Grid rows are filtered to matching properties only.
    - expect: Search remains responsive while typing.
  2. Clear search.
    - expect: Full property list is restored.

#### 2.3. PROP_003 Invalid Property Search

**File:** `tests/frontdesk/prop-003-invalid-property-search.spec.ts`

**Steps:**
  1. On Select Property page, search with non-existing text.
    - expect: No-matching state is shown or list becomes empty without UI break.
    - expect: User can still clear search and continue.

### 3. FrontOffice Setup Parameter Setup Predefined Charges

**Seed:** `tests/seed.spec.ts`

#### 3.1. PDC_001 Open Predefined Charges Screen

**File:** `tests/FrontOfficeSetup/parameter-setup/pdc-001-open-screen.spec.ts`

**Steps:**
  1. Login and select a property.
    - expect: Dashboard is loaded.
  2. Open sidebar: FrontOffice Setup > Parameter Setup > Predefined Charges.
    - expect: Predefined Charges page loads with toolbar buttons (Add, Edit, Delete), Search input, and data grid.
    - expect: No navigation error occurs.

#### 3.2. PDC_002 Duplicate Charge Code Validation

**File:** `tests/FrontOfficeSetup/parameter-setup/pdc-002-duplicate-validation.spec.ts`

**Steps:**
  1. Open Predefined Charges page and click Add.
    - expect: Predefined Charges modal opens with Charge Code, Description, Amount, FX Code, Item Code, and action buttons.
  2. Select an existing Charge Code from Charge Code combobox.
    - expect: Description auto-populates for selected code.
    - expect: System recognizes the record as existing.
  3. Trigger validation (tab/save per behavior).
    - expect: Duplicate validation message appears (for example Code Already Exists).
    - expect: User can acknowledge message and close modal safely.

#### 3.3. PDC_003 Delete Existing Charge Then Recreate Same Charge

**File:** `tests/FrontOfficeSetup/parameter-setup/pdc-003-delete-and-recreate.spec.ts`

**Steps:**
  1. Identify an existing Charge Code from grid (or from Charge Code combobox).
    - expect: A valid existing code is available for operation.
  2. Search by the identified code and open edit.
    - expect: Correct record opens in modal.
    - expect: Record details correspond to selected code.
  3. Set Active to off if required and click Update.
    - expect: Update success message appears and can be acknowledged.
  4. Click Delete and confirm Yes.
    - expect: Deletion confirmation dialog appears first.
    - expect: Success message appears after deletion.
    - expect: Deleted code is no longer present in current grid results.
  5. Click Add, select/enter the same code, enter Amount = 1000.00 in numeric field, then Save.
    - expect: Save succeeds with success message.
    - expect: Record is recreated and visible in search results.

#### 3.4. PDC_004 Amount Field Numeric Validation

**File:** `tests/FrontOfficeSetup/parameter-setup/pdc-004-amount-validation.spec.ts`

**Steps:**
  1. Open Add Predefined Charges modal.
    - expect: Amount field is visible and initialized (example 0.00).
  2. Try entering alphabetic/special characters in Amount.
    - expect: Only valid numeric format is accepted because field uses number-only behavior.
    - expect: Invalid characters are blocked/ignored or validation is shown.
  3. Enter valid amount with decimals (example 1000.00).
    - expect: Value is accepted and retained for save.

#### 3.5. PDC_005 Required Fields Validation On Save

**File:** `tests/FrontOfficeSetup/parameter-setup/pdc-005-required-fields.spec.ts`

**Steps:**
  1. Open Add Predefined Charges modal and leave required fields empty (Charge Code and Amount as applicable).
    - expect: Required markers are visible on mandatory fields.
  2. Click Save.
    - expect: Required-field validation is shown and save is prevented.
    - expect: Modal remains open for correction.

#### 3.6. PDC_006 Toolbar Search And Refresh

**File:** `tests/FrontOfficeSetup/parameter-setup/pdc-006-search-refresh.spec.ts`

**Steps:**
  1. Enter a valid code/description token in Search box.
    - expect: Grid filters matching rows.
  2. Use refresh/reset toolbar behavior.
    - expect: Grid reloads and returns to default listing state without stale filters.

#### 3.7. PDC_007 Cancel/Close Modal Without Save

**File:** `tests/FrontOfficeSetup/parameter-setup/pdc-007-close-without-save.spec.ts`

**Steps:**
  1. Open Add modal, change at least one field, then click Close.
    - expect: Modal closes without creating/updating record.
    - expect: No unintended success message appears.

### 4. Dashboard And Header Utilities

**Seed:** `tests/seed.spec.ts`

#### 4.1. DASH_001 Dashboard Widgets Render

**File:** `tests/frontdesk/dash-001-widgets.spec.ts`

**Steps:**
  1. Login, select property, and land on dashboard.
    - expect: Key tiles/widgets (Occupancy, Arrivals, In-house, Departures) are visible.
    - expect: Values render without UI overlap or broken icons.

#### 4.2. DASH_002 Header Global Search Presence

**File:** `tests/frontdesk/dash-002-global-search.spec.ts`

**Steps:**
  1. On dashboard, verify top Search input and in-page search control.
    - expect: Search controls are interactable.
    - expect: No JavaScript exception blocks typing.
  2. Enter sample query in dashboard search area.
    - expect: System triggers search behavior or presents expected no-result response without crash.

#### 4.3. DASH_003 Notification And Profile Menu Accessibility

**File:** `tests/frontdesk/dash-003-header-actions.spec.ts`

**Steps:**
  1. Click notification icon and profile/avatar controls.
    - expect: Menus/panels open correctly.
    - expect: User can close menus and continue navigation without page reload.
