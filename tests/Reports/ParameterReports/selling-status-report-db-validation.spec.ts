import { test, expect } from '@playwright/test';
import { databaseClient } from '../../../src/utils/DatabaseClient';
import { SellingStatusReportPage } from '../../../src/pages/Reports/ParameterReports/SellingStatusReportPage';
import { ParameterReportValidationHelper } from '../../../src/helpers/ParameterReportValidationHelper';
import { createLoggedInReportPage } from '../report-session';

type CommonMasterRow = Record<string, unknown>;

test.describe('Parameter Reports - Selling Status DB Validation', () => {
  test.beforeAll(async () => {
    if (!databaseClient.isConfigured()) {
      return;
    }

    await databaseClient.connect();
  });

  test.afterAll(async () => {
    if (!databaseClient.isConfigured()) {
      return;
    }

    await databaseClient.close();
  });

  test('PRR_SELLING_STATUS_001: should validate selling status PDF data with DB data', async ({ browser }) => {
    test.skip(!databaseClient.isConfigured(), 'DB is not configured. Set DB_* variables in config/.env.* files.');

    const session = await createLoggedInReportPage(browser);

    try {
      const reportPage = new SellingStatusReportPage(session.page, session.context);

      await reportPage.openSellingStatusReport();

      const popup = await reportPage.openReportPopup();
      const queryText = "select * from prm_common_masters where property_id='webwe' and param_type='RSEL'";
      const validationResult = await ParameterReportValidationHelper.validatePdfAgainstDatabase<CommonMasterRow>(popup, {
        reportTitle: 'Parameter Reports - Selling Status DB Validation',
        artifactBaseName: 'selling-status-report',
        queryText,
        extractRowValues: ParameterReportValidationHelper.createColumnExtractor<CommonMasterRow>(['param_code', 'description']),
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
        `PDF report mismatches found for selling status report rows: ${missing.map((item) => item.rowNumber).join(', ')}`
      ).toHaveLength(0);
    } finally {
      await session.context.close();
    }
  });
});