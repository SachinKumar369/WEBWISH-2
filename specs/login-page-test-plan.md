# Login Page Test Plan

## Application Overview

Comprehensive test plan for the Web Wish Login Page, covering primary authentication flow, validation/error handling, boundary/edge behavior, keyboard accessibility, and visual/UI integrity. All scenarios assume a fresh browser state and can be run independently.

## Test Scenarios

### 1. Login Page

**Seed:** `tests/seed.spec.ts`

#### 1.1. Positive - Successful Login with Valid Credentials

**File:** `tests/login-page/positive-successful-login.spec.ts`

**Steps:**
  1. Navigate to the Login page URL.
    - expect: Login page is displayed with User Id field, Password field, Log in button, and Forgot password link visible.
  2. Enter a valid User Id and valid Password.
    - expect: Entered values appear in their respective fields.
    - expect: Password characters are masked by default.
  3. Click Log in.
    - expect: Authentication request is submitted once.
    - expect: User is redirected away from Login page to the next authenticated step (for this app, property selection/dashboard flow).
  4. Verify no error modal appears.
    - expect: No error dialog is displayed.
    - expect: Session is established successfully.

#### 1.2. Positive - Submit Login with Enter Key from Password Field

**File:** `tests/login-page/positive-enter-key-submit.spec.ts`

**Steps:**
  1. Open Login page and enter valid User Id and valid Password.
    - expect: Credentials are populated correctly in inputs.
  2. Place cursor in Password field and press Enter.
    - expect: Form submits exactly once, equivalent to clicking Log in.
    - expect: User successfully navigates to authenticated area.

#### 1.3. Positive - Forgot Password Link Opens Recovery Flow with User Id

**File:** `tests/login-page/positive-forgot-password-navigation.spec.ts`

**Steps:**
  1. Open Login page and enter a valid/known User Id in User Id field.
    - expect: User Id field retains entered value.
  2. Click Forgot password?.
    - expect: Forgot Password screen appears.
    - expect: Forgot Password form includes Email (disabled), OTP field, captcha field, Resend OTP, Request Password (initially disabled), and Back to login link.
  3. Click Back to login.
    - expect: User returns to Login page with login controls visible again.

#### 1.4. Negative - Login Attempt with Invalid User Id

**File:** `tests/login-page/negative-invalid-user.spec.ts`

**Steps:**
  1. Open Login page and enter an invalid/non-existent User Id with any password.
    - expect: Inputs accept text entry.
  2. Click Log in.
    - expect: Error dialog appears.
    - expect: Dialog message states invalid user identifier (observed: 'Invalid User Id. (606)').
    - expect: User remains on Login page and is not authenticated.
  3. Click OK on error dialog.
    - expect: Error dialog closes.
    - expect: Login form remains usable for retry.

#### 1.5. Negative - Login Attempt with Valid User Id and Wrong Password

**File:** `tests/login-page/negative-invalid-password.spec.ts`

**Steps:**
  1. Open Login page and enter a valid/known User Id with incorrect password.
    - expect: Inputs are populated successfully.
  2. Submit login (click Log in or press Enter).
    - expect: Error dialog appears with invalid password message.
    - expect: Lockout countdown warning is shown (observed pattern: remaining unsuccessful attempts and code 475).
    - expect: User stays on Login page.
  3. Dismiss dialog.
    - expect: Dialog closes and login form remains interactive.

#### 1.6. Negative - Forgot Password Click with Empty User Id

**File:** `tests/login-page/negative-forgot-password-empty-user.spec.ts`

**Steps:**
  1. Open Login page with User Id field left empty.
    - expect: Login form is visible and ready for input.
  2. Click Forgot password?.
    - expect: Validation modal/dialog appears requesting user id input (observed: 'Please input your user Id...!').
    - expect: No navigation to forgot-password page occurs until requirement is met.
  3. Click OK on modal.
    - expect: Modal closes and user remains on Login page.

#### 1.7. Negative - Empty Credentials Login Submission

**File:** `tests/login-page/negative-empty-credentials.spec.ts`

**Steps:**
  1. Open Login page without entering User Id or Password.
    - expect: Both fields are empty.
  2. Click Log in.
    - expect: Login is blocked by client/server validation.
    - expect: User is not redirected to authenticated area.
    - expect: No successful auth request is completed.

#### 1.8. Negative - Username Only Submission

**File:** `tests/login-page/negative-username-only.spec.ts`

**Steps:**
  1. Enter User Id only; keep Password empty.
    - expect: User Id appears in input; Password remains empty.
  2. Click Log in.
    - expect: Authentication is rejected.
    - expect: User remains on Login page with clear error/validation feedback.

#### 1.9. Negative - Password Only Submission

**File:** `tests/login-page/negative-password-only.spec.ts`

**Steps:**
  1. Enter Password only; keep User Id empty.
    - expect: Password is accepted in field and masked.
  2. Click Log in.
    - expect: Authentication is rejected.
    - expect: User remains on Login page with validation/error feedback.

