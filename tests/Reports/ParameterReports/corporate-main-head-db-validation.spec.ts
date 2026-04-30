import { test, expect } from '@playwright/test';
import { databaseClient } from '../../../src/utils/DatabaseClient';
import { CorporateMainHeadReportPage } from '../../../src/pages/Reports/ParameterReports/CorporateMainHeadReportPage';
import { ParameterReportValidationHelper } from '../../../src/helpers/ParameterReportValidationHelper';
import { createLoggedInReportPage } from '../report-session';

type MainHeadRow = Record<string, unknown>;

const corporateMainHeadColumns = [
  'main_head_code',
  'description',
];

async function connectToDbWithRetry(maxAttempts = 3, delayMs = 3000): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await databaseClient.connect();
      return;
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

test.describe('Parameter Reports - Corporate Main Head DB Validation', () => {
  test.beforeAll(async () => {
    if (!databaseClient.isConfigured()) {
      return;
    }

    await connectToDbWithRetry();
  });

  test.afterAll(async () => {
    if (!databaseClient.isConfigured()) {
      return;
    }

    await databaseClient.close();
  });

  test('PRR_CORPMAINHEAD_001: should validate corporate main head PDF data with DB data', async ({ browser }) => {
    test.skip(!databaseClient.isConfigured(), 'DB is not configured. Set DB_* variables in config/.env.* files.');

    const session = await createLoggedInReportPage(browser);

    try {
      const reportPage = new CorporateMainHeadReportPage(session.page, session.context);

      await reportPage.openCorporateMainHeadReport();

      const popup = await reportPage.openReportPopup();
      const queryText = "select * from prm_main_head_master where property_id='webwe' and main_head_type='CP'";
      const validationResult = await ParameterReportValidationHelper.validatePdfAgainstDatabase<MainHeadRow>(popup, {
        reportTitle: 'Parameter Reports - Corporate Main Head DB Validation',
        artifactBaseName: 'corporate-main-head-report',
        queryText,
        extractRowValues: ParameterReportValidationHelper.createColumnExtractor<MainHeadRow>(corporateMainHeadColumns),
      });

      expect(validationResult.dbRows.length).toBeGreaterThan(0);

      console.table(
        validationResult.comparison.map((item) => ({
          rowNumber: item.rowNumber,
          matched: item.matched,
          matchedValueCount: item.matchedValues.length,
          missingValueCount: item.missingValues.length,
        }))
      );

      const missing = validationResult.missingRows;
      expect(
        missing,
        `PDF report mismatches found for corporate main head report rows: ${missing.map((item) => item.rowNumber).join(', ')}`
      ).toHaveLength(0);
    } finally {
      await session.context.close();
    }
  });
});
