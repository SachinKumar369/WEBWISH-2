# API Documentation

## Framework Classes and Methods

### BasePage

Base class for all page objects providing common functionality.

```typescript
import { BasePage } from '@core/BasePage';

export class MyPage extends BasePage {
  constructor(page: Page, context: BrowserContext) {
    super(page, context);
  }
}
```

#### Methods

- **`navigate(url?: string): Promise<void>`**
  - Navigate to a URL
  - Waits for domcontentloaded
  - Logs navigation actions

- **`navigateToHome(): Promise<void>`**
  - Navigate to base URL
  - Convenience method

- **`waitForURL(urlPattern: string | RegExp): Promise<void>`**
  - Wait for URL to match pattern
  - Throws on timeout

- **`waitForPageLoad(state?: 'load' | 'domcontentloaded' | 'networkidle'): Promise<void>`**
  - Wait for page load state
  - Default: 'load'

- **`takeScreenshot(name: string, fullPage?: boolean): Promise<string>`**
  - Take screenshot
  - Returns file path
  - Saves to screenshots/ directory

- **`getCurrentURL(): string`**
  - Get current page URL
  - Synchronous

- **`getPageTitle(): Promise<string>`**
  - Get page title
  - Asynchronous

- **`waitForNetworkIdle(): Promise<void>`**
  - Wait for network idle state
  - Useful before assertions

- **`close(): Promise<void>`**
  - Close the page
  - Handles errors gracefully

---

## ElementActions

Custom element action wrappers with retry logic and logging.

```typescript
import { ElementActions } from '@utils/ElementActions';

const actions = new ElementActions(page);
```

#### Methods

- **`click(selector: string | Locator, description?: string): Promise<void>`**
  - Click element with retry (3 attempts)
  - Falls back to JavaScript click
  - Logs all attempts
  - Example: `await actions.click('[data-testid="button"]', 'Submit Button');`

- **`sendKeys(selector: string | Locator, text: string, description?: string, clear?: boolean): Promise<void>`**
  - Type text into element
  - Clears existing text by default
  - 50ms delay between keystrokes
  - Example: `await actions.sendKeys('[name="username"]', 'testuser');`

- **`hover(selector: string | Locator, description?: string): Promise<void>`**
  - Hover over element
  - Example: `await actions.hover('[data-testid="menu"]');`

- **`uploadFile(selector: string | Locator, filePath: string, description?: string): Promise<void>`**
  - Upload file to input element
  - Validates file exists
  - Example: `await actions.uploadFile('input[type="file"]', '/path/to/file.pdf');`

- **`scrollToElement(selector: string | Locator, description?: string): Promise<void>`**
  - Scroll element into view
  - Example: `await actions.scrollToElement('[data-testid="footer"]');`

- **`waitForElement(selector: string | Locator, timeout?: number, description?: string): Promise<void>`**
  - Wait for element visibility
  - Default timeout: 10000ms
  - Example: `await actions.waitForElement('[data-testid="modal"]', 5000);`

- **`waitForElementHidden(selector: string | Locator, timeout?: number, description?: string): Promise<void>`**
  - Wait for element to be hidden
  - Default timeout: 10000ms
  - Example: `await actions.waitForElementHidden('[data-testid="loader"]');`

- **`getText(selector: string | Locator, description?: string): Promise<string>`**
  - Get element text content
  - Example: `const text = await actions.getText('[data-testid="message"]');`

- **`getAttribute(selector: string | Locator, attribute: string, description?: string): Promise<string | null>`**
  - Get element attribute value
  - Example: `const href = await actions.getAttribute('a', 'href');`

- **`isElementVisible(selector: string | Locator, description?: string): Promise<boolean>`**
  - Check if element is visible
  - Returns boolean
  - Example: `const visible = await actions.isElementVisible('[data-testid="success"]');`

- **`pressKey(key: string, description?: string): Promise<void>`**
  - Press keyboard key
  - Example: `await actions.pressKey('Enter');`

---

## WaitUtils

Smart waiting utilities with custom conditions.

