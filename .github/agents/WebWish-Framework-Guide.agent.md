---
name: WebWish Framework Guide
description: "Answer any question about the WebWish PMS automation framework — how to create tests, use page objects, navigate modules, configure environments, debug failures, run specific suites, understand fixtures, or follow project conventions. Covers every module: Login, Front Desk, Marketing, Front Office Setup, Reports, Global Search, System Config, Manager Function, Night Audit, Availability, Cashiering, and Database validation."
---

# 🏗️ WebWish PMS Automation Framework — Complete Reference

You are a **comprehensive knowledge base** for the WebWish PMS Playwright automation framework. You can answer ANY question about this codebase: how to create tests, how page objects work, how to navigate modules, how to debug failures, how to run tests, and every convention/pattern used in this project.

---

# 📁 Project Structure

```
WebWish 2/
├── .github/
│   ├── agents/                    # Custom agent definitions
│   │   ├── WebWishAgent.agent.md          # Main test engineer agent
│   │   ├── WebWish-Framework-Guide.agent.md # This guide (comprehensive reference)
│   │   ├── playwright-test-generator.agent.md
│   │   ├── playwright-test-healer.agent.md
│   │   ├── playwright-test-planner.agent.md
│   │   ├── PlaywrightQA.agent.md
│   │   └── test-case-generator.agent.md
│   ├── prompts/
│   └── workflows/
├── src/
│   ├── core/
│   │   ├── BasePage.ts                    # Base page class (navigate, screenshot, waitForURL)
│   │   └── Logger.ts                      # Winston logger (info/debug/warn/error)
│   ├── pages/
│   │   ├── LoginPage.ts                   # Login + property selection
│   │   ├── LoginPage1.ts                  # Legacy login (unused)
│   │   ├── SelectProperty.ts              # Property selection (index/code)
│   │   ├── PropertySelectionPage.ts       # Legacy property selection
│   │   ├── NoteTemplatesPage.ts           # Note templates
│   │   ├── Availability/
│   │   │   ├── GroupAvailabilityPage.ts   # Group availability flow
│   │   │   └── RecreateAvailabilityPage.ts
│   │   ├── Cashiering/
│   │   │   └── PostAdvancePage.ts         # Post advance (cash collection)
│   │   ├── FrontDesk/
│   │   │   ├── GuestManagementPage.ts           # Guest search/reservation
│   │   │   ├── GuestManagementActivitiesPage.ts # Activities CRUD
│   │   │   ├── BookingCalendarPage.ts          # Booking calendar view
│   │   │   ├── BookingCal.ts                   # Calendar helper
│   │   │   ├── BookingCalendarFilterPropertyValidationPage.ts
│   │   │   ├── ConfirmBookingPage.ts           # Confirm booking flow
│   │   │   ├── SpecialAccountPage.ts           # Special account create
│   │   │   ├── SpecialAccountsPage.ts          # Special accounts sections
│   │   │   ├── GroupManagementPage.ts          # Group create/management
│   │   │   ├── GroupDetailsPage.ts             # Group detail view
│   │   │   ├── TaskManagement.ts               # Task management
│   │   │   ├── TaskManagementFlowPage.ts       # Task CRUD flow
│   │   │   ├── Advance.ts                      # Advance bookings
│   │   │   └── NoShowGuestDetailsPage.ts       # No-show handling
│   │   ├── FrontOfficeSetup/
│   │   │   ├── CashieringParameters/           # 11 sub-pages (AccountCode, ChargeCode, etc.)
│   │   │   ├── CityStateMaster/
│   │   │   ├── ClientParameters/
│   │   │   ├── ItemParameters/
│   │   │   ├── MealPlan/
│   │   │   ├── Message/
│   │   │   ├── MIS/
│   │   │   ├── ParameterSetup/
│   │   │   ├── Profiles/
│   │   │   ├── RoomParameter/
│   │   │   ├── TypeMaster/
│   │   │   └── UserDefinedCode/
│   │   ├── GlobalSearch/
│   │   │   └── GlobalSearchPage.ts           # Tab-based global search
│   │   ├── ManagerFunction/
│   │   │   ├── RateManagerPage.ts            # Rate management
│   │   │   ├── CopyRateManager.ts            # Copy rate
│   │   │   ├── RateManagerAdvanceConfigPage.ts
│   │   │   ├── DerivedRateConfigPage.ts      # Derived rate
│   │   │   ├── AvailabilityManagementPage.ts  # Availability management
│   │   │   ├── MealPlanDetailsPage.ts
│   │   │   ├── MealPlanDetailsDeletePage.ts
│   │   │   └── MealPlanDetailsSaveAndAddNewPage.ts
│   │   ├── Marketing/
│   │   │   ├── ProfileOperationsPage.ts      # Profile sections (complaints, loyalty, etc.)
│   │   │   ├── ProfilesPage.ts               # Profile listing
│   │   │   ├── AgentMaintenancePage.ts       # Agent CRUD
│   │   │   └── CorporateMaintenancePage.ts   # Corporate CRUD
│   │   ├── NightAudit/
│   │   │   └── NightAuditPage.ts
│   │   ├── Reports/
│   │   │   ├── ParameterReports/             # 14 report page objects
│   │   │   └── HKReports/
│   │   │       └── TemporaryOutOfOrderPage.ts
│   │   └── SystemConfig/
│   │       ├── UserSetupPage.ts
│   │       ├── UserSetupWithPolicyPage.ts
│   │       ├── AlertSetupPage.ts
│   │       ├── PasswordPolicyPage.ts
│   │       └── TemplateSetupPage.ts
│   ├── utils/
│   │   ├── ElementActions.ts         # click/sendKeys/hover with 3-retry + JS fallback
│   │   ├── WaitUtils.ts              # waitForNetworkIdle/waitForResponse/waitForCondition
│   │   ├── TestDataManager.ts        # loadJSONData/loadCSVData/getUserCredentials
│   │   ├── DatabaseClient.ts         # postgres/mysql/mssql via DB_TYPE env
│   │   ├── ExcelHelper.ts            # Read Excel files
│   │   ├── ExcelDataWriter.ts        # Write Excel files
│   │   ├── ExcelPropertyManager.ts   # Property data from Excel
│   │   ├── UserDataProvider.ts       # User data from Excel (PRIMARY for new tests)
│   │   ├── PropertyDataProvider.ts   # Property data from Excel (PRIMARY for new tests)
│   │   ├── TestDataStore.ts          # In-memory data store
│   │   ├── GlobalDataStore.ts        # Cross-test data store
│   │   └── VisualRegressionUtil.ts   # Visual regression helpers
│   ├── helpers/
│   │   ├── AssertionHelper.ts              # assertTextContains/assertEquals/assertTrue/assertFalse
│   │   ├── DatabaseAssertionHelper.ts      # DB existence/count/column validation
│   │   ├── BrowserContextManager.ts        # Browser context management
│   │   ├── ParameterReportValidationHelper.ts
│   │   └── TestExtensions.ts
│   └── listeners/
│       └── CustomReporter.ts               # Custom test reporter
├── tests/
│   ├── fixtuers/
│   │   └── auth.fixtuers.ts                # Auth fixture (authenticatedPage)
│   ├── Login/                              # Login test suites
│   ├── frontdesk/                          # Front desk tests
│   ├── Availability/                       # Group availability tests
│   ├── Cashiering/                         # Cashiering tests
│   ├── Reports/                            # Report tests
│   │   ├── ParameterReports/
│   │   └── HKReports/
│   ├── GlobalSearch/                       # Global search tests
│   ├── Marketing/                          # Marketing tests
│   ├── ManagerFunction/                    # Manager function tests
│   ├── SystemConfig/                       # System config tests
│   ├── NightAudit/                         # Night audit tests
│   └── database/                           # Database validation tests
├── test-data/
│   ├── users.xlsx                          # User credentials (PRIMARY data source)
│   └── properties.xlsx                     # Property list (PRIMARY data source)
├── config/
│   ├── .env.dev
│   ├── .env.stage
│   └── .env.prod
├── playwright.config.ts
├── tsconfig.json
├── package.json
├── global-setup.ts                         # Global setup: login + save storageState
└── storageState.json                       # Persisted browser auth state
```

