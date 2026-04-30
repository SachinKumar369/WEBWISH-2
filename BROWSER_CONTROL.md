# Browser Control Guide

## Keep Browser Open After Test Completion

By default, Playwright closes the browser after test execution. To keep the browser open for inspection or manual testing, you can use the `KEEP_BROWSER_OPEN` environment variable.

### Usage

#### Option 1: With PowerShell
```powershell
$env:KEEP_BROWSER_OPEN='true'
npm run test:chrome -- --project=chromium --headed -g "TC_LOGIN_001" --workers=1
```

#### Option 2: Inline Command
```powershell
$env:KEEP_BROWSER_OPEN='true'; npm run test:chrome -- --project=chromium --headed
```

#### Option 3: Using npx directly
```powershell
$env:KEEP_BROWSER_OPEN='true'; npx playwright test tests/login.spec.ts --project=chromium --headed
```

### What Happens

When `KEEP_BROWSER_OPEN=true`:
1. After test completion, the browser will NOT automatically close
2. The Playwright Inspector will open, allowing you to:
   - View the page state
   - Execute commands in the Inspector
   - Inspect elements
   - Test selectors

3. Press **Continue** button or use keyboard shortcut in the Inspector to close the browser

### Default Behavior (KEEP_BROWSER_OPEN not set)

When `KEEP_BROWSER_OPEN` is not set or set to `false`:
- Browser will pause for 5 seconds (configurable via `PAUSE_ON_FINISH` env var)
- You can see the test result
- Browser closes automatically after the pause

### Examples

#### Keep browser open for debugging login test
```powershell
$env:KEEP_BROWSER_OPEN='true'; npx playwright test tests/login.spec.ts --project=chromium --headed -g "TC_LOGIN_001"
```

#### Customize pause duration before close (in milliseconds)
```powershell
$env:PAUSE_ON_FINISH='10000'; npx playwright test tests/login.spec.ts --project=chromium --headed
```

#### Run all tests with browser staying open
```powershell
$env:KEEP_BROWSER_OPEN='true'; npm test
```

## Files Modified

The following test files have been updated to support `KEEP_BROWSER_OPEN`:

1. `tests/login.spec.ts` - Login tests
2. `tests/property-selection.spec.ts` - Property selection tests
3. `tests/note-templates.spec.ts` - Note templates tests
4. `tests/note-templates-create.spec.ts` - Note templates creation tests

## Technical Details

The implementation uses `page.pause()` method from Playwright, which:
- Halts test execution
- Opens the Playwright Inspector
- Allows interactive debugging
- Maintains browser state for inspection

The logic is implemented in the `test.afterEach()` hook, so it applies to all tests automatically.

