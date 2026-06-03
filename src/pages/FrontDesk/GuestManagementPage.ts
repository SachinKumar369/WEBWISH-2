import { Page, BrowserContext, expect } from '@playwright/test';
import logger from '../../core/Logger';

export class GuestManagementPage {
  page: Page;
  context: BrowserContext;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
  }

  // Locators for search and navigation (as getters to avoid initialization issues)
  private get searchInput() {
    return this.page.getByRole('textbox', { name: 'Search...' });
  }

  private get guestManagementHeading() {
    return this.page.locator('h3');
  }

  private get pageHeader() {
    return this.page.locator('page-header');
  }

  private get newReservationButton() {
    return this.page.getByRole('button', { name: /New Reservation/ });
  }

  private get nextButton() {
    return this.page.getByRole('button', { name: 'Next' });
  }

  private get roomTable() {
    return this.page.locator('tbody');
  }

   get searchResults() {
    return this.page.locator('//li[@tabindex="0"]');
  }


  /**
   * Search and navigate to Guest Management module
   */
  async searchAndOpenGuestManagement(): Promise<void> {
    try {
      logger.info('Searching for Guest Management module');

      await this.searchInput.click();
      await this.searchInput.fill('guest management');
      await this.page.getByText('Guest Management').click();

      await expect(this.guestManagementHeading).toContainText('Guest Management');
      logger.info('✅ Guest Management module opened successfully');
    } catch (error) {
      logger.error(`Failed to open Guest Management: ${error}`);
      throw error;
    }
  }






   async searchGuestManagement(searchText: string) {
    logger.info(`Searching for: ${searchText}`);
    await this.searchInput.fill('');
    await this.searchInput.type(searchText);
    await this.page.waitForTimeout(1000); // small wait for dropdown to populate
          await this.page.getByText('Guest Management').click();


    // // Find the first matching result that contains 'Booking' and click it
    // const count = await this.searchResults.count();
    // logger.info(`Found ${count} search result items`);

    // for (let i = 0; i < count; i++) {
    //   const item = this.searchResults.nth(i);
    //   const text = (await item.innerText()).trim().toLowerCase();
    //   logger.debug(`Search result [${i}]: ${text}`);
    //   if (text.includes('Guest') && text.includes('Management')) {
    //     logger.info(`Clicking search result at index ${i} -> ${text}`);
    //     await item.click();
    //     return true;
    //   }
    // }

    logger.warn('Booking Calendar not found in search results');
    return false;
  }













  /**
   * Create new reservation
   */
  async createNewReservation(): Promise<void> {
    try {
      logger.info('Creating new reservation');

      await this.newReservationButton.click();
      await this.nextButton.click();




    

      //await expect(this.roomTable).toContainText('141 Rooms');
      logger.info('✅ New Reservation flow started, room selection page loaded');
    } catch (error) {
      logger.error(`Failed to create new reservation: ${error}`);
      throw error;
    }
  }

  /**
   * Select a room for reservation
   * @param roomName - Name of the room to select (e.g., 'Delux Room')
   */
  async selectRoom(roomName: string = 'Delux Room'): Promise<void> {
    try {
      logger.info(`Selecting room: ${roomName}`);

      const roomRow = this.page.getByRole('row', { name: new RegExp(roomName) });
      await roomRow.getByRole('button').first().click();
      await this.nextButton.click();

      logger.info(`✅ Room ${roomName} selected successfully`);
    } catch (error) {
      logger.error(`Failed to select room: ${error}`);
      throw error;
    }
  }

  /**
   * Enter guest last name
   * @param lastName - Last name of the guest
   */
  async enterLastName(lastName: string): Promise<void> {
    try {
      logger.info(`Entering last name: ${lastName}`);

      const lastNameInput = this.page.locator('div').filter({ hasText: /^Last Name\*$/ }).getByRole('textbox');
      await lastNameInput.click();
      await lastNameInput.fill(lastName);
      await lastNameInput.press('Tab');

      logger.info('✅ Last name entered successfully');
    } catch (error) {
      logger.error(`Failed to enter last name: ${error}`);
      throw error;
    }
  }

  /**
   * Close any open dialogs/modals
   */
  async closeDialog(): Promise<void> {
    try {
      logger.info('Closing dialog');

      const closeButton = this.page.getByRole('button', { name: 'Close' });
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click();
        logger.info('✅ Dialog closed');
      }
    } catch (error) {
      logger.debug(`No dialog to close: ${error}`);
    }
  }

  /**
   * Enter guest first name
   * @param firstName - First name of the guest
   */
  async enterFirstName(firstName: string): Promise<void> {
    try {
      logger.info(`Entering first name: ${firstName}`);

      const firstNameInput = this.page.locator('div').filter({ hasText: /^First Name$/ }).getByRole('textbox');
      await firstNameInput.click();
      await firstNameInput.fill(firstName);

      logger.info('✅ First name entered successfully');
    } catch (error) {
      logger.error(`Failed to enter first name: ${error}`);
      throw error;
    }
  }

  /**
   * Select guest type
   * @param guestType - Type of guest (e.g., 'Guets', 'VIP')
   */
  async selectGuestType(guestType: string = 'Guets'): Promise<void> {
    try {
      logger.info(`Selecting guest type: ${guestType}`);

      const guestTypeDropdown = this.page.locator('ng-select').filter({ hasText: '--select--× Normal' });
      await guestTypeDropdown.locator('span').nth(3).click();
      await this.page.getByRole('option', { name: guestType }).locator('div').click();

      logger.info(`✅ Guest type ${guestType} selected successfully`);
    } catch (error) {
      logger.error(`Failed to select guest type: ${error}`);
      throw error;
    }
  }

  /**
   * Select package type
   * @param packageType - Package type (e.g., 'Packages')
   */
  async selectPackageType(packageType: string = 'Packages'): Promise<void> {
    try {
      logger.info(`Selecting package type: ${packageType}`);

      const packageDropdown = this.page.locator('ng-select').filter({ hasText: '--select--× Others' });
      await packageDropdown.locator('span').nth(3).click();
      await this.page.getByText(packageType, { exact: true }).click();

      logger.info(`✅ Package type ${packageType} selected successfully`);
    } catch (error) {
      logger.error(`Failed to select package type: ${error}`);
      throw error;
    }
  }

  /**
   * Select business source
   * @param source - Business source (e.g., 'Direct Booking')
   */
  async selectBusinessSource(source: string = 'Direct Booking'): Promise<void> {
    try {
      logger.info(`Selecting business source: ${source}`);

      const businessSourceDropdown = this.page.locator('div').filter({ hasText: /^Business Source\*--select--$/ });
      await businessSourceDropdown.locator('span').nth(1).click();
      await this.page.getByText(source).click();

      logger.info(`✅ Business source ${source} selected successfully`);
    } catch (error) {
      logger.error(`Failed to select business source: ${error}`);
      throw error;
    }
  }

  /**
   * Confirm and continue to next step
   */
  async confirmAndContinue(): Promise<void> {
    try {
      logger.info('Confirming and continuing');

      const confirmButton = this.page.getByRole('button', { name: 'Confirm & Continue' });
      await confirmButton.click();

      logger.info('✅ Confirmed and continuing');
    } catch (error) {
      logger.error(`Failed to confirm and continue: ${error}`);
      throw error;
    }
  }

  /**
   * Handle confirmation letter prompt
   * @param sendConfirmation - Whether to send confirmation letter
   */
  async handleConfirmationLetterPrompt(sendConfirmation: boolean = true): Promise<void> {
    try {
      logger.info(`Handling confirmation letter prompt - Send: ${sendConfirmation}`);

      const confirmationText = this.page.getByRole('paragraph');
      await expect(confirmationText).toContainText('Do you want to send the confirmation letter on save?');

      const yesButton = this.page.getByRole('button', { name: 'Yes' });
      const noButton = this.page.getByRole('button', { name: 'No' });

      if (sendConfirmation) {
        await yesButton.click();
      } else {
        await noButton.click();
      }

      const okButton = this.page.getByRole('button', { name: 'OK' });
      await okButton.click();

      logger.info('✅ Confirmation letter prompt handled');
    } catch (error) {
      logger.error(`Failed to handle confirmation letter prompt: ${error}`);
      throw error;
    }
  }

  /**
   * Enter email address
   * @param email - Email address to enter
   */
  async enterEmail(email: string): Promise<void> {
    try {
      logger.info(`Entering email: ${email}`);

      const emailInput = this.page.getByRole('textbox', { name: 'example@gmail.com' });
      await emailInput.click();
      await emailInput.fill(email);

      logger.info('✅ Email entered successfully');
    } catch (error) {
      logger.error(`Failed to enter email: ${error}`);
      throw error;
    }
  }

  /**
   * Complete reservation with confirmation
   */
  async completeReservation(): Promise<void> {
    try {
      logger.info('Completing reservation');

      await this.confirmAndContinue();

      const yesButton = this.page.getByRole('button', { name: 'Yes' });
      await yesButton.click();

      const alertMessage = this.page.getByRole('alert');
      await expect(alertMessage).toContainText('Congratulations, your reservation for');

      logger.info('✅ Reservation completed successfully');
    } catch (error) {
      logger.error(`Failed to complete reservation: ${error}`);
      throw error;
    }
  }

  /**
   * Full flow: Create new guest reservation from start to finish
   * @param guestData - Guest information (lastName, firstName, email, etc.)
   */
  async createFullGuestReservation(guestData: {
    lastName: string;
    firstName: string;
    guestType?: string;
    packageType?: string;
    businessSource?: string;
    email: string;
  }): Promise<void> {
    try {
      logger.info('🔄 Starting full guest reservation flow');

      // Search and open Guest Management
      await this.searchGuestManagement('Guest Management');

      // Create new reservation
      await this.createNewReservation();

      // Select room
      await this.selectRoom('Delux Room');

      // Enter guest details
      await this.enterLastName(guestData.lastName);
      await this.closeDialog();
      await this.enterFirstName(guestData.firstName);

      // Select options
      await this.selectGuestType(guestData.guestType || 'Guets');
      await this.selectPackageType(guestData.packageType || 'Packages');
      await this.selectBusinessSource(guestData.businessSource || 'Direct Booking');

      // Confirm and continue
      await this.handleConfirmationLetterPrompt(true);

      // Enter email
      await this.enterEmail(guestData.email);

      // Complete reservation
      await this.completeReservation();

      logger.info('✅ Full guest reservation flow completed successfully');
    } catch (error) {
      logger.error(`Failed during full guest reservation flow: ${error}`);
      throw error;
    }
  }
}

