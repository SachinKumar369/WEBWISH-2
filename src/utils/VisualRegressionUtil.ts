import { Page } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import fs from 'fs';
import path from 'path';
import logger from '../core/Logger';
import { PNG } from 'pngjs';

export class VisualRegressionUtil {
  private baselineDir: string;
  private diffDir: string;
  private screenshotsDir: string;

  constructor() {
    this.baselineDir = path.join(process.cwd(), 'test-data', 'baselines');
    this.diffDir = path.join(process.cwd(), 'test-results', 'visual-diffs');
    this.screenshotsDir = path.join(process.cwd(), 'screenshots');

    // Create directories if they don't exist
    [this.baselineDir, this.diffDir, this.screenshotsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Take a screenshot for visual regression testing
   */
  async takeVisualScreenshot(page: Page, testName: string, fullPage: boolean = false): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${testName}_${timestamp}.png`;
      const filepath = path.join(this.screenshotsDir, filename);

      logger.info(`Taking visual screenshot: ${testName}`);
      await page.screenshot({ path: filepath, fullPage });

      logger.info(`Visual screenshot saved: ${filepath}`);
      return filepath;
    } catch (error) {
      logger.error(`Failed to take visual screenshot: ${error}`);
      throw error;
    }
  }

  /**
   * Create or update baseline screenshot
   */
  async createBaseline(page: Page, testName: string, fullPage: boolean = false): Promise<string> {
    try {
      logger.info(`Creating baseline for: ${testName}`);

      const baselineFile = path.join(this.baselineDir, `${testName}.png`);

      await page.screenshot({ path: baselineFile, fullPage });

      logger.info(`Baseline created: ${baselineFile}`);
      return baselineFile;
    } catch (error) {
      logger.error(`Failed to create baseline: ${error}`);
      throw error;
    }
  }

  /**
   * Compare current screenshot with baseline
   */
  async compareWithBaseline(
    page: Page,
    testName: string,
    fullPage: boolean = false,
    threshold: number = 0.1
  ): Promise<{ match: boolean; pixelsDifferent: number; diffPercentage: number }> {
    try {
      logger.info(`Comparing screenshot for: ${testName}`);

      const baselineFile = path.join(this.baselineDir, `${testName}.png`);

      // Check if baseline exists
      if (!fs.existsSync(baselineFile)) {
        logger.warn(`Baseline not found for ${testName}. Creating new baseline.`);
        await this.createBaseline(page, testName, fullPage);
        return { match: true, pixelsDifferent: 0, diffPercentage: 0 };
      }

      // Take current screenshot
      const currentFile = path.join(this.screenshotsDir, `${testName}_current.png`);
      await page.screenshot({ path: currentFile, fullPage });

      // Read baseline and current screenshots
      const baselineBuffer = fs.readFileSync(baselineFile);
      const currentBuffer = fs.readFileSync(currentFile);

      const baseline = PNG.sync.read(baselineBuffer);
      const current = PNG.sync.read(currentBuffer);

      // Check dimensions match
      if (baseline.width !== current.width || baseline.height !== current.height) {
        logger.warn(`Screenshot dimensions differ. Baseline: ${baseline.width}x${baseline.height}, Current: ${current.width}x${current.height}`);
        return { match: false, pixelsDifferent: baseline.width * baseline.height, diffPercentage: 100 };
      }

      // Compare pixels
      const diff = new PNG({ width: baseline.width, height: baseline.height });
      const pixelsDifferent = pixelmatch(
        baseline.data,
        current.data,
        diff.data,
        baseline.width,
        baseline.height,
        { threshold }
      );

      // Calculate diff percentage
      const totalPixels = baseline.width * baseline.height;
      const diffPercentage = (pixelsDifferent / totalPixels) * 100;

      // Save diff image
      const diffFile = path.join(this.diffDir, `${testName}_diff.png`);
      fs.writeFileSync(diffFile, PNG.sync.write(diff));

      const match = pixelsDifferent === 0;
      const matchStatus = match ? 'MATCH' : 'MISMATCH';

      logger.info(`Visual comparison result: ${matchStatus} - Pixels different: ${pixelsDifferent} (${diffPercentage.toFixed(2)}%)`);

      // Clean up current file
      fs.unlinkSync(currentFile);

      return { match, pixelsDifferent, diffPercentage };
    } catch (error) {
      logger.error(`Failed to compare with baseline: ${error}`);
      throw error;
    }
  }

  /**
   * Update baseline with current screenshot
   */
  async updateBaseline(page: Page, testName: string, fullPage: boolean = false): Promise<void> {
    try {
      logger.info(`Updating baseline for: ${testName}`);
      await this.createBaseline(page, testName, fullPage);
      logger.info(`Baseline updated: ${testName}`);
    } catch (error) {
      logger.error(`Failed to update baseline: ${error}`);
      throw error;
    }
  }

  /**
   * Delete baseline
   */
  deleteBaseline(testName: string): void {
    try {
      const baselineFile = path.join(this.baselineDir, `${testName}.png`);
      if (fs.existsSync(baselineFile)) {
        fs.unlinkSync(baselineFile);
        logger.info(`Baseline deleted: ${testName}`);
      }
    } catch (error) {
      logger.error(`Failed to delete baseline: ${error}`);
    }
  }

  /**
   * Get all baselines
   */
  getAllBaselines(): string[] {
    try {
      if (!fs.existsSync(this.baselineDir)) {
        return [];
      }

      const files = fs.readdirSync(this.baselineDir).filter(f => f.endsWith('.png'));
      logger.debug(`Found ${files.length} baselines`);
      return files;
    } catch (error) {
      logger.error(`Failed to get baselines: ${error}`);
      return [];
    }
  }
}

export const visualRegressionUtil = new VisualRegressionUtil();

