import { test, expect } from '@playwright/test';
import { databaseClient } from '../../../src/utils/DatabaseClient';
import { ParameterReportsPage } from '../../../src/pages/Reports/ParameterReports/ParameterReportsPage';
import { ParameterReportValidationHelper } from '../../../src/helpers/ParameterReportValidationHelper';
import { createLoggedInReportPage } from '../report-session';

type CommonMasterRow = Record<string, unknown>;

test.describe('Parameter Reports - Visa Type List DB Validation', () => {
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

  test('PRR_VISATYPE_001: should validate visa type list PDF data with DB data', async ({ browser }) => {
    test.skip(!databaseClient.isConfigured(), 'DB is not configured. Set DB_* variables in config/.env.* files.');

    const session = await createLoggedInReportPage(browser);

    try {
      const reportPage = new ParameterReportsPage(session.page, session.context);

      await reportPage.openReportByName('Visa Type List');

      const popup = await reportPage.openReportPopup();
      const queryText = "select * from prm_common_masters where property_id='webwe' and param_type='VISA'";
      const validationResult = await ParameterReportValidationHelper.validatePdfAgainstDatabase<CommonMasterRow>(popup, {
        reportTitle: 'Parameter Reports - Visa Type List DB Validation',
        artifactBaseName: 'visa-type-list-report',
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
        `PDF report mismatches found for visa type list report rows: ${missing.map((item) => item.rowNumber).join(', ')}`
      ).toHaveLength(0);
    } finally {
      await session.context.close();
    }
  });
});