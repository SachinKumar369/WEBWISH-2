# 📘 WebWish Automation Framework — Complete Knowledge Base

> **Purpose:** This document is a comprehensive reference for the WebWish Playwright automation framework. Any AI, LLM, or human developer can use this to fully understand the framework's architecture, conventions, configuration, test data, and usage patterns without reading the source code.

---

## 1. Framework Overview

| Property | Value |
|---|---|
| **Project Name** | `webwish-automation-framework` |
| **Version** | 1.0.0 |
| **Language** | TypeScript (ES2020, CommonJS modules) |
| **Test Framework** | Playwright Test (`@playwright/test ^1.40.0`) |
| **Application Under Test** | **WebWish** — a hotel/hospitality Property Management System (PMS) |
| **Author** | SDET Automation Team |
| **License** | MIT |

### What is WebWish?
WebWish is a **cloud-based hotel Property Management System (PMS)** used for front-office operations including:
- Login / Authentication / Property Selection
- Room management (room types, availability, rate plans)
- Front-desk operations (check-in, check-out, cashiering)
- Guest profiles and marketing (agents, corporates)
- Manager functions (rate management, copy rates, derived rates, meal plans)
- Reports (housekeeping, parameter reports)
- System configuration (users, alerts, templates)
- Global search
- Database validation

---

## 2. Application URLs & Environment

### Environments

| Environment | URL | Config File |
|---|---|---|
| **DEV** | `https://qc2webwish.prologicfirst.in/login/z6cQJcxmrEbhhFXqdoj64Q%3D%3D` | `config/.env.dev` |
| **STAGE** | (similar pattern) | `config/.env.stage` |
| **PROD** | (similar pattern) | `config/.env.prod` |

### Default BASE_URL
```
https://qc2webwish.prologicfirst.in/login/z6cQJcxmrEbhhFXqdoj64Q%3D%3D
```
The URL is set via the `BASE_URL` environment variable. If not set, the hardcoded default in `playwright.config.ts` is used.

### Environment Selection
The `ENV` environment variable controls which `.env.*` file is loaded:
```bash
# Run against dev (default)
npx playwright test

# Run against stage
ENV=stage npx playwright test

# Run against prod
ENV=prod npx playwright test
```

---

## 3. Credentials & Test Users

### User Credentials (`test-data/test-data.json`)

| Username | Password | Role | Environment | Email |
|---|---|---|---|---|
| `SACH` | `Sachin@578` | admin | all | sach@example.com |
| `TEST_USER` | `Test@123` | user | dev | testuser@example.com |
| `STAGE_USER` | `Stage@123` | user | stage | stageuser@example.com |
| `dummy` | `Sachin@578` | user | prod | produser@example.com |

### How Credentials Are Loaded
The `TestDataManager` class (`src/utils/TestDataManager.ts`) loads credentials:
```typescript
import { testDataManager } from '../../src/utils/TestDataManager';
const user = await testDataManager.getUserCredentials('all'); // returns first admin user
```
- It reads from `test-data/test-data.json`
- Filters by environment if specified (otherwise returns the first user)
- Results are cached in memory after first load

### Global Setup Login
The `global-setup.ts` performs a **one-time login** before all tests:
1. Launches Chromium
2. Navigates to the login URL
3. Calls `loginPage.loginWithPropertySelection(username, password, propertyIndex)`
4. Saves authenticated `storageState.json` for reuse

---

## 4. Property Selection

### Properties (`test-data/properties.json`)

| Code | Name |
|---|---|
| `WDUBI` | WEBWISH DUBAI 3.0 |
| `WEBIN` | WEBWISHINDIA |
| `WEBBE` | Webwish Hotel |

### How Property Selection Works
After login, the user must select a **property** (hotel). The framework supports this via:

1. **`LoginPage.loginWithPropertySelection(username, password, propertyIndex)`** — Logs in and selects the property at the given index (0-based)
2. **`PropertySelectionPage`** — Can select a property by code or by index
3. **`SelectProperty`** — An alternative class that reads all available properties from the page and selects by index or code

