import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import logger from '../core/Logger';

export interface UserData {
  index: number;
  username: string;
  password: string;
  email: string;
  role: string;
  environment: string;
  enabled: boolean;
}

let cached: UserData[] | null = null;

/**
 * Read all users from test-data/users.xlsx (cached after first read).
 */
export function getUsersFromExcel(): UserData[] {
  if (cached) return cached;

  const filePath = path.join(process.cwd(), 'test-data', 'users.xlsx');

  if (!fs.existsSync(filePath)) {
    throw new Error(`users.xlsx not found at: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  cached = rows
    .filter(row => row.username)
    .map(row => ({
      index: Number(row.index ?? 0),
      username: String(row.username || '').trim(),
      password: String(row.password || '').trim(),
      email: String(row.email || '').trim(),
      role: String(row.role || 'user').trim().toLowerCase(),
      environment: String(row.environment || 'all').trim().toLowerCase(),
      enabled: String(row.enabled || 'TRUE').trim().toUpperCase() === 'TRUE',
    }));

  logger.info(`Loaded ${cached.length} users from Excel`);
  return cached;
}

/**
 * Find user by index from Excel.
 * Usage: const user = getUserByIndexFromExcel(0);
 */
export function getUserByIndexFromExcel(index: number): UserData | undefined {
  return getUsersFromExcel().find(u => u.index === index && u.enabled);
}

/**
 * Find user by username from Excel.
 * Usage: const user = getUserByUsernameFromExcel('SACH');
 */
export function getUserByUsernameFromExcel(username: string): UserData | undefined {
  return getUsersFromExcel().find(u => u.username.toUpperCase() === username.toUpperCase() && u.enabled);
}

/**
 * Find user by role from Excel (first matching enabled user).
 * Usage: const user = getUserByRoleFromExcel('admin');
 */
export function getUserByRoleFromExcel(role: string): UserData | undefined {
  return getUsersFromExcel().find(u => u.role === role.toLowerCase() && u.enabled);
}

/**
 * Find user by environment from Excel (first matching enabled user).
 * Usage: const user = getUserByEnvironmentFromExcel('all');
 */
export function getUserByEnvironmentFromExcel(environment: string): UserData | undefined {
  return getUsersFromExcel().find(u => u.environment === environment.toLowerCase() && u.enabled);
}
