import { test, expect } from '@playwright/test';
import { databaseClient } from '../../../src/utils/DatabaseClient';
import { ParameterReportsPage } from '../../../src/pages/Reports/ParameterReports/ParameterReportsPage';
import { ParameterReportValidationHelper } from '../../../src/helpers/ParameterReportValidationHelper';
import { createLoggedInReportPage } from '../report-session';

type TaxExemptChargeCodeRow = Record<string, unknown>;

test.describe('Parameter Reports - Tax Exempt Charge Code DB Validation', () => {
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

  test('PRR_TAXEXEMPT_001: should validate tax exempt charge code PDF data with DB data', async ({ browser }) => {
    test.skip(!databaseClient.isConfigured(), 'DB is not configured. Set DB_* variables in config/.env.* files.');

    const session = await createLoggedInReportPage(browser);

    try {
      const reportPage = new ParameterReportsPage(session.page, session.context);

      await reportPage.openReportByName('Tax Exempt Charge Code');

      const popup = await reportPage.openReportPopup();
      const queryText = "select * from prm_tax_xmpt_charge_cd where property_id='webwe'";
      const validationResult = await ParameterReportValidationHelper.validatePdfAgainstDatabase<TaxExemptChargeCodeRow>(popup, {
        reportTitle: 'Parameter Reports - Tax Exempt Charge Code DB Validation',
        artifactBaseName: 'tax-exempt-charge-code-report',
        queryText,
        extractRowValues: ParameterReportValidationHelper.createColumnExtractor<TaxExemptChargeCodeRow>([
          'tax_exempt_code',
          'charge_code',
        ]),
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
        `PDF report mismatches found for tax exempt charge code report rows: ${missing.map((item) => item.rowNumber).join(', ')}`
      ).toHaveLength(0);
    } finally {
      await session.context.close();
    }
  });
});