The property selection page displays the heading **"Select a property to signin!"** and shows property buttons with codes like `WDUBI`, `WEBIN`, etc.

### Property Selection Flow
```
Login Page → Enter credentials → Click Login → Property Selection Page → Click property button → Dashboard
```

---

## 5. Project Structure

```
WebWish 2/
├── playwright.config.ts          # Playwright configuration (projects, reporters, settings)
├── global-setup.ts               # Global setup: login + save storage state
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and scripts
├── storageState.json             # Saved browser state (auto-generated)
├── docker-compose.yml            # Docker setup
├── Jenkinsfile                   # CI/CD pipeline
│
├── config/
│   ├── .env.dev                  # Dev environment variables
│   ├── .env.stage                # Stage environment variables
│   └── .env.prod                 # Production environment variables
│
├── src/
│   ├── core/
│   │   ├── BasePage.ts           # Base class for all page objects
│   │   └── Logger.ts             # Winston logger (file + console)
│   │
│   ├── pages/
│   │   ├── LoginPage.ts          # Main login page (legacy, extended)
│   │   ├── LoginPage1.ts         # Alternative login page implementation
│   │   ├── SelectProperty.ts     # Property selection page
│   │   ├── PropertySelectionPage.ts  # Property selection (read from JSON)
│   │   ├── NoteTemplatesPage.ts  # Note templates page
│   │   ├── Login/                # Login-specific page objects
│   │   ├── FrontDesk/            # Front desk page objects
│   │   ├── FrontOfficeSetup/     # Parameter setup pages (12+ modules)
│   │   ├── GlobalSearch/         # Global search page
│   │   ├── ManagerFunction/      # Rate management pages
│   │   ├── Marketing/            # Marketing/profile pages
│   │   ├── Reports/              # Report pages
│   │   └── SystemConfig/         # System configuration pages
│   │
│   ├── utils/
│   │   ├── ElementActions.ts     # Click, sendKeys, dropdown, checkbox actions (with retry)
│   │   ├── WaitUtils.ts          # Wait for element, network idle, specific responses
│   │   ├── TestDataManager.ts    # Load JSON/CSV test data, user credentials
│   │   ├── DatabaseClient.ts     # PostgreSQL, MySQL, MSSQL database client
│   │   ├── ExcelHelper.ts        # Read Excel files
│   │   ├── ExcelDataWriter.ts    # Write data to Excel
│   │   ├── ExcelPropertyManager.ts  # Excel-based property management
│   │   ├── GlobalDataStore.ts    # Global shared data store
│   │   └── VisualRegressionUtil.ts  # Screenshot comparison utilities
│   │
│   ├── helpers/
│   │   ├── AssertionHelper.ts    # Custom assertion helpers
│   │   ├── BrowserContextManager.ts  # Browser context management
│   │   ├── DatabaseAssertionHelper.ts  # DB-based assertions
│   │   ├── ParameterReportValidationHelper.ts  # Report validation
│   │   └── TestExtensions.ts     # Extended test utilities
│   │
│   └── listeners/
│       └── CustomReporter.ts     # Custom Playwright reporter (JSON summary + logs)
│
├── tests/                        # All test specifications
│   ├── Login/                    # 4 test files (auth, lockout, password policy)
│   ├── FrontOfficeSetup/         # 12 sub-modules (cashiering, rooms, meals, etc.)
│   │   ├── cashiering-parameters/
│   │   ├── CityStateMaster/
│   │   ├── ClientParameters/
│   │   ├── ItemParameter/
│   │   ├── MealPlan/
│   │   ├── Message/
│   │   ├── MIS/
│   │   ├── parameter-setup/
│   │   ├── Profiles/
│   │   ├── RoomParameter/
│   │   ├── TypeMaster/
│   │   └── UserDefinedCode/
│   ├── ManagerFunction/          # 12 test files (rate management, availability)
│   ├── Marketing/                # 4 test files (agents, corporates, profiles)
│   ├── Reports/                  # Report tests (HK, Parameter)
│   │   ├── HKReports/
│   │   └── ParameterReports/
│   ├── SystemConfig/             # 3 test files (alerts, templates, users)
│   ├── GlobalSearch/             # 1 test file
│   ├── database/                 # 2 database validation test files
│   ├── frontdesk/                # Front desk tests
│   ├── fixtuers/                 # Test fixtures
│   └── *.spec.ts                 # Top-level spec files
│
├── test-data/
│   ├── test-data.json            # User credentials and test case data
│   ├── properties.json           # Hotel property codes and names
│   ├── properties.xlsx           # Excel property data
│   ├── room-types.json           # Room type definitions
│   ├── users.csv                 # CSV user data
│   ├── TestData.xlsx             # Excel test data
│   └── baselines/                # Baseline screenshots for visual regression
│
├── scripts/                      # Utility scripts
├── allure-results/               # Allure test results (auto-generated)
├── allure-report/                # Allure HTML report (auto-generated)
├── reports/                      # Test reports (HTML, Extent)
├── screenshots/                  # Screenshots (auto-generated)
├── test-results/                 # Test results JSON + JUnit XML
├── logs/                         # Application logs (Winston)
└── graphify-out/                 # Knowledge graph output
```