---

# 🔑 Login & Property Selection

## Pattern 1: Excel-Based Selection (PRIMARY — for ALL new tests)

```typescript
import { LoginPage } from '../../src/pages/LoginPage';
import { UserDataProvider } from '../../src/utils/UserDataProvider';
import { PropertyDataProvider } from '../../src/utils/PropertyDataProvider';

const userProvider = new UserDataProvider();
const propProvider = new PropertyDataProvider();

const user = await userProvider.getUserByIndexFromExcel(0);        // Index 0 = SACH
const prop = await propProvider.getPropertyByIndexFromExcel(3);    // Index 3 = WEBWE

const loginPage = new LoginPage(page, context);
await loginPage.loginWithPropertySelection(user.username, user.password, prop.code);
```

### UserDataProvider Methods
| Method | Description |
|---|---|
| `getUserByIndexFromExcel(0)` | Get user by row index |
| `getUserByUsernameFromExcel('SACH')` | Get user by username |
| `getUserByRoleFromExcel('admin')` | Get user by role |
| `getUserByEnvironmentFromExcel('all')` | Get user by environment |

### PropertyDataProvider Methods
| Method | Description |
|---|---|
| `getPropertyByIndexFromExcel(3)` | Get property by row index |
| `getPropertyByCodeFromExcel('WEBWE')` | Get property by code |

## Pattern 2: testDataManager (LEGACY — for existing tests only)

```typescript
import { testDataManager } from '../../src/utils/TestDataManager';

const user = await testDataManager.getUserCredentials('all');
await loginPage.loginWithPropertySelection(user.username, user.password, 2);
```

## Pattern 3: Auth Fixture (Reuse Existing Session)

```typescript
import { test, expect } from '../../tests/fixtuers/auth.fixtuers';
// Provides: { authenticatedPage } — already logged in with property 2 selected
```

## ⚠️ CRITICAL RULES
- **NEVER** hardcode username/password or property index in new tests
- **NEVER** use `testDataManager.getUserCredentials()` for new tests
- **ALWAYS** use Excel-based selection for new tests
- Default property index: `3` (WEBWE) when not specified
- Default user index: `0` (SACH) when not specified

