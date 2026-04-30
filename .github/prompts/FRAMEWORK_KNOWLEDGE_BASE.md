# FRAMEWORK KNOWLEDGE BASE

## 1. Architecture Overview
- Framework type: Hybrid Playwright TypeScript framework using POM + utility wrappers + data manager + custom reporter.
- Primary style: Domain-oriented serial suites with reusable page classes; cross-domain execution still runs in parallel at file level.
- Core directories:
- tests: 78 Playwright spec files grouped by business domains.
- src/pages: 67 page-object files (domain-heavy organization).
- src/utils: Action wrappers, waits, visual regression, data, Excel helpers.
- src/core: Base page and central logger.
- src/helpers: Optional helpers (available, mostly not wired into active tests).
- src/listeners: Custom Playwright reporter.
- test-data: JSON, CSV, Excel static test data files.
- Execution flow (typical):
- Playwright config loads env files and defaults headed/maximized debugging behavior.
- global setup logs in once and writes storageState.
- Spec initializes page objects.
- Test gets credentials from test data manager.
- Login + property selection via shared login page.
- Domain page-object flow executes.
- Screenshot/logging done per test.
- afterEach optionally pauses browser when KEEP_BROWSER_OPEN=true.

## 2. Test Layer
- How tests are written:
- Most business specs use test.describe.serial with one long E2E scenario per file.
- Tests instantiate page objects directly inside each test or beforeEach.
- Most tests wrap flow in try/catch with logger calls and screenshots.
- Some suites reuse a single context/page via beforeAll for sequential workflows.
- Test naming conventions:
- Strong ID-prefix naming is common: TC_, FOS_, FD_, MKT_, MGR_, GLOBAL_SEARCH_, VR_.
- Name format usually follows: ID: business action description.
- A few legacy/simple specs use plain names without domain IDs.
- Retry and timeout handling:
- Global retries are config-driven (local default 1, CI default 2, env-overridable).
- No test.describe.configure retry overrides found.
- No meaningful per-test retry APIs used.
- test.setTimeout is used heavily (65 occurrences), often 10-120 minutes for long business flows.
- Global timeout is 30s but many tests override it explicitly for workflow suites.
- Hooks usage profile:
- beforeEach: 11 occurrences.
- afterEach: 63 occurrences.
- beforeAll: 4 occurrences.
- afterAll: 5 occurrences.
- Dominant afterEach pattern checks KEEP_BROWSER_OPEN and calls page.pause for manual inspection.

## 3. Page Object Model (POM)

### Core/Root Pages
- LoginPage (legacy) | Responsibility: Primary framework login + property selection + maximize behavior. | Key methods: navigateToLoginPage, login, loginWithPropertySelection, handlePropertySelection. | Locator strategy: resilient fallback CSS selectors with data-testid/placeholder/name combinations.
- LoginPage1 | Responsibility: Placeholder/legacy shell. | Key methods: none meaningful. | Locator strategy: not implemented.
- NoteTemplatesPage | Responsibility: Note template create/search flow. | Key methods: createTemplate, searchAndValidateTemplate. | Locator strategy: locator-heavy with CSS/XPath blend.
- PropertySelectionPage | Responsibility: Property file-driven selection helper. | Key methods: readPropertiesFromFile, selectPropertyByCode, selectFirstProperty. | Locator strategy: generic locator-based and button traversal.
- SelectProperty | Responsibility: UI property selection by index/code and listing. | Key methods: getAllPropertiesFromPage, selectPropertyAtIndex, selectPropertyByCode, listAllProperties. | Locator strategy: locator-based with ancestor traversal and icon discovery.

### Login Domain
- Login/Login (modern LoginPage) | Responsibility: Rich login behavior/negative cases/accessibility flows. | Key methods: fillCredentials, clickLogin, expectAuthenticatedLanding, expectErrorDialogContains, keyboard focus methods. | Locator strategy: role-first with explicit expects.
- LoginScenariosPage | Responsibility: Scenario-level login outcomes and validations. | Key methods: loginWithFlowProvided, expectInvalidUserIdError, expectInvalidPasswordError. | Locator strategy: role + text + lightweight locator fallback.
- LoginDashboardPage | Responsibility: Post-login dashboard/shift checks. | Key methods: expectDashboardLoaded, openShiftMenu, selectShift. | Locator strategy: role-first.
- LockScreenAndSignoutPage | Responsibility: Dashboard validation and avatar/menu interaction. | Key methods: expectDashboardVisible, clickHeaderAvatar. | Locator strategy: role + structural locators.