---

## 6. Playwright Configuration

### Key Settings (`playwright.config.ts`)

| Setting | Value |
|---|---|
| **Test Directory** | `./tests` |
| **Test Pattern** | `**/*.spec.ts` |
| **Workers** | `1` (serial execution) |
| **Parallel** | `fullyParallel: true` (but workers=1 makes it serial) |
| **Global Setup** | `./global-setup.ts` |
| **baseURL** | Environment-specific (see Section 2) |
| **Storage State** | `./storageState.json` (saved after global setup) |
| **Action Timeout** | 10,000ms |
| **Navigation Timeout** | 30,000ms |
| **Global Timeout** | 30,000ms per test |
| **Expect Timeout** | 5,000ms |
| **Trace** | `on-first-retry` |
| **Screenshot** | `only-on-failure` |
| **Video** | `retain-on-failure` |

### Browser Projects

| Project Name | Browser | Notes |
|---|---|---|
| `Login` | Chromium | Matches `**/Login/*.spec.ts` only |
| `chromium` | Chromium | Default browser |
| `firefox` | Firefox | Cross-browser testing |
| `webkit` | WebKit | Cross-browser testing |
| `msedge` | Chromium (Edge channel) | Microsoft Edge |

### Browser Behavior (Environment Variables)
```bash
HEADED=true          # Run in headed mode (default: true)
KEEP_BROWSER_OPEN=true  # Keep browser open after tests (default: true)
MAXIMIZE_BROWSER=true   # Maximize browser window (default: true)
```

### Reporters

| Reporter | Output |
|---|---|
| `list` | Console output |
| `html` | `reports/html-report/` |
| `json` | `test-results/test-results.json` |
| `junit` | `test-results/junit.xml` |
| `allure-playwright` | `allure-results/` |
| `CustomReporter.ts` | Custom JSON summary + Winston logs |

---

## 7. Architecture & Design Patterns

### Page Object Model (POM)
The framework follows the **Page Object Model** pattern:

```
BasePage (src/core/BasePage.ts)
    ├── LoginPage
    ├── LoginPage1
    ├── PropertySelectionPage
    ├── SelectProperty
    ├── NoteTemplatesPage
    └── [Module]Page objects under src/pages/
```

**BasePage** provides:
- `navigate(url)` — navigate to a URL
- `navigateToHome()` — navigate to base URL
- `waitForURL(pattern)` — wait for URL match
- `waitForPageLoad(state)` — wait for load/domcontentloaded/networkidle
- `takeScreenshot(name)` — capture screenshot to `screenshots/` folder
- `getCurrentURL()` — get current URL
- `getPageTitle()` — get page title
- `waitForNetworkIdle()` — wait for network idle

