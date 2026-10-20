---
name: webwish
description: Central knowledge base for the WebWish hotel PMS Playwright + TypeScript automation framework (Prologic First, QC2 instance). Use for ANY work in this repo — writing, extending, debugging or running specs and page objects in any module (Login, FrontDesk, FrontOfficeSetup, ManagerFunction, Marketing, Availability, Cashiering, NightAudit, Regression, Reports, SystemConfig, database), finding locators on the live Angular UI, handling ng-select / SweetAlert / NGB modals, availability capture and verification, Availability Management restrictions (Over/Under Booking, Revise Availability), creating and cancelling reservations (multi-guest stay-by-stay cancel), and running tests headed or headless.
---

# WebWish automation — central skill

Playwright + TypeScript UI automation for **WebWish**, an Angular hotel Property Management
System. The tests target QC2: `https://qc2webwish.prologicfirst.in/Webwish_APP/...`. The repo
contains only test code, no application source.

**Load the reference that matches the task:**

| Task | Read |
|---|---|
| Availability tests (grid capture, allotment, OOO, recreate, groups, booking → cancel → availability restored) | [references/availability.md](references/availability.md) |
| Availability Management → Revise Availability / Over-Under Booking / calendar drag | [references/revise-availability.md](references/revise-availability.md) |
| Inspecting the live UI to find locators (logged-in browser + CDP probes) | [references/exploring-live-ui.md](references/exploring-live-ui.md) |

When you verify something new against the live app, add it to the matching reference, or
create a new `references/<module>.md` and link it in the table above. Keep this file as the
index plus the rules that apply everywhere.

---

## Commands

```bash
npm install && npx playwright install
npx playwright test tests/Availability/revise-availability.spec.ts --project=chromium   # one file
npx playwright test -g "REV_AVAIL_001" --project=chromium                              # one test by ID
npm run test:login:chrome:serial | test:frontoffice:chrome:serial | test:cashiering:chrome:serial | test:db
npm run lint            # ESLint (*.spec.ts files are ignored)
npx tsc --noEmit        # typecheck
npm run report:allure:serve
```

- **Always pass `--project=chromium`.** Otherwise each test runs in Login, chromium, firefox, webkit and msedge.
- **Headless / CI:** `HEADED=false KEEP_BROWSER_OPEN=false` (PowerShell: `$env:HEADED='false'; $env:KEEP_BROWSER_OPEN='false'`).
  Both default to `'true'`, and `KEEP_BROWSER_OPEN` makes specs call `page.pause()`, so the run hangs without it.
- Environment: `ENV=dev|stage|prod` loads `config/.env.<ENV>` and then `.env`. The `--env=` flag in npm scripts is not a real option.
- `npm test` runs lint first (`pretest`).

## Runtime defaults (playwright.config.ts)

- `workers: 1`, test timeout 30 s, action 10 s, navigation 100 s, expect 5 s. Long flows use `test.setTimeout(10–20 min)`.
- `MAXIMIZE_BROWSER=true` → `--start-maximized` + `viewport: null`. **Headless ignores maximize** and
  renders at 800×600, which switches some screens to a narrow layout (e.g. the Availability
  Management year grid becomes month cards). In custom contexts, set
  `viewport: headed ? null : { width: 1920, height: 1080 }`.
- `globalSetup` logs in and writes `storageState.json`, but the app rejects deep links ("Invalid Login Url!"),
  so **specs log in themselves**. Multi-test flows share one live page (see below).
