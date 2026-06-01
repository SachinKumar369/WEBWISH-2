import { Page, BrowserContext, expect } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';
import { ElementActions } from '../../../utils/ElementActions';
import { WaitUtils } from '../../../utils/WaitUtils';
import logger from '../../../core/Logger';

export class TemporaryOutOfOrderPage extends BasePage {
  private elementActions: ElementActions;
  private waitUtils: WaitUtils;

  // Locators for HouseKeeping Operations
  private readonly SEARCH_BOX = 'input[placeholder*="Search"]';
  private readonly HOUSEKEEPING_OPERATIONS_LINK = 'text=HouseKeeping Operations';
  private readonly PAGE_TOPBAR = '#page-topbar';
  private readonly HK = this.page.locator('#page-topbar').getByText('HouseKeeping Operations');
  
  // Locators for Room Selection and Actions
  private readonly SELECT_ALL_BUTTON = 'button:has-text("Select All")';
  private readonly SET_TEMPORARY_OUT_OF_ORDER_BUTTON = 'button:has-text("Set Temporary Out of Order")';
  private readonly RELEASE_SELECTED_ROOMS_BUTTON = 'button:has-text("Release Selected Rooms")';
  private readonly SAVE_SELECTED_ROOMS_BUTTON = 'button:has-text("Save Selected Rooms")';
  
  // Locators for Time and Notes Input
  private readonly TIME_INPUT_FIELDS = '[role="textbox"]';
  private readonly APPLY_BUTTON = 'button:has-text("Apply")';
  
  // Locators for Status and Verification
  private readonly HK_STATUS_HEADER = '[role="row"]:has-text("HK Status Room #")';
  private readonly STATUS_CHECKBOX = 'input[type="checkbox"]';
  private readonly SUCCESS_MESSAGE = '#swal2-html-container';
  private readonly OK_BUTTON = 'button:has-text("OK")';
  private readonly TEMPORARY_OOO_TAG = 'text=T-OOO';
  
  // Locators for Room Cards
  private readonly ROOM_TOP_ROW = '.room-top-row';
  private readonly ROOM_CARD = '.roomNo-card';
  
  // Locators for Navigation
  private readonly REPORT_LINK = 'a:has-text("Report")';
  private readonly HOUSEKEEPING_REPORTS_LINK = 'a:has-text("Housekeeping Reports")';
  private readonly OUT_OF_ORDER_LINK = 'a:has-text("Out of Order")';
  private readonly TEMPORARY_OUT_OF_ORDER_LINK = 'a:has-text("Temporary Out of Order")';
  private readonly LIST_INLINE_ITEM_BUTTON = '.list-inline-item > .btn';
  

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
    this.waitUtils = new WaitUtils(page);
  }

  /**
   * Search for HouseKeeping Operations
   */
  async searchForHouseKeepingOperations(searchTerm: string = 'house'): Promise<void> {
    try {
      logger.info(`Searching for: ${searchTerm}`);
      const searchBox = this.page.locator(this.SEARCH_BOX).first();
      await this.elementActions.click(searchBox, 'HouseKeeping search box');
      await this.elementActions.sendKeys(searchBox, searchTerm, 'HouseKeeping search text');
      await this.elementActions.click(this.HK, 'HouseKeeping Operations link');
      logger.info('HouseKeeping Operations selected');
    } catch (error) {
      logger.error(`Failed to search for HouseKeeping Operations: ${error}`);
      throw error;
    }
  }

  /**
   * Select all rooms
   */
  async selectAllRooms(): Promise<void> {
    try {
      logger.info('Selecting all rooms');
      await this.elementActions.click(
        this.page.locator(this.SELECT_ALL_BUTTON),
        'Select All rooms button'
      );
      await this.page.waitForTimeout(500);
      logger.info('All rooms selected');
    } catch (error) {
      logger.error(`Failed to select all rooms: ${error}`);
      throw error;
    }
  }

  /**
 * Select first N available rooms from table
 */
