import fs from 'fs/promises';
import path from 'path';
import { databaseClient } from '../../src/utils/DatabaseClient';
import { test, expect } from '../fixtuers/auth.fixtuers';

type MealPlanRow = {
  property_id: string;
  meal_plan_id: string;
  description: string;
  active: boolean;
  amount_percent_flg: string;
};

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toUpperCase();
}

async function getPdfBufferFromPopup(popupPage: any): Promise<Buffer> {
  const base64 = await popupPage.evaluate(async () => {
    const response = await fetch((globalThis as any).location.href);
    if (!response.ok) {
      throw new Error(`Unable to fetch PDF blob: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';

    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  });

  return Buffer.from(base64, 'base64');
}

async function parsePdfText(pdfBuffer: Buffer): Promise<string> {
  const pdfParseModule = await import('pdf-parse');
  const PDFParse = (pdfParseModule as any).PDFParse;
  const parser = new PDFParse({ data: pdfBuffer });
  const parsed = await parser.getText();
  await parser.destroy();
  return parsed.text || '';
}

test.describe('Meal Plan Report DB Validation', () => {
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

  test('should validate meal plan report PDF data with DB data', async ({ authenticatedPage }) => {
    test.skip(!databaseClient.isConfigured(), 'DB is not configured. Set DB_* variables in config/.env.* files.');

    const page = authenticatedPage;  

    await page.mouse.move(0,300);
    await page.getByRole('link', { name: ' Report' }).click();
    await page.getByRole('link', { name: ' Parameter Reports ' }).click();
    await page.getByRole('link', { name: ' Room Type List' }).click();

    const popupPromise = page.waitForEvent('popup');
    await page.locator('.list-inline-item > .btn').first().click();
    const popup = await popupPromise;

    await popup.waitForLoadState('domcontentloaded');

    const pdfBuffer = await getPdfBufferFromPopup(popup);
    const pdfText = await parsePdfText(pdfBuffer);
    const normalizedPdfText = normalize(pdfText);

    const queryText = 'SELECT * FROM prm_room_type WHERE property_id = @propertyId';
    const queryParams = { propertyId: 'WEBWE' };

    const dbRows = await databaseClient.query<MealPlanRow>(queryText, queryParams);

    expect(dbRows.length).toBeGreaterThan(0);

    const comparison = dbRows.map((row) => {
      const code = normalize(String(row.meal_plan_id || ''));
      const description = normalize(String(row.description || ''));
      const codeFound = normalizedPdfText.includes(code);
      const descriptionFound = normalizedPdfText.includes(description);

      return {
        meal_plan_id: code,
        description,
        codeFoundInPdf: codeFound,
        descriptionFoundInPdf: descriptionFound,
        matched: codeFound && descriptionFound,
      };
    });

    console.table(comparison);

    const reportDir = path.join(process.cwd(), 'reports', 'db');
    await fs.mkdir(reportDir, { recursive: true });

    const resultFile = path.join(reportDir, 'meal-plan-report-vs-db.json');
    await fs.writeFile(
      resultFile,
      JSON.stringify(
        {
          propertyId: 'WEBWE',
          totalDbRows: dbRows.length,
          totalMatches: comparison.filter((c) => c.matched).length,
          comparison,
        },
        null,
        2
      ),
      'utf-8'
    );

    const pdfTextFile = path.join(reportDir, 'meal-plan-report-pdf-text.txt');
    await fs.writeFile(pdfTextFile, pdfText, 'utf-8');

    const comparisonLogFile = path.join(reportDir, 'meal-plan-report-comparison.log');
    const comparisonLogLines = [
      `Timestamp: ${new Date().toISOString()}`,
      'Report: Meal Plan Report DB Validation',
      '',
      'Executed Query:',
      queryText,
      '',
      'Query Parameters:',
      JSON.stringify(queryParams, null, 2),
      '',
      `Total DB Rows: ${dbRows.length}`,
      `Total Matched Rows: ${comparison.filter((c) => c.matched).length}`,
      '',
      'Comparison Details (DB vs PDF):',
      ...comparison.map(
        (item, index) =>
          `${index + 1}. meal_plan_id=${item.meal_plan_id} | description=${item.description} | codeFoundInPdf=${item.codeFoundInPdf} | descriptionFoundInPdf=${item.descriptionFoundInPdf} | matched=${item.matched}`
      ),
      '',
      `PDF Text File: ${pdfTextFile}`,
      `JSON Comparison File: ${resultFile}`,
    ];
    await fs.writeFile(comparisonLogFile, comparisonLogLines.join('\n'), 'utf-8');

    console.log(`Meal plan PDF vs DB report saved to: ${resultFile}`);
    console.log(`Extracted PDF text saved to: ${pdfTextFile}`);
    console.log(`Comparison log saved to: ${comparisonLogFile}`);

    const missing = comparison.filter((c) => !c.matched);
    expect(
      missing,
      `PDF report mismatches found for meal plans: ${missing.map((m) => m.meal_plan_id).join(', ')}`
    ).toHaveLength(0);
  });
});
