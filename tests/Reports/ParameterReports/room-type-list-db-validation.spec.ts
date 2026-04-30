import { test, expect } from '@playwright/test';
import { ParameterReportsPage } from '../../../src/pages/Reports/ParameterReports/ParameterReportsPage';
import { ParameterReportValidationHelper } from '../../../src/helpers/ParameterReportValidationHelper';
import { createLoggedInReportPage } from '../report-session';

type RoomTypeRow = Record<string, unknown>;

test.describe('Parameter Reports - Room Type List DB Validation', () => {
  test.beforeAll(async () => {
    const { databaseClient } = await import('../../../src/utils/DatabaseClient');
    if (!databaseClient.isConfigured()) {
      return;
    }

    await databaseClient.connect();
  });

  test.afterAll(async () => {
    const { databaseClient } = await import('../../../src/utils/DatabaseClient');
    if (!databaseClient.isConfigured()) {
      return;
    }

    await databaseClient.close();
  });

  test('PRR_ROOMTYPE_001: should validate room type list PDF data with DB data', async ({ browser }) => {
    const { databaseClient } = await import('../../../src/utils/DatabaseClient');
    test.skip(!databaseClient.isConfigured(), 'DB is not configured. Set DB_* variables in config/.env.* files.');

    const session = await createLoggedInReportPage(browser);

    try {
      const reportPage = new ParameterReportsPage(session.page, session.context);

      await reportPage.openReportByName('Room Type List');

      const popup = await reportPage.openReportPopup();
      const queryText = 'SELECT * FROM prm_room_type WHERE property_id = @propertyId';


      const validationResult = await ParameterReportValidationHelper.validatePdfAgainstDatabase<RoomTypeRow>(popup, {
        reportTitle: 'Parameter Reports - Room Type List DB Validation',
        artifactBaseName: 'room-type-list-report',
        queryText,
        queryParams: { propertyId: 'WEBWE' },
        extractRowValues: ParameterReportValidationHelper.createColumnExtractor<RoomTypeRow>(['meal_plan_id', 'description']),
      });

      expect(validationResult.dbRows.length).toBeGreaterThan(0);
      expect(validationResult.missingRows, 'PDF report mismatches found for room type list rows: ' + validationResult.missingRows.map((item) => item.rowNumber).join(', ')).toHaveLength(0);
    } finally {
      await session.context.close();
    }
  });
});