---

# 🧭 Navigation Patterns

## Global Search (Primary Navigation)
Most modules are accessed via the search bar at the top of the page:

```typescript
const searchInput = page.getByRole('textbox', { name: 'Search...' });
await searchInput.click();
await searchInput.fill('Guest Management');
await page.getByText('Guest Management').click();
```

**Or using a loop for more control:**
```typescript
await searchInput.fill('');
await searchInput.type('Special Accounts');
await page.waitForTimeout(1000);
const results = page.locator('//li[@tabindex="0"]');
const count = await results.count();
for (let i = 0; i < count; i++) {
  const text = (await results.nth(i).innerText()).trim().toLowerCase();
  if (text.includes('special') && text.includes('account')) {
    await results.nth(i).click();
    break;
  }
}
```

## Sidebar Menu Navigation
```typescript
// Front Desk module
await page.getByRole('link', { name: /Front Desk/ }).click();
await page.getByRole('link', { name: ' Guest Management' }).click();

// Marketing module
await page.getByRole('link', { name: ' Marketing' }).click();
await page.getByRole('link', { name: ' Profiles' }).click();

// System Configurations
await page.getByRole('link', { name: /System Configurations/i }).click();
await page.getByRole('link', { name: /User Setup/i }).click();

// Manager Functions
await page.getByRole('link', { name: /Manager Functions/i }).click();
await page.getByRole('link', { name: ' Rate Manager' }).click();
```

## Sections Dropdown (Detail Views)
```typescript
await page.getByRole('button', { name: /Sections/i }).click();
await page.locator('dropdown-button .dropdown-item').filter({ hasText: 'Activities' }).first().click();
```

## ⚠️ Mouse Move Before Clicking Sidebar
Some menus require a mouse move first to trigger hover-based menus:
```typescript
await page.mouse.move(0, 400);
await page.getByRole('link', { name: /Front Desk/ }).click();
```

---

# 📐 Test File Structure

## Standard Test Template (Use for ALL new tests)

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { SomePageObject } from '../../src/pages/Module/SomePageObject';
import { UserDataProvider } from '../../src/utils/UserDataProvider';
import { PropertyDataProvider } from '../../src/utils/PropertyDataProvider';
import logger from '../../src/core/Logger';

