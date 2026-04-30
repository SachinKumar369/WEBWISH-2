import { test, expect } from '@playwright/test';
import { databaseClient } from '../../../src/utils/DatabaseClient';
import { PaymentMethodListReportPage } from '../../../src/pages/Reports/ParameterReports/PaymentMethodListReportPage';
import { ParameterReportValidationHelper } from '../../../src/helpers/ParameterReportValidationHelper';
import { createLoggedInReportPage } from '../report-session';

type PaymentMethodRow = Record<string, unknown>;

test.describe('Parameter Reports - Payment Method List DB Validation', () => {
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

  test('PRR_PAYMENT_METHOD_001: should validate payment method list PDF data with DB data', async ({ browser }) => {
    test.skip(!databaseClient.isConfigured(), 'DB is not configured. Set DB_* variables in config/.env.* files.');

    const session = await createLoggedInReportPage(browser);

    try {
      const reportPage = new PaymentMethodListReportPage(session.page, session.context);

      await reportPage.openPaymentMethodListReport();

      const popup = await reportPage.openReportPopup();
      const queryText = "select * from prm_payment_method where property_id='webwe'";
      const validationResult = await ParameterReportValidationHelper.validatePdfAgainstDatabase<PaymentMethodRow>(popup, {
        reportTitle: 'Parameter Reports - Payment Method List DB Validation',
        artifactBaseName: 'payment-method-list-report',
        queryText,
        extractRowValues: ParameterReportValidationHelper.createColumnExtractor<PaymentMethodRow>(['payment_method_code', 'description']),
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
        `PDF report mismatches found for payment method list report rows: ${missing.map((item) => item.rowNumber).join(', ')}`
      ).toHaveLength(0);
    } finally {
      await session.context.close();
    }
  });
});
