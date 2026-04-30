import { test, expect } from '@playwright/test';
import { databaseClient } from '../../../src/utils/DatabaseClient';
import { RoomTypeListReportPage } from '../../../src/pages/Reports/ParameterReports/RoomTypeListReportPage';
import { ParameterReportValidationHelper } from '../../../src/helpers/ParameterReportValidationHelper';
import { createLoggedInReportPage } from '../report-session';

type RoomTypeRow = Record<string, unknown>;

test.describe('Parameter Reports - Room Type List DB Validation', () => {
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

  test('PRR_ROOM_TYPE_LIST_001: should validate room type list PDF data with DB data', async ({ browser }) => {
    test.skip(!databaseClient.isConfigured(), 'DB is not configured. Set DB_* variables in config/.env.* files.');

    const session = await createLoggedInReportPage(browser);

    try {
      const reportPage = new RoomTypeListReportPage(session.page, session.context);

      await reportPage.openRoomTypeListReport();

      const popup = await reportPage.openReportPopup();
      const queryText = "select * from prm_room_type where property_id='webwe'";
      const validationResult = await ParameterReportValidationHelper.validatePdfAgainstDatabase<RoomTypeRow>(popup, {
        reportTitle: 'Parameter Reports - Room Type List DB Validation',
        artifactBaseName: 'room-type-list-report',
        queryText,
        extractRowValues: ParameterReportValidationHelper.createColumnExtractor<RoomTypeRow>(['room_type_code', 'description']),
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
        `PDF report mismatches found for room type list report rows: ${missing.map((item) => item.rowNumber).join(', ')}`
      ).toHaveLength(0);
    } finally {
      await session.context.close();
    }
  });
});
