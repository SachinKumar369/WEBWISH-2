import path from 'path';
import fs from 'fs';
import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult
} from '@playwright/test/reporter';
import logger from '../core/Logger';

type ResultRow = {
  title: string;
  fullTitle: string;
  file?: string;
  project?: string;
  status: TestResult['status'];
  expectedStatus: TestCase['expectedStatus'];
  durationMs: number;
  retry: number;
  error?: string;
  attachments: string[];
};

class CustomReporter implements Reporter {
  private rows: ResultRow[] = [];
  private startTime = Date.now();

  onBegin(_config: FullConfig, suite: Suite): void {
    this.startTime = Date.now();
    logger.info('Test execution started');
    logger.info(`Total tests: ${suite.allTests().length}`);
  }

  onTestBegin(test: TestCase): void {
    logger.info(`Starting test: ${test.title}`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const row: ResultRow = {
      title: test.title,
      fullTitle: test.titlePath().join(' > '),
      file: test.location?.file,
      project: test.parent.project()?.name,
      status: result.status,
      expectedStatus: test.expectedStatus,
      durationMs: result.duration,
      retry: result.retry,
      error: result.error?.message,
      attachments: result.attachments
        .map(a => a.path)
        .filter((value): value is string => Boolean(value))
    };

    this.rows.push(row);
    logger.info(`Test finished: ${row.title} | Status: ${row.status} | Duration: ${row.durationMs}ms`);

    if (result.status === 'failed') {
      logger.error(`Test FAILED: ${row.fullTitle}`);
      if (row.error) {
        logger.error(row.error);
      }
    }
  }

  onEnd(result: FullResult): void {
    const totalDurationMs = Date.now() - this.startTime;
    const passed = this.rows.filter(r => r.status === 'passed').length;
    const failed = this.rows.filter(r => r.status === 'failed').length;
    const skipped = this.rows.filter(r => r.status === 'skipped').length;
    const timedOut = this.rows.filter(r => r.status === 'timedOut').length;
    const interrupted = this.rows.filter(r => r.status === 'interrupted').length;
    const retriedPassed = this.rows.filter(r => r.status === 'passed' && r.retry > 0).length;

    const summary = {
      timestamp: new Date().toISOString(),
      runStatus: result.status,
      totalDurationMs,
      totalTests: this.rows.length,
      passed,
      failed,
      skipped,
      timedOut,
      interrupted,
      retriedPassed,
      passRate: this.rows.length ? Number(((passed / this.rows.length) * 100).toFixed(2)) : 0,
      environment: process.env.ENV || 'dev',
      browser: process.env.BROWSER || 'mixed',
      reports: {
        html: 'reports/html-report/index.html',
        allureResults: 'allure-results',
        junit: 'test-results/junit.xml',
        json: 'test-results/test-results.json'
      },
      failedTests: this.rows.filter(r => r.status === 'failed'),
      tests: this.rows
    };

    logger.info('================= TEST EXECUTION SUMMARY =================');
    logger.info(`Status: ${summary.runStatus}`);
    logger.info(`Total: ${summary.totalTests} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
    logger.info(`Timed Out: ${timedOut} | Interrupted: ${interrupted} | Retried Passed: ${retriedPassed}`);
    logger.info(`Duration: ${totalDurationMs}ms | Pass Rate: ${summary.passRate}%`);
    logger.info('=========================================================');

    this.writeArtifacts(summary);
  }

  private writeArtifacts(summary: Record<string, unknown>): void {
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const jsonPath = path.join(reportsDir, 'run-summary.json');
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

    const failedRows = this.rows.filter(r => r.status === 'failed');
    const markdown = [
      '# Test Run Summary',
      '',
      `- Status: ${String(summary.runStatus)}`,
      `- Total: ${this.rows.length}`,
      `- Passed: ${this.rows.filter(r => r.status === 'passed').length}`,
      `- Failed: ${failedRows.length}`,
      `- Skipped: ${this.rows.filter(r => r.status === 'skipped').length}`,
      `- Timed Out: ${this.rows.filter(r => r.status === 'timedOut').length}`,
      `- Interrupted: ${this.rows.filter(r => r.status === 'interrupted').length}`,
      `- Retried Passed: ${this.rows.filter(r => r.status === 'passed' && r.retry > 0).length}`,
      '',
      '## Report Paths',
      '',
      '- HTML: `reports/html-report/index.html`',
      '- Allure Results: `allure-results`',
      '- Allure HTML: `allure-report/index.html`',
      '- JUnit: `test-results/junit.xml`',
      '- JSON: `test-results/test-results.json`',
      ''
    ];

    if (failedRows.length) {
      markdown.push('## Failed Tests', '');
      for (const row of failedRows) {
        markdown.push(`- ${row.fullTitle}`);
        if (row.error) {
          markdown.push(`  - Error: ${row.error}`);
        }
        if (row.attachments.length) {
          markdown.push(`  - Attachments: ${row.attachments.join(', ')}`);
        }
      }
      markdown.push('');
    }

    const mdPath = path.join(reportsDir, 'run-summary.md');
    fs.writeFileSync(mdPath, markdown.join('\n'));

    logger.info(`Run summary JSON: ${jsonPath}`);
    logger.info(`Run summary Markdown: ${mdPath}`);
  }
}

export default CustomReporter;
