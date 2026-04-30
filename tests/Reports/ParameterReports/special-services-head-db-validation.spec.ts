import { test, expect } from '@playwright/test';
import { databaseClient } from '../../../src/utils/DatabaseClient';
import { SpecialServicesHeadReportPage } from '../../../src/pages/Reports/ParameterReports/SpecialServicesHeadReportPage';
import { ParameterReportValidationHelper } from '../../../src/helpers/ParameterReportValidationHelper';
import { createLoggedInReportPage } from '../report-session';

type MainHeadRow = Record<string, unknown>;

const specialServicesHeadColumns = [
  'main_head_code',
  'description',
];

test.describe('Parameter Reports - Special Services Head DB Validation', () => {
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

  test('PRR_SSHEAD_001: should validate special services head PDF data with DB data', async ({ browser }) => {
    test.skip(!databaseClient.isConfigured(), 'DB is not configured. Set DB_* variables in config/.env.* files.');

    const session = await createLoggedInReportPage(browser);

    try {
      const reportPage = new SpecialServicesHeadReportPage(session.page, session.context);

      await reportPage.openSpecialServicesHeadReport();

      const popup = await reportPage.openReportPopup();
      const queryText = "select * from prm_main_head_master where property_id='webwe' and main_head_type='SS'";
      const validationResult = await ParameterReportValidationHelper.validatePdfAgainstDatabase<MainHeadRow>(popup, {
        reportTitle: 'Parameter Reports - Special Services Head DB Validation',
        artifactBaseName: 'special-services-head-report',
        queryText,
        extractRowValues: ParameterReportValidationHelper.createColumnExtractor<MainHeadRow>(specialServicesHeadColumns),
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
        `PDF report mismatches found for special services head report rows: ${missing.map((item) => item.rowNumber).join(', ')}`
      ).toHaveLength(0);
    } finally {
      await session.context.close();
    }
  });
});