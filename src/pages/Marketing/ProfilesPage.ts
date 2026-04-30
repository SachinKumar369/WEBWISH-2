import { Page, BrowserContext, Locator } from '@playwright/test';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';
import { ExcelDataWriter } from '../../utils/ExcelDataWriter';

export interface ProfileData {
  lastName: string;
  firstName: string;
  title?: string; // e.g. 'AMB Ambassador'
  mobileNumber?: string;
}

export class ProfilesPage {
  page: Page;
  context: BrowserContext;
  private elementActions: ElementActions;
  private excelDataWriter: ExcelDataWriter;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
    this.elementActions = new ElementActions(page);
    this.excelDataWriter = new ExcelDataWriter('test-data/TestData.xlsx', 'Profiles');
  }

  // Global search input selector used across app


  getSearchResultByMobile(mobile: string): Locator {
  return this.page.locator(`//h6[normalize-space()='${mobile}']`);
}

  get globalSearchInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Search...' });
  }

  get pageHeader(): Locator {
    return this.page.locator('page-header');
  }

  get newProfileButton(): Locator {
    return this.page.getByRole('button', { name: '󰐕 New Profile' });
  }

  get saveButton(): Locator {
    return this.page.getByRole('button', { name: 'Save' });
  }

  get successParagraph(): Locator {
    return this.page.getByRole('paragraph');
  }

  get okButton(): Locator {
    return this.page.getByRole('button', { name: 'OK' });
  }

  // Search input used in the profile list (Text input with dropdown)
  get listSearchInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Text input with dropdown' });
  }

  get searchResultContainer(): Locator {
    return this.page.locator('app-search-result');
  }

  /**
   * Open Profiles from the global search box using framework helpers.
   */
  async filesFromGlobalSearch(): Promise<void> {
    logger.info('Opening Profiles from global search');

    // Use ElementActions to type into search
    await this.elementActions.click(this.globalSearchInput, 'Global search input');
    await this.elementActions.sendKeys(this.globalSearchInput, 'profiles', 'Global search input', true);

    // small wait for the dropdown / search results to render
    await this.page.waitForTimeout(500);

    // Try to click from the standard search result list (li[@tabindex='0']) using framework click
    try {
      const results = this.page.locator("//li[@tabindex='0']");
      const count = await results.count();
      logger.info(`Found ${count} global-search result items`);
      for (let i = 0; i < count; i++) {
        const item = results.nth(i);
        const text = (await item.innerText()).trim().toLowerCase();
        if (text.includes('profiles')) {
          logger.info(`Clicking search result item ${i} with text: ${text}`);
          await this.elementActions.click(item, `Global search result item ${i}`);
          await this.elementActions.waitForElement(this.pageHeader, 8000, 'Profiles page header');
          return;
        }
      }
    } catch (err) {
      logger.debug(`Error while attempting to click from search results: ${err}`);
    }

    // Fallback: click any visible element with text 'Profiles'
    try {
      logger.info('Fallback: clicking visible "Profiles" text');
      const txt = this.page.getByText('Profiles');
      await this.elementActions.click(txt.first(), 'Profiles fallback link');
      await this.elementActions.waitForElement(this.pageHeader, 8000, 'Profiles page header');
      return;
    } catch (err) {
      logger.error(`Failed to open Profiles via fallback click: ${err}`);
      throw err;
    }
  }

  async waitForProfilesPage(timeout = 15000): Promise<void> {
    await this.elementActions.waitForElement(this.pageHeader, timeout, 'Profiles page header');
  }

  /**
   * Create a profile using ElementActions (framework methods). Validates presence of success message.
   */
  async createProfile(data: ProfileData): Promise<void> {
    logger.info(`Creating profile: ${data.lastName} ${data.firstName}`);

    await this.elementActions.click(this.newProfileButton, 'New Profile button');

    // Fill Last Name
    const lastNameLocator = this.page.locator('div').filter({ hasText: /^Last Name\*$/ }).getByRole('textbox');
    await this.elementActions.click(lastNameLocator, 'Last Name input');
    await this.elementActions.sendKeys(lastNameLocator, data.lastName, 'Last Name input');

    // Fill First Name
    const firstNameLocator = this.page.locator('div').filter({ hasText: /^First Name\*$/ }).getByRole('textbox');
    await this.elementActions.click(firstNameLocator, 'First Name input');
    await this.elementActions.sendKeys(firstNameLocator, data.firstName, 'First Name input');

    // Select Title if provided - handle ng-select using keyboard interactions
    if (data.title) {
      const titleToggle = this.page.locator('div').filter({ hasText: /^Title\*--select--$/ }).getByRole('textbox');
      await this.elementActions.click(titleToggle, 'Title select toggle');

      // find matching ng-select and press keys until match appears (defensive)
      const ngSelect = this.page.locator('ng-select').filter({ hasText: `--select-- ${data.title}` });
      if (await ngSelect.count() > 0) {
        await this.elementActions.click(ngSelect.getByRole('textbox'), 'Matched ng-select textbox');
        await this.elementActions.pressKey('ArrowDown');
        await this.elementActions.pressKey('ArrowDown');
        await this.elementActions.pressKey('Enter');
      } else {
        // fallback: type the title and press enter
        await this.elementActions.sendKeys(titleToggle, data.title, 'Title typing');
        await this.elementActions.pressKey('Enter');
      }
    }

    // Mobile Number 1
    if (data.mobileNumber) {
      // Find the mobile number input field - using a more robust selector
      const mobileLocator = this.page.locator("//input[@maxlength='20']").first();
      
      // Scroll the element into view if needed
      await mobileLocator.scrollIntoViewIfNeeded();
      
      await this.page.waitForTimeout(500); // Wait for scroll animation
      await this.elementActions.click(mobileLocator, 'Mobile Number 1');
      await this.elementActions.sendKeys(mobileLocator, data.mobileNumber, 'Mobile Number 1');
    }

    // Save and wait for confirmation
    await this.elementActions.click(this.saveButton, 'Save profile button');

    // Validate success paragraph
    await this.elementActions.waitForElement(this.successParagraph, 5000, 'Success paragraph');
    const text = await this.elementActions.getText(this.successParagraph, 'Success paragraph');
    if (!text || !text.toLowerCase().includes('details created/updated')) {
      logger.error(`Unexpected success text: ${text}`);
      throw new Error('Profile creation did not show expected success message');
    }

    logger.info('Profile created successfully');
  }

  async confirmSuccess(): Promise<void> {
    // Some flows show additional text then OK button
    try {
      await this.elementActions.click(this.page.getByText('Details created/updated').first(), 'Details created/updated text');
    } catch (e) {
      // ignore if not present
    }
    await this.elementActions.click(this.okButton, 'OK button');
  }

  async closeProfileDialog(): Promise<void> {
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }).first(), 'Close button');
  }

  async searchInListAndOpen(mobileOrText: string): Promise<void> {
    // Use the list search input
    await this.elementActions.click(this.listSearchInput, 'List search input');
    await this.elementActions.sendKeys(this.listSearchInput, mobileOrText, 'List search input');

    // Click the search dropdown item
    const searchItem = this.page.getByText(`Search '${mobileOrText}' in Mobile`).first();
    await this.elementActions.click(searchItem, `Search '${mobileOrText}' in Mobile`);

    // Verify search results contain the mobile
    //await this.elementActions.waitForElement(this.searchResultContainer, 5000, 'Search results container');
  }

  async verifySearchResultContains(text: string): Promise<boolean> {
    const content = await this.elementActions.getText(this.searchResultContainer, 'Search result content');
    return content.includes(text);
  }

  async openFirstSearchResult(): Promise<void> {
    // Click the first 'Open' heading or button using framework click
    await this.elementActions.click(this.page.getByRole('heading', { name: 'Open' }).first(), 'Open first search result');
  }

  /**
   * Search for a profile using the mobile number in the list search.
   */
  async searchProfile(mobile: string): Promise<void> {
    logger.info(`Searching for profile with mobile: ${mobile}`);
    await this.elementActions.click(this.listSearchInput, 'List search input');
    await this.elementActions.sendKeys(this.listSearchInput, mobile, 'List search input');
    await this.elementActions.click(this.page.getByText(`Search '${mobile}' in Mobile`), `Search '${mobile}' in Mobile`);
  }

  /**
   * Verify that the search result contains the mobile number.
   */
  // async verifySearchResult(mobile: string): Promise<void> {
  //   logger.info(`Verifying search result contains mobile: ${mobile}`);
  //   await this.elementActions.waitForElement(this.searchResultContainer, 5000, 'Search results container');
  //   const content = await this.elementActions.getText(this.searchResultContainer, 'Search result content');
  //   if (!content.includes(`Mobile Number: ${mobile}`)) {
  //     throw new Error(`Search result does not contain Mobile Number: ${mobile}`);
  //   }
  // }


 async verifySearchResult(mobile: string): Promise<void> {
  logger.info(`Verifying search result for mobile: ${mobile}`);

  const mobileLocator = this.page.locator(`//h6[normalize-space()='${mobile}']`);

  await this.elementActions.waitForElement(mobileLocator, 5000, `Mobile ${mobile} in search result`);

  const mobileText = await this.elementActions.getText(mobileLocator, 'Mobile number text');

  if (mobileText.trim() !== mobile) {
    logger.error(`Expected mobile: ${mobile}, but found: ${mobileText}`);
    throw new Error(`Mobile number mismatch. Expected: ${mobile}, Found: ${mobileText}`);
  }

  logger.info(`Mobile number verified successfully: ${mobileText}`);
}

  /**
   * Open the first search result.
   */
  async openProfile(): Promise<void> {
    logger.info('Opening the first search result');
    
    // Wait for search results to load
    await this.page.waitForTimeout(500);
    
    // Try to find and click the Open button/link in the search results
    try {
      // Look for Open text that is clickable (could be in various elements)
      const openButton = this.page.locator('//text()[normalize-space()="Open"]/ancestor::button | //text()[normalize-space()="Open"]/ancestor::a | //h6[normalize-space()="Open"]').first();
      
      if (await openButton.count() > 0) {
        await this.elementActions.click(openButton, 'Open button');
        await this.page.waitForTimeout(1000); // Wait for profile to load
      } else {
        throw new Error('Could not find Open button in search results');
      }
    } catch (error) {
      logger.error(`Error opening profile: ${error}`);
      throw error;
    }
  }

  /**
   * Click the edit button (assuming the icon is the edit button).
   */
  async clickEditButton(): Promise<void> {
    logger.info('Clicking edit button');
    await this.elementActions.click(this.page.getByRole('button', { name: '󰲶' }).first(), 'Edit button');
  }

  /**
   * Modify the last name in the profile.
   */
  async modifyLastName(newLastName: string): Promise<void> {
    logger.info(`Modifying last name to: ${newLastName}`);
    const lastNameLocator = this.page.locator('div').filter({ hasText: /^Last Name\*$/ }).getByRole('textbox');
    await this.elementActions.click(lastNameLocator, 'Last Name input');
    await this.elementActions.pressKey('ControlOrMeta+a'); // Select all
    await this.elementActions.sendKeys(lastNameLocator, newLastName, 'Last Name input');
  }

  /**
   * Click the Update button.
   */
  async updateProfile(): Promise<void> {
    logger.info('Updating profile');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update button');
  }

  /**
   * Verify that the profile details contain the specified text.
   */
  // async verifyProfileDetails(text: string): Promise<void> {
  //   logger.info(`Verifying profile details contain: ${text}`);
  //   const profileDetails = this.page.locator('app-profile-details');
  //   await this.elementActions.waitForElement(profileDetails, 5000, 'Profile details');
  //   const content = await this.elementActions.getText(profileDetails, 'Profile details');
  //   if (!content.includes(text)) {
  //     throw new Error(`Profile details do not contain: ${text}`);
  //   }
  // }

  /**
   * Save profile data to Excel file for reference and traceability.
   */
  async saveProfileDataToExcel(firstName: string, mobileNumber: string): Promise<void> {
    logger.info(`Saving profile data to Excel: ${firstName}, ${mobileNumber}`);
    await this.excelDataWriter.appendProfileData({
      firstName,
      mobileNumber,
      createdAt: new Date().toISOString()
    });
  }
}
