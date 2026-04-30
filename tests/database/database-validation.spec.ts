import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { databaseClient } from '../../src/utils/DatabaseClient';
import { DatabaseAssertionHelper } from '../../src/helpers/DatabaseAssertionHelper';

test.describe('Database Validation Layer', () => {
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

  test('DB_HEALTH_001: should execute a simple validation query', async () => {
    test.skip(!databaseClient.isConfigured(), 'DB is not configured. Set DB_* variables in config/.env.* files.');

    const rows = await databaseClient.query<{ ok: number }>('SELECT 1 AS ok');
    expect(rows.length).toBeGreaterThan(0);
    expect(Number(rows[0].ok)).toBe(1);
  });

  test('DB_ASSERT_001: sample record existence assertion', async () => {
    test.skip(!databaseClient.isConfigured(), 'DB is not configured. Set DB_* variables in config/.env.* files.');

    await DatabaseAssertionHelper.assertRecordExists(
      'SELECT * FROM prm_meal_plan WHERE property_id = @propertyId',
      { propertyId: 'WEBWE' },
      'No rows found in prm_meal_plan for property_id WEBWE.'
    );

    const rows = await databaseClient.query<Record<string, unknown>>(
      'SELECT * FROM prm_meal_plan WHERE property_id = @propertyId',
      { propertyId: 'WEBWE' }
    );

    expect(rows.length).toBeGreaterThan(0);
    console.log(`prm_meal_plan rows fetched for WEBWE: ${rows.length}`);

    console.table(
      rows.map(row => ({
        property_id: row.property_id,
        meal_plan_id: row.meal_plan_id,
        active: row.active,
        description: row.description,
        amount_percent_flg: row.amount_percent_flg,
      }))
    );

    const reportDir = path.join(process.cwd(), 'reports', 'db');
    const reportFile = path.join(reportDir, 'prm_meal_plan_WEBWE.json');
    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(reportFile, JSON.stringify(rows, null, 2), 'utf-8');

    console.log(`prm_meal_plan query result saved to: ${reportFile}`);
  });
});