test.describe('Module - Feature Name', () => {
  let pageObject: SomePageObject;
  const userProvider = new UserDataProvider();
  const propProvider = new PropertyDataProvider();

  test.beforeEach(async ({ page, context }) => {
    pageObject = new SomePageObject(page, context);
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.afterEach(async ({ page }) => {
    if (test.info().status === 'failed') {
      await page.screenshot({
        path: `screenshots/${test.info().title.replace(/\s+/g, '_')}.png`,
        fullPage: true,
      });
    }
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      await page.pause();
    }
  });

  test('MODULE_001: description of what this test does', async ({ page, context }) => {
    // Step 1: Login with Excel-based selection
    const loginPage = new LoginPage(page, context);
    const user = await userProvider.getUserByIndexFromExcel(0);
    const prop = await propProvider.getPropertyByIndexFromExcel(3);
    await loginPage.loginWithPropertySelection(user.username, user.password, prop.code);

    // Step 2+: Module-specific actions
    await pageObject.someAction();
  });
});
```

## Serial Test Pattern (For ordered test suites)

```typescript
test.describe.serial('Feature - Ordered Tests', () => {
  test('Step 1: Create record', async ({ page, context }) => { /* ... */ });
  test('Step 2: Verify record', async ({ page, context }) => { /* ... */ });
  test('Step 3: Delete record', async ({ page, context }) => { /* ... */ });
});
```

## Test with Steps (For complex flows)

```typescript
test('FLOW_001: complete booking flow', async ({ page, context }) => {
  const loginPage = new LoginPage(page, context);
  const user = await userProvider.getUserByIndexFromExcel(0);
  const prop = await propProvider.getPropertyByIndexFromExcel(3);

  await test.step('Login with user + property from Excel', async () => {
    await loginPage.loginWithPropertySelection(user.username, user.password, prop.code);
  });

  await test.step('Navigate to module', async () => {
    await pageObject.navigateToModule();
  });

  await test.step('Perform action', async () => {
    await pageObject.performAction();
  });
});
```

---

# 📦 Page Object Reference

## BasePage (`src/core/BasePage.ts`)
All page objects should extend BasePage:
```typescript
class BasePage {
  readonly page: Page;
  readonly context: BrowserContext;
  protected baseURL: string;  // defaults to process.env.BASE_URL

  async navigate(url?: string): Promise<void>;
  async navigateToHome(): Promise<void>;
  async waitForURL(urlPattern: string | RegExp): Promise<void>;
  async waitForPageLoad(state?): Promise<void>;
  async takeScreenshot(name: string, fullPage?: boolean): Promise<string>;
  getCurrentURL(): string;
}
```

## ElementActions (`src/utils/ElementActions.ts`)
```typescript
class ElementActions {
  async click(selector: string | Locator, description?: string): Promise<void>;       // 3-retry + JS fallback
  async sendKeys(selector: string | Locator, text: string, desc?: string, clear?: boolean): Promise<void>;
  async hover(selector: string | Locator, description?: string): Promise<void>;
  async waitForElement(selector: string | Locator, timeout?: number, description?: string): Promise<void>;
  async waitForElementHidden(selector: string | Locator, timeout?: number, description?: string): Promise<void>;
}
```

## WaitUtils (`src/utils/WaitUtils.ts`)
```typescript
class WaitUtils {
  async waitForElementStable(selector: string, timeout?: number): Promise<void>;
  async waitForNetworkIdle(timeout?: number): Promise<void>;
  async waitForResponse(urlPattern: string | RegExp, timeout?: number): Promise<void>;
  async waitForCondition(condition: () => Promise<boolean>, timeout?: number, pollInterval?: number): Promise<void>;
}
```

## AssertionHelper (`src/helpers/AssertionHelper.ts`)
```typescript
assertTextContains(actual: string, expected: string, message?: string): void;
assertEquals(actual: any, expected: any, message?: string): void;
assertTrue(condition: boolean, message?: string): void;
assertFalse(condition: boolean, message?: string): void;
```

## DatabaseClient (`src/utils/DatabaseClient.ts`)
Supports postgres, mysql, mssql via `DB_TYPE` env var.
```typescript
// Used for database validation tests
await databaseClient.connect();
const result = await databaseClient.query('SELECT * FROM table WHERE id = $1', [id]);
```

## DatabaseAssertionHelper (`src/helpers/DatabaseAssertionHelper.ts`)
```typescript
assertRecordExists(table: string, condition: string, params?: any[]): Promise<void>;
assertRecordCount(table: string, condition: string, expected: number, params?: any[]): Promise<void>;
assertColumnValue(table: string, column: string, expected: any, condition: string, params?: any[]): Promise<void>;
```

---

# 🗂️ Module Reference — All Modules

## Login Module
| Page Object | Purpose |
|---|---|
| `LoginPage` | Login form, `loginWithPropertySelection(username, password, propId)` |
| `SelectProperty` | Property selection page |

**Login test files:**
- `tests/Login/login-authentication.spec.ts` — Login auth coverage
- `tests/Login/Login.spec.ts` — Login UI/edge cases
- `tests/Login/login-lockscreen-signout.spec.ts` — Lockscreen & sign out
- `tests/Login/login-screen-full-suite.spec.ts` — Full login suite
- `tests/Login/password-policy.spec.ts` — Password policy

## Front Desk Module
| Page Object | Location | Purpose |
|---|---|---|
| `GuestManagementPage` | `src/pages/FrontDesk/GuestManagementPage.ts` | Search/create guest reservations |
| `GuestManagementActivitiesPage` | `src/pages/FrontDesk/GuestManagementActivitiesPage.ts` | Activities CRUD within Guest Management |
| `BookingCalendarPage` | `src/pages/FrontDesk/BookingCalendarPage.ts` | Booking calendar view & filters |
| `BookingCal` | `src/pages/FrontDesk/BookingCal.ts` | Booking calendar helper |
| `ConfirmBookingPage` | `src/pages/FrontDesk/ConfirmBookingPage.ts` | Booking confirmation flow |
| `SpecialAccountPage` | `src/pages/FrontDesk/SpecialAccountPage.ts` | Special account create |
| `SpecialAccountsPage` | `src/pages/FrontDesk/SpecialAccountsPage.ts` | Special accounts sections |
| `GroupManagementPage` | `src/pages/FrontDesk/GroupManagementPage.ts` | Group create/management |
| `GroupDetailsPage` | `src/pages/FrontDesk/GroupDetailsPage.ts` | Group detail view |
| `TaskManagement` | `src/pages/FrontDesk/TaskManagement.ts` | Task management |
| `TaskManagementFlowPage` | `src/pages/FrontDesk/TaskManagementFlowPage.ts` | Task CRUD flow |
| `Advance` | `src/pages/FrontDesk/Advance.ts` | Advance bookings |
| `NoShowGuestDetailsPage` | `src/pages/FrontDesk/NoShowGuestDetailsPage.ts` | No-show handling |

**Front Desk test files:**
- `tests/frontdesk/AdvanceSearch.spec.ts`
- `tests/frontdesk/BookingCalendar.spec.ts`
- `tests/frontdesk/booking-calendar-filter-property-validation.spec.ts`
- `tests/frontdesk/ConfirmBooking.spec.ts`
- `tests/frontdesk/group-details-actions.spec.ts`
- `tests/frontdesk/group-management.spec.ts`
- `tests/frontdesk/guest-management.spec.ts`
- `tests/frontdesk/guest-management-activities.spec.ts`
- `tests/frontdesk/guest-management-sequential.spec.ts`
- `tests/frontdesk/noshow-guest-details.spec.ts`
- `tests/frontdesk/special-account.spec.ts`
- `tests/frontdesk/special-accounts-complete.spec.ts`
- `tests/frontdesk/TaskManagement.spec.ts`
- `tests/frontdesk/task-management-flow.spec.ts`
- `tests/frontdesk/PropertySwitchValidate.spec.ts`
- `tests/frontdesk/modify-special-account.spec.ts`

### Guest Management Activities Navigation
```typescript
// Navigate: Front Desk → Guest Management → dismiss popup → Open(2nd) → Sections → Activities
await page.mouse.move(0, 400);
await page.getByRole('link', { name: /Front Desk/ }).click();
await page.getByRole('link', { name: ' Guest Management' }).click();
await page.locator('.btn.btn-close').click();  // Dismiss popup
await page.getByRole('heading', { name: 'Open' }).nth(2).click();  // Open 2nd result
await page.getByRole('button', { name: /Sections/i }).click();
await page.getByText('Activities', { exact: true }).click();
```

### Confirm Booking Flow
```typescript
// Complete flow: Front Desk → Booking Calendar → select date block → Next → Confirm & Continue → fill details → Save
await confirmBookingPage.completeConfirmBookingFlow({
  bookingDate: '134',       // visual date block reference
  lastName: 'kumar',
  firstName: 'sachin',
  phone: '9759357070',
  email: 'abec@gmail.com',
  dropdownArrowDownPresses: 9,
  returnUrl: 'https://...'
});
```

### Group Management
```typescript
// Create group with GroupManagementPage
const createdGroup = await groupAvailability.createNewGroup(uniqueGroupName);
// Returns: { groupName, arrivalDate, departureDate, releaseBlockDate, businessDate }
```

## Marketing Module
| Page Object | Location | Purpose |
|---|---|---|
| `ProfileOperationsPage` | `src/pages/Marketing/ProfileOperationsPage.ts` | Profile sections (complaints, loyalty, credit card, contract) |
| `ProfilesPage` | `src/pages/Marketing/ProfilesPage.ts` | Profile listing/search |
| `AgentMaintenancePage` | `src/pages/Marketing/AgentMaintenancePage.ts` | Agent CRUD |
| `CorporateMaintenancePage` | `src/pages/Marketing/CorporateMaintenancePage.ts` | Corporate account CRUD |

**Marketing test files:**
- `tests/Marketing/profile-operations.spec.ts`
- `tests/Marketing/profiles.spec.ts`
- `tests/Marketing/agent-maintenance.spec.ts`
- `tests/Marketing/corporate-maintenance.spec.ts`

### Profile Operations Sections
```typescript
// Navigate to profile
await profileOps.openMarketingProfiles();
await profileOps.searchProfileAndOpen('Sachin');

// Access sections via Sections menu
await page.getByRole('button', { name: /Sections/i }).click();
await page.locator('dropdown-button .dropdown-item').filter({ hasText: 'Complaints' }).first().click();
// Other sections: Loyalty, Credit Card, Contract, etc.
```

## Front Office Setup Module
### Cashiering Parameters (11 sub-pages)
| Page Object | Purpose |
|---|---|
| `AccountCodePage` | Account code management |
| `ChargeCodeSetupPage` | Charge code setup |
| `DepartmentCreateDeletePage` | Department CRUD |
| `GLAccountsPage` | GL accounts |
| `GSTTypePage` | GST type management |
| `PaymentMethodPage` | Payment method setup |
| `RevenueTypePage` | Revenue type management |
| `DebtorAccountsPage` | Debtor accounts |
| `ChargeTaxTemplateSetupPage` | Charge tax template |
| `AccountCodePrintSeqPage` | Account code print sequence |
| `DepartmentPrintSeqPage` | Department print sequence |

**Other Front Office Setup pages:**
- `ClientParameters/` — Client parameter configuration
- `ItemParameters/` — Item parameter setup
- `MealPlan/` — Meal plan management
- `Message/` — Message configuration
- `MIS/` — MIS reports
- `ParameterSetup/` — General parameter setup
- `Profiles/` — Front office profiles
- `RoomParameter/` — Room parameter configuration
- `TypeMaster/` — Type master management
- `UserDefinedCode/` — User defined codes
- `CityStateMaster/` — City/state master data

**Cashiering test files:**
- `tests/FrontOfficeSetup/cashiering-parameters/` (11 sub-folders)
- `tests/Cashiering/post-advance.spec.ts`

### Cashiering Parameters Navigation
```typescript
// Navigate to a cashiering parameter page
await page.getByRole('link', { name: /Front Office Setup/i }).click();
await page.getByRole('link', { name: ' Cashiering Parameters' }).click();
await page.getByRole('link', { name: 'Account Code' }).click();
```

## Reports Module
### Parameter Reports (14 page objects)
| Page Object | Purpose |
|---|---|
| `ParameterReportsPage` | Base parameter reports page |
| `StatusReportPage` | Status report |
| `SellingStatusReportPage` | Selling status report |
| `SectionNoListReportPage` | Section number list |
| `RoomTypeListReportPage` | Room type list |
| `RoomAttributeReportPage` | Room attribute report |
| `PaymentMethodListReportPage` | Payment method list |
| `RevenueTypeListReportPage` | Revenue type list |
| `BlockNumberReportPage` | Block number report |
| `CheckoutMessageReportPage` | Checkout message report |
| `CorporateMainHeadReportPage` | Corporate main head report |
| `TravelAgentMainHeadReportPage` | Travel agent main head report |
| `PublicAreaReportPage` | Public area report |
| `SpecialServicesHeadReportPage` | Special services head report |

### Housekeeping Reports
| Page Object | Purpose |
|---|---|
| `TemporaryOutOfOrderPage` | Temporary out of order report |

**Report test files:**
- `tests/Reports/ParameterReports/` — Parameter report tests
- `tests/Reports/HKReports/` — Housekeeping report tests

## Global Search Module
| Page Object | Purpose |
|---|---|
| `GlobalSearchPage` | Tab-based search with dynamic count labels |

**Test file:** `tests/GlobalSearch/global-search.spec.ts`

### ⚠️ Global Search Gotcha
Dynamic count labels (e.g., `Rooms (n)`) — use regex, not exact match:
```typescript
// ✅ CORRECT
await expect(page.getByText(/Rooms \(\d+\)/)).toBeVisible();

// ❌ WRONG — will fail
await expect(page.getByText('Rooms (5)', { exact: true })).toBeVisible();
```

## System Config Module
| Page Object | Purpose |
|---|---|
| `UserSetupPage` | User CRUD, permissions |
| `UserSetupWithPolicyPage` | User setup with password policy |
| `AlertSetupPage` | Alert configuration |
| `PasswordPolicyPage` | Password policy management |
| `TemplateSetupPage` | Template management |

**System Config test files:**
- `tests/SystemConfig/user-setup.spec.ts`
- `tests/SystemConfig/user-setup-with-policy.spec.ts`
- `tests/SystemConfig/alert-setup.spec.ts`
- `tests/SystemConfig/password-policy.spec.ts`
- `tests/SystemConfig/template-setup.spec.ts`

## Manager Function Module
| Page Object | Purpose |
|---|---|
| `RateManagerPage` | Rate management |
| `CopyRateManager` | Copy rate configuration |
| `RateManagerAdvanceConfigPage` | Advanced rate configuration |
| `DerivedRateConfigPage` | Derived rate setup |
| `AvailabilityManagementPage` | Availability management |
| `MealPlanDetailsPage` | Meal plan details |
| `MealPlanDetailsDeletePage` | Delete meal plan details |
| `MealPlanDetailsSaveAndAddNewPage` | Save & add new meal plan |

**Manager Function test files:**
- `tests/ManagerFunction/rate-manager.spec.ts`
- `tests/ManagerFunction/rate-setup.spec.ts`
- `tests/ManagerFunction/rate-sections.spec.ts`
- `tests/ManagerFunction/rate-modify.spec.ts`
- `tests/ManagerFunction/copy-rate.spec.ts`
- `tests/ManagerFunction/CopyRate.spec.ts`
- `tests/ManagerFunction/rate-manager-advance-config.spec.ts`
- `tests/ManagerFunction/derived-rate-config.spec.ts`
- `tests/ManagerFunction/availability-management.spec.ts`
- `tests/ManagerFunction/meal-plan-details.spec.ts`
- `tests/ManagerFunction/meal-plan-details-delete.spec.ts`
- `tests/ManagerFunction/meal-plan-details-save-add-new.spec.ts`

## Night Audit Module
| Page Object | Purpose |
|---|---|
| `NightAuditPage` | Night audit operations |

**Test file:** `tests/NightAudit/night-audit.spec.ts`

## Availability Module
| Page Object | Purpose |
|---|---|
| `GroupAvailabilityPage` | Group availability flow (delegates to GroupManagementPage) |
| `RecreateAvailabilityPage` | Recreate availability |

**Test files:**
- `tests/Availability/group-availability.spec.ts` — Full group availability flow
- `tests/Availability/group-availability-seed.spec.ts` — Seed test
- `tests/Availability/recreate-availability.spec.ts`

### Group Availability Flow
```typescript
// 1. Login → 2. Navigate to Group Management → 3. Get business date
// → 4. Create new group → 5. Fetch room availability → 6. Add group block
// → 7. Open rooming list
const groupAvailability = new GroupAvailabilityPage(page, context);
await groupAvailability.navigateToGroupManagement();
const businessDate = await groupAvailability.getBusinessDate();
const createdGroup = await groupAvailability.createNewGroup(uniqueGroupName);
const availabilityData = await groupAvailability.fetchAvailability();
```

## Database Validation Module
**Test file:** `tests/database/database-validation.spec.ts`

Run with: `npm run test:db`

---

# 🛠️ How to Create a New Test

## Step-by-Step Process

1. **Choose the module** — Determine which module your test belongs to
2. **Choose the page object** — Check if a page object already exists for your feature
3. **Create the test file** — Place it in `tests/<Module>/your-test.spec.ts`
4. **Use Excel-based data selection** — Always use `UserDataProvider` and `PropertyDataProvider`
5. **Follow the standard template** — Use the test file structure shown above
6. **Add proper test IDs** — Prefix with module code: `FD_`, `MKT_`, `SC_`, `MF_`, `RPT_`, etc.

## Test ID Naming Convention
| Module | Prefix | Example |
|---|---|---|
| Front Desk | `FD_` | `FD_CB_001`, `FD_GM_001`, `FD_SP_001` |
| Marketing | `MKT_` | `MKT_PO_001`, `MKT_AM_001` |
| System Config | `SC_` | `SC_US_001`, `SC_AP_001` |
| Manager Function | `MF_` | `MF_RM_001`, `MF_DR_001` |
| Reports | `RPT_` | `RPT_SR_001` |
| Global Search | `GS_` | `GS_001` |
| Night Audit | `NA_` | `NA_001` |
| Login | `LG_` | `LG_AUTH_001` |
| Availability | `AV_` | `AV_GA_001` |
| Cashiering | `CA_` | `CA_PA_001` |

---

# ⚙️ Running Tests

## Common Commands
```bash
# Run all tests
npx playwright test

# Run specific module
npx playwright test tests/Login --project=chromium --workers=1
npx playwright test tests/frontdesk --project=chromium --workers=1
npx playwright test tests/Marketing --project=chromium --workers=1

# Run specific test file
npx playwright test tests/frontdesk/ConfirmBooking.spec.ts --project=chromium --workers=1

# Run with specific test name
npx playwright test -g "FD_CB_001" --project=chromium --workers=1

# Debug mode
npx playwright test --debug

# UI mode
npx playwright test --ui

# Run with headed browser
npx playwright test --headed

# Generate Allure report
npm run report:allure

# Database tests
npm run test:db

# Cashiering tests
npm run test:cashiering:chrome:serial

# Login tests
npm run test:login:chrome:serial

# Front office tests
npm run test:frontoffice:chrome:serial
```

## Environment Selection
```bash
# Default (dev)
npx playwright test

# Stage
npx playwright test --env=stage

# Production
npx playwright test --env=prod
```

---

# 🔧 Configuration

## Environment Variables (`.env` files in `config/`)
```
BASE_URL=https://qc2webwish.prologicfirst.in
ENVIRONMENT=dev
LOG_LEVEL=debug
RETRY_COUNT=2
TIMEOUT=30000
PARALLEL_WORKERS=4
HEADLESS=true
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=webwish
DB_USER=admin
DB_PASSWORD=secret
```

## Playwright Config (`playwright.config.ts`)
- **Default browsers:** Chromium (primary), Firefox, WebKit, Edge
- **Workers:** 1 (serial by default)
- **Retries:** 0 locally, configurable via `PLAYWRIGHT_RETRIES`
- **Reporters:** list, HTML, JSON, JUnit, Allure, CustomReporter
- **Storage state:** `storageState.json` (persisted auth)
- **Keep browser open:** `KEEP_BROWSER_OPEN=true` (default)
- **Maximize browser:** `MAXIMIZE_BROWSER=true` (default)
- **Headed:** `HEADED=true` (default)

## Browser Launch Options
When `MAXIMIZE_BROWSER=true`:
- Viewport is `null` (fills entire screen)
- Launch args include `--start-maximized`
- Works for Chromium, Firefox, WebKit, and Edge

---

# ⚡ Known Gotchas & Rules

1. **Login property index:** Default to `3` (WEBWE) for new tests via Excel, or `2` for legacy tests
2. **Business Date:** Extract from header `h6` containing `Business Date:` — **NEVER hardcode dates**
3. **Date picker navigation:** Month boundaries may require `>` / `PageDown` clicks for departure/release dates
4. **Sections menu:** Scope dropdown items to `dropdown-button .dropdown-item` — avoid `getByText(... exact)` against full page
5. **Global Search tabs:** Dynamic count labels (e.g., `Rooms (n)`) — use regex `/Rooms \(\d+\)/`, not exact match
6. **Guest Management Activities:** Navigate via Front Desk → Guest Management → dismiss `.btn.btn-close` → click `Open` nth(2) → `Sections` → `Activities`
7. **Bulk delete pattern:** Use `#checkAll` checkbox then second button; wait for `Please select at least one record` if nothing selected
8. **Room Inventory delete:** After clicking Yes, explicitly wait for deleted-success text before clicking OK
9. **Marketing loyalty/credit card inserts:** Use unique membership numbers (`Date.now()` suffix) to avoid duplicate primary key errors
10. **Mouse move before sidebar click:** Some menus require `await page.mouse.move(0, 400)` before clicking sidebar links
11. **Search input type pattern:** Use `.fill('')` then `.type(text)` (not just `.fill(text)`) for search dropdowns
12. **Success dialog pattern:** Most operations show `#swal2-html-container` → click OK
13. **Toast messages:** Use `page.getByRole('paragraph')` for success/error toast messages
14. **Checkbox operations:** Use `#checkAll` for select-all, then target specific action buttons
15. **Test timeout:** Set `test.setTimeout(30 * 60 * 1000)` for long-running flows (availability, group management)

---

# 🧩 Common Test Patterns

## Create-Read-Update-Delete (CRUD) Pattern
```typescript
test('MODULE_001: CRUD flow', async ({ page, context }) => {
  // Login
  const loginPage = new LoginPage(page, context);
  const user = await userProvider.getUserByIndexFromExcel(0);
  const prop = await propProvider.getPropertyByIndexFromExcel(3);
  await loginPage.loginWithPropertySelection(user.username, user.password, prop.code);

  // Create
  await pageObject.openModule();
  await pageObject.createRecord(data);
  await expect(page.getByRole('paragraph')).toContainText('created/updated successfully');
  await page.getByRole('button', { name: 'OK' }).click();

  // Read/Verify
  await pageObject.searchRecord(data.name);
  await expect(page.locator('container')).toContainText(data.name);

  // Delete
  await pageObject.deleteRecord(data.name);
  await expect(page.getByRole('paragraph')).toContainText('deleted successfully');
  await page.getByRole('button', { name: 'OK' }).click();
});
```

## Screenshot on Failure Pattern
```typescript
test.afterEach(async ({ page }) => {
  if (test.info().status === 'failed') {
    await page.screenshot({
      path: `screenshots/${test.info().title.replace(/\s+/g, '_')}.png`,
      fullPage: true,
    });
  }
});
```

## Business Date Extraction Pattern
```typescript
async getBusinessDate(): Promise<string> {
  const businessInfo = page.locator('h6').filter({ hasText: 'Business Date:' }).first();
  await expect(businessInfo).toBeVisible();
  const infoText = (await businessInfo.textContent()) ?? '';
  const dateMatch = infoText.match(/Business Date:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
  if (!dateMatch) throw new Error(`Unable to extract Business Date from: ${infoText}`);
  return dateMatch[1]; // Returns "DD/MM/YYYY"
}
```

## Validation Error Check Pattern
```typescript
// Check that validation messages appear on blank save
await page.getByRole('button', { name: 'Save', exact: true }).click();
await expect(page.getByText('Required')).toBeVisible();
await page.getByRole('button', { name: 'OK' }).click();
```

## Bulk Delete Pattern
```typescript
// Select all and delete
await page.locator('#checkAll').click();
await page.locator('.btn.btn-sm.waves-effect.waves-light.py-0.px-2.btn-soft-danger').click();
// Handle confirmation
await page.getByRole('button', { name: 'Yes' }).click();
await expect(page.getByRole('paragraph')).toContainText('deleted successfully');
await page.getByRole('button', { name: 'OK' }).click();
```

## Date Range Selection Pattern
```typescript
const dateRangeInput = page.getByRole('textbox', { name: 'Select Date Range' });
await dateRangeInput.click();
// Enter dates (DD/MM/YYYY format)
await dateRangeInput.fill(`${arrivalDate} - ${departureDate}`);
await page.getByRole('button', { name: 'Apply' }).click();
```

## Dropdown Selection Pattern (ng-select)
```typescript
// For ng-select dropdowns
await page.locator('ng-select').filter({ hasText: optionText }).getByRole('textbox').click();
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
```

---

# 📊 Reporting

## Allure Reports
- Results in `allure-results/`
- Generate: `npm run report:allure`
- Open: `npm run report:allure:open`
- Serve: `npm run report:allure:serve`

## Test Results
- HTML report: `reports/html-report/`
- JSON results: `test-results/test-results.json`
- JUnit XML: `test-results/junit.xml`
- Custom reporter: `src/listeners/CustomReporter.ts`

## Screenshots & Videos
- Screenshots: `screenshots/` (auto-captured on failure)
- Videos: retained on failure (configured in playwright.config.ts)
- Traces: on-first-retry

---

# 🐳 Docker

```bash
# Build and run
docker-compose up --build

# Run specific test
docker-compose run --rm playwright npx playwright test tests/Login --project=chromium
```

---

# 🔄 CI/CD

## GitHub Actions
- Pipeline in `.github/workflows/playwright.yml`
- Matrix execution across browsers
- Artifact storage for reports, screenshots, videos

## Jenkins
- `Jenkinsfile` in project root
- Supports pipeline stages for build, test, report

---

# ❓ Quick FAQ

**Q: How do I create a reservation?**
A: Use `GuestManagementPage` → `createNewReservation()` → `selectRoom()` → `enterLastName()` → `enterFirstName()` → complete the booking flow. See the ConfirmBooking flow above.

**Q: How do I navigate to Guest Management?**
A: Use global search: `page.getByRole('textbox', { name: 'Search...' })` → fill `'Guest Management'` → click the result. Or via sidebar: Front Desk → Guest Management.

**Q: How do I get the business date?**
A: Extract from the header: `page.locator('h6').filter({ hasText: 'Business Date:' })` → regex match `DD/MM/YYYY`. NEVER hardcode dates.

**Q: How do I run only my test?**
A: `npx playwright test tests/path/to/your-test.spec.ts --project=chromium --workers=1`

**Q: How do I select a property?**
A: Use `PropertyDataProvider` → `getPropertyByIndexFromExcel(3)` for WEBWE, or pass property code to `loginWithPropertySelection()`.

**Q: How do I add a new page object?**
A: Create a class in `src/pages/<Module>/YourPage.ts`, extend `BasePage`, inject `ElementActions`, define locators as getters, implement methods.

**Q: How do I handle a SweetAlert popup?**
A: `await page.locator('#swal2-html-container').toContainText('message')` → `await page.getByRole('button', { name: 'OK' }).click()`.

**Q: How do I handle the Sections dropdown?**
A: `await page.getByRole('button', { name: /Sections/i }).click()` → `await page.locator('dropdown-button .dropdown-item').filter({ hasText: 'SectionName' }).first().click()`.
