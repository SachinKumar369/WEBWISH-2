import logger from '../core/Logger';
import { databaseClient, QueryParams } from '../utils/DatabaseClient';

export class DatabaseAssertionHelper {
  static async assertRecordExists(sql: string, params: QueryParams = [], message?: string): Promise<void> {
    const row = await databaseClient.queryOne(sql, params);
    if (!row) {
      const error = message || `Expected at least one record, but query returned none. SQL: ${sql}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info('DB assertion passed: record exists.');
  }

  static async assertNoRecordExists(sql: string, params: QueryParams = [], message?: string): Promise<void> {
    const row = await databaseClient.queryOne(sql, params);
    if (row) {
      const error = message || `Expected no records, but query returned one or more. SQL: ${sql}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info('DB assertion passed: record does not exist.');
  }

  static async assertRowCount(
    sql: string,
    expectedCount: number,
    params: QueryParams = [],
    alias: string = 'count',
    message?: string
  ): Promise<void> {
    const row = await databaseClient.queryOne<Record<string, unknown>>(sql, params);
    const value = row?.[alias];
    const actual = typeof value === 'string' ? Number(value) : Number(value ?? Number.NaN);

    if (!Number.isFinite(actual) || actual !== expectedCount) {
      const error =
        message || `Expected row count ${expectedCount}, but got ${String(value)}. SQL: ${sql}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info(`DB assertion passed: row count is ${expectedCount}.`);
  }

  static async assertColumnEquals(
    sql: string,
    columnName: string,
    expectedValue: unknown,
    params: QueryParams = [],
    message?: string
  ): Promise<void> {
    const row = await databaseClient.queryOne<Record<string, unknown>>(sql, params);
    const actualValue = row?.[columnName];

    if (actualValue !== expectedValue) {
      const error =
        message ||
        `Expected column ${columnName} to be ${String(expectedValue)} but got ${String(actualValue)}. SQL: ${sql}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info(`DB assertion passed: ${columnName} equals expected value.`);
  }
}
