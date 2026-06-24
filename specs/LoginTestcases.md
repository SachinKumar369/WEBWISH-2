# Login Screen — Test Cases

> **Generated from current login flow** in `src/pages/Login/Login.ts`, `src/pages/Login/LoginScenariosPage.ts`, and `tests/Login/`.
>
> **Application:** WebWish — Prologic First India Pvt Ltd

---

## Table of Contents

| # | Category | Count |
|---|----------|-------|
| 1 | Positive Scenarios | 4 |
| 2 | Negative Scenarios | 6 |
| 3 | Edge Case Scenarios | 5 |
| 4 | UI / Visual Validation | 4 |
| 5 | Keyboard & Accessibility | 3 |
| 6 | Security / Injection | 2 |
| 7 | Account Lockout | 1 |
| 8 | Post-Login Flow | 2 |
| | **Total** | **27** |

---

## 1. Positive Scenarios

### TC_LGN_001 — Successful Login with Valid Credentials

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Fresh browser session; valid User Id and Password available |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to the Login page URL | Login page is displayed with logo, "Welcome!" heading, "Please login to your account" subtitle, User Id field, Password field, Log in button, and Forgot password link |
| 2 | Enter a valid User Id in the **User Id** field | Value is displayed in the input field |
| 3 | Enter the matching valid Password in the **Password** field | Characters are masked (input type = `password`) |
| 4 | Click the **Log in** button | Authentication request is submitted; no error dialog appears |
| 5 | Wait for navigation | User is redirected away from the `/login` URL to either **"Select a property to signin!"** screen or the **Dashboard** (`#page-topbar` visible) |

---

### TC_LGN_002 — Submit Login Using Enter Key from Password Field

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Fresh browser session; valid credentials available |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter valid User Id and valid Password | Both fields populated correctly |
| 3 | Ensure focus is in the **Password** field | Cursor is active in password input |
| 4 | Press **Enter** key | Form submits exactly once, equivalent to clicking Log in |
| 5 | Verify authenticated landing | User is redirected to property selection or dashboard; no error dialog shown |

---

### TC_LGN_003 — Login with Property Selection and Validate Dashboard

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Fresh browser session; valid credentials; account has property access |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter valid credentials and click Log in | "Select a property to signin!" screen appears |
| 3 | Select a property (index 0) | Dashboard loads |
| 4 | Verify dashboard elements | `#page-topbar` is visible; search box with placeholder "Search..." is visible; navigation buttons are visible |
| 5 | Open Shift menu | Shift options (Shift 1, Shift 2, Shift 3) are visible |
| 6 | Select Shift 1 | Topbar updates to reflect Shift 1 |
| 7 | Select Shift 2 | Topbar updates to reflect Shift 2 |
| 8 | Select Shift 3 | Topbar displays "3" confirming Shift 3 is active |

---

### TC_LGN_004 — Forgot Password Link Opens Recovery Flow (with User Id Pre-filled)

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Fresh browser session; a known User Id is available |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter a valid/known User Id in the **User Id** field | Value appears in the field |
| 3 | Click the **Forgot password?** link | Forgot Password screen loads |
| 4 | Verify Forgot Password screen elements | "Welcome" heading, "Forgot Password !" text, Email field (disabled), OTP input, "Resend OTP" button, Captcha input, "Request Password" button (disabled), "Back to login" link are all visible |
| 5 | Click **Back to login** | User returns to the Login page with all login controls visible |

---

## 2. Negative Scenarios

### TC_LGN_005 — Login with Invalid User Id

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter an invalid/non-existent User Id (e.g., `invalid.user`) and any password | Both fields accept text entry |
| 3 | Click **Log in** | Error dialog appears |
| 4 | Verify error message | Dialog contains **"Invalid User Id"** and error code **(606)** |
| 5 | Click **OK** on the error dialog | Dialog closes |
| 6 | Verify login form state | Login form remains visible and usable for retry; user is still on `/login` |

---