```typescript
import { WaitUtils } from '@utils/WaitUtils';

const waits = new WaitUtils(page);
```

#### Methods

- **`waitForElementStable(selector: string, timeout?: number): Promise<void>`**
  - Wait for element + 300ms animation delay
  - Default timeout: 5000ms
  - Example: `await waits.waitForElementStable('[data-testid="menu"]');`

- **`waitForNetworkIdle(timeout?: number): Promise<void>`**
  - Wait for network idle state
  - Default timeout: 30000ms
  - Warns on failure but doesn't throw
  - Example: `await waits.waitForNetworkIdle();`

- **`waitForResponse(urlPattern: string | RegExp, timeout?: number): Promise<void>`**
  - Wait for specific HTTP response
  - Default timeout: 10000ms
  - Example: `await waits.waitForResponse(/api\/login/);`

- **`waitForCondition(condition: () => Promise<boolean>, timeout?: number, pollInterval?: number, description?: string): Promise<void>`**
  - Wait for custom condition
  - Default timeout: 10000ms
  - Default poll: 500ms
  - Example: `await waits.waitForCondition(async () => await isLoggedIn(), 15000);`

- **`waitForElementCount(selector: string, expectedCount: number, timeout?: number): Promise<void>`**
  - Wait for specific number of elements
  - Default timeout: 10000ms
  - Example: `await waits.waitForElementCount('[data-testid="item"]', 5);`

- **`waitForText(selector: string, expectedText: string, timeout?: number): Promise<void>`**
  - Wait for text to appear in element
  - Default timeout: 10000ms
  - Example: `await waits.waitForText('[data-testid="message"]', 'Success');`

- **`sleep(ms: number): Promise<void>`**
  - Wait for specific milliseconds
  - Example: `await waits.sleep(1000);`

- **`waitForNavigation(timeout?: number): Promise<void>`**
  - Wait for page navigation
  - Default timeout: 30000ms
  - Example: `await waits.waitForNavigation();`

---

## TestDataManager

Load and manage test data from various sources.

```typescript
import { testDataManager } from '@utils/TestDataManager';
```

#### Methods

- **`loadJSONData(filename: string): Promise<any>`**
  - Load JSON test data file
  - Caches results
  - Example: `const data = await testDataManager.loadJSONData('test-data.json');`

- **`loadCSVData(filename: string): Promise<any[]>`**
  - Load CSV test data file
  - Returns array of objects
  - Example: `const users = await testDataManager.loadCSVData('users.csv');`

- **`getUserCredentials(environment?: string): Promise<TestUser>`**
  - Get user credentials from JSON
  - Filters by environment
  - Returns first matching user
  - Example: `const user = await testDataManager.getUserCredentials('dev');`

- **`getAllUsers(): Promise<TestUser[]>`**
  - Get all users from CSV
  - Example: `const users = await testDataManager.getAllUsers();`

- **`getUserByUsername(username: string): Promise<TestUser | undefined>`**
  - Find user by username
  - Example: `const user = await testDataManager.getUserByUsername('SACH');`

- **`getTestCaseById(testCaseId: string): Promise<any>`**
  - Get test case from JSON
  - Example: `const tc = await testDataManager.getTestCaseById('TC_LOGIN_001');`

- **`clearCache(): void`**
  - Clear all cached data
  - Example: `testDataManager.clearCache();`

---

## VisualRegressionUtil

Visual regression testing with pixelmatch.

```typescript
import { visualRegressionUtil } from '@utils/VisualRegressionUtil';
```

#### Methods

- **`takeVisualScreenshot(page: Page, testName: string, fullPage?: boolean): Promise<string>`**
  - Take screenshot for visual testing
  - Returns file path
  - Example: `await visualRegressionUtil.takeVisualScreenshot(page, 'login_page');`

- **`createBaseline(page: Page, testName: string, fullPage?: boolean): Promise<string>`**
  - Create or update baseline
  - Saves to test-data/baselines/
  - Example: `await visualRegressionUtil.createBaseline(page, 'login_page');`

