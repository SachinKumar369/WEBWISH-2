import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../core/Logger';

export interface ProfileTestData {
  firstName: string;
  mobileNumber: string;
  createdAt?: string;
}

export class ExcelDataWriter {
  private filePath: string;
  private sheetName: string = 'Profiles';

  constructor(filePath: string = 'test-data/TestData.xlsx', sheetName: string = 'Profiles') {
    this.filePath = filePath;
    this.sheetName = sheetName;

    // Ensure directory exists
    const directory = path.dirname(this.filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
      logger.info(`Created directory: ${directory}`);
    }
  }

  /**
   * Append profile test data to Excel file
   */
  async appendProfileData(data: ProfileTestData): Promise<void> {
    try {
      logger.info(`Writing profile data to Excel: ${this.filePath}`);

      let workbook: XLSX.WorkBook;
      let worksheet: XLSX.WorkSheet;

      // Check if file exists
      if (fs.existsSync(this.filePath)) {
        logger.info(`Excel file exists. Reading: ${this.filePath}`);
        workbook = XLSX.readFile(this.filePath);

        // Check if sheet exists
        if (workbook.SheetNames.includes(this.sheetName)) {
          worksheet = workbook.Sheets[this.sheetName];
          logger.info(`Sheet "${this.sheetName}" found. Appending data.`);
        } else {
          logger.info(`Sheet "${this.sheetName}" not found. Creating new sheet.`);
          worksheet = XLSX.utils.aoa_to_sheet([['First Name', 'Mobile Number', 'Created At']]);
          workbook.SheetNames.push(this.sheetName);
          workbook.Sheets[this.sheetName] = worksheet;
        }
      } else {
        logger.info(`Excel file does not exist. Creating new file: ${this.filePath}`);
        // Create new workbook with headers
        const headers = [['First Name', 'Mobile Number', 'Created At']];
        worksheet = XLSX.utils.aoa_to_sheet(headers);
        workbook = XLSX.utils.book_new();
        workbook.SheetNames.push(this.sheetName);
        workbook.Sheets[this.sheetName] = worksheet;
      }

      // Get existing data
      const existingData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

      // Add new row
      const createdAt = data.createdAt || new Date().toISOString();
      const newRow = [data.firstName, data.mobileNumber, createdAt];
      existingData.push(newRow);

      // Update worksheet with all data
      worksheet = XLSX.utils.aoa_to_sheet(existingData);
      workbook.Sheets[this.sheetName] = worksheet;

      // Write to file
      XLSX.writeFile(workbook, this.filePath);
      logger.info(`✅ Profile data saved successfully to Excel: ${this.filePath}`);
      logger.info(`Data: First Name="${data.firstName}", Mobile="${data.mobileNumber}"`);
    } catch (error) {
      logger.error(`❌ Error writing to Excel file: ${error}`);
      throw new Error(`Failed to write Excel data: ${error}`);
    }
  }

  /**
   * Read all profile data from Excel file
   */
  async readProfileData(): Promise<ProfileTestData[]> {
    try {
      if (!fs.existsSync(this.filePath)) {
        logger.warn(`Excel file not found: ${this.filePath}`);
        return [];
      }

      const workbook = XLSX.readFile(this.filePath);
      if (!workbook.SheetNames.includes(this.sheetName)) {
        logger.warn(`Sheet "${this.sheetName}" not found in workbook`);
        return [];
      }

      const worksheet = workbook.Sheets[this.sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as ProfileTestData[];
      logger.info(`Read ${data.length} profile records from Excel`);
      return data;
    } catch (error) {
      logger.error(`Error reading Excel file: ${error}`);
      throw new Error(`Failed to read Excel data: ${error}`);
    }
  }

  /**
   * Clear all data from the sheet (keeping headers)
   */
  async clearProfileData(): Promise<void> {
    try {
      const headers = [['First Name', 'Mobile Number', 'Created At']];
      const worksheet = XLSX.utils.aoa_to_sheet(headers);
      const workbook = XLSX.utils.book_new();
      workbook.SheetNames.push(this.sheetName);
      workbook.Sheets[this.sheetName] = worksheet;

      XLSX.writeFile(workbook, this.filePath);
      logger.info(`Cleared all profile data from Excel: ${this.filePath}`);
    } catch (error) {
      logger.error(`Error clearing Excel data: ${error}`);
      throw new Error(`Failed to clear Excel data: ${error}`);
    }
  }

  /**
   * Get the count of profile records
   */
  async getProfileCount(): Promise<number> {
    const data = await this.readProfileData();
    return data.length;
  }
}
