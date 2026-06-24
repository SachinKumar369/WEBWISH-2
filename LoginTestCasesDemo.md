# WebWish Login — Comprehensive Test Cases

> **Application Under Test:** WebWish PMS — `https://qc2webwish.prologicfirst.in`  
> **Module:** Login & Authentication  
> **Author:** Generated via Playwright MCP + AI  
> **Date:** 2026-06-22  
> **Environment:** Dev (QC2)

---

## Login Page Elements Identified

| # | Element | Type | Placeholder / Label |
|---|---------|------|---------------------|
| 1 | User Id | Text Input | `Enter username.` |
| 2 | Password | Password Input | `Enter password` |
| 3 | Password Toggle (Eye Icon) | Button / Icon | — |
| 4 | Log in | Button | `Log in` |
| 5 | Forgot password? | Link | `Forgot password?` |
| 6 | Logo | Link (image) | `logo` |
| 7 | Carousel Slides | Buttons | `Slide 1`, `Slide 2`, `Slide 3` |
| 8 | Footer | Static Text | `© 2025 Prologic First India Pvt Ltd` |
| 9 | Welcome Heading | Heading (H4) | `Welcome!` |
| 10 | Subtitle | Paragraph | `Please login to your account` |

---

## 1. Positive Test Cases

### TC_LOGIN_POS_001 — Successful Login with Valid Credentials

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_POS_001` |
| **Priority** | High |
| **Precondition** | User `SACH` exists in the system |
| **Steps** | 1. Navigate to the login page<br>2. Enter `SACH` in the User Id field<br>3. Enter `Sachin@578` in the Password field<br>4. Click the **Log in** button |
| **Expected Result** | User is redirected to the "Select a property to signin!" page or Dashboard |

---

### TC_LOGIN_POS_002 — Login by Pressing Enter from Password Field

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_POS_002` |
| **Priority** | High |
| **Precondition** | Valid user credentials available |
| **Steps** | 1. Navigate to the login page<br>2. Enter valid User Id<br>3. Enter valid Password<br>4. Press **Enter** key while focused on the Password field |
| **Expected Result** | Form is submitted and user is redirected to authenticated landing |

---

### TC_LOGIN_POS_003 — Login by Pressing Enter from Username Field (Tab to Password)

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_POS_003` |
| **Priority** | Medium |
| **Precondition** | Valid user credentials available |
| **Steps** | 1. Navigate to the login page<br>2. Enter valid User Id<br>3. Press **Tab** to move to Password field<br>4. Enter valid Password<br>5. Press **Enter** |
| **Expected Result** | Form is submitted and user is redirected to authenticated landing |

---

### TC_LOGIN_POS_004 — Password Visibility Toggle (Show Password)

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_POS_004` |
| **Priority** | Medium |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter a password in the Password field<br>3. Click the **eye icon** (password toggle) |
| **Expected Result** | Password field type changes from `password` to `text`; password is visible in plain text |

---

### TC_LOGIN_POS_005 — Password Visibility Toggle (Hide Password)

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_POS_005` |
| **Priority** | Medium |
| **Precondition** | Login page loaded; password toggle was clicked once |
| **Steps** | 1. Navigate to the login page<br>2. Enter a password<br>3. Click the eye icon once → password becomes visible<br>4. Click the eye icon again |
| **Expected Result** | Password field type reverts from `text` back to `password`; password is masked |

---

### TC_LOGIN_POS_006 — Login with Different Valid User (TEST_USER)

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_POS_006` |
| **Priority** | Medium |
| **Precondition** | User `TEST_USER` exists with password `Test@123` |
| **Steps** | 1. Navigate to the login page<br>2. Enter `TEST_USER` in User Id<br>3. Enter `Test@123` in Password<br>4. Click **Log in** |
| **Expected Result** | User is authenticated and redirected to property selection or dashboard |

---

### TC_LOGIN_POS_007 — Property Selection After Login

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_POS_007` |
| **Priority** | High |
| **Precondition** | User is logged in and on the "Select a property" page |
| **Steps** | 1. Log in with valid credentials<br>2. On the "Select a property to signin!" page, click on a property row (e.g., **WEBIN — WEBWISHINDIA**)<br>3. Click the action icon (▶) to select the property |
| **Expected Result** | User is redirected to the main Dashboard for the selected property |

---

### TC_LOGIN_POS_008 — Login with Property Selection and Shift Switch Validation

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_POS_008` |
| **Priority** | Medium |
| **Precondition** | User has access to a property with shift configuration |
| **Steps** | 1. Log in with valid credentials<br>2. Select a property from the property selection page<br>3. On the Dashboard, verify shift details are displayed<br>4. Switch to a different shift |
| **Expected Result** | Dashboard loads correctly; shift switch is successful |