### FrontDesk Domain
- AdvanceSearchPage | Responsibility: Advanced search criteria and status filtering workflows. | Key methods: selectReserved, selectInhouse, searchByGuestName, searchByConfirmationNumber. | Locator strategy: mostly inherited utility actions with few direct selectors.
- BookingCalendarPage (legacy BookingCal) | Responsibility: Calendar date navigation/details extraction. | Key methods: clickPreviousMonth, clickNextMonth, clickToday, getBookingDetails. | Locator strategy: utility-driven with direct selectors.
- BookingCalendarPage (modern) | Responsibility: Search + booking calendar open + filter operations + task transition helper. | Key methods: searchAndOpenBookingCalendar, openFilter, taskManagement. | Locator strategy: role + text + locator mixed.
- GroupManagementPage | Responsibility: Group creation using business-date-derived date logic. | Key methods: navigateToGroupManagement, createNewGroup, selectDateFromPicker. | Locator strategy: role-first, form-block scoped locators, dynamic calendar label navigation.
- GuestManagementPage | Responsibility: Reservation creation end-to-end (full/minimal). | Key methods: searchAndOpenGuestManagement, createNewReservation, selectRoom, createFullGuestReservation. | Locator strategy: role + label-text container filters + some XPath dropdown results.
- SpecialAccountPage | Responsibility: Special account create/modify operations. | Key methods: createSpecialAccount, searchAccount, modifyHeaderDetails, modifyMembershipDetails. | Locator strategy: heavy role + locator + scoped container chaining.
- SpecialAccountsPage | Responsibility: Complete special account module operations suite. | Key methods: runCompleteSpecialAccountFlow, performBillRoutingOperations, performCashieringOperations. | Locator strategy: very role-heavy with mixed structured locators.
- TaskManagement | Responsibility: Task create/save/save-add-new/edit/delete workflows; cross-step state transfer. | Key methods: searchAndOpenTaskManagement, taskManagementSave, verifyCreatedTaskInTable, editPendingTaskWorkflow. | Locator strategy: role + locator + scoped text filters; uses GlobalDataStore for task description continuity.

### FrontOfficeSetup - CashieringParameters
- AccountCodePage | Responsibility: Account code create/update/delete and print-seq handling. | Key methods: runAccountCodeCreateDeleteFlow, collectExistingAccountCodeDataAcrossPages, generateUniquePrintSeqNo. | Locator strategy: role + table locators + popup pattern.
- AccountCodePrintSeqPage | Responsibility: Collect code/print-seq pairs across pagination. | Key methods: collectAllCodeAndPrintSeqNoPairs, runCollectAllCodeAndPrintSeqNoFlow. | Locator strategy: table/pagination locators.
- ChargeCodeSetupPage | Responsibility: Charge code CRUD with modal and dropdown helpers. | Key methods: runChargeCodeCreateDeleteFlow, selectDropdownByArrowDown. | Locator strategy: role + modal-scoped locator chains.
- ChargeTaxTemplateSetupPage | Responsibility: Charge tax template setup and cleanup. | Key methods: navigateToChargeTaxTemplateSetup, fillTemplateId, searchTemplate, deleteSelectedTemplate. | Locator strategy: role + placeholder + list/table locators.
- DebtorAccountsPage | Responsibility: Debtor account create/delete with unique code generation. | Key methods: createDebtorAccountsAndDeleteFlow, buildCode, fillDebtorForm. | Locator strategy: role + compact locator mix.
- DepartmentCreateDeletePage | Responsibility: Department create/delete with search resolution and popups. | Key methods: runDepartmentCreateDeleteFlow, resolveSearchInput, getCodeAndPrintSeqFromRow. | Locator strategy: role + locator-heavy + popup wrappers.
- DepartmentPrintSeqPage | Responsibility: Department print-seq extraction across pages. | Key methods: collectAllCodeAndPrintSeqNoPairs, runCollectAllCodeAndPrintSeqNoFlow. | Locator strategy: table/pagination locators.
- GLAccountsPage | Responsibility: GL account create/delete operations. | Key methods: runGLAccountsCreateDeleteFlow, resolveSearchInput, expectPopupAndConfirm. | Locator strategy: role + locator mixed.
- GSTTypePage | Responsibility: GST type create/delete automation records. | Key methods: runGSTTypeCreateDeleteFlow, openGSTTypePage. | Locator strategy: role + locator with modal/table patterns.
- PaymentMethodPage | Responsibility: Payment method create/delete lifecycle. | Key methods: runPaymentMethodCreateDeleteFlow, fillPaymentMethodDetails, deleteOneIfExists. | Locator strategy: role + locator mixed.
- RevenueTypePage | Responsibility: Revenue type create/delete lifecycle. | Key methods: runRevenueTypeCreateDeleteFlow, fillRevenueTypeDetails, deleteOneIfExists. | Locator strategy: role + locator mixed.

