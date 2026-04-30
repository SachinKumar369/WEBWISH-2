import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import logger from '../core/Logger';

export class ExcelPropertyManager {
  private filePath: string;

  constructor(fileName: string = 'properties.xlsx') {
    this.filePath = path.join(process.cwd(), 'test-data', fileName);
  }

  /**
   * Save properties to Excel file
   */
  async savePropertiesToExcel(properties: Array<{ code: string; name: string }>): Promise<void> {
    try {
      logger.info(`💾 Saving ${properties.length} properties to Excel file...`);

      const ws = XLSX.utils.json_to_sheet(properties);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Properties');

      // Set column widths
      ws['!cols'] = [{ wch: 15 }, { wch: 40 }];

      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      XLSX.writeFile(wb, this.filePath);
      logger.info(`✅ Successfully saved ${properties.length} properties to: ${this.filePath}`);
    } catch (error) {
      logger.error(`Failed to save properties to Excel: ${error}`);
      throw error;
    }
  }

  /**
   * Read properties from Excel file
   */
  async readPropertiesFromExcel(): Promise<Array<{ code: string; name: string }>> {
    try {
      if (!fs.existsSync(this.filePath)) {
        logger.warn(`📁 Excel file not found: ${this.filePath}`);
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
      return properties as Array<{ code: string; name: string }>;
    } catch (error) {
      logger.error(`Failed to read properties from Excel: ${error}`);
      throw error;
    }
  }

  /**
   * Get property by index
   */
  async getPropertyByIndex(index: number): Promise<{ code: string; name: string } | null> {
    try {
      const properties = await this.readPropertiesFromExcel();

      if (index < 0 || index >= properties.length) {
        logger.warn(`❌ Invalid index: ${index}. Total properties: ${properties.length}`);
        return null;
      }

      const property = properties[index];
      logger.info(`✅ Found property at index ${index}: ${property.code} - ${property.name}`);
      return property;
    } catch (error) {
      logger.error(`Failed to get property by index: ${error}`);
      return null;
    }
  }

  /**
   * Get property by code (initials/code)
   */
  async getPropertyByCode(code: string): Promise<{ code: string; name: string } | null> {
    try {
      const properties = await this.readPropertiesFromExcel();
      const property = properties.find(p => p.code.toUpperCase() === code.toUpperCase());

      if (property) {
        logger.info(`✅ Found property: ${property.code} - ${property.name}`);
        return property;
      } else {
        logger.warn(`❌ Property not found: ${code}`);
        return null;
      }
    } catch (error) {
      logger.error(`Failed to get property by code: ${error}`);
      return null;
    }
  }

  /**
   * Get all properties
   */
  async getAllProperties(): Promise<Array<{ code: string; name: string }>> {
    return this.readPropertiesFromExcel();
  }

  /**
   * List all properties with their index
   */
  async listAllProperties(): Promise<void> {
    try {
      const properties = await this.readPropertiesFromExcel();

      if (properties.length === 0) {
        logger.info('📭 No properties found in Excel');
        return;
      }

      logger.info('📋 Available Properties:');
      logger.info('─'.repeat(50));
      properties.forEach((prop, index) => {
        logger.info(`[${index}] ${prop.code} - ${prop.name}`);
      });
      logger.info('─'.repeat(50));
    } catch (error) {
      logger.error(`Failed to list properties: ${error}`);
    }
  }
}

