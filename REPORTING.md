# Reporting Setup

This framework now uses a unified reporting stack for every Playwright test run:

- Playwright HTML report: `reports/html-report`
- Allure raw results: `allure-results`
- Allure HTML report: `allure-report`
- JUnit XML: `test-results/junit.xml`
- JSON report: `test-results/test-results.json`
- Custom run summaries: `reports/run-summary.json` and `reports/run-summary.md`

## What Is Applied Globally

Reporting is configured in `playwright.config.ts` reporters, so it automatically applies to all specs under `tests/**/*.spec.ts` without per-test changes.

## Commands

```powershell
npm install
npm run test:chrome
npm run report:allure
npm run report:allure:open
```

## One-Step Run + Allure Build

```powershell
npm run test:report
```

## Auto-Open Allure (Pass or Fail)

Use this command to always generate Allure and auto-open it after tests, whether tests pass or fail:

```powershell
npm run test:report:auto
```

You can pass normal Playwright filters/paths:

```powershell
npm run test:report:auto -- tests/Marketing/corporate-maintenance.spec.ts --project=chromium
```

For CI or non-interactive runs, skip opening browser but still generate report:

```powershell
npm run test:report:auto -- --no-open
```

## Notes

- `report:allure` generates `allure-report` from `allure-results`.
- `report:allure:open` opens the already generated report in browser.
- `report:allure:serve` can be used for temporary report hosting directly from `allure-results`.
- If no tests are executed, report folders can be created but contain minimal content.
