import logger from '../core/Logger';

export class AssertionHelper {
  /**
   * Assert text contains expected value
   */
  static assertTextContains(actual: string, expected: string, message?: string): void {
    const contains = actual.includes(expected);
    if (!contains) {
      const errorMsg = message || `Expected text to contain "${expected}" but got "${actual}"`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    logger.info(`Assertion passed: Text contains "${expected}"`);
  }

  /**
   * Assert text equals expected value
   */
  static assertEquals(actual: any, expected: any, message?: string): void {
    if (actual !== expected) {
      const errorMsg = message || `Expected "${expected}" but got "${actual}"`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    logger.info(`Assertion passed: "${actual}" equals "${expected}"`);
  }

  /**
   * Assert value is true
   */
  static assertTrue(actual: boolean, message?: string): void {
    if (!actual) {
      const errorMsg = message || 'Expected value to be true';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    logger.info('Assertion passed: Value is true');
  }

  /**
   * Assert value is false
   */
  static assertFalse(actual: boolean, message?: string): void {
    if (actual) {
      const errorMsg = message || 'Expected value to be false';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    logger.info('Assertion passed: Value is false');
  }

  /**
   * Assert value is not null
   */
  static assertNotNull(actual: any, message?: string): void {
    if (actual === null || actual === undefined) {
      const errorMsg = message || 'Expected value to not be null';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    logger.info('Assertion passed: Value is not null');
  }

  /**
   * Assert array contains value
   */
  static assertArrayContains(array: any[], expected: any, message?: string): void {
    if (!array.includes(expected)) {
      const errorMsg = message || `Expected array to contain "${expected}"`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    logger.info(`Assertion passed: Array contains "${expected}"`);
  }

  /**
   * Assert number is greater than
   */
  static assertGreaterThan(actual: number, expected: number, message?: string): void {
    if (actual <= expected) {
      const errorMsg = message || `Expected ${actual} to be greater than ${expected}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    logger.info(`Assertion passed: ${actual} is greater than ${expected}`);
  }

  /**
   * Assert number is less than
   */
  static assertLessThan(actual: number, expected: number, message?: string): void {
    if (actual >= expected) {
      const errorMsg = message || `Expected ${actual} to be less than ${expected}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    logger.info(`Assertion passed: ${actual} is less than ${expected}`);
  }

  /**
   * Assert with custom condition
   */
  static assertEqual(condition: boolean, message: string): void {
    if (!condition) {
      logger.error(message);
      throw new Error(message);
    }
    logger.info(`Assertion passed: ${message}`);
  }
}