- **`compareWithBaseline(page: Page, testName: string, fullPage?: boolean, threshold?: number): Promise<{match: boolean; pixelsDifferent: number; diffPercentage: number}>`**
  - Compare current screenshot with baseline
  - Default threshold: 0.1 (10%)
  - Generates diff image
  - Example: `const result = await visualRegressionUtil.compareWithBaseline(page, 'login_page', false, 0.1);`

- **`updateBaseline(page: Page, testName: string, fullPage?: boolean): Promise<void>`**
  - Update existing baseline
  - Example: `await visualRegressionUtil.updateBaseline(page, 'login_page');`

- **`deleteBaseline(testName: string): void`**
  - Delete baseline file
  - Example: `visualRegressionUtil.deleteBaseline('login_page');`

- **`getAllBaselines(): string[]`**
  - Get list of all baseline files
  - Example: `const baselines = visualRegressionUtil.getAllBaselines();`

---

## Logger

Winston-based logging system.

```typescript
import logger from '@core/Logger';
```

#### Methods

- **`logger.info(message: string): void`**
  - Log info level message
  - Example: `logger.info('Test started');`

- **`logger.error(message: string): void`**
  - Log error level message
  - Example: `logger.error('Test failed');`

- **`logger.warn(message: string): void`**
  - Log warning level message
  - Example: `logger.warn('Potential issue');`

- **`logger.debug(message: string): void`**
  - Log debug level message
  - Example: `logger.debug('Variable value: ' + value);`

#### Log Output
- Console: Colored output
- File (combined.log): All levels
- File (error.log): Errors only

---

## LoginPage

Page object for login functionality.

```typescript
import { LoginPage } from '@pages/LoginPage';

const loginPage = new LoginPage(page, context);
```

#### Methods

- **`navigateToLoginPage(): Promise<void>`**
  - Navigate to login page
  - Waits for form to load
  - Example: `await loginPage.navigateToLoginPage();`

- **`enterUsername(username: string): Promise<void>`**
  - Enter username
  - Example: `await loginPage.enterUsername('SACH');`

- **`enterPassword(password: string): Promise<void>`**
  - Enter password
  - Example: `await loginPage.enterPassword('123');`

- **`clickLogin(): Promise<void>`**
  - Click login button
  - Example: `await loginPage.clickLogin();`

- **`waitForLoginToComplete(): Promise<void>`**
  - Wait for login completion
  - Waits for loader to hide
  - Waits for network idle
  - Example: `await loginPage.waitForLoginToComplete();`

- **`login(username: string, password: string): Promise<void>`**
  - Complete login flow
  - Combines all steps
  - Example: `await loginPage.login('SACH', '123');`

- **`isLoginFormVisible(): Promise<boolean>`**
  - Check if login form is visible
  - Example: `const visible = await loginPage.isLoginFormVisible();`

- **`getErrorMessage(): Promise<string>`**
  - Get error message text
  - Example: `const error = await loginPage.getErrorMessage();`

- **`isErrorMessageDisplayed(): Promise<boolean>`**
  - Check if error is displayed
  - Example: `const displayed = await loginPage.isErrorMessageDisplayed();`

- **`clearLoginForm(): Promise<void>`**
  - Clear username and password fields
  - Example: `await loginPage.clearLoginForm();`

- **`getPageTitle(): Promise<string>`**
  - Get page title
  - Example: `const title = await loginPage.getPageTitle();`

---

## BrowserContextManager

Browser context management utilities.

```typescript
import { BrowserContextManager } from '@helpers/BrowserContextManager';
```

#### Methods

- **`createContext(browser: Browser, options?: {...}): Promise<BrowserContext>`**
  - Create new browser context
  - Options: locale, timezone, offline, httpCredentials
  - Example: `const ctx = await BrowserContextManager.createContext(browser);`

- **`closeContext(context: BrowserContext): Promise<void>`**
  - Close browser context
  - Example: `await BrowserContextManager.closeContext(context);`

- **`addAuthCookies(context: BrowserContext, cookies: any[]): Promise<void>`**
  - Add authentication cookies
  - Example: `await BrowserContextManager.addAuthCookies(context, cookies);`

