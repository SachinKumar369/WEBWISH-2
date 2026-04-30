# WebWish Automation Framework - Enterprise Grade Playwright Testing

A production-ready Playwright automation framework using TypeScript with comprehensive reporting, parallel execution, visual regression testing, and multi-environment support.

## 📋 Framework Features

### ✨ Core Features
- **Layered Architecture**: Strict separation of pages, tests, utilities, and configuration
- **Page Object Model**: Clean, maintainable page classes with element locators
- **TypeScript**: Full type safety and IntelliSense support
- **Multi-Browser Support**: Chrome, Firefox, WebKit, and Edge
- **Parallel Execution**: 4+ workers with configurable concurrency
- **Smart Waiting**: Custom wait utilities with retry mechanisms
- **Custom Element Wrappers**: Click, sendKeys, hover, upload with logging and retry logic

### 📊 Reporting & Monitoring
- **Allure Reports**: Comprehensive with step reporting, screenshots, videos, and traces
- **Extent Reports**: HTML dashboard with embedded screenshots
- **Winston Logger**: Structured logging with file rotation
- **Custom Reporter**: Real-time test metrics and summaries
- **Screenshots on Failure**: Automatic capture with timestamps
- **Video Recording**: Retain videos on test failure

### 🔄 Advanced Features
- **Visual Regression Testing**: pixelmatch integration with baseline comparison
- **Test Data Management**: JSON, CSV, and Excel support with caching
- **Environment Configuration**: dev, stage, prod with .env files
- **Retry Mechanism**: Configurable retry count with logging
- **Network Idle Waits**: Automatic network synchronization
- **CI/CD Integration**: GitHub Actions with matrix execution

### 🐳 Infrastructure
- **Docker Support**: Complete containerization with all browsers pre-installed
- **Docker Compose**: Easy local execution with volume mapping
- **GitHub Actions**: Automated CI/CD pipeline with artifact storage

## 📁 Project Structure

```
WebWish 2/
├── src/
│   ├── core/
│   │   ├── BasePage.ts           # Base page class with navigation
│   │   └── Logger.ts              # Winston logger configuration
│   ├── pages/
│   │   └── LoginPage.ts           # Login page object
│   ├── utils/
│   │   ├── ElementActions.ts      # Custom element action wrappers
│   │   ├── TestDataManager.ts     # Test data loading and caching
│   │   ├── WaitUtils.ts           # Smart waiting utilities
│   │   └── VisualRegressionUtil.ts # Visual regression testing
│   ├── listeners/
│   │   └── CustomReporter.ts      # Custom test reporter
│   └── helpers/
│       └── (Additional helpers)
├── tests/
│   ├── login.spec.ts              # Login test cases
│   └── visual-regression.spec.ts  # Visual regression tests
├── test-data/
│   ├── test-data.json            # JSON test data
│   ├── users.csv                 # CSV user data
│   └── baselines/                # Visual baseline images
├── config/
│   ├── .env.dev                  # Dev environment config
│   ├── .env.stage                # Stage environment config
│   └── .env.prod                 # Prod environment config
├── logs/                          # Log files directory
├── screenshots/                   # Failure screenshots
├── videos/                        # Test videos
├── traces/                        # Playwright traces
├── test-results/                  # Test reports
├── allure-results/               # Allure report data
├── .github/workflows/
│   └── playwright.yml            # GitHub Actions pipeline
├── playwright.config.ts          # Playwright configuration
├── tsconfig.json                 # TypeScript configuration
├── .eslintrc.json               # ESLint configuration
├── Dockerfile                    # Docker image definition
├── docker-compose.yml            # Docker compose setup
├── package.json                  # Dependencies and scripts
├── .env                          # Default environment variables
└── README.md                     # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- git
- Docker (optional, for containerized execution)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd "WebWish 2"
```

2. **Install dependencies**
```bash
npm install
```

3. **Install Playwright browsers**
```bash
npm run install:browsers
```

4. **Verify installation**
```bash
npx playwright --version
```

## ⚙️ Configuration

### Environment Variables

Create or modify `.env` files in the `config/` directory:

**config/.env.dev**
```
BASE_URL=https://qc2webwish.prologicfirst.in
ENVIRONMENT=dev
LOG_LEVEL=debug
RETRY_COUNT=2
TIMEOUT=30000
PARALLEL_WORKERS=4
HEADLESS=true
```

### Test Data

Test credentials are stored in `test-data/` directory:

**test-data/test-data.json**
```json
{
  "users": [
    {
      "username": "SACH",
      "password": "123",
      "email": "sach@example.com"
    }
  ]
}
```

**test-data/users.csv**
```
username,password,email
SACH,123,sach@example.com
TEST_USER,Test@123,testuser@example.com
```

### Database Validation Layer

You can add DB-backed validation to any Playwright test for an extra assertion layer.

1. Configure DB variables in your environment file (for example `config/.env.dev`):
```
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=your_database
DB_SSL=false
```

2. Use the reusable client/helper in tests:
```typescript
import { databaseClient } from '../src/utils/DatabaseClient';
import { DatabaseAssertionHelper } from '../src/helpers/DatabaseAssertionHelper';

const rows = await databaseClient.query('SELECT 1 AS ok');
await DatabaseAssertionHelper.assertRecordExists(
  'SELECT * FROM guest_master WHERE reservation_no = $1',
  ['RES123']
);
```

3. Run DB-only validations:
```bash
npm run test:db
```

## 📝 Test Execution

### Run All Tests
```bash
npm test
```

### Run Tests by Browser
```bash
npm run test:chrome      # Chrome only
npm run test:firefox     # Firefox only
npm run test:webkit      # WebKit only
npm run test:edge        # Edge only
npm run test:all-browsers # All browsers sequentially
```

### Run Tests in Headed Mode
```bash
npm run test:headed
```

### Run Tests in Debug Mode
```bash
npm run test:debug
```

### Run Tests with UI
```bash
npm run test:ui
```

### Run Tests in Parallel
```bash
npm run test:parallel   # 4 workers
npm run test:serial     # 1 worker
```

### Run Tests by Environment
```bash
npm run test:dev        # Dev environment
npm run test:stage      # Staging environment
npm run test:prod       # Production environment
```

### Run Specific Test File
```bash
npx playwright test tests/login.spec.ts
```

### Run Specific Test Case
```bash
npx playwright test -g "Successful login with valid credentials"
```

## 📊 Reports

### Allure Report
```bash
npm run report:allure
```

The Allure report includes:
- Step-by-step test execution
- Screenshots attached to failed tests
- Video recordings
- Playwright traces
- Environment metadata
- Test categorization

### HTML Report
```bash
npx playwright show-report
```

### View Test Results
```bash
npm run report:extent
```

## 🐳 Docker Execution

### Build and Run with Docker
```bash
docker build -t webwish-automation:latest .
docker run --rm -v $(pwd)/test-results:/app/test-results webwish-automation:latest
```

### Using Docker Compose
```bash
docker-compose up --build
```

### Docker Compose with Specific Environment
```bash
docker-compose run --rm -e ENV=stage playwright-tests npm test
```

## 🔍 Writing Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { testDataManager } from '../utils/TestDataManager';
import logger from '../core/Logger';

test.describe('Feature Tests', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page, context }) => {
    loginPage = new LoginPage(page, context);
  });

  test('TC_001: Test description', async () => {
    logger.info('Test started');
    
    // Get test data
    const user = await testDataManager.getUserCredentials('dev');
    
    // Perform actions
    await loginPage.navigateToLoginPage();
    await loginPage.login(user.username, user.password);
    
    // Assert
    expect(loginPage.getCurrentURL()).not.toContain('login');
    
    logger.info('Test completed');
  });
});
```

### Creating Page Objects

```typescript
import { BasePage } from '../core/BasePage';
import { ElementActions } from '../utils/ElementActions';

export class MyPage extends BasePage {
  private elementActions: ElementActions;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  // Define locators
  private readonly MY_ELEMENT = '[data-testid="my-element"]';

  // Define methods
  async clickMyElement(): Promise<void> {
    await this.elementActions.click(this.MY_ELEMENT, 'My Element');
  }
}
```

## 🎨 Visual Regression Testing

### Create Baseline
```typescript
import { visualRegressionUtil } from '../utils/VisualRegressionUtil';