- Reporters: list, HTML (`reports/html-report`), JSON/JUnit (`test-results/`), Allure, and
  `src/listeners/CustomReporter.ts` → `reports/run-summary.{json,md}` (these change on every run, so don't commit them).

## Architecture

```
src/core/        BasePage (page, context; navigate, takeScreenshot, waits), Logger (winston → logs/), PageFactory
src/pages/<Mod>/ Page objects, one per screen/flow, all `extends BasePage`
src/helpers/     AssertionHelper, DatabaseAssertionHelper, ParameterReportValidationHelper, BrowserContextManager
src/utils/       ElementActions, WaitUtils, UserDataProvider, PropertyDataProvider, TestDataManager, ExcelHelper,
                 DatabaseClient, GlobalDataStore, VisualRegressionUtil
tests/<Mod>/     Specs that mirror src/pages (FrontDesk specs are in lowercase tests/frontdesk)
test-data/       users.xlsx, properties.xlsx, test-data.json, TestData.xlsx
testcases/       Manual test-case workbooks (reference only)
```

## Writing a spec

1. **Login + property:**
   ```ts
   const loginPage = new LoginPage(page, context);              // src/pages/LoginPage (most specs use this one)
   const user = getUserByIndexFromExcel(1);                     // test-data/users.xlsx
   const property = getPropertyByIndexFromExcel(3);             // test-data/properties.xlsx (3 = WEBWISHQCMI / WEBMI)
   await loginPage.loginWithPropertySelection(user!.username, user!.password, property!.index);
   ```
   Alternatives: `testDataManager.getUserCredentials('all')` (older specs), the `authenticatedPage` fixture
   in `tests/fixtuers/auth.fixtuers.ts` (the folder name is misspelled, keep it), and `createLoggedInReportPage()`
   in `tests/Reports/report-session.ts`.
2. **Test titles start with a test-case ID**: `'REV_AVAIL_001: …'`, `'AGENT_ALLLOT_001 …'`, `'SU_AVAIL_002: …'`.
3. **Dependent steps** use `test.describe.serial` with ONE shared live session in module-level variables:
   ```ts
   let sharedContext: BrowserContext | null = null; let sharedPage: Page | null = null;
   async function getSharedSession(browser: Browser) { /* newContext once, reuse after */ }
   test('…', async ({ browser }) => { const { context, page } = await getSharedSession(browser); … });
   test.afterAll(async () => { if (KEEP_BROWSER_OPEN) await sharedPage?.pause(); await sharedContext?.close(); });
   ```
   Logging in again between tests is not an option. Hand state from test to test in module variables.
4. Wrap steps in `test.step('Step N: …')`. Log with `logger` (`src/core/Logger`), never `console.log`.
5. **Unique data** (timestamp codes/names) for anything you create. CRUD specs create, then delete.
   Specs that mutate shared QC config (restrictions, allotments, OOO) must **restore** it at the end.
6. **Assert exact deltas**: capture before, compute expected per item, log a before/expected/actual table,
   then `expect(actual).toEqual(expected)`.
7. Optional final `page.screenshot({ path: 'screenshots/<ID>.png', fullPage: true })`.

## Page-object conventions

- `private readonly` locator fields grouped by `/* ── Section ── */` comments, built in the constructor.
  Section dividers inside the class look like `// ───…  Title  ───…`.
- Actions go through `ElementActions` (`this.elementActions = new ElementActions(page)`):
  `click` (3 retries + JS-click fallback + failure screenshot), `sendKeys` (clear + type),
  `hover`, `scrollToElement`, `waitForElement(loc, timeout, desc)`, `waitForElementHidden`,
  `getText`, `isElementVisible`, `pressKey`.
- Prefer label- and role-based resolution. Form fields are `col-md-4`/`col-md-6`/`col-6` divs holding a
  `label-control > label` plus a sibling `<input>` or `<drop-down-searchable>` (ng-select). Resolve them as
  `container.locator('.col-md-6').filter({ has: page.locator('label', { hasText: /^Room Type$/ }) })`. Avoid `nth()`.
- Class JSDoc describes the UI flow and the **verified quirks** with the date verified. Export shared
  types and helpers from the page file.
- Duplicate/legacy files exist: `src/pages/LoginPage.ts` vs `src/pages/Login/LoginPage.ts`, `LoginPage1.ts`,
  `BaseCrudPage1.ts`, `FrontDesk/SpecialAccountPage.ts` vs `SpecialAccountsPage.ts`. Check which one nearby specs import.
- The tsconfig has **no DOM lib**: `document` inside `page.evaluate` fails `tsc`/eslint in new page objects.
  Prefer locators (`textContent`, `evaluateAll`) or cast carefully. (Some older files do it anyway.)

## App-wide UI patterns & quirks (verified)

| Element | How to handle |
|---|---|
| **Collapsed left sidebar** | `page.mouse.move(10, 400)` to expand it, then `.simplebar-content a` / `li a` filtered by text |
| **Header global search** | `#search-options` → type a fragment (`ava`, `guest mana`) → `#page-topbar` getByText `<Screen name>`. Re-selecting the screen you're already on does **not** reload it. Type with `pressSequentially`: `fill()` shows no results |
| **ng-select** (`drop-down-searchable`) | Click the `ng-select` → options are `ng-dropdown-panel .ng-option`. Many read `"CODE  Name"` (e.g. `BEAC  Beachsuite`, `O  Over Booking`), so match the name at the end: `/\sName\s*$/`. Clear with `.ng-clear-wrapper` |
| **SweetAlert2 popups** | `.swal2-popup`, message in `.swal2-html-container`, OK = `.swal2-confirm`; confirms have Yes/No/Cancel buttons. Success text is usually `Details created/updated successfully.` |
| **aria-hidden after SweetAlert** | After a swal closes, `app-root` can stay `aria-hidden="true"`, so `getByRole`/`getByLabel` stop finding page content (header search, grids). Use CSS ids/attributes for page content. Modal content is unaffected |
| **NGB modals / side panels** | `ngb-modal-window` (side floating panels too, e.g. filters). They fade out, so wait for `state: 'detached'` before mouse interactions (drags right after a close misbehave) |
| **Page toolbars** | `button.app-toolbar__btn[title="Filter"\|"Refresh"\|"Log"\|"Save"]`. Some toolbars render twice, so use `:visible` + `.first()` |
| **Strict-mode traps** | Several inputs have `placeholder="Search"` (the grid search is `input.search`). Duplicate toolbars. Stacked offcanvas panels |
| **Async data** | Widgets often render before their data arrives. Wait on the specific API response (`page.waitForResponse(r => r.url().includes('/<Endpoint>') && r.ok())`, API base `/Webwish_API/api/...`). `waitForLoadState('networkidle')` is useless after the SPA has loaded |
| **Header bar intercepting clicks** | Use a JS click (`locator.evaluate(el => el.click())`) or rely on the `ElementActions.click` fallback |
| **Reservations: book → conf no** | Booking flow: `RecreateAvailabilityPage.runBookingFlow(roomType, lastName, n)`. Read the confirmation number from `app-guest-confirmation h5` `Guest Details <conf no>` (buttons there: Open Booking / Print Registration / Back) |
| **Reservations: future dates** | Stay range = flatpickr `date-range-control` input, type `DD/MM/YYYY to DD/MM/YYYY` + Enter. Use `FutureReservationAvailabilityPage.bookFutureRooms()`. Details: [availability.md](references/availability.md#future-dated-booking-verified-2026-10-19) |
| **Reservations: find & open** | Remove the default "Quick Search : Expected Arrival (Today)" chip first (`clearQuickSearchFilter()`), or non-today arrivals don't show. Guest Management grid: `input.search` (type + Enter) → `app-data-grid .dg-row` filtered by conf no → JS-click `[title="Open"]` → `…/SE/<conf no>`. Right-click opens only the layout menu, not row actions |
| **Reservations: cancel** | A single-stay booking opens directly in its stay view on SE with the red Cancel visible, and `cancelReservation()` cancels it in place (verified 2026-10-19). A **multi-guest booking (green "M" badge, one stay per room) must be cancelled stay by stay**: Stay card ⋮ → Reservation Details (`…/DE/<res id>`) → `.card.hstack button.btn-soft-danger` "Cancel" → dialog with reason ng-select + Remarks (both required) → Ok → POST `ReservationActions/CancelationReservation` → swal `Details created/updated successfully.` → `button[title="View all bookings"]` back to SE. Reuse `ReservationCancelAvailabilityPage.cancelReservation(confNo, stays)`. Details: [availability.md](references/availability.md#cancel-a-reservation-verified-2026-10-19) |
| **Native JS dialogs during CDP probes** | If two Playwright clients are attached to one page, both auto-dismiss native dialogs and one crashes with `No dialog is showing`. Register `page.on('dialog', …)` in the probe client |
| **flatpickr date inputs** | `input.flatpickr-input`. See `AgentAllotmentPage` for date entry |

## Database validation

`databaseClient` (`src/utils/DatabaseClient.ts`) supports postgres/mysql/mssql via `DB_TYPE, DB_HOST, DB_PORT,
DB_USER, DB_PASSWORD, DB_NAME, DB_SSL` in `config/.env.*`. Pattern: `connect()` in `beforeAll`, `close()` in
`afterAll`, `test.skip(!databaseClient.isConfigured(), …)`. Report specs compare PDF output against the DB with
`ParameterReportValidationHelper`.

## Repo hygiene & safety

- Edit `.ts` sources only. `dist/` is stale build output.
- `config/.env.*`, `.env` and `test-data/*.xlsx` hold real credentials. **Never print, log or commit secrets.**
- Don't modify or commit unrelated root files: resumes, `generate_resume.py`, `create_ppt.py`, `compare_pdfs.py`,
  `.docx`, `*.png`, `*-snapshot.yml`, `.playwright-mcp/`, `agent-allotment-state.json`, `reports/run-summary.*`, `storageState.json`.
- Root-level `.md` docs are partly AI-generated and may be stale. Trust the code, then this skill.
- Mutating tests change shared QC data that other people use. Clean up, and tell the user what changed.
- CI: `.github/workflows/playwright.yml` (browsers × dev/stage) and the Windows `Jenkinsfile`.

## Workflow for a new test

1. Read the nearest existing spec and page object in that module, and the matching reference here.
2. Explore the live screen ([exploring-live-ui.md](references/exploring-live-ui.md)). Record exact
   DOM, labels, option texts, popup texts and API calls. Try the mutation once by hand, observe the
   semantics (absolute vs. cumulative, validation messages, pre-filled values), then undo it.
3. Write a new page object in `src/pages/<Module>/` and a spec in `tests/<Module>/` following the
   conventions above. Reuse existing page objects for shared widgets (e.g. the availability grid).
4. Run `npx tsc --noEmit` and `npx eslint <page file>`, then the spec headless at least twice: once from
   a dirty state and once from a clean state, to prove it can be re-run.
5. Add any newly verified quirks to the references.