### FrontOfficeSetup - City/Client/Item/Meal/Message/MIS
- CityStateMasterPage | Responsibility: City/state master CRUD. | Key methods: fillForm, deleteAll, selectDropdownBySearch. | Locator strategy: role + modal-scoped locators.
- ActionTypePage | Responsibility: Action type create/delete flow. | Key methods: runActionTypeCreateDeleteFlow. | Locator strategy: role-first.
- AIUniversalPage | Responsibility: Universal client-parameter CRUD abstraction flow. | Key methods: runFlow, fillSmartForm, detect. | Locator strategy: role + flexible locator heuristics.
- AlertTypePage | Responsibility: Alert type create/delete flow. | Key methods: runAlertTypeCreateDeleteFlow. | Locator strategy: role-first.
- ARAccountTypePage | Responsibility: AR account type create/delete flow. | Key methods: runARAccountTypeCreateDeleteFlow. | Locator strategy: role-first with targeted locator fallback.
- BaseCrudPage | Responsibility: Shared CRUD skeleton for client-parameter style pages. | Key methods: runCrudFlow, deleteAll, resolveSearchInput, expectAndConfirmPopup. | Locator strategy: reusable role/locator wrapper pattern.
- BaseCrudPage1 | Responsibility: Alternate/extended CRUD skeleton with duplicate-handling retries. | Key methods: create, deleteOne, runCrudFlow, generateUniqueCode. | Locator strategy: same as BaseCrudPage with retry-enhanced logic.
- ClientParameterPage | Responsibility: Client parameter generic flow runner. | Key methods: runFlow. | Locator strategy: role-first.
- ItemParametersPage | Responsibility: Item parameter flow runner. | Key methods: runFlow. | Locator strategy: role-first.
- MealParametersPage | Responsibility: Meal parameter create/delete with row-level edit handling. | Key methods: runMealParametersCreateDeleteFlow, fillMealPlanForm. | Locator strategy: role + table/locator mix.
- MealTypePage | Responsibility: Meal type form creation/delete with modal controls. | Key methods: runMealTypeCreateDeleteFlow, fillMealTypeForm. | Locator strategy: locator-heavy with role support.
- MessagesPage | Responsibility: Message setup flow runner. | Key methods: runFlow. | Locator strategy: locator-heavy.
- MisGroupPage | Responsibility: MIS group flow runner. | Key methods: runFlow, deleteAll. | Locator strategy: role + locator mixed.