---

### TC_LOGIN_POS_009 — Login Preserves Carousel Functionality

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_POS_009` |
| **Priority** | Low |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Click on **Slide 2** carousel button<br>3. Click on **Slide 3** carousel button<br>4. Click on **Slide 1** carousel button |
| **Expected Result** | Carousel navigates between slides; the active slide indicator updates correctly |

---

### TC_LOGIN_POS_010 — Logo Click Redirects to Login Page

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_POS_010` |
| **Priority** | Low |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Click the **logo** link |
| **Expected Result** | Page navigates to `index.html` (home/login landing) |

---

### TC_LOGIN_POS_011 — Login with Forgot Password Recovery Flow

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_POS_011` |
| **Priority** | Medium |
| **Precondition** | Valid user `SACH` exists |
| **Steps** | 1. Navigate to the login page<br>2. Enter `SACH` in User Id<br>3. Click **Forgot password?**<br>4. Verify the Forgot Password screen appears with Email, OTP, Captcha, and Request Password fields<br>5. Click **Back to login** |
| **Expected Result** | Forgot Password screen is displayed with all expected elements; "Back to login" returns to login form |

---

### TC_LOGIN_POS_012 — Login Without User Id Triggers Forgot Password Prompt

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_POS_012` |
| **Priority** | Medium |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page (leave User Id empty)<br>2. Click **Forgot password?** without entering a User Id |
| **Expected Result** | A dialog prompts the user to enter a User Id first |

---

### TC_LOGIN_POS_013 — Login UI Elements Visibility

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_POS_013` |
| **Priority** | High |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Verify the following elements are visible:<br>  - Logo<br>  - "Welcome!" heading<br>  - "Please login to your account" subtitle<br>  - "User Id" label<br>  - "Password" label<br>  - Username input (placeholder: `Enter username.`)<br>  - Password input (placeholder: `Enter password`)<br>  - "Log in" button<br>  - "Forgot password?" link<br>  - Footer text<br>  - Carousel slide buttons |
| **Expected Result** | All login page UI elements are visible and correctly rendered |

---

### TC_LOGIN_POS_014 — Double-Click on Login Button Does Not Submit Twice

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_POS_014` |
| **Priority** | Medium |
| **Precondition** | Valid credentials available |
| **Steps** | 1. Navigate to the login page<br>2. Enter valid User Id and Password<br>3. **Double-click** the Log in button rapidly |
| **Expected Result** | Only one login request is sent; user lands on property selection (no duplicate navigation or error) |

---

## 2. Negative Test Cases

### TC_LOGIN_NEG_001 — Invalid User Id and Valid Password

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_001` |
| **Priority** | High |
| **Precondition** | User `INVALID_USER_XYZ` does not exist |
| **Steps** | 1. Navigate to the login page<br>2. Enter `INVALID_USER_XYZ` in User Id<br>3. Enter `Sachin@578` in Password<br>4. Click **Log in** |
| **Expected Result** | Error dialog displays: **"Invalid User Id"** |

---

### TC_LOGIN_NEG_002 — Valid User Id and Invalid Password

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_002` |
| **Priority** | High |
| **Precondition** | User `SACH` exists |
| **Steps** | 1. Navigate to the login page<br>2. Enter `SACH` in User Id<br>3. Enter `WrongPassword999!` in Password<br>4. Click **Log in** |
| **Expected Result** | Error dialog displays: **"Invalid Password"** with a warning about remaining attempts before account deactivation |

---

### TC_LOGIN_NEG_003 — Invalid User Id and Invalid Password

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_003` |
| **Priority** | High |
| **Precondition** | None |
| **Steps** | 1. Navigate to the login page<br>2. Enter `FAKE_USER` in User Id<br>3. Enter `WrongPass!` in Password<br>4. Click **Log in** |
| **Expected Result** | Error dialog displays: **"Invalid User Id"** |

---

### TC_LOGIN_NEG_004 — Empty User Id and Empty Password

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_004` |
| **Priority** | High |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Leave both fields empty<br>3. Click **Log in** |
| **Expected Result** | Error dialog or validation message indicating User Id is required |