#### 1.10. Edge Case - Leading/Trailing Whitespace in User Id

**File:** `tests/login-page/edge-whitespace-userid.spec.ts`

**Steps:**
  1. Enter User Id with leading/trailing spaces and valid password.
    - expect: System either trims User Id before submit or rejects with clear error.
    - expect: Behavior is consistent across repeated attempts.
  2. Submit login.
    - expect: No ambiguous state; either successful login for valid trimmed value or explicit rejection.

#### 1.11. Edge Case - Case Sensitivity Behavior of User Id

**File:** `tests/login-page/edge-case-sensitivity-userid.spec.ts`

**Steps:**
  1. Login once with canonical casing of a known User Id.
    - expect: Baseline behavior captured (success/failure).
  2. Retry with same User Id in different letter case and same password.
    - expect: System behavior regarding case sensitivity is consistent and documented.
    - expect: Unexpected silent failures do not occur.

#### 1.12. Edge Case - Very Long Input Strings

**File:** `tests/login-page/edge-long-inputs.spec.ts`

**Steps:**
  1. Paste very long string (e.g., 256+ chars) into User Id and Password fields.
    - expect: UI remains stable (no layout break, crash, or script error).
    - expect: Input handling is constrained safely (maxlength enforcement or validation feedback).
  2. Submit login.
    - expect: Request is handled gracefully with explicit rejection/validation.
    - expect: No unhandled exception or blank screen appears.

#### 1.13. Edge Case - Special Characters and SQL-like Payload Strings

**File:** `tests/login-page/edge-special-characters.spec.ts`

**Steps:**
  1. Enter payload-like strings and special characters in User Id and Password (e.g., quotes, semicolons, unicode symbols where supported).
    - expect: Application treats inputs as plain text.
    - expect: No client-side crashes, DOM breakage, or unintended navigation.
  2. Submit login.
    - expect: Authentication is rejected safely unless credentials are genuinely valid.
    - expect: No security-sensitive error leakage is shown in UI.

#### 1.14. Edge Case - Rapid Repeated Submit Clicks

**File:** `tests/login-page/edge-rapid-submit.spec.ts`

**Steps:**
  1. Enter invalid credentials.
    - expect: Form is ready for submit.
  2. Double-click or rapidly click Log in multiple times.
    - expect: System handles duplicate submits safely (single effective login flow or controlled repeated failures).
    - expect: UI does not freeze and no overlapping broken dialogs occur.

#### 1.15. UI Validation - Core Login Form Elements and Labels

**File:** `tests/login-page/ui-core-elements.spec.ts`

**Steps:**
  1. Open Login page on desktop viewport.
    - expect: Visible elements: logo, Welcome heading, 'Please login to your account' text, User Id label/input, Password label/input, Log in button, Forgot password link, footer copyright.
  2. Verify placeholder and label clarity.
    - expect: User Id placeholder is present.
    - expect: Password placeholder is present.
    - expect: Control names are understandable and unambiguous.

#### 1.16. UI Validation - Password Masking and Visibility Toggle

**File:** `tests/login-page/ui-password-toggle.spec.ts`

**Steps:**
  1. Enter password text in Password field.
    - expect: Field input type is password and characters are masked initially.
  2. Click eye/visibility toggle once.
    - expect: Password becomes visible (input type changes to text).
    - expect: Toggle icon state changes.
  3. Click toggle again.
    - expect: Password returns to masked state (input type password).

#### 1.17. UI Validation - Carousel Indicator Interaction on Login Page

**File:** `tests/login-page/ui-carousel-indicators.spec.ts`

**Steps:**
  1. Observe slide indicator controls (Slide 1, Slide 2, Slide 3).
    - expect: All three indicators are visible and clickable.
  2. Click Slide 2 then Slide 3.
    - expect: Active indicator changes correctly to selected slide.
    - expect: No impact on login form operability.

#### 1.18. UI Validation - Responsive Behavior (Mobile and Desktop)

**File:** `tests/login-page/ui-responsive.spec.ts`

**Steps:**
  1. Open Login page on desktop and then mobile viewport.
    - expect: Login form remains readable and usable in both viewports.
    - expect: No overlapping controls or clipped text in key actions (User Id, Password, Log in, Forgot password).
  2. Perform a basic invalid login attempt on mobile viewport.
    - expect: Validation/error dialogs are fully visible and actionable on small screen.

#### 1.19. UI Validation - Focus Order and Keyboard Accessibility

**File:** `tests/login-page/ui-keyboard-focus.spec.ts`

**Steps:**
  1. Use Tab key from top of form.
    - expect: Focus moves in logical order: User Id -> Password -> Log in -> Forgot password (or equivalent accessible order).
  2. Activate Log in using keyboard (Enter/Space) when focused.
    - expect: Action triggers submit behavior equivalently to mouse click.
  3. When error dialog appears, test focus trap and dismissal.
    - expect: Focus moves to dialog action (OK).
    - expect: Dialog can be dismissed via keyboard and focus returns to login context.