### TC_LGN_006 — Login with Valid User Id and Wrong Password

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Fresh browser session; known valid User Id |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter a valid User Id and an incorrect password (e.g., `WrongPass123!`) | Both fields populated |
| 3 | Click **Log in** | Error dialog appears |
| 4 | Verify error message | Dialog contains **"Invalid Password"** and lockout warning text **"unsuccessful attempts"** with error code **(475)** |
| 5 | Click **OK** | Dialog closes |
| 6 | Verify login form state | Login form remains interactive; user is still on `/login` |

---

### TC_LGN_007 — Empty Credentials Submission

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Leave both User Id and Password fields empty | Both fields remain empty |
| 3 | Click **Log in** | Authentication is blocked by client/server validation |
| 4 | Verify user is not authenticated | User remains on `/login`; no redirect occurs; no error dialog with misleading info appears |

---

### TC_LGN_008 — Username Only Submission (No Password)

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Fresh browser session; valid User Id available |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter a valid User Id; leave Password empty | User Id field populated; Password field empty |
| 3 | Click **Log in** | Authentication is rejected |
| 4 | Verify user stays on login | User remains on `/login` URL with error/feedback visible |

---

### TC_LGN_009 — Password Only Submission (No Username)

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Leave User Id empty; enter a password | Password field is populated and masked |
| 3 | Click **Log in** | Authentication is rejected |
| 4 | Verify user stays on login | User remains on `/login` URL with error/feedback visible |

---

### TC_LGN_010 — Forgot Password Click with Empty User Id

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Leave User Id field empty | Field remains empty |
| 3 | Click **Forgot password?** | Validation dialog appears |
| 4 | Verify validation message | Dialog contains **"Please input your user Id...!"** |
| 5 | Click **OK** | Dialog closes |
| 6 | Verify login form state | User remains on Login page with login controls visible |

---

## 3. Edge Case Scenarios

### TC_LGN_011 — Leading and Trailing Whitespace in User Id

| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Fresh browser session; valid User Id available |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter User Id with leading and trailing spaces (e.g., `"  12  "`) along with valid Password | Fields are populated |
| 3 | Click **Log in** | System either trims the User Id and proceeds, or rejects with explicit error |
| 4 | Verify outcome is deterministic | Either authenticated landing or clear error dialog — no ambiguous state |

---

### TC_LGN_012 — Case Sensitivity Behavior of User Id

| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Fresh browser session; known valid User Id |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login with the canonical casing of a known User Id and correct Password | Record baseline result (success or failure) |
| 2 | Dismiss any dialog and return to login page | Login form is visible |
| 3 | Enter the same User Id with inverted letter case (e.g., `abc` → `ABC`) with the same Password | Fields are populated |
| 4 | Click **Log in** | Behavior is consistent with baseline — case sensitivity is deterministic |
| 5 | Verify no unexpected silent failures | No blank screens or unhandled errors |

---

### TC_LGN_013 — Very Long Input Strings

| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter a very long string (256+ characters, e.g., `'x'.repeat(300)`) in both User Id and Password fields | UI remains stable; no layout break, crash, or script error |
| 3 | Click **Log in** | Request is handled gracefully with explicit rejection or validation feedback |
| 4 | Verify no unhandled exception | No blank screen or console error causing page failure |

---

### TC_LGN_014 — Special Characters and SQL-like Payload Strings

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter SQL-like payloads in both fields (e.g., `' OR 1=1; DROP TABLE users; --`) | Fields accept the input as plain text |
| 3 | Click **Log in** | Authentication is rejected safely; no client-side crash or DOM breakage |
| 4 | Verify no security-sensitive error leakage | Error dialog does not reveal database structure, stack traces, or internal details |
| 5 | Verify UI stability | Login form remains functional for subsequent attempts |

---

### TC_LGN_015 — Rapid/Double Click on Log in Button

| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter invalid credentials (e.g., `invalid.user` / `WrongPass123!`) | Fields populated |
| 3 | Double-click (or rapidly click) the **Log in** button | System handles duplicate submits safely |
| 4 | Verify single effective login flow | Only one error dialog appears (or controlled repeated failures); no overlapping dialogs |
| 5 | Click **OK** on dialog | Dialog closes; UI does not freeze |