---

### TC_LOGIN_NEG_005 — Empty User Id with Valid Password

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_005` |
| **Priority** | Medium |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Leave User Id empty<br>3. Enter `Sachin@578` in Password<br>4. Click **Log in** |
| **Expected Result** | Error dialog or validation message indicating User Id is required |

---

### TC_LOGIN_NEG_006 — Valid User Id with Empty Password

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_006` |
| **Priority** | Medium |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter `SACH` in User Id<br>3. Leave Password empty<br>4. Click **Log in** |
| **Expected Result** | Error dialog or validation message indicating Password is required |

---

### TC_LOGIN_NEG_007 — Account Lockout After Multiple Failed Attempts

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_007` |
| **Priority** | Critical |
| **Precondition** | User `SACH` exists; account not currently locked |
| **Steps** | 1. Navigate to the login page<br>2. Enter `SACH` and an incorrect password<br>3. Click **Log in** → note "Invalid Password" and remaining attempts count<br>4. Click OK, repeat steps 2–3 until remaining attempts = 1<br>5. Click OK and attempt one more invalid login |
| **Expected Result** | Error dialog counts down remaining attempts (e.g., "deactivated after N unsuccessful attempts"); after exhausting attempts, account is temporarily blocked/locked |

---

### TC_LOGIN_NEG_008 — SQL Injection Attempt in User Id

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_008` |
| **Priority** | High |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter `' OR 1=1; DROP TABLE users; --` in User Id<br>3. Enter any password<br>4. Click **Log in** |
| **Expected Result** | Error dialog with "Invalid User Id"; no SQL injection occurs; application remains stable |

---

### TC_LOGIN_NEG_009 — SQL Injection Attempt in Password

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_009` |
| **Priority** | High |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter `SACH` in User Id<br>3. Enter `' OR '1'='1` in Password<br>4. Click **Log in** |
| **Expected Result** | Error dialog with "Invalid Password"; no SQL injection occurs |

---

### TC_LOGIN_NEG_010 — XSS Attempt in User Id Field

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_010` |
| **Priority** | High |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter `<script>alert('XSS')</script>` in User Id<br>3. Enter any password<br>4. Click **Log in** |
| **Expected Result** | No JavaScript alert executes; input is sanitized; error dialog shows "Invalid User Id" |

---

### TC_LOGIN_NEG_011 — XSS Attempt in Password Field

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_011` |
| **Priority** | High |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter `SACH` in User Id<br>3. Enter `<img src=x onerror=alert(1)>` in Password<br>4. Click **Log in** |
| **Expected Result** | No JavaScript executes; error dialog shows "Invalid Password" |

---

### TC_LOGIN_NEG_012 — Extremely Long Input in User Id Field

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_012` |
| **Priority** | Medium |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter a 300-character string (`x` repeated 300 times) in User Id<br>3. Enter any password<br>4. Click **Log in** |
| **Expected Result** | Error dialog with "Invalid User Id"; no crash, no unhandled exception |

---

### TC_LOGIN_NEG_013 — Extremely Long Input in Password Field

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_013` |
| **Priority** | Medium |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter `SACH` in User Id<br>3. Enter a 300-character string in Password<br>4. Click **Log in** |
| **Expected Result** | Error dialog with "Invalid Password"; no crash, no unhandled exception |

---

### TC_LOGIN_NEG_014 — Special Characters in User Id

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_014` |
| **Priority** | Medium |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter `user@#$%^&*()` in User Id<br>3. Enter any password<br>4. Click **Log in** |
| **Expected Result** | Error dialog with "Invalid User Id"; no crash |

---

### TC_LOGIN_NEG_015 — Special Characters in Password

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_015` |
| **Priority** | Medium |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter `SACH` in User Id<br>3. Enter `!@#$%^&*()_+{}|:"<>?` in Password<br>4. Click **Log in** |
| **Expected Result** | Error dialog with "Invalid Password"; no crash |

---