### FrontOfficeSetup - ParameterSetup
- GuestClassDeletePage | Responsibility: Bulk guest class delete utilities. | Key methods: runDeleteAllAutomationGuestClassesFlow. | Locator strategy: role + table locator mix.
- GuestClassPage | Responsibility: Full guest class CRUD and validation workflows. | Key methods: runGuestClassAutomationFlow, createGuestClass, deleteAllAutomationGuestClasses. | Locator strategy: role + locator-heavy with toolbar abstractions.
- ParameterSetupCreateOperationsPage | Responsibility: Sequential create-only orchestration (guest class, public area, title master) with uniqueness checks across pagination. | Key methods: runCreateOperationsInSequence, collectExistingCodesAcrossPages, generateUniqueCodeFromSet. | Locator strategy: table/pagination locator logic.
- PredefinedChargePage | Responsibility: Predefined charge create/duplicate checks/delete. | Key methods: runPredefinedChargeCreateAndDeleteFlow. | Locator strategy: locator-heavy + role actions.
- PublicAreaPage | Responsibility: Public area create/delete and duplicate handling. | Key methods: runPublicAreaCreateAndDeleteFlow. | Locator strategy: locator-heavy + role actions.
- TitleMasterPage | Responsibility: Title master create/delete flow. | Key methods: runTitleMasterCreateAndDeleteFlow. | Locator strategy: locator-heavy + role actions.
- TransportParameterPage | Responsibility: Transport parameter create/edit/delete. | Key methods: navigateToTransportParameter, addTransportParameter, editTransportParameter, deleteTransportParameter. | Locator strategy: role-first.
- UserDepartmentPage | Responsibility: User department create/delete and bulk delete helpers. | Key methods: runUserDepartmentCreateAndDeleteFlow. | Locator strategy: locator-heavy + role actions.
- VisaTypePage | Responsibility: Visa type duplicate validation/create/delete. | Key methods: runVisaTypeDuplicateCheckAndCreateFlow, deleteAllAutomationVisaTypes. | Locator strategy: locator-heavy + role actions.

### FrontOfficeSetup - Profiles/Room/Type/UserDefined
- ProfilesPage (FrontOfficeSetup) | Responsibility: Front office profile setup flow. | Key methods: runFlow. | Locator strategy: role-first.
- RoomInventoryPage | Responsibility: Room inventory create/across-pages cleanup automation. | Key methods: runRoomInventoryCreateDeleteFlow, resetToFirstPage, deleteAllMatchingByInventoryNo. | Locator strategy: role + table/pagination locators.
- RoomPage | Responsibility: Room create/delete across pagination. | Key methods: runRoomCreateDeleteFlow, deleteAllMatchingByRoomNo. | Locator strategy: role + table/pagination locators.
- RoomParameterPage | Responsibility: Room parameter generic setup flow and pagination helpers. | Key methods: runFlow, getPaginationStats, resetToFirstPage. | Locator strategy: role + locator mix.
- RoomTypePage | Responsibility: Room type create/inactivate/delete across pages. | Key methods: runRoomTypeCreateInactivateDeleteFlow, fillRoomTypeForm. | Locator strategy: role + modal/table locators.
- TypeMasterPage | Responsibility: Type master flow runner. | Key methods: runFlow. | Locator strategy: role-first.
- UserDefinedCodesPage | Responsibility: User-defined code flow runner. | Key methods: runFlow. | Locator strategy: role-first.

### ManagerFunction Domain
- MealPlanDetailsPage | Responsibility: Meal plan details create and delete in same flow. | Key methods: runMealPlanDetailsCreateDeleteFlow, getBusinessDate, getOffsetDate. | Locator strategy: role + dropdown locator mix.
- MealPlanDetailsSaveAndAddNewPage | Responsibility: Repeated meal-plan creation using Save and Add New. | Key methods: runSaveAndAddNewFlow. | Locator strategy: role + dropdown locator mix.
- MealPlanDetailsDeletePage | Responsibility: Deactivate and bulk-delete meal plans. | Key methods: runMealPlanDetailsDeleteFlow, deactivateAndUpdateAllMealPlans, selectAllAndDeleteMealPlans. | Locator strategy: role + row locators.
- RateManagerPage | Responsibility: Complex rate manager setup/edit/copy/derive/delete operations. | Key methods: many modular operations across settings, legends, copy rates, stop sell, and delete flows. | Locator strategy: strongly mixed role + locator with many dynamic wrappers.