### Utility Classes

| Class | Purpose |
|---|---|
| `ElementActions` | Click (3 retries + JS fallback), sendKeys (with clear), dropdown select, checkbox toggle, scroll, hover, waitForElement, waitForElementHidden, takeScreenshotOnFailure |
| `WaitUtils` | waitForElementStable, waitForNetworkIdle, waitForResponse (specific HTTP response patterns) |
| `TestDataManager` | Load JSON/CSV test data, get user credentials, caching |
| `DatabaseClient` | Connect to PostgreSQL/MySQL/MSSQL, execute queries, disconnect. Reads config from env vars |
| `ExcelHelper` | Read Excel files |
| `ExcelDataWriter` | Write data to Excel files |
| `GlobalDataStore` | Shared data across test files |
| `VisualRegressionUtil` | Screenshot comparison with pixelmatch |

### Assertion Helpers

| Helper | Purpose |
|---|---|
| `AssertionHelper` | Custom Playwright assertions |
| `DatabaseAssertionHelper` | Assert database state matches UI state |
| `ParameterReportValidationHelper` | Validate parameter report data |

---

## 8. Test Data Management

### Data Sources

| File | Format | Contents |
|---|---|---|
| `test-data/test-data.json` | JSON | User credentials, test case definitions |
| `test-data/properties.json` | JSON | Property codes (WDUBI, WEBIN, WEBBE) |
| `test-data/properties.xlsx` | Excel | Property data |
| `test-data/room-types.json` | JSON | Room type definitions |
| `test-data/users.csv` | CSV | User data |
| `test-data/TestData.xlsx` | Excel | General test data |
| `test-data/baselines/` | PNG | Baseline screenshots for visual regression |

### Test Case Data Structure (from `test-data.json`)
```json
{
  "id": "TC_LOGIN_001",
  "name": "Valid Login with Admin Credentials",
  "description": "Verify successful login with valid admin credentials",
  "username": "SACH",
  "password": "Sachin@578",
  "expectedResult": "Dashboard page should be displayed"
}
```

### How to Add Test Data
1. Add JSON files to `test-data/` directory
2. Use `TestDataManager` to load: `await testDataManager.loadJSONData('my-data.json')`
3. For CSV: `await testDataManager.loadCSVData('my-data.csv')`

---

## 9. Database Validation

### Supported Databases

| Database | Package | Default Port |
|---|---|---|
| PostgreSQL | `pg` | 5432 |
| MySQL | `mysql2` | 3306 |
| MSSQL (SQL Server) | `mssql` | 1433 |

### Current Configuration (from `.env.dev`)
```bash
DB_TYPE=mssql
DB_HOST=192.168.0.9
DB_PORT=2026
DB_USER=PFSYS
DB_PASSWORD=p@$$w0rd578
DB_NAME=QCPMS
DB_SSL=true
```

### Usage Pattern
```typescript
import { DatabaseClient } from '../../src/utils/DatabaseClient';

const db = new DatabaseClient();
if (db.isConfigured()) {
  await db.connect();
  const result = await db.query('SELECT * FROM table_name');
  // Assert against result
  await db.disconnect();
}
```

### Database Validation Tests
- `tests/database/database-validation.spec.ts` — General database validation
- `tests/database/meal-plan-report-db-validation.spec.ts` — Meal plan report DB validation

---

## 10. Test Modules & Coverage

### Login (`tests/Login/`)
| File | Tests |
|---|---|
| `Login.spec.ts` | Positive: valid login, enter key submit, forgot password. Negative: invalid user, wrong password, empty fields, SQL injection, XSS, long values, lockout |
| `login-authentication.spec.ts` | Authentication flows |
| `login-lockscreen-signout.spec.ts` | Lock screen and sign-out |
| `password-policy.spec.ts` | Password policy validation |

