import { test, expect } from '@playwright/test';
import { databaseClient } from '../../../src/utils/DatabaseClient';
import { TravelAgentMainHeadReportPage } from '../../../src/pages/Reports/ParameterReports/TravelAgentMainHeadReportPage';
import { ParameterReportValidationHelper } from '../../../src/helpers/ParameterReportValidationHelper';
import { createLoggedInReportPage } from '../report-session';

type MainHeadRow = Record<string, unknown>;

const travelAgentMainHeadColumns = [
  'main_head_code',
  'description',
];

test.describe('Parameter Reports - Travel Agent Main Head DB Validation', () => {
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

  test('PRR_TAHEAD_001: should validate travel agent main head PDF data with DB data', async ({ browser }) => {
    test.skip(!databaseClient.isConfigured(), 'DB is not configured. Set DB_* variables in config/.env.* files.');

    const session = await createLoggedInReportPage(browser);

    try {
      const reportPage = new TravelAgentMainHeadReportPage(session.page, session.context);

      await reportPage.openTravelAgentMainHeadReport();

      const popup = await reportPage.openReportPopup();
      const queryText = "select * from prm_main_head_master where property_id='webwe' and main_head_type='TA'";
      const validationResult = await ParameterReportValidationHelper.validatePdfAgainstDatabase<MainHeadRow>(popup, {
        reportTitle: 'Parameter Reports - Travel Agent Main Head DB Validation',
        artifactBaseName: 'travel-agent-main-head-report',
        queryText,
        extractRowValues: ParameterReportValidationHelper.createColumnExtractor<MainHeadRow>(travelAgentMainHeadColumns),
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
        `PDF report mismatches found for travel agent main head report rows: ${missing.map((item) => item.rowNumber).join(', ')}`
      ).toHaveLength(0);
    } finally {
      await session.context.close();
    }
  });
});