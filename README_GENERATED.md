# WebWish 2 Automation Framework

This repository contains an enterprise‑grade end‑to‑end automation framework built on [Playwright](https://playwright.dev) using TypeScript. It has been designed to support a large WebWish application with robust features, flexible configuration, and full CI/CD readiness.

> 🔧 *The following README was generated programmatically by analysing the entire project.*

---

## 📌 Key Capabilities

- **Page Object Model** with a layered architecture (`src/core`, `src/pages`, `src/utils`).
- **TypeScript** for static typing, linting, and maintainability.
- **Multi‑browser support**: Chromium (Chrome), Firefox, WebKit (Safari) and Edge.
- **Parallel execution** via Playwright workers, configurable in `playwright.config.ts`.
- **Rich reporting**:
  - Allure (with screenshots, videos, traces)
  - Extent Reports (HTML dashboard)
  - Custom reporters and Winston logging
- **Visual regression testing** using `pixelmatch` and baseline image comparison.
- **Test data management** (JSON, CSV, Excel) with caching utilities.
- **Environment configuration** (`dev`, `stage`, `prod`) using `.env` files.
- **Retry/recovery mechanisms** and network‑idle synchronization.
- **Dockerisation** and `docker-compose` support for containerised runs.
- **CI/CD pipeline** configured via GitHub Actions with matrix support.

---

## 🗂 Project Structure

```
WebWish 2/
├── src/
│   ├── core/                 # BasePage, Logger, configuration helpers
│   ├── pages/                # Page object classes
│   ├── utils/                # ElementActions, WaitUtils, TestDataManager, VisualRegressionUtil
│   ├── listeners/            # CustomReporter.ts
│   └── helpers/              # Additional utility modules
├── tests/                    # Playwright test suites (login.spec.ts, visual‑regression.spec.ts, …)
├── test-data/                # JSON, CSV, Excel data and visual baselines
├── config/                   # Environment `.env` files
├── logs/                     # Generated log files
├── screenshots/              # Failure screenshots
├── videos/                   # Recorded videos of failed runs
├── traces/                   # Playwright trace files
├── test-results/             # Aggregated test reports
├── allure-results/           # Allure report artifacts
├── .github/workflows/        # CI configuration (playwright.yml)
├── playwright.config.ts      # Playwright configuration and projects
├── tsconfig.json             # TypeScript configuration
├── .eslintrc.json            # ESLint rules
├── Dockerfile                # Docker image definition
├── docker-compose.yml        # Compose file for local container execution
├── package.json              # Scripts and dependencies
└── README.md (this file)
```

> 📄 Additional documentation lives across the repository in files such as `API.md`, `CONTRIBUTING.md`, `QUICK_REFERENCE.md`, etc. See `FILE_LISTING.md` for a full inventory.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- (Optional) Docker & Docker Compose for container runs

### Installation

```bash
git clone <repository-url> "WebWish 2"
cd "WebWish 2"
npm install
npm run install:browsers    # installs Playwright browsers
npx playwright --version     # verify installation
```

### Configuration

Environment-specific values are stored in `.env` files inside `config/`.
Copy or modify `config/.env.dev`, `config/.env.stage` and `config/.env.prod` as needed:

```properties
BASE_URL=https://qc2webwish.prologicfirst.in
ENVIRONMENT=dev
LOG_LEVEL=debug
RETRY_COUNT=2
TIMEOUT=30000
PARALLEL_WORKERS=4
HEADLESS=true
```

Test credentials and other data reside in `test-data/` in various formats.

---

## 🧪 Running Tests

Use the npm scripts defined in `package.json`:

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests with default settings |
| `npm run test:chrome` | Run tests in Chromium |
| `npm run test:firefox` | Run tests in Firefox |
| `npm run test:webkit` | Run tests in WebKit |
| `npm run test:edge` | Run tests in Edge |
| `npm run test:all-browsers` | Sequentially run all four projects |
| `npm run test:headed` | Run in headed mode |
| `npm run test:debug` | Start in Playwright debug mode |
| `npm run test:ui` | Launch the interactive test runner UI |
| `npm run test:parallel` | Force 4 workers |
| `npm run test:serial` | Single‑worker execution |
| `npm run test:dev` / `stage` / `prod` | Target specific environment |
| `npm run report:allure` | Generate and view Allure report |
| `npm run report:extent` | Generate Extent HTML report |
| `npm run clean` | Remove generated artifacts |
| `npm run lint` / `lint:fix` | ESLint checks and fixes |

CI-specific commands are also provided (`npm run ci:test`).

---

## 🐳 Docker & CI

Build and run the container with:

```bash
docker build -t webwish-automation-framework .
docker-compose up --build
```

The GitHub Actions workflow (`.github/workflows/playwright.yml`) executes the full test suite on push and pull‑request events, uploading reports as artifacts.

---

## 📦 Dependencies

The project uses the following key packages:

- `@playwright/test` for test execution
- `typescript`, `ts-node`, `eslint` for code quality
- `allure-playwright`, `winston`, `pixelmatch` for reporting and visual tests
- `dotenv`, `csv-parser`, `xlsx` for configuration and data handling

Refer to `package.json` for a full listing.

---

## 🛠 Contributing

See `CONTRIBUTING.md` for guidelines on branching, coding standards, and pull requests. Follow the layered architecture and add page objects under `src/pages` when creating new tests.

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).

---

Thank you for using the WebWish 2 automation framework! For additional help check the various markdown documents or contact the SDET Automation Team.