### Front Office Setup (`tests/FrontOfficeSetup/`) — 12 Modules
| Module | Description |
|---|---|
| `cashiering-parameters/` | Cashiering parameter configuration |
| `CityStateMaster/` | City/state master data |
| `ClientParameters/` | Client parameter settings |
| `ItemParameter/` | Item parameter configuration |
| `MealPlan/` | Meal plan setup |
| `Message/` | Message templates |
| `MIS/` | MIS report parameters |
| `parameter-setup/` | General parameter setup |
| `Profiles/` | Guest profile management |
| `RoomParameter/` | Room parameter configuration |
| `TypeMaster/` | Type master data |
| `UserDefinedCode/` | User-defined codes |

### Manager Function (`tests/ManagerFunction/`)
| File | Description |
|---|---|
| `availability-management.spec.ts` | Room availability management |
| `rate-setup.spec.ts` | Rate plan setup |
| `rate-manager.spec.ts` | Rate manager operations |
| `rate-manager-advance-config.spec.ts` | Advanced rate configuration |
| `rate-modify.spec.ts` | Rate modification |
| `rate-sections.spec.ts` | Rate section management |
| `copy-rate.spec.ts` / `CopyRate.spec.ts` | Copy rate plans |
| `derived-rate-config.spec.ts` | Derived rate configuration |
| `meal-plan-details.spec.ts` | Meal plan details |
| `meal-plan-details-save-add-new.spec.ts` | Meal plan save/add |
| `meal-plan-details-delete.spec.ts` | Meal plan deletion |

### Marketing (`tests/Marketing/`)
| File | Description |
|---|---|
| `agent-maintenance.spec.ts` | Travel agent management |
| `corporate-maintenance.spec.ts` | Corporate client management |
| `profile-operations.spec.ts` | Profile CRUD operations |
| `profiles.spec.ts` | Profile management |

### Reports (`tests/Reports/`)
- `HKReports/` — Housekeeping reports
- `ParameterReports/` — Parameter-based reports

### System Config (`tests/SystemConfig/`)
| File | Description |
|---|---|
| `alert-setup.spec.ts` | Alert configuration |
| `template-setup.spec.ts` | Template management |
| `user-setup.spec.ts` | User account management |

### Other Tests
| File/Dir | Description |
|---|---|
| `tests/GlobalSearch/global-search.spec.ts` | Global search functionality |
| `tests/frontdesk/` | Front desk operations |
| `tests/database/` | Database validation tests |
| `property-selection.spec.ts` | Property selection flow |
| `visual-regression.spec.ts` | Visual regression testing |
| `search_facebook.spec.ts` | Facebook search integration |
| `note-templates.spec.ts` / `note-templates-create.spec.ts` | Note template operations |

---

## 11. Running Tests — NPM Scripts

### Basic Commands
```bash
# Run all tests (default chromium project)
npm test

# Run specific browser
npm run test:chrome
npm run test:firefox
npm run test:webkit
npm run test:edge

# Run all browsers
npm run test:all-browsers
```

### Execution Modes
```bash
# Headed mode
npm run test:headed

# Debug mode (step through)
npm run test:debug

# UI mode (interactive)
npm run test:ui

# Parallel (4 workers)
npm run test:parallel

# Serial (1 worker)
npm run test:serial
```

### Environment-Specific
```bash
# Dev environment
npm run test:dev

# Stage environment
npm run test:stage

# Production environment
npm run test:prod
```

### Module-Specific
```bash
# Login tests only
npm run test:login:chrome:serial

# Front office setup tests
npm run test:frontoffice:chrome:serial

# Cashiering parameters only
npm run test:cashiering:chrome:serial

# Database validation tests
npm run test:db
```

### Reports
```bash
# Generate Allure report
npm run report:allure

# Open Allure report
npm run report:allure:open

# Serve Allure report
npm run report:allure:serve

# Run tests + generate Allure report
npm run test:report

# Run tests + auto-open Allure report
npm run test:report:auto
```

