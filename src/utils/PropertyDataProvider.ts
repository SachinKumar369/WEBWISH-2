import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import logger from '../core/Logger';

export interface PropertyData {
  code: string;
  name: string;
  index: number;
  module: string;
  enabled: boolean;
  url: string;
}

let cached: PropertyData[] | null = null;

/**
 * Read all properties from test-data/properties.xlsx (cached after first read).
 */
export function getPropertiesFromExcel(): PropertyData[] {
  if (cached) return cached;

  const filePath = path.join(process.cwd(), 'test-data', 'properties.xlsx');

  if (!fs.existsSync(filePath)) {
    throw new Error(`properties.xlsx not found at: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  cached = rows
    .filter(row => row.code)
    .map(row => ({
      code: String(row.code).trim().toUpperCase(),
      name: String(row.name || '').trim(),
      index: Number(row.index ?? 0),
      module: String(row.module || 'all').trim().toLowerCase(),
      enabled: String(row.enabled || 'TRUE').trim().toUpperCase() === 'TRUE',
      url: String(row.url || '').trim(),
    }));

  logger.info(`Loaded ${cached.length} properties from Excel`);
  return cached;
}

/**
 * Find property by code from Excel.
 * Usage: const prop = getPropertyByCodeFromExcel('WEBWISHQCMI');
 */
export function getPropertyByCodeFromExcel(code: string): PropertyData | undefined {
  return getPropertiesFromExcel().find(p => p.code === code.toUpperCase() && p.enabled);
}

/**
 * Find property by index from Excel.
 * Usage: const prop = getPropertyByIndexFromExcel(2);
 */
export function getPropertyByIndexFromExcel(index: number): PropertyData | undefined {
  return getPropertiesFromExcel().find(p => p.index === index && p.enabled);
}
