import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import logger from '../core/Logger';

export interface TestUser {
  username: string;
  password: string;
  email?: string;
  role?: string;
  environment?: string;
}

export interface TestData {
  users?: TestUser[];
  testCases?: any[];
  [key: string]: any;
}

export class TestDataManager {
  private testDataPath: string = path.join(process.cwd(), 'test-data');
  private cachedData: Map<string, any> = new Map();

  /**
   * Load JSON test data file
   */
  async loadJSONData(filename: string): Promise<any> {
    try {
      const filepath = path.join(this.testDataPath, filename);

      if (this.cachedData.has(filepath)) {
        logger.debug(`Using cached data for ${filename}`);
        return this.cachedData.get(filepath);
      }

      logger.info(`Loading JSON test data from ${filename}`);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

      this.cachedData.set(filepath, data);
      logger.debug(`Loaded JSON data from ${filename}`);

      return data;
    } catch (error) {
      logger.error(`Failed to load JSON test data from ${filename}: ${error}`);
      throw error;
    }
  }

  /**
   * Load CSV test data file
   */
  async loadCSVData(filename: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      try {
        const filepath = path.join(this.testDataPath, filename);

        if (this.cachedData.has(filepath)) {
          logger.debug(`Using cached CSV data for ${filename}`);
          resolve(this.cachedData.get(filepath));
          return;
        }

        logger.info(`Loading CSV test data from ${filename}`);
        const data: any[] = [];

        fs.createReadStream(filepath)
          .pipe(csv())
          .on('data', (row) => {
            data.push(row);
          })
          .on('end', () => {
            this.cachedData.set(filepath, data);
            logger.debug(`Loaded CSV data from ${filename} with ${data.length} rows`);
            resolve(data);
          })
          .on('error', (error) => {
            logger.error(`Failed to load CSV test data from ${filename}: ${error}`);
            reject(error);
          });
      } catch (error) {
        logger.error(`Error reading CSV file: ${error}`);
        reject(error);
      }
    });
  }

  /**
   * Get user credentials from test data
   */
  // async getUserCredentials(environment: string = 'all'): Promise<TestUser> {
  //   try {
  //     const data = await this.loadJSONData('test-data.json') as TestData;

  //     if (!data.users || data.users.length === 0) {
  //       throw new Error('No users found in test data');
  //     }

  //     // Filter by environment if specified
  //     let users = data.users;
  //     if (environment !== 'all') {
  //       users = users.filter(u => u.environment === environment || u.environment === 'all');
  //     }

  //     if (users.length === 0) {
  //       throw new Error(`No users found for environment: ${environment}`);
  //     }

  //     // Return first user (admin user)
  //     const user = users[0];
  //     logger.info(`Retrieved credentials for user: ${user.username}`);

  //     return user;
  //   } catch (error) {
  //     logger.error(`Failed to get user credentials: ${error}`);
  //     throw error;
  //   }
  // }

  async getUserCredentials(environment: string = 'all'): Promise<TestUser> {
  try {
    const data = await this.loadJSONData('test-data.json') as TestData;

    if (!data.users || data.users.length === 0) {
      throw new Error('No users found in test data');
    }

    // 1. Try exact environment match FIRST
    const exactMatch = data.users.find(u => u.environment === environment);

    if (exactMatch) {
      logger.info(`Retrieved ${environment} user: ${exactMatch.username}`);
      return exactMatch;
    }

    // 2. Fallback to 'all'
    const fallback = data.users.find(u => u.environment === 'all');

    if (fallback) {
      logger.info(`Fallback to 'all' user: ${fallback.username}`);
      return fallback;
    }

    throw new Error(`No users found for environment: ${environment}`);

  } catch (error) {
    logger.error(`Failed to get user credentials: ${error}`);
    throw error;
  }
}
  /**
   * Get all users from CSV
   */
  async getAllUsers(): Promise<TestUser[]> {
    try {
      const data = await this.loadCSVData('users.csv');
      logger.info(`Retrieved ${data.length} users from CSV`);
      return data as TestUser[];
    } catch (error) {
      logger.error(`Failed to get users from CSV: ${error}`);
      throw error;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<TestUser | undefined> {
    try {
      const users = await this.getAllUsers();
      const user = users.find(u => u.username === username);

      if (user) {
        logger.info(`Found user: ${username}`);
      } else {
        logger.warn(`User not found: ${username}`);
      }

      return user;
    } catch (error) {
      logger.error(`Failed to get user by username: ${error}`);
      throw error;
    }
  }

  /**
   * Get test case by ID
   */
  async getTestCaseById(testCaseId: string): Promise<any> {
    try {
      const data = await this.loadJSONData('test-data.json') as TestData;

      if (!data.testCases) {
        throw new Error('No test cases found in test data');
      }

      const testCase = data.testCases.find(tc => tc.id === testCaseId);

      if (!testCase) {
        throw new Error(`Test case not found: ${testCaseId}`);
      }

      logger.info(`Retrieved test case: ${testCaseId}`);
      return testCase;
    } catch (error) {
      logger.error(`Failed to get test case: ${error}`);
      throw error;
    }
  }

  /**
   * Save JSON test data to a file (overwrites the file)
   */
  async saveJSONData(filename: string, data: any): Promise<void> {
    try {
      const filepath = path.join(this.testDataPath, filename);
      logger.info(`Saving JSON test data to ${filename}`);

      fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');

      this.cachedData.set(filepath, data);
      logger.debug(`Saved JSON data to ${filename}`);
    } catch (error) {
      logger.error(`Failed to save JSON test data to ${filename}: ${error}`);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedData.clear();
    logger.debug('Test data cache cleared');
  }
}

export const testDataManager = new TestDataManager();