### Maintenance
```bash
# Clean all generated artifacts
npm run clean

# Install browsers
npm run install:browsers

# Lint TypeScript
npm run lint

# Fix lint issues
npm run lint:fix

# Build TypeScript
npm run build
```

### Direct Playwright Commands
```bash
# Run specific test file
npx playwright test tests/Login/Login.spec.ts

# Run specific test directory
npx playwright test tests/GlobalSearch --project=chromium --workers=1

# Run with specific project
npx playwright test --project=chromium

# Run with grep filter
npx playwright test -g "Positive"
```

---

## 12. Writing Tests — Conventions

### Test File Naming
- Files use `.spec.ts` extension
- Named with kebab-case: `login-authentication.spec.ts`
- Organized in feature-based directories

### Test Structure
```typescript
import { expect, test } from '@playwright/test';
import logger from '../../src/core/Logger';
import { testDataManager } from '../../src/utils/TestDataManager';
import { LoginPage } from '../../src/pages/Login/Login';

test.describe('Module Name', () => {
  let validUsername = 'default';
  let validPassword = 'default';

  test.beforeAll(async () => {
    const user = await testDataManager.getUserCredentials('all');
    validUsername = user.username;
    validPassword = user.password;
  });

  test.beforeEach(async ({ page, context }) => {
    // Navigate to starting page
  });

  test.afterEach(async ({ page }) => {
    const keepBrowserOpen = process.env.KEEP_BROWSER_OPEN === 'true';
    if (keepBrowserOpen) {
      logger.info('KEEP_BROWSER_OPEN enabled.');
    }
    await page.waitForTimeout(200);
  });

  test('Test Name', async ({ page, context }) => {
    // Arrange → Act → Assert pattern
  });
});
```

### Locator Strategy
The framework uses **multiple fallback locators** for resilience:
```typescript
private readonly USERNAME_INPUT = '[data-testid=\'username-input\'], input[placeholder*=\'Username\'], input[placeholder*=\'username\'], input[name=\'username\']';
```
Priority: `data-testid` → `placeholder` → `name` attribute → CSS/XPath

### Element Action Pattern
All element interactions go through `ElementActions` which provides:
- **3-retry logic** for clicks (with JavaScript fallback)
- **Clear + type** for text input
- **Screenshot on failure** for debugging
- **Automatic scroll into view**

---

## 13. Logging

### Logger (`src/core/Logger.ts`)
Uses **Winston** with:
- **File transports:** `logs/error.log` and `logs/combined.log` (10MB max, 5 files)
- **Console transport:** Colorized output
- **Timestamp format:** `YYYY-MM-DD HH:mm:ss`

### Log Levels
- `error` — Failures and exceptions
- `warn` — Non-critical issues
- `info` — Key actions (navigation, clicks, form fills)
- `debug` — Detailed debugging info

---

## 14. Visual Regression Testing

- Baseline screenshots stored in `test-data/baselines/`
- Uses `pixelmatch` for pixel-level comparison
- `VisualRegressionUtil` class handles comparison logic
- Test file: `visual-regression.spec.ts`

---

## 15. CI/CD Integration

### Jenkins
- `Jenkinsfile` present for Jenkins pipeline
- Docker support via `docker-compose.yml`

### CI Environment Variables
```bash
CI=true              # Enables forbidOnly mode
```

---

## 16. Dependencies

### Core Dependencies
| Package | Purpose |
|---|---|
| `@playwright/test` | Test framework |
| `playwright` | Browser automation |
| `typescript` | TypeScript compiler |
| `dotenv` | Environment variable loading |
| `winston` | Logging |
| `allure-playwright` | Allure reporting |

### Database Drivers
| Package | Purpose |
|---|---|
| `pg` | PostgreSQL client |
| `mysql2` | MySQL client |
| `mssql` | SQL Server client |

### Data & Reporting
| Package | Purpose |
|---|---|
| `xlsx` | Excel file reading/writing |
| `csv-parser` | CSV parsing |
| `fast-csv` | Fast CSV generation |
| `pdf-parse` | PDF parsing |
| `pixelmatch` | Visual regression comparison |
| `allure-commandline` | Allure report generation |

