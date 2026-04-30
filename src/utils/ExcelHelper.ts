import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import logger from '../core/Logger';

export class ExcelHelper {
  private filePath: string;

  constructor(fileName: string = 'properties.xlsx') {
    this.filePath = path.join(process.cwd(), 'test-data', fileName);
  }

  /**
   * Save properties to Excel file
   */
  async savePropertiesToExcel(properties: Array<{ code: string; name: string; url?: string }>): Promise<void> {
    try {
      logger.info(`Saving ${properties.length} properties to Excel file: ${this.filePath}`);

      const ws = XLSX.utils.json_to_sheet(properties);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Properties');

      // Set column widths
      ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 50 }];

      XLSX.writeFile(wb, this.filePath);
      logger.info(`✅ Successfully saved properties to ${this.filePath}`);
    } catch (error) {
      logger.error(`Failed to save properties to Excel: ${error}`);
      throw error;
    }
  }

  /**
   * Read properties from Excel file
   */
  async readPropertiesFromExcel(): Promise<Array<{ code: string; name: string; url?: string }>> {
    try {
      if (!fs.existsSync(this.filePath)) {
        logger.warn(`Excel file not found: ${this.filePath}`);
        return [];
      }

      const workbook = XLSX.readFile(this.filePath);
      const worksheet = workbook.Sheets['Properties'];

      if (!worksheet) {
        logger.warn('Properties sheet not found in Excel file');
        return [];
      }

      const properties = XLSX.utils.sheet_to_json(worksheet);
      logger.info(`✅ Read ${properties.length} properties from Excel`);
      return properties as Array<{ code: string; name: string; url?: string }>;
    } catch (error) {
      logger.error(`Failed to read properties from Excel: ${error}`);
      throw error;
    }
  }

  /**
   * Get property by code
   */
  async getPropertyByCode(code: string): Promise<{ code: string; name: string; url?: string } | null> {
    try {
      const properties = await this.readPropertiesFromExcel();
      const property = properties.find(p => p.code.toLowerCase() === code.toLowerCase());

      if (property) {
        logger.info(`Found property: ${property.code} - ${property.name}`);
      } else {
        logger.warn(`Property not found: ${code}`);
      }

      return property || null;
    } catch (error) {
      logger.error(`Failed to get property by code: ${error}`);
      return null;
    }
  }

  /**
   * Get all properties
   */
  async getAllProperties(): Promise<Array<{ code: string; name: string; url?: string }>> {
    return this.readPropertiesFromExcel();
  }
}

