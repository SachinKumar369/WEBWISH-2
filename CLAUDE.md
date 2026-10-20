# CLAUDE.md

Playwright + TypeScript UI automation framework for **WebWish**, a hotel Property Management System (PMS) by Prologic First. Tests drive the QC instance at `https://qc2webwish.prologicfirst.in/Webwish_APP/...` (Angular app, ng-select dropdowns, collapsible left sidebar). There is no application source in this repo, only test automation.

## Commands

```bash
npm install && npx playwright install        # setup
npx playwright test tests/Availability/agent-allotment.spec.ts --project=chromium   # one file
npx playwright test -g "AGENT_ALLLOT_001" --project=chromium                       # one test by ID
npm run test:frontoffice:chrome:serial       # module scripts: test:login / test:cashiering / test:db ...
npm run lint                                 # ESLint (note: *.spec.ts files are ignored by lint)
npx tsc --noEmit                             # typecheck (npm run build emits to dist/)
npm run report:allure:serve                  # Allure report from allure-results/
```

- **Always pass `--project=chromium`.** Without it every test runs in all of `Login`, `chromium`, `firefox`, `webkit`, `msedge` projects.
- `npm test` runs `pretest` → `npm run lint` first.
- Environment selection is via the `ENV` env var (`dev` | `stage` | `prod`, default `dev`), which loads `config/.env.<ENV>` and then `.env`. The `--env=...` flag used in some npm scripts is not a real Playwright option; set `ENV` instead (PowerShell: `$env:ENV='stage'`).

## Runtime defaults that surprise people

Set in [playwright.config.ts](playwright.config.ts):
- `HEADED`, `KEEP_BROWSER_OPEN`, `MAXIMIZE_BROWSER` all default to `'true'`. Many specs check `KEEP_BROWSER_OPEN` in `afterEach` and call `page.pause()` / wait, so **headless/CI-style runs need `HEADED=false KEEP_BROWSER_OPEN=false`** or the run will hang.
- `workers: 1`, test `timeout: 30s`, `actionTimeout: 10s`, `navigationTimeout: 100s`, `expect` timeout 5s. Long flows override with `test.setTimeout(...)`.
- `globalSetup` ([global-setup.ts](global-setup.ts)) logs in on every run (hardcoded QC URL, user from `test-data/test-data.json`, property index 2) and writes `storageState.json`, which is the default `storageState` for all contexts. In practice, though, the app rejects direct deep links ("Invalid Login Url!"), so **most specs log in themselves** in a fresh context instead of relying on the saved state.
- Reporters: list, HTML (`reports/html-report`), JSON + JUnit (`test-results/`), Allure (`allure-results/`), and [src/listeners/CustomReporter.ts](src/listeners/CustomReporter.ts), which writes `reports/run-summary.{json,md}` (those files change on every run).

## Architecture

```
src/core/       BasePage (navigate, screenshots, waits; takes (page, context)), Logger (winston → logs/), PageFactory
src/pages/<Module>/   Page objects, one per screen/flow, all `extends BasePage`
src/helpers/    AssertionHelper, DatabaseAssertionHelper, ParameterReportValidationHelper (PDF report vs DB), BrowserContextManager
src/utils/      ElementActions (logged click/fill wrappers), WaitUtils, Excel/JSON/CSV data providers, DatabaseClient, GlobalDataStore
tests/<Module>/ Specs mirroring src/pages/<Module>
test-data/      users.xlsx, properties.xlsx, test-data.json, users.csv, TestData.xlsx
testcases/      Manual test-case workbooks (xlsx), reference only
```

Modules: Login, FrontDesk (`tests/frontdesk`, lowercase), FrontOfficeSetup (CashieringParameters, ParameterSetup, ClientParameters, RoomParameter, ...), ManagerFunction (rates, meal plans), Marketing, Availability, Cashiering, NightAudit, Regression (guest reservation flows), Reports (PDF reports validated against DB), SystemConfig, database.