---

## 4. UI / Visual Validation

### TC_LGN_016 — Core Login Form Elements and Labels

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page on desktop viewport | Page loads fully |
| 2 | Verify logo | Logo link is visible |
| 3 | Verify heading | "Welcome!" heading is displayed |
| 4 | Verify subtitle | "Please login to your account" text is visible |
| 5 | Verify User Id field | "User Id" label visible; input placeholder = "Enter username." |
| 6 | Verify Password field | "Password" label visible; input placeholder = "Enter password" |
| 7 | Verify Log in button | "Log in" button is visible and clickable |
| 8 | Verify Forgot password link | "Forgot password?" link is visible |
| 9 | Verify footer | "Prologic First India Pvt Ltd" copyright text is visible |

---

### TC_LGN_017 — Password Masking and Visibility Toggle

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter a password in the Password field | Input type is `password`; characters are masked with dots/bullets |
| 3 | Click the eye/visibility toggle icon once | Input type changes to `text`; password characters become visible in plain text |
| 4 | Click the toggle icon again | Input type reverts to `password`; characters are masked again |
| 5 | Verify toggle icon state changes | Icon visually reflects current visibility state |

---

### TC_LGN_018 — Carousel Indicator Interaction

| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Carousel indicators (Slide 1, Slide 2, Slide 3) are visible |
| 2 | Observe Slide 1 is active by default | First indicator has active/highlighted state |
| 3 | Click the Slide 2 indicator | Active indicator switches to Slide 2 |
| 4 | Click the Slide 3 indicator | Active indicator switches to Slide 3 |
| 5 | Verify form operability | Login form remains fully functional regardless of active slide |

---

### TC_LGN_019 — Responsive Behavior (Mobile and Desktop Viewports)

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open Login page on desktop viewport (1280×720) | Login form is readable and fully usable; no overlapping controls or clipped text |
| 2 | Resize to mobile viewport (390×844, iPhone-like user agent) | Login form remains readable; all controls (User Id, Password, Log in, Forgot password) are accessible |
| 3 | Enter invalid credentials on mobile and submit | Error dialog is fully visible and actionable on small screen |
| 4 | Dismiss dialog on mobile | Form returns to normal state; no layout issues |

---

## 5. Keyboard & Accessibility

### TC_LGN_020 — Tab Focus Order Through Login Controls

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Set focus to the User Id field | User Id input is focused |
| 3 | Press **Tab** | Focus moves to Password field |
| 4 | Press **Tab** | Focus moves to Log in button |
| 5 | Press **Tab** | Focus moves to Forgot password link |
| 6 | Verify logical order | Focus follows a predictable, accessible order through all interactive elements |

---

### TC_LGN_021 — Enter Key Activates Log in Button

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter valid credentials | Both fields populated |
| 3 | Navigate focus to Log in button using Tab | Log in button is focused |
| 4 | Press **Enter** or **Space** | Form submits equivalently to mouse click |
| 5 | Verify outcome | Authenticated landing or error dialog — same behavior as click |

---

### TC_LGN_022 — Error Dialog Focus Trap and Keyboard Dismissal

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Enter invalid credentials and click Log in | Error dialog appears |
| 2 | Verify focus moves to dialog | Focus is trapped within the error dialog |
| 3 | Verify OK button is focused or focusable | **OK** button is visible and can be activated |
| 4 | Press **Enter** to dismiss dialog | Dialog closes |
| 5 | Verify focus returns to login context | Login form is accessible; focus returns to a login control |

---

## 6. Security / Injection

### TC_LGN_023 — SQL Injection Attempt in User Id

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter `' OR 1=1; --` in User Id field and any text in Password | Fields accept input as plain text |
| 3 | Click **Log in** | Authentication is rejected with standard "Invalid User Id" error |
| 4 | Verify no SQL error or stack trace in UI | No database error messages, SQL syntax errors, or technical stack traces are displayed |
| 5 | Verify form is still usable | Login form remains fully functional |

---

