import { test, expect } from '@playwright/test';
import { databaseClient } from '../../../src/utils/DatabaseClient';
import { CheckoutMessageReportPage } from '../../../src/pages/Reports/ParameterReports/CheckoutMessageReportPage';
import { ParameterReportValidationHelper } from '../../../src/helpers/ParameterReportValidationHelper';
import { createLoggedInReportPage } from '../report-session';

type CommonMasterRow = Record<string, unknown>;

function formatReportDate(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());

  return `${day}/${month}/${year}`;
}

function formatReportActive(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const text = String(value).trim().toUpperCase();

  if (text === '1' || text === 'TRUE' || text === 'Y' || text === 'YES') {
    return 'ü';
  }

  return String(value);
}

test.describe('Parameter Reports - Checkout Message DB Validation', () => {
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

  test('PRR_CHECKOUT_001: should validate checkout message PDF data with DB data', async ({ browser }) => {
    test.skip(!databaseClient.isConfigured(), 'DB is not configured. Set DB_* variables in config/.env.* files.');

    const session = await createLoggedInReportPage(browser);

    try {
      const reportPage = new CheckoutMessageReportPage(session.page, session.context);

      await reportPage.openCheckoutMessageReport();

      const popup = await reportPage.openReportPopup();
      const queryText = "select * from prm_common_masters where property_id='webwe' and param_type='COMG'";
      const validationResult = await ParameterReportValidationHelper.validatePdfAgainstDatabase<CommonMasterRow>(popup, {
        reportTitle: 'Parameter Reports - Checkout Message DB Validation',
        artifactBaseName: 'checkout-message-report',
        queryText,
        extractRowValues: (row) => [
          { column: 'param_code', value: row.param_code },
          { column: 'description', value: row.description },
          { column: 'active', value: formatReportActive(row.active) },
          { column: 'created_by', value: row.created_by },
          { column: 'created_on', value: formatReportDate(row.created_on) },
          { column: 'modified_by', value: row.modified_by },
          { column: 'modified_on', value: formatReportDate(row.modified_on) },
        ],
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
        `PDF report mismatches found for checkout message report rows: ${missing.map((item) => item.rowNumber).join(', ')}`
      ).toHaveLength(0);
    } finally {
      await session.context.close();
    }
  });
});
