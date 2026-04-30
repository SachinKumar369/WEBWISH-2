import fs from 'fs/promises';
import path from 'path';
import { Page } from '@playwright/test';
import logger from '../core/Logger';
import { QueryParams, databaseClient } from '../utils/DatabaseClient';

export type ReportRowValue = {
  column: string;
  value: unknown;
};

export type ReportRowValueExtractor<TRow extends Record<string, unknown>> = (row: TRow) => ReportRowValue[];

export type ReportComparisonRow = {
  rowNumber: number;
  relevantValues: Array<{ column: string; value: string }>;
  matchedValues: Array<{ column: string; value: string }>;
  missingValues: Array<{ column: string; value: string }>;
  matched: boolean;
};

export type ParameterReportValidationOptions<TRow extends Record<string, unknown>> = {
  reportTitle: string;
  artifactBaseName: string;
  queryText: string;
  queryParams?: QueryParams;
  reportDir?: string;
  extractRowValues: ReportRowValueExtractor<TRow>;
};

export type ParameterReportValidationResult<TRow extends Record<string, unknown>> = {
  pdfText: string;
  normalizedPdfText: string;
  dbRows: TRow[];
  comparison: ReportComparisonRow[];
  missingRows: ReportComparisonRow[];
  resultFile: string;
  pdfTextFile: string;
  comparisonLogFile: string;
};

function normalize(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function compact(value: string): string {
  return value.replace(/\s+/g, '');
}

function formatComparisonValues(values: Array<{ column: string; value: string }>): string {
  if (values.length === 0) {
    return 'none';
  }

  return values.map(({ column, value }) => `${column}=${value}`).join(', ');
}

function getPdfTextFromBuffer(pdfBuffer: Buffer): Promise<string> {
  return (async () => {
    const pdfParseModule = await import('pdf-parse');
    const PDFParse = (pdfParseModule as any).PDFParse;
    const parser = new PDFParse({ data: pdfBuffer });
    const parsed = await parser.getText();
    await parser.destroy();

    return parsed.text || '';
  })();
}

async function getPdfBufferFromPopup(popupPage: Page): Promise<Buffer> {
  const base64 = await popupPage.evaluate(async () => {
    const response = await fetch((globalThis as any).location.href);
    if (!response.ok) {
      throw new Error(`Unable to fetch PDF blob: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';

    for (let index = 0; index < bytes.length; index++) {
      binary += String.fromCharCode(bytes[index]);
    }

    return btoa(binary);
  });

  return Buffer.from(base64, 'base64');
}

export class ParameterReportValidationHelper {
  static normalize(value: unknown): string {
    return normalize(value);
  }

  static createColumnExtractor<TRow extends Record<string, unknown>>(columns: string[]): ReportRowValueExtractor<TRow> {
    return (row: TRow) =>
      columns
        .map((column) => ({ column, value: row[column] }))
        .filter(({ value }) => value !== undefined && value !== null && String(value).trim() !== '');
  }

  static async getPdfTextFromPopup(popupPage: Page): Promise<string> {
    const pdfBuffer = await getPdfBufferFromPopup(popupPage);
    return getPdfTextFromBuffer(pdfBuffer);
  }

  static async validatePdfAgainstDatabase<TRow extends Record<string, unknown>>(
    popupPage: Page,
    options: ParameterReportValidationOptions<TRow>
  ): Promise<ParameterReportValidationResult<TRow>> {
    if (!databaseClient.isConfigured()) {
      throw new Error('DB is not configured. Set DB_* variables in config/.env.* files.');
    }

    const pdfText = await this.getPdfTextFromPopup(popupPage);
    const normalizedPdfText = normalize(pdfText);
    const compactPdfText = compact(normalizedPdfText);
    const dbRows = await databaseClient.query<TRow>(options.queryText, options.queryParams ?? []);

    if (dbRows.length === 0) {
      const message = `${options.reportTitle} query returned no rows.`;
      logger.warn(message);
      throw new Error(message);
    }

    const comparison: ReportComparisonRow[] = dbRows.map((row, index) => {
      const relevantValues = options
        .extractRowValues(row)
        .map(({ column, value }) => ({ column, value: normalize(value) }))
        .filter(({ value }) => Boolean(value));
      const matchedValues = relevantValues.filter(
        ({ value }) => normalizedPdfText.includes(value) || compactPdfText.includes(compact(value))
      );
      const missingValues = relevantValues.filter(
        ({ value }) => !normalizedPdfText.includes(value) && !compactPdfText.includes(compact(value))
      );

      return {
        rowNumber: index + 1,
        relevantValues,
        matchedValues,
        missingValues,
        matched: missingValues.length === 0,
      };
    });

    const reportDir = options.reportDir || path.join(process.cwd(), 'reports', 'db', 'parameter-reports');
    await fs.mkdir(reportDir, { recursive: true });

    const resultFile = path.join(reportDir, `${options.artifactBaseName}-vs-db.json`);
    await fs.writeFile(
      resultFile,
      JSON.stringify(
        {
          reportTitle: options.reportTitle,
          queryText: options.queryText,
          totalDbRows: dbRows.length,
          totalMatchedRows: comparison.filter((item) => item.matched).length,
          comparison,
        },
        null,
        2
      ),
      'utf-8'
    );

    const pdfTextFile = path.join(reportDir, `${options.artifactBaseName}-pdf-text.txt`);
    await fs.writeFile(pdfTextFile, pdfText, 'utf-8');

    const comparisonLogFile = path.join(reportDir, `${options.artifactBaseName}-comparison.log`);
    const comparisonLogLines = [
      `Timestamp: ${new Date().toISOString()}`,
      `Report: ${options.reportTitle}`,
      '',
      'Executed Query:',
      options.queryText,
      '',
      `Total DB Rows: ${dbRows.length}`,
      `Total Matched Rows: ${comparison.filter((item) => item.matched).length}`,
      '',
      'Comparison Details (DB vs PDF):',
      ...comparison.flatMap((item, index) => [
        `${index + 1}. matched=${item.matched} | matchedValueCount=${item.matchedValues.length} | missingValueCount=${item.missingValues.length}`,
        `   relevant: ${formatComparisonValues(item.relevantValues)}`,
        `   matched: ${formatComparisonValues(item.matchedValues)}`,
        `   missing: ${formatComparisonValues(item.missingValues)}`,
      ]),
      '',
      `PDF Text File: ${pdfTextFile}`,
      `JSON Comparison File: ${resultFile}`,
    ];
    await fs.writeFile(comparisonLogFile, comparisonLogLines.join('\n'), 'utf-8');

    logger.info(`${options.reportTitle} PDF vs DB report saved to: ${resultFile}`);
    logger.info(`Extracted PDF text saved to: ${pdfTextFile}`);
    logger.info(`Comparison log saved to: ${comparisonLogFile}`);

    const missingRows = comparison.filter((item) => !item.matched);

    return {
      pdfText,
      normalizedPdfText,
      dbRows,
      comparison,
      missingRows,
      resultFile,
      pdfTextFile,
      comparisonLogFile,
    };
  }
}