### TC_LGN_024 — XSS Attempt in User Id Field

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Fresh browser session |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter `<script>alert('XSS')</script>` in User Id field | Field accepts input as plain text |
| 3 | Click **Log in** | No JavaScript alert pops up; input is treated as text |
| 4 | Verify page stability | No DOM manipulation, no script execution from user input |
| 5 | Verify error handling | Standard authentication error or validation — no reflected XSS |

---

## 7. Account Lockout

### TC_LGN_025 — Account Lockout After Repeated Failed Attempts

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Fresh browser session; known valid User Id; test account with sufficient remaining attempts |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open the Login page | Login form is visible |
| 2 | Enter valid User Id and wrong password; click **Log in** | Error dialog: **"Invalid Password. Your login will be deactivated after N unsuccessful attempts. (475)"** |
| 3 | Record remaining attempts (N) from dialog text | N is a number (e.g., 23) |
| 4 | Click **OK** | Dialog closes |
| 5 | Repeat steps 2–4, recording N each time | Each iteration decreases remaining attempts by 1 |
| 6 | Continue until remaining attempts reaches 1 | Final warning dialog is displayed |
| 7 | Click **OK** and attempt one more invalid login | Account is locked / deactivated; either a different error or complete lockout message appears |
| 8 | Verify no overlapping dialogs or UI freeze | UI remains stable throughout the lockout loop |

---

## 8. Post-Login Flow

### TC_LGN_026 — Select Property to Sign In

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Fresh browser session; valid multi-property credentials |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login with valid credentials | Redirected to property selection screen |
| 2 | Verify "Select a property to signin!" heading | Heading text is visible |
| 3 | Select the first available property | Dashboard loads |
| 4 | Verify dashboard topbar | `#page-topbar` is visible with property name |
| 5 | Verify search box | Search input with placeholder "Search..." is visible and interactive |

---

### TC_LGN_027 — Post-Login: Shift Menu Navigation

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Fresh browser session; valid credentials; property selected |

**Steps:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login and select a property | Dashboard loads |
| 2 | Click the Shift menu button | Shift dropdown/options panel opens |
| 3 | Verify shift options | Shift 1, Shift 2, and Shift 3 radio options are visible |
| 4 | Select **Shift 1** | Panel closes; topbar reflects Shift 1 |
| 5 | Reopen Shift menu and select **Shift 2** | Topbar updates to Shift 2 |
| 6 | Reopen Shift menu and select **Shift 3** | Topbar updates to display "3" confirming Shift 3 |
| 7 | Verify no errors during switching | No error dialogs; dashboard remains stable |

---

## Error Message Reference

| Error Code | Message Pattern | Trigger |
|------------|----------------|---------|
| **606** | `Invalid User Id. (606)` | Login with non-existent User Id |
| **475** | `Invalid Password. Your login will be deactivated after N unsuccessful attempts. (475)` | Login with valid User Id but wrong Password |
| — | `Please input your user Id...!` | Clicking Forgot Password with empty User Id field |

---

## Test Data Requirements

| Data | Description |
|------|-------------|
| `validUsername` | A known existing User Id in the system |
| `validPassword` | The correct password for the valid User Id |
| `invalidUsername` | A non-existent User Id (e.g., `invalid.user`) |
| `invalidPassword` | Any incorrect password (e.g., `WrongPass123!`) |
| `longString` | A 300-character string of repeated characters |
| `sqlPayload` | `' OR 1=1; DROP TABLE users; --` |
| `xssPayload` | `<script>alert('XSS')</script>` |
| `whitespaceUsername` | `"  {validUsername}  "` (with leading/trailing spaces) |

---

## Traceability Matrix