### Marketing Domain
- AgentMaintenancePage | Responsibility: Agent create and multi-section operations (allotment, reservation, contact, contracts). | Key methods: runCompleteAgentMaintenanceFlow, performContractsOperations. | Locator strategy: role-heavy with targeted locators.
- CorporateMaintenancePage | Responsibility: Corporate maintenance full lifecycle across sections. | Key methods: runCompleteCorporateMaintenanceFlow, updateProfileAndDefaults, maintainContracts. | Locator strategy: role + locator mix with ng-select helpers.
- ProfileOperationsPage | Responsibility: Marketing profile section operations (complaints/preferences/notes/loyalty/cards/details). | Key methods: runCompleteProfileOperationsFlow, openSectionsMenuAndSelect. | Locator strategy: role-heavy with menu scoping patterns.
- ProfilesPage (Marketing) | Responsibility: Profile creation/search and persisted output to Excel test data. | Key methods: createProfile, searchInListAndOpen, verifySearchResultContains. | Locator strategy: mixed role/locator; includes file writing integration.

### GlobalSearch Domain
- GlobalSearchPage | Responsibility: Topbar global-search module navigation validation. | Key methods: searchAndOpenModuleFromTopbar, validateTopbarSearchAcrossModules. | Locator strategy: role-first search input + dropdown-item list + heading fallback validation.

### SystemConfig Domain
- TemplateSetupPage | Responsibility: Template setup create/copy/permission-check/delete workflows. | Key methods: createTemplate, copyFromTemplate, createWithChecks, deleteSelected. | Locator strategy: role + locator mix with popup-confirm pattern.

## 4. Utilities and Helpers
- ElementActions:
- Central wrapper for click/type/hover/upload/wait/text/visibility/keyboard.
- Built-in retry loops (up to 3 attempts) and JS-click fallback.
- Auto screenshot capture on action failure.
- WaitUtils:
- Wait primitives for network idle, condition polling, response matching, text checks.
- VisualRegressionUtil:
- Baseline creation, comparison via pixelmatch, diff image creation, baseline lifecycle management.
- TestDataManager:
- JSON and CSV loading with cache map.
- Environment-first user credential resolution with fallback to environment=all.
- GlobalDataStore:
- Shared in-memory cross-step data store (currently used in task management flow).
- Excel helpers:
- ExcelHelper and ExcelPropertyManager for property read/write.
- ExcelDataWriter for appending profile test outputs.
- Core framework helpers:
- BasePage provides navigation/waits/screenshot helper.
- Logger centralizes winston logging to file + console.
- Available but lightly/unused in active tests:
- BrowserContextManager, AssertionHelper, TestExtensions, auth fixture under tests/fixtuers.

## 5. Test Data Management
- Static data sources:
- test-data/test-data.json (users + test cases).
- test-data/users.csv (credential matrix).
- test-data/properties.json and properties.xlsx.
- test-data/TestData.xlsx for runtime profile output.
- Dynamic data patterns:
- randomUUID/Date.now/random suffix usage for unique entity IDs/codes.
- Business date parsed from UI footer and offset for future dates.
- Shared runtime data via GlobalDataStore for multi-step verification.
- Environment handling:
- Credentials selected by environment, with fallback to all.
- Dotenv profile selected via ENV (dev default), then root env overrides.