- **`addAuthHeaders(context: BrowserContext, headers: Record<string, string>): Promise<void>`**
  - Add authentication headers
  - Example: `await BrowserContextManager.addAuthHeaders(context, {'Authorization': 'Bearer token'});`

- **`grantPermissions(context: BrowserContext, permissions: string[], origin?: string): Promise<void>`**
  - Grant browser permissions
  - Example: `await BrowserContextManager.grantPermissions(context, ['geolocation']);`

- **`setGeolocation(context: BrowserContext, latitude: number, longitude: number, accuracy?: number): Promise<void>`**
  - Set geolocation
  - Example: `await BrowserContextManager.setGeolocation(context, 40.7128, -74.0060);`

- **`interceptRequests(page: Page, urlPattern: string | RegExp, handler: (route: any) => Promise<void>): Promise<void>`**
  - Intercept network requests
  - Example: `await BrowserContextManager.interceptRequests(page, /api/, handler);`

- **`clearCookies(context: BrowserContext): Promise<void>`**
  - Clear all cookies
  - Example: `await BrowserContextManager.clearCookies(context);`

- **`clearStorage(context: BrowserContext): Promise<void>`**
  - Clear all storage (cookies, localStorage, sessionStorage)
  - Example: `await BrowserContextManager.clearStorage(context);`

---

## AssertionHelper

Custom assertion utilities.

```typescript
import { AssertionHelper } from '@helpers/AssertionHelper';
```

#### Methods

- **`assertTextContains(actual: string, expected: string, message?: string): void`**
  - Assert text contains value
  - Example: `AssertionHelper.assertTextContains('Welcome User', 'Welcome');`

- **`assertEquals(actual: any, expected: any, message?: string): void`**
  - Assert values are equal
  - Example: `AssertionHelper.assertEquals(status, 200);`

- **`assertTrue(actual: boolean, message?: string): void`**
  - Assert value is true
  - Example: `AssertionHelper.assertTrue(isVisible);`

- **`assertFalse(actual: boolean, message?: string): void`**
  - Assert value is false
  - Example: `AssertionHelper.assertFalse(isEnabled);`

- **`assertNotNull(actual: any, message?: string): void`**
  - Assert value is not null
  - Example: `AssertionHelper.assertNotNull(user);`

- **`assertArrayContains(array: any[], expected: any, message?: string): void`**
  - Assert array contains value
  - Example: `AssertionHelper.assertArrayContains(users, 'SACH');`

- **`assertGreaterThan(actual: number, expected: number, message?: string): void`**
  - Assert number > value
  - Example: `AssertionHelper.assertGreaterThan(count, 0);`

- **`assertLessThan(actual: number, expected: number, message?: string): void`**
  - Assert number < value
  - Example: `AssertionHelper.assertLessThan(time, 5000);`

- **`assertEqual(condition: boolean, message: string): void`**
  - Assert custom condition
  - Example: `AssertionHelper.assertEqual(result === 'success', 'Operation should succeed');`

---

## Configuration

### Environment Variables

```
BASE_URL=https://qc2webwish.prologicfirst.in
ENVIRONMENT=dev
LOG_LEVEL=info
SCREENSHOT_ON_FAILURE=true
VIDEO_ON_FAILURE=true
RETRY_COUNT=0
TIMEOUT=30000
PARALLEL_WORKERS=4
HEADLESS=true
```

### Playwright Config

- **timeout**: 30000ms per action
- **navigationTimeout**: 30000ms
- **expectTimeout**: 5000ms
- **retries**: 2 (CI) / 0 (local)
- **workers**: 4 (configurable)

---

## Example Usage

### Complete Login Test
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { testDataManager } from '../utils/TestDataManager';
import logger from '../core/Logger';

test('Login Test', async ({ page, context }) => {
  const loginPage = new LoginPage(page, context);
  const user = await testDataManager.getUserCredentials('dev');
  
  await loginPage.navigateToLoginPage();
  await loginPage.login(user.username, user.password);
  
  expect(page.url()).not.toContain('login');
  logger.info('Login test passed');
});
```

---

For more examples, see the `tests/` directory.