| Test Case | Page Object Method(s) | Source Spec File |
|-----------|-----------------------|------------------|
| TC_LGN_001 | `LoginPage.fillCredentials()`, `clickLogin()`, `expectAuthenticatedLanding()` | `Login.spec.ts` |
| TC_LGN_002 | `LoginPage.fillCredentials()`, `submitWithEnterFromPassword()`, `expectAuthenticatedLanding()` | `Login.spec.ts` |
| TC_LGN_003 | `LoginPage.loginWithPropertySelection()`, `LoginDashboardPage.expectDashboardLoaded()`, `validateShiftSwitchFlow()` | `login-authentication.spec.ts` |
| TC_LGN_004 | `LoginPage.fillUserId()`, `clickForgotPassword()`, `expectForgotPasswordScreen()`, `clickBackToLogin()` | `Login.spec.ts` |
| TC_LGN_005 | `LoginPage.fillCredentials()`, `clickLogin()`, `expectErrorDialogContains()`, `clickDialogOk()` | `Login.spec.ts` |
| TC_LGN_006 | `LoginPage.fillCredentials()`, `clickLogin()`, `expectErrorDialogContains()` | `Login.spec.ts` |
| TC_LGN_007 | `LoginPage.clearCredentials()`, `clickLogin()`, `expectStillOnLogin()` | `Login.spec.ts` |
| TC_LGN_008 | `LoginPage.fillUserId()`, `clearPassword()`, `clickLogin()`, `expectStillOnLogin()` | `Login.spec.ts` |
| TC_LGN_009 | `LoginPage.clearUserId()`, `fillPassword()`, `clickLogin()`, `expectStillOnLogin()` | `Login.spec.ts` |
| TC_LGN_010 | `LoginPage.clickForgotPassword()`, `expectErrorDialogContains()`, `clickDialogOk()` | `Login.spec.ts` |
| TC_LGN_011 | `LoginPage.fillCredentials()`, `clickLogin()`, `expectAuthOrErrorDialog()` | `Login.spec.ts` |
| TC_LGN_012 | `LoginPage.fillCredentials()`, `clickLogin()`, `isAuthenticatedLanding()` | `Login.spec.ts` |
| TC_LGN_013 | `LoginPage.fillCredentials()`, `clickLogin()`, `expectNoUnhandledClientError()` | `Login.spec.ts` |
| TC_LGN_014 | `LoginPage.fillCredentials()`, `clickLogin()`, `expectNoUnhandledClientError()` | `Login.spec.ts` |
| TC_LGN_015 | `LoginPage.fillCredentials()`, `doubleClickLogin()`, `expectErrorDialogVisible()` | `Login.spec.ts` |
| TC_LGN_016 | `LoginPage.expectLoginFormVisible()`, `expectCoreStaticUiVisible()` | `Login.spec.ts` |
| TC_LGN_017 | `LoginPage.fillPassword()`, `togglePasswordVisibility()`, `getPasswordInputType()` | `Login.spec.ts` |
| TC_LGN_018 | `LoginPage.expectCarouselVisible()`, `clickSlideIndicator()` | `Login.spec.ts` |
| TC_LGN_019 | `LoginPage.open()`, `fillCredentials()`, `clickLogin()`, `expectErrorDialogVisible()` | `Login.spec.ts` |
| TC_LGN_020 | `LoginPage.focusUserId()`, `pressTab()`, `expectPasswordFocused()` | `Login.spec.ts` |
| TC_LGN_021 | `LoginPage.fillCredentials()`, `submitWithEnterFromPassword()` | `Login.spec.ts` |
| TC_LGN_022 | `LoginPage.expectErrorDialogVisible()`, `expectDialogOkFocused()`, `pressEnter()` | `Login.spec.ts` |
| TC_LGN_023 | `LoginPage.fillCredentials()`, `clickLogin()`, `expectErrorDialogContains()` | `Login.spec.ts` |
| TC_LGN_024 | `LoginPage.fillCredentials()`, `clickLogin()`, `expectErrorDialogContains()` | `Login.spec.ts` |
| TC_LGN_025 | `LoginPage.fillCredentials()`, `clickLogin()`, `clickDialogOk()` (loop) | `Login.spec.ts` |
| TC_LGN_026 | `LoginPage.loginWithPropertySelection()`, `LoginDashboardPage.expectDashboardLoaded()` | `login-authentication.spec.ts` |
| TC_LGN_027 | `LoginDashboardPage.openShiftMenu()`, `selectShift()`, `expectShiftOptionsVisible()` | `login-authentication.spec.ts` |

---

*End of Login Screen Test Cases*