### TC_LOGIN_NEG_016 — User Id with Leading/Trailing Spaces

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_016` |
| **Priority** | Medium |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter `  SACH  ` (with leading/trailing spaces) in User Id<br>3. Enter `Sachin@578` in Password<br>4. Click **Log in** |
| **Expected Result** | Either login succeeds (if trimmed) or error dialog displays "Invalid User Id"; no crash |

---

### TC_LOGIN_NEG_017 — Password with Leading/Trailing Spaces

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_017` |
| **Priority** | Medium |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter `SACH` in User Id<br>3. Enter `  Sachin@578  ` (with spaces) in Password<br>4. Click **Log in** |
| **Expected Result** | Either login succeeds (if trimmed) or error dialog displays "Invalid Password" |

---

### TC_LOGIN_NEG_018 — Case Sensitivity — Lowercase User Id

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_018` |
| **Priority** | Medium |
| **Precondition** | User `SACH` exists (uppercase) |
| **Steps** | 1. Navigate to the login page<br>2. Enter `sach` (lowercase) in User Id<br>3. Enter `Sachin@578` in Password<br>4. Click **Log in** |
| **Expected Result** | System behavior documented: either login succeeds (case-insensitive) or error dialog shows "Invalid User Id" |

---

### TC_LOGIN_NEG_019 — Copy-Paste Attack in User Id

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_019` |
| **Priority** | Low |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Paste `SACH; DROP TABLE users--` into User Id<br>3. Enter any password<br>4. Click **Log in** |
| **Expected Result** | Error dialog with "Invalid User Id"; no SQL injection or crash |

---

### TC_LOGIN_NEG_020 — Unicode / Emoji in User Id

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_020` |
| **Priority** | Low |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter `用户🎭` (unicode/emoji) in User Id<br>3. Enter any password<br>4. Click **Log in** |
| **Expected Result** | Error dialog with "Invalid User Id"; no crash or encoding error |

---

### TC_LOGIN_NEG_021 — Account Lockout Countdown Validation

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_021` |
| **Priority** | High |
| **Precondition** | User `SACH` exists; account not locked |
| **Steps** | 1. Navigate to the login page<br>2. Enter `SACH` and wrong password, click Log in<br>3. Note the remaining attempts count in the error dialog<br>4. Click OK and repeat with wrong password<br>5. Verify the count decrements by 1 each time |
| **Expected Result** | Each failed attempt decrements the remaining attempts counter correctly (e.g., 5 → 4 → 3 → 2 → 1) |

---

### TC_LOGIN_NEG_022 — Error Dialog Dismissal Returns to Login Form

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_022` |
| **Priority** | Medium |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter invalid credentials and click Log in<br>3. Error dialog appears<br>4. Click **OK** to dismiss the dialog |
| **Expected Result** | Dialog closes; login form is visible and interactive again; User Id and Password fields are accessible |

---

### TC_LOGIN_NEG_023 — Multiple Rapid Login Attempts (Spam Click)

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_023` |
| **Priority** | Medium |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter valid credentials<br>3. Click the **Log in** button rapidly 5+ times in succession |
| **Expected Result** | Only one authentication request is processed; no duplicate submissions or server errors |

---

### TC_LOGIN_NEG_024 — Browser Back Button After Failed Login

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_024` |
| **Priority** | Low |
| **Precondition** | Login page loaded |
| **Steps** | 1. Navigate to the login page<br>2. Enter invalid credentials and click Log in<br>3. Error dialog appears, click OK<br>4. Press the **browser Back** button |
| **Expected Result** | User stays on the login page or is redirected back to it; no sensitive data leaked in URL |

---

### TC_LOGIN_NEG_025 — Login with Deleted / Deactivated User

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_NEG_025` |
| **Priority** | High |
| **Precondition** | A user account has been previously deactivated |
| **Steps** | 1. Navigate to the login page<br>2. Enter the deactivated user's ID<br>3. Enter the last known password<br>4. Click **Log in** |
| **Expected Result** | Error dialog displays appropriate message (e.g., "Invalid User Id" or "Account deactivated") |

---

## 3. Boundary & Edge-Case Test Cases

### TC_LOGIN_EDGE_001 — User Id with Single Character

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_EDGE_001` |
| **Priority** | Medium |
| **Steps** | 1. Enter `S` in User Id<br>2. Enter valid password<br>3. Click Log in |
| **Expected Result** | Error dialog with "Invalid User Id" (single char is not a valid user) |

---

### TC_LOGIN_EDGE_002 — Password with Minimum Length

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_EDGE_002` |
| **Priority** | Medium |
| **Steps** | 1. Enter valid User Id<br>2. Enter `a` (1 character) in Password<br>3. Click Log in |
| **Expected Result** | Error dialog with "Invalid Password" |