### Dev Tools
| Package | Purpose |
|---|---|
| `eslint` | Code linting |
| `@typescript-eslint/*` | TypeScript ESLint |
| `rimraf` | Cross-platform rm -rf |
| `ts-node` | TypeScript execution |

---

## 17. Key Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ENV` | `dev` | Environment to run against |
| `BASE_URL` | `https://qc2webwish.prologicfirst.in/...` | Application base URL |
| `HEADED` | `true` | Run browser in headed mode |
| `KEEP_BROWSER_OPEN` | `true` | Keep browser open after test |
| `MAXIMIZE_BROWSER` | `true` | Maximize browser window |
| `LOG_LEVEL` | `info` | Logging level |
| `SCREENSHOT_ON_FAILURE` | `true` | Capture screenshot on failure |
| `VIDEO_ON_FAILURE` | `true` | Record video on failure |
| `RETRY_COUNT` | `0` | Number of retries |
| `TIMEOUT` | `30000` | Default timeout (ms) |
| `PARALLEL_WORKERS` | `4` | Number of parallel workers |
| `DB_TYPE` | `mssql` | Database type (postgres/mysql/mssql) |
| `DB_HOST` | - | Database host |
| `DB_PORT` | - | Database port |
| `DB_USER` | - | Database user |
| `DB_PASSWORD` | - | Database password |
| `DB_NAME` | - | Database name |
| `DB_SSL` | `false` | Use SSL for database |

---

## 18. Graphify Analysis

The framework includes a knowledge graph generated by the **graphify** tool in `graphify-out/`:
- `GRAPH_REPORT.md` — Full knowledge graph report
- `graph.html` — Interactive HTML graph
- `graph.json` — Machine-readable graph data
- `converted/properties_682daac7.md` — Properties analysis
- `converted/TestData_4ce0e508.md` — Test data analysis

---

## 19. Quick Reference — Common Patterns

### Login and Navigate
```typescript
const login = new LoginPage(page, context);
await login.open(DEFAULT_LOGIN_URL);
await login.fillCredentials(username, password);
await login.clickLogin();
await login.expectAuthenticatedLanding();
```

### Select Property
```typescript
const propertyPage = new PropertySelectionPage(page, context);
await propertyPage.selectPropertyByCode('WDUBI');
// OR
await propertyPage.selectFirstProperty();
```

### Element Interactions (via ElementActions)
```typescript
const actions = new ElementActions(page);
await actions.click(selector, 'description');
await actions.sendKeys(selector, 'text', 'description', true);
await actions.waitForElement(selector, timeout, 'description');
await actions.waitForElementHidden(selector, timeout, 'description');
```

### Database Query
```typescript
const db = new DatabaseClient();
if (db.isConfigured()) {
  await db.connect();
  const rows = await db.query('SELECT * FROM room_types WHERE status = ?', ['active']);
  // Validate rows
  await db.disconnect();
}
```

### Load Test Data
```typescript
const data = await testDataManager.loadJSONData('properties.json');
const user = await testDataManager.getUserCredentials('dev');
const csvData = await testDataManager.loadCSVData('users.csv');
```

---

## 20. Adding a New Test Module — Step by Step

1. **Create page object** in `src/pages/[Module]/[PageName].ts` extending `BasePage`
2. **Create test file** in `tests/[Module]/[test-name].spec.ts`
3. **Import dependencies:**
   ```typescript
   import { expect, test } from '@playwright/test';
   import { LoginPage } from '../../src/pages/Login/Login';
   import { testDataManager } from '../../src/utils/TestDataManager';
   ```
4. **Write test** using Arrange → Act → Assert pattern
5. **Run test:**
   ```bash
   npx playwright test tests/[Module]/[test-name].spec.ts --project=chromium --workers=1
   ```

---

*Last updated: June 2026*
*Generated from source code analysis of the WebWish 2 automation framework.*