async selectFirstNRooms(count: number = 5): Promise<void> {
  try {
    logger.info(`Selecting first ${count} available rooms`);

    const roomRows = this.page.locator('#tblRooms_data tbody tr');

    const totalRows = await roomRows.count();
    logger.info(`Total rows found: ${totalRows}`);

    for (let i = 0; i < Math.min(count, totalRows); i++) {

      const checkbox = roomRows
        .nth(i)
        .locator('input[type="checkbox"]')
        .first();

      await checkbox.scrollIntoViewIfNeeded();

      await this.elementActions.click(
        checkbox,
        `Room checkbox at row ${i + 1}`
      );

      const roomNumber = await roomRows
        .nth(i)
        .locator('td')
        .nth(2)
        .textContent();

      logger.info(`Selected Room: ${roomNumber?.trim()}`);

      await this.page.waitForTimeout(300);
    }

    logger.info(`Successfully selected first ${count} rooms`);

  } catch (error) {
    logger.error(`Failed to select first ${count} rooms: ${error}`);
    throw error;
  }
}
  /**
   * Set Temporary Out of Order with time and notes
   */
  async setTemporaryOutOfOrder(time: string = '23:11', notes: string = 'automation'): Promise<void> {
    try {
      logger.info(`Setting Temporary Out of Order with time: ${time}, notes: ${notes}`);
      await this.elementActions.click(this.page.getByRole('button', { name: 'Set Temporary Out of Order' }), 'Set Temporary Out of Order button');
      
      // Fill time field (2nd textbox)
      const timeInput = this.page.getByRole('textbox').nth(1);
      await this.elementActions.click(timeInput, 'Temporary Out of Order time field');
      await this.elementActions.sendKeys(timeInput, time, 'Temporary Out of Order time value');
      
      // Fill notes field (3rd textbox)
      const notesInput = this.page.getByRole('textbox').nth(2);
      await this.elementActions.click(notesInput, 'Temporary Out of Order notes field');
      await this.elementActions.sendKeys(notesInput, notes, 'Temporary Out of Order notes value');
      
      logger.info('Time and notes filled');
    } catch (error) {
      logger.error(`Failed to set Temporary Out of Order: ${error}`);
      throw error;
    }
  }

  /**
   * Apply the temporary out of order settings
   */
  async applySettings(): Promise<void> {
    try {
      logger.info('Applying settings');
      await this.elementActions.click(this.page.getByRole('button', { name: 'Apply' }), 'Apply settings button');
      await this.page.waitForTimeout(500);
      logger.info('Settings applied');
    } catch (error) {
      logger.error(`Failed to apply settings: ${error}`);
      throw error;
    }
  }

  /**
   * Get the HK Status checkbox and check it
   */
  // async checkHKStatusCheckbox(): Promise<void> {
  //   try {
  //     logger.info('Checking HK Status checkbox');
  //     const checkbox = this.page.getByRole('row', { name: 'HK Status Room #' }).getByLabel('', { exact: true });
  //     await this.elementActions.click(checkbox, 'HK Status checkbox');
  //     logger.info('HK Status checkbox checked');
  //   } catch (error) {
  //     logger.error(`Failed to check HK Status checkbox: ${error}`);
  //     throw error;
  //   }
  // }



  async checkHKStatusCheckbox(): Promise<void> {

  try {

    logger.info('Checking first 5 HK Status checkboxes');

    const checkboxes = this.page.locator(
      '#tblRooms_data tbody input[type="checkbox"]'
    );

    const totalCheckboxes = await checkboxes.count();

    logger.info(`Total checkboxes found: ${totalCheckboxes}`);

    const limit = Math.min(1, totalCheckboxes);

    for (let i = 0; i < limit; i++) {

      const checkbox = checkboxes.nth(i);

      await checkbox.scrollIntoViewIfNeeded();

      const isChecked = await checkbox.isChecked();

      if (!isChecked) {

        await this.elementActions.click(
          checkbox,
          `HK Status checkbox ${i + 1}`
        );

        logger.info(`Clicked checkbox ${i + 1}`);
      }
      else {

        logger.info(`Checkbox ${i + 1} already checked`);
      }

      await this.page.waitForTimeout(300);
    }

    logger.info('Successfully checked first 5 checkboxes');

  } catch (error) {

    logger.error(`Failed to check first 5 checkboxes: ${error}`);
    throw error;
  }
}

  /**
   * Save selected rooms
   */
  async saveSelectedRooms(): Promise<void> {
    try {
      logger.info('Saving selected rooms');
      
      // Find modal/dialog and scope the save button to it
      const dialog = this.page.locator('[role="dialog"], .modal, ngb-modal-window').first();
      
      // Use role-based button selector scoped to the dialog for more reliable detection
      const saveButton = dialog.getByRole('button', { name: /Save Selected Rooms/i }).first();
      
      // Wait for it to be visible
      await saveButton.waitFor({ state: 'visible', timeout: 10000 });
      
      // Click it
      await this.elementActions.click(saveButton, 'Save Selected Rooms button');
      await this.page.waitForTimeout(1000);
      logger.info('Rooms saved');
    } catch (error) {
      logger.error(`Failed to save selected rooms: ${error}`);
      throw error;
    }
  }

  /**
   * Verify success message and close OK dialog
   */
  async verifySuccessAndCloseDialog(): Promise<void> {
    try {
      logger.info('Verifying success message');
      const successMessage = this.page.locator(this.SUCCESS_MESSAGE);
      await expect(successMessage).toContainText('Details created/updated successfully.');
      await this.elementActions.click(this.page.locator(this.OK_BUTTON), 'Success dialog OK button');
      logger.info('Success verified and dialog closed');
    } catch (error) {
      logger.error(`Failed to verify success: ${error}`);
      throw error;
    }
  }

  /**
   * Click on T-OOO tag
   */
  async clickTemporaryOOOTag(): Promise<void> {
    try {
      logger.info('Clicking on T-OOO tag');
      await this.elementActions.click(this.page.getByText('T-OOO'), 'T-OOO tag');
      await this.page.waitForTimeout(500);
      logger.info('T-OOO tag clicked');
    } catch (error) {
      logger.error(`Failed to click T-OOO tag: ${error}`);
      throw error;
    }
  }

  /**
   * Select specific rooms by clicking on room cards
   */
  async selectSpecificRooms(roomIndices: number[]): Promise<void> {
    try {
      logger.info(`Selecting rooms at indices: ${roomIndices.join(', ')}`);
      const roomCards = this.page.locator(`${this.ROOM_CARD} > ${this.ROOM_TOP_ROW}`);
      
      for (const index of roomIndices) {
        await this.elementActions.click(roomCards.nth(index), `Room card at index ${index}`);
        await this.page.waitForTimeout(300);
      }
      logger.info('Rooms selected');
    } catch (error) {
      logger.error(`Failed to select rooms: ${error}`);
      throw error;
    }
  }

  /**
   * Release selected rooms from Temporary Out of Order
   */
  async releaseSelectedRooms(): Promise<void> {
    try {
      logger.info('Releasing selected rooms');
      await this.checkHKStatusCheckbox();
      await this.elementActions.click(this.page.getByRole('button', { name: 'Release Selected Rooms' }), 'Release Selected Rooms button');
      await this.page.waitForTimeout(1000);
      logger.info('Rooms released');
    } catch (error) {
      logger.error(`Failed to release selected rooms: ${error}`);
      throw error;
    }
  }

  /**
   * Navigate to Temporary Out of Order report
   */
  async navigateToTemporaryOutOfOrderReport(): Promise<void> {
    try {
      logger.info('Navigating to Temporary Out of Order Report');
      await this.elementActions.click(this.page.getByRole('button').nth(1), 'Navigation menu button');
      await this.elementActions.click(this.page.getByRole('link', { name: ' Report' }), 'Report menu link');
      await this.elementActions.click(this.page.getByRole('link', { name: ' Housekeeping Reports ' }), 'Housekeeping Reports link');
      await this.elementActions.click(this.page.getByRole('link', { name: ' Out of Order ' }), 'Out of Order link');
      await this.elementActions.click(this.page.getByRole('link', { name: ' Temporary Out of Order' }), 'Temporary Out of Order link');
      await this.page.waitForTimeout(1000);
      logger.info('Temporary Out of Order Report page loaded');
    } catch (error) {
      logger.error(`Failed to navigate to report: ${error}`);
      throw error;
    }
  }

  /**
   * Click on first list item button (opens popup)
   */
  async clickFirstListItemButton(): Promise<void> {
    try {
      logger.info('Clicking on first list item button');
      await this.elementActions.click(this.page.locator(this.LIST_INLINE_ITEM_BUTTON).first(), 'First report row action button');
      await this.page.waitForTimeout(500);
      logger.info('First list item clicked');
    } catch (error) {
      logger.error(`Failed to click list item: ${error}`);
      throw error;
    }
  }

  /**
   * Wait for popup to open and return the popup page
   */
  async waitForPopupAndGetPage(): Promise<Page> {
    try {
      logger.info('Waiting for popup window');
      const popupPage = await this.context.waitForEvent('page');
      await this.page.waitForTimeout(1000);
      logger.info('Popup window opened');
      return popupPage;
    } catch (error) {
      logger.error(`Failed to wait for popup: ${error}`);
      throw error;
    }
  }

  /**
   * Wait for the Temporary Out of Order report list to appear.
   */
  async waitForReportToLoad(): Promise<void> {
    try {
      logger.info('Waiting for Temporary Out of Order report to load');
      await expect(this.page.locator(this.LIST_INLINE_ITEM_BUTTON).first()).toBeVisible();
      logger.info('Temporary Out of Order report is visible');
    } catch (error) {
      logger.error(`Failed to verify report load: ${error}`);
      throw error;
    }
  }

  /**
   * Open the first report row in a popup window.
   */
  async openFirstReportPopup(timeoutMs: number = 30000): Promise<Page> {
    try {
      logger.info('Opening first report popup');
      const popupPromise = this.context.waitForEvent('page', { timeout: timeoutMs });
      await this.clickFirstListItemButton();
      const popupPage = await popupPromise;
      await popupPage.waitForLoadState('domcontentloaded');
      logger.info('First report popup opened');
      return popupPage;
    } catch (error) {
      logger.error(`Failed to open report popup: ${error}`);
      throw error;
    }
  }
}