### Writing a spec: the established pattern

1. Fresh context + login with property selection:
   ```ts
   const loginPage = new LoginPage(page, context);
   const user = getUserByIndexFromExcel(1);          // src/utils/UserDataProvider (test-data/users.xlsx)
   const property = getPropertyByIndexFromExcel(1);  // src/utils/PropertyDataProvider (test-data/properties.xlsx)
   await loginPage.loginWithPropertySelection(user.username, user.password, property.code /* or index */);
   ```
   Older specs use `testDataManager.getUserCredentials('all')` (reads `test-data/test-data.json`). Alternatives: the `authenticatedPage` fixture in [tests/fixtuers/auth.fixtuers.ts](tests/fixtuers/auth.fixtuers.ts) (folder name is misspelled, keep it), and `createLoggedInReportPage()` in [tests/Reports/report-session.ts](tests/Reports/report-session.ts) for report specs.
2. Instantiate page objects directly or via `PageFactory.create(page, context, SomePage)`.
3. Test titles start with a test-case ID, e.g. `'PRR_STATUS_001: should ...'`, `'AGENT_ALLLOT_001 ...'`.
4. Multi-step flows that depend on each other use `test.describe.serial` and share one live browser session in module-level variables (see [tests/Availability/agent-allotment.spec.ts](tests/Availability/agent-allotment.spec.ts)). Logging in again between steps is not an option, since storageState restore does not work for this app.
5. Generate unique data (codes/names with timestamps) for anything created; CRUD specs usually create then delete.

### Page-object conventions

- Locators are `private readonly` class fields, grouped by screen region with `/* ── Section ── */` comments.
- Prefer `getByRole` / label-based resolution; the app's form fields are `col-md-4` divs with a `label-control` label plus a sibling `<input>` or `<drop-down-searchable>` (ng-select). Avoid `nth()` indexes.
- Sidebar navigation: hover the collapsed sidebar, then click `.simplebar-content a` filtered by text.
- Watch for strict-mode ambiguity: e.g. several elements carry `placeholder="Search"`; the grid search is `input.search`.
- Use `logger` from `src/core/Logger` for step logging (not `console.log`; ESLint warns on it). Export shared types/helpers from the page file when specs need them.
- JSDoc on classes/methods describing the UI flow and any verified quirks is the norm.

### Database validation

`databaseClient` ([src/utils/DatabaseClient.ts](src/utils/DatabaseClient.ts)) supports `postgres | mysql | mssql` via `DB_TYPE`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL` in `config/.env.*`. DB specs `connect()` in `beforeAll`, `close()` in `afterAll`, and `test.skip(!databaseClient.isConfigured(), ...)` when unset.

## Repo hygiene notes

- `dist/` is stale compiled output; edit `.ts` sources only.
- Duplicate/legacy page objects exist: `src/pages/LoginPage.ts` vs `src/pages/Login/LoginPage.ts`, `LoginPage1.ts`, `BaseCrudPage1.ts`, `FrontDesk/SpecialAccountPage.ts` vs `SpecialAccountsPage.ts`. Check which one nearby specs import before editing.
- Root-level `.md` files (README, FRAMEWORK_KNOWLEDGE_BASE, API.md, etc.) are partly AI-generated and may be out of date; trust the code.
- The repo root also holds unrelated personal files (resumes, `generate_resume.py`, `create_ppt.py`, `compare_pdfs.py`, `.docx`) and scratch artifacts (`*.png`, `*-snapshot.yml`, `.playwright-mcp/`, `agent-allotment-state.json`). Don't modify or commit them as part of test work.
- `config/.env.*` and `.env` contain real credentials; never print or commit secrets from them.
- `.mcp.json` configures the Playwright MCP server, which is useful for exploring live UI before writing locators.
- CI: [.github/workflows/playwright.yml](.github/workflows/playwright.yml) (matrix of browsers × dev/stage) and a Windows [Jenkinsfile](Jenkinsfile).