## 6. Configuration
- playwright config breakdown:
- testDir is tests and match is **/*.spec.ts.
- globalSetup enabled to login and write storageState.
- fullyParallel true.
- retries from env or default (CI=2, local=1).
- workers CI=1 else 4.
- use: trace on first retry, screenshot only on failure, video retain on failure, actionTimeout 10s, navigationTimeout 30s, storageState path.
- browser setup:
- Projects: chromium, firefox, webkit, msedge.
- Default headed mode true unless overridden.
- Default maximize mode true unless overridden.
- launch args include start-maximized when maximize is enabled.
- environment model:
- Loads config/.env.{ENV} then .env.
- ENV defaults to dev.
- base URL and execution behavior can be env-overridden.
- parallel execution model:
- Cross-file parallelism enabled globally.
- Most business suites force serial order inside each file using test.describe.serial.

## 7. Reporting and Logging
- Reporter stack:
- list reporter for console feedback.
- html reporter in reports/html-report.
- json reporter in test-results/test-results.json.
- junit reporter in test-results/junit.xml.
- allure-playwright in allure-results.
- custom reporter in src/listeners/CustomReporter.ts.
- CustomReporter outputs:
- Aggregated run summary JSON at reports/run-summary.json.
- Markdown summary at reports/run-summary.md.
- Failure list and attachment metadata.
- Logger usage:
- Winston logger writes logs/error.log and logs/combined.log plus console output.
- Tests and page objects log start/step/success/failure heavily.
- Screenshot strategy:
- Framework-level screenshot only on failure via config.
- Many tests also take explicit full-page screenshots for checkpoints.
- ElementActions and BasePage also capture failure/debug screenshots.
- Allure utility script:
- scripts/run-with-allure-open.js runs tests, generates allure report, optionally auto-opens it.

## 8. Best Practices Implemented
- Error handling:
- Try/catch wrappers with logger context in most long workflows.
- Popup confirmation abstractions with explicit expected text assertions.
- Action stability:
- Wrapped clicks/types with retries and explicit visibility waits.
- Frequent network idle or short stabilization waits in long UI flows.
- Reusability patterns:
- BaseCrudPage pattern reused widely for create/delete flows.
- Shared login + property-selection entry point reused across domains.
- Generic dropdown/search/pagination helper methods across page classes.
- Data integrity patterns:
- Unique code generation to avoid duplicate record collisions.
- Business-date-driven selection for date-sensitive workflows.
- Observed gaps to be aware of:
- Duplicate login page object implementations (legacy and modern) coexist.
- Some simple tests bypass POM patterns (task-management demo specs, search_facebook).
- Credentials are stored in plain test data files.
- Several helper layers exist but are not consistently consumed.

## 9. Custom Patterns (VERY IMPORTANT)
- Always follow these framework conventions when generating new code:
- Use legacy LoginPage from src/pages/LoginPage for business workflow suites unless the suite is specifically modern-login focused.
- Always call loginWithPropertySelection before opening domain modules that require authenticated context.
- Prefer test.describe.serial for workflow suites that mutate shared app data.
- Put long business scenarios under explicit test.setTimeout with realistic upper bounds.
- Add afterEach KEEP_BROWSER_OPEN guard in workflow suites so debugging behavior stays consistent.
- Use logger in tests and page objects for each major step and outcome.
- Use page object methods for business actions, not raw page.click/page.fill in enterprise suites.
- Use ElementActions inside page objects for resilient interaction and failure screenshots.
- Use popup-confirm wrappers that validate exact success/confirm text before proceeding.
- Generate unique test values for create flows (Date.now/randomUUID) to avoid duplicate-key errors.
- For date workflows, derive from UI business date when available, not hardcoded calendar dates.
- Prefer getByRole/getByLabel for robust selectors; use locator filters/scoped selectors when role access is insufficient.
- Keep screenshot evidence for important milestones and for failure diagnostics.
- Keep domain naming style for test IDs (FOS/FD/MKT/MGR/etc) to preserve report consistency.
- Do not introduce a third login abstraction; pick one existing login POM per suite style and stay consistent.
- Avoid using unused helper layers unless you intentionally standardize them across suites.

## 10. How To Generate New Tests In THIS Framework
- Use this sequence for all future test generation:
- Choose target domain folder under tests and follow existing ID naming (for example FOS_, FD_, MKT_, MGR_).
- Create or reuse a page object in src/pages matching that domain; extend BasePage and use ElementActions.
- In spec, define test.describe.serial for multi-step CRUD/business journeys.
- Add test.afterEach with KEEP_BROWSER_OPEN check and optional page.pause behavior.
- In test body, set test.setTimeout for long workflows.
- Instantiate LoginPage and domain page object.
- Fetch user with testDataManager.getUserCredentials('all') unless environment-specific credentials are required.
- Execute loginWithPropertySelection and then the domain flow method.
- Assert key checkpoints through page-object methods and popup message validations.
- Save a screenshot artifact at the end (and rely on failure screenshots from framework wrappers).
- Keep selectors and helper patterns consistent with existing role-first plus scoped-locator fallback strategy.
- For create/update data, generate unique values and avoid hardcoded static IDs.
- If test depends on sequential state across steps, keep actions in one serial suite or one test file with shared context pattern.
- Keep logs concise but explicit at each major step so custom reporter output remains actionable.