---

### TC_LOGIN_EDGE_003 — User Id = Numeric Only

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_EDGE_003` |
| **Priority** | Medium |
| **Steps** | 1. Enter `12345` in User Id<br>2. Enter any password<br>3. Click Log in |
| **Expected Result** | Error dialog with "Invalid User Id" (unless numeric IDs are valid) |

---

### TC_LOGIN_EDGE_004 — Password with Only Spaces

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_EDGE_004` |
| **Priority** | Medium |
| **Steps** | 1. Enter valid User Id<br>2. Enter `     ` (5 spaces) in Password<br>3. Click Log in |
| **Expected Result** | Error dialog with "Invalid Password" |

---

### TC_LOGIN_EDGE_005 — Copy-Paste Valid Credentials

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_EDGE_005` |
| **Priority** | Low |
| **Steps** | 1. Copy `SACH` to clipboard<br>2. Paste into User Id field<br>3. Copy `Sachin@578` to clipboard<br>4. Paste into Password field<br>5. Click Log in |
| **Expected Result** | Login succeeds (copy-paste works normally) |

---

### TC_LOGIN_EDGE_006 — Tab Key Navigation Through Login Form

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_EDGE_006` |
| **Priority** | Low |
| **Steps** | 1. Navigate to the login page<br>2. Press **Tab** from the User Id field<br>3. Verify focus moves to Password field<br>4. Press **Tab** again<br>5. Verify focus moves to Log in button or Forgot password link |
| **Expected Result** | Tab key moves focus in the correct order: User Id → Password → Log in / Forgot password |

---

### TC_LOGIN_EDGE_007 — Login Page Responsive Layout (Narrow Viewport)

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_EDGE_007` |
| **Priority** | Low |
| **Steps** | 1. Set browser viewport to 375×667 (mobile)<br>2. Navigate to the login page<br>3. Verify all form elements are visible and usable |
| **Expected Result** | Login form renders correctly on narrow screens; no elements are cut off or overlapping |

---

## 4. Security Test Cases

### TC_LOGIN_SEC_001 — Password Not Visible in URL

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_SEC_001` |
| **Priority** | Critical |
| **Steps** | 1. Navigate to login page<br>2. Enter credentials and click Log in<br>3. Check the browser URL bar |
| **Expected Result** | Password is never present in the URL; authentication uses POST or secure method |

---

### TC_LOGIN_SEC_002 — Password Not Stored in LocalStorage / SessionStorage

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_SEC_002` |
| **Priority** | Critical |
| **Steps** | 1. Log in with valid credentials<br>2. Open browser DevTools → Application → Local Storage & Session Storage<br>3. Inspect all stored values |
| **Expected Result** | Plain-text password is NOT stored in localStorage or sessionStorage |

---

### TC_LOGIN_SEC_003 — Password Field Masking Default

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_SEC_003` |
| **Priority** | High |
| **Steps** | 1. Navigate to login page<br>2. Enter a password<br>3. Inspect the Password field's `type` attribute |
| **Expected Result** | Password field `type` is `password` by default (characters are masked) |

---

### TC_LOGIN_SEC_004 — HTTPS Enforced

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_SEC_004` |
| **Priority** | Critical |
| **Steps** | 1. Navigate to the login page<br>2. Check the URL scheme in the address bar |
| **Expected Result** | URL uses `https://` protocol; no mixed-content warnings |

---

### TC_LOGIN_SEC_005 — Session Token Secure Handling

| Field | Value |
|-------|-------|
| **ID** | `TC_LOGIN_SEC_005` |
| **Priority** | High |
| **Steps** | 1. Log in with valid credentials<br>2. Open DevTools → Network tab<br>3. Check authentication response headers and cookies |
| **Expected Result** | Session/JWT token is returned securely; cookies have `HttpOnly` and `Secure` flags where applicable |

---

## Summary

| Category | Count |
|----------|-------|
| **Positive Tests** | 14 |
| **Negative Tests** | 25 |
| **Edge-Case Tests** | 7 |
| **Security Tests** | 5 |
| **Total** | **51** |

---

> *This document was auto-generated based on live Playwright MCP inspection of the WebWish login page and analysis of existing test suites in `tests/Login/`.*
