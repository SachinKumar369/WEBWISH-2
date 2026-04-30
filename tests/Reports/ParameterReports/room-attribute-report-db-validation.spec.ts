import { test, expect } from '@playwright/test';
import { databaseClient } from '../../../src/utils/DatabaseClient';
import { RoomAttributeReportPage } from '../../../src/pages/Reports/ParameterReports/RoomAttributeReportPage';
import { ParameterReportValidationHelper } from '../../../src/helpers/ParameterReportValidationHelper';
import { createLoggedInReportPage } from '../report-session';

type RoomAttributeRow = Record<string, unknown>;

test.describe('Parameter Reports - Room Attribute DB Validation', () => {
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

  test('PRR_ROOM_ATTRIBUTE_001: should validate room attribute PDF data with DB data', async ({ browser }) => {
    test.skip(!databaseClient.isConfigured(), 'DB is not configured. Set DB_* variables in config/.env.* files.');

    const session = await createLoggedInReportPage(browser);

    try {
      const reportPage = new RoomAttributeReportPage(session.page, session.context);

      await reportPage.openRoomAttributeReport();

      const popup = await reportPage.openReportPopup();
      const queryText = "select * from prm_room_attribute where property_id='webwe'";
      const validationResult = await ParameterReportValidationHelper.validatePdfAgainstDatabase<RoomAttributeRow>(popup, {
        reportTitle: 'Parameter Reports - Room Attribute DB Validation',
        artifactBaseName: 'room-attribute-report',
        queryText,
        extractRowValues: ParameterReportValidationHelper.createColumnExtractor<RoomAttributeRow>(['room_attribute_code', 'description']),
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
        `PDF report mismatches found for room attribute report rows: ${missing.map((item) => item.rowNumber).join(', ')}`
      ).toHaveLength(0);
    } finally {
      await session.context.close();
    }
  });
});
