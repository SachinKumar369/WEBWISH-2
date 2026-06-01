import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
const environment = process.env.ENV || 'dev';
dotenv.config({ path: path.resolve(__dirname, `config/.env.${environment}`) });
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Framework defaults for local debugging UX.
process.env.KEEP_BROWSER_OPEN = process.env.KEEP_BROWSER_OPEN ?? 'true';
process.env.HEADED = process.env.HEADED ?? 'true';
process.env.MAXIMIZE_BROWSER = process.env.MAXIMIZE_BROWSER ?? 'true';

const runHeaded = process.env.HEADED === 'true';
const maximizeBrowser = process.env.MAXIMIZE_BROWSER === 'true';
const launchArgs = maximizeBrowser ? ['--start-maximized'] : [];
//const configuredRetries = Number(process.env.PLAYWRIGHT_RETRIES ?? (process.env.CI ? 2 : 1));
//const retries = Number.isFinite(configuredRetries) && configuredRetries >= 0 ? configuredRetries : 1;

const chromiumUse = maximizeBrowser
  ? {
      browserName: 'chromium' as const,
      headless: !runHeaded,
      viewport: null,
      launchOptions: { args: launchArgs }
    }
  : {
      ...devices['Desktop Chrome'],
      headless: !runHeaded
    };

const firefoxUse = maximizeBrowser
  ? {
      browserName: 'firefox' as const,
      headless: !runHeaded,
      viewport: null,
      launchOptions: { args: launchArgs }
    }
  : {
      ...devices['Desktop Firefox'],
      headless: !runHeaded
    };

const webkitUse = maximizeBrowser
  ? {
      browserName: 'webkit' as const,
      headless: !runHeaded,
      viewport: null,
      launchOptions: { args: launchArgs }
    }
  : {
      ...devices['Desktop Safari'],
      headless: !runHeaded
    };

const msedgeUse = maximizeBrowser
  ? {
      browserName: 'chromium' as const,
      channel: 'msedge' as const,
      headless: !runHeaded,
      viewport: null,
      launchOptions: { args: launchArgs }
    }
  : {
      ...devices['Desktop Edge'],
      headless: !runHeaded
    };

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',

    globalSetup: require.resolve('./global-setup'),  // ✅ ADD THIS


  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  //retries,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['allure-playwright', { outputFolder: 'allure-results', detail: true, suiteTitle: false }],
    ['./src/listeners/CustomReporter.ts']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://qc2webwish.prologicfirst.in/#/login/z6cQJcxmrEbhhFXqdoj64Q%3D%3D',

    //baseURL: process.env.BASE_URL || 'https://qc2webwish.prologicfirst.in/',

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    storageState: './storageState.json',
    viewport: maximizeBrowser ? null : undefined,
    launchOptions: {
      args: launchArgs,
    }

  },
  webServer: undefined,
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  projects: [



    



    {
      name: 'chromium',
      use: chromiumUse,
    },
    {
      name: 'firefox',
      use: firefoxUse,
    },
    {
      name: 'webkit',
      use: webkitUse,
    },
    {
      name: 'msedge',
      use: msedgeUse,
    },
  ],
});