test('Create baseline', async ({ page }) => {
  await page.goto('https://example.com');
  await visualRegressionUtil.createBaseline(page, 'my_page');
});
```

### Compare with Baseline
```typescript
test('Visual regression test', async ({ page }) => {
  await page.goto('https://example.com');
  
  const result = await visualRegressionUtil.compareWithBaseline(
    page,
    'my_page',
    false,
    0.1 // 10% threshold
  );
  
  expect(result.match).toBe(true);
});
```

## 📚 Custom Utilities

### ElementActions

```typescript
// Click element with retry
await elementActions.click(selector, 'Element description');

// Send keys with automatic clear
await elementActions.sendKeys(selector, 'text', 'Input field');

// Hover over element
await elementActions.hover(selector);

// Upload file
await elementActions.uploadFile(selector, '/path/to/file.pdf');

// Scroll to element
await elementActions.scrollToElement(selector);

// Wait for element
await elementActions.waitForElement(selector);

// Get element text
const text = await elementActions.getText(selector);

// Get element attribute
const attr = await elementActions.getAttribute(selector, 'href');

// Check element visibility
const isVisible = await elementActions.isElementVisible(selector);
```

### WaitUtils

```typescript
// Wait for element to be stable
await waitUtils.waitForElementStable(selector);

// Wait for network idle
await waitUtils.waitForNetworkIdle();

// Wait for specific response
await waitUtils.waitForResponse(/api\/endpoint/);

// Wait for condition
await waitUtils.waitForCondition(
  async () => {
    const text = await element.textContent();
    return text === 'Expected Text';
  },
  10000,
  500
);

// Wait for element count
await waitUtils.waitForElementCount(selector, 5);

// Wait for text in element
await waitUtils.waitForText(selector, 'Expected text');

// Sleep
await waitUtils.sleep(1000);
```

### TestDataManager

```typescript
// Get user credentials
const user = await testDataManager.getUserCredentials('dev');

// Get all users from CSV
const users = await testDataManager.getAllUsers();

// Get user by username
const user = await testDataManager.getUserByUsername('SACH');

// Get test case by ID
const testCase = await testDataManager.getTestCaseById('TC_LOGIN_001');

// Clear cache
testDataManager.clearCache();
```

## 🔐 Security Best Practices

1. **Never hardcode credentials**
   - Always use test-data or environment config
   - Use .gitignore to exclude sensitive files

2. **Protect sensitive data**
   - Store real credentials in CI/CD secrets
   - Use environment variables for sensitive values

3. **Audit logs**
   - All actions are logged for compliance
   - Logs contain timestamps and error details

## 🚨 Troubleshooting

### Tests Timeout
- Increase timeout in `playwright.config.ts`
- Check network connectivity
- Verify application is responding

### Locator Not Found
- Use browser devtools to inspect elements
- Try multiple locator strategies
- Add explicit wait conditions

### Flaky Tests
- Add proper wait conditions
- Use `waitForPageLoad()` before assertions
- Increase timeout for slow elements

### Memory Issues
- Reduce parallel workers
- Close browser pages properly
- Monitor system resources

## 📖 Logging

All actions are logged to `logs/` directory:
- `combined.log`: All log levels
- `error.log`: Errors only

Log levels can be controlled via `LOG_LEVEL` environment variable:
- `error`: Only errors
- `warn`: Warnings and errors
- `info`: General information (default)
- `debug`: Detailed debugging information

## 🤝 Contributing

1. Create feature branch
2. Follow ESLint rules: `npm run lint:fix`
3. Write tests for new features
4. Update documentation
5. Submit pull request

## 📝 License

MIT License - See LICENSE file for details

## 📞 Support

For issues and questions:
1. Check existing GitHub issues
2. Review test logs in `logs/` directory
3. Check test-results for detailed failure info
4. Review Allure report for step-by-step execution

## 🎯 Roadmap

- [ ] API Testing Integration
- [ ] Mobile Testing Support
- [ ] Performance Testing
- [ ] Accessibility Testing (axe)
- [ ] Advanced Analytics Dashboard
- [ ] Test Sharding
- [ ] Custom Allure Plugin

---

**Last Updated**: February 2026
**Framework Version**: 1.0.0
**Playwright Version**: 1.40.0+

