import { expect, BrowserContext, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export class ProfileOperationsPage extends BasePage {
  private readonly elementActions: ElementActions;
  private businessDateCache?: string;

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  private async expectSuccessAndConfirm(message: string = 'Details created/updated successfully.'): Promise<void> {
    await expect(this.page.getByRole('paragraph')).toContainText(message);
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Success OK button');
  }

  private async openSectionsMenuAndSelect(sectionName: string): Promise<void> {
    const sectionsButton = this.page.getByRole('button', { name: /Sections/i });
    await this.elementActions.click(sectionsButton, 'Sections menu button');

    const sectionOption = this.page.locator('dropdown-button .dropdown-item').filter({ hasText: sectionName }).first();
    await expect(sectionOption).toBeVisible();
    await this.elementActions.click(sectionOption, `${sectionName} section option`);
  }

  private async getBusinessDate(): Promise<string> {
    if (this.businessDateCache) {
      return this.businessDateCache;
    }

    const businessInfo = this.page.locator('h6').filter({ hasText: 'Business Date:' }).first();
    await expect(businessInfo).toBeVisible();

    const infoText = (await businessInfo.textContent()) ?? '';
    const dateMatch = infoText.match(/Business Date:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
    if (!dateMatch) {
      throw new Error(`Unable to extract Business Date from: ${infoText}`);
    }

    this.businessDateCache = dateMatch[1];
    logger.info(`Using business date from header: ${this.businessDateCache}`);
    return this.businessDateCache;
  }

  private getNextDate(dateValue: string): string {
    const [day, month, year] = dateValue.split('/').map((part) => Number(part));
    const nextDate = new Date(year, month - 1, day);
    nextDate.setDate(nextDate.getDate() + 1);

    const nextDay = String(nextDate.getDate()).padStart(2, '0');
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
    const nextYear = String(nextDate.getFullYear());
    return `${nextDay}/${nextMonth}/${nextYear}`;
  }

  async openMarketingProfiles(): Promise<void> {
    logger.info('Opening Marketing > Profiles');


    

    await this.page.mouse.move(0, 400);

    await this.elementActions.click(this.page.getByRole('link', { name: ' Marketing' }), 'Marketing link');
    await this.elementActions.click(this.page.getByRole('link', { name: ' Profiles' }), 'Profiles link');
  }

  async searchProfileAndOpen(searchName: string): Promise<void> {
    logger.info(`Searching profile by name: ${searchName}`);
    const searchInput = this.page.getByRole('textbox', { name: 'Text input with dropdown' });

    await this.elementActions.click(searchInput, 'Profile search input');
    await this.elementActions.sendKeys(searchInput, searchName, 'Profile search input');
    await this.elementActions.click(this.page.getByText(`Search '${searchName}' in Name`), `Search '${searchName}' in Name option`);

    await this.elementActions.click(this.page.getByRole('heading', { name: 'Open' }).first(), 'Open profile result');
    await expect(this.page.locator('#candidate-name')).toContainText('Sachin');
  }

  async performComplaintsOperations(): Promise<void> {
    logger.info('Running Complaints operations');
    await this.openSectionsMenuAndSelect('Complaints');
    const businessDate = await this.getBusinessDate();

    await this.elementActions.click(this.page.getByRole('button').first(), 'Add complaint button');

    const dateInput = this.page.getByRole('textbox', { name: 'Select' });
    const complaintTextInput = this.page.locator('input-control').getByRole('textbox');

    await this.elementActions.click(dateInput, 'Complaint date input');
    await this.elementActions.sendKeys(dateInput, businessDate, 'Complaint date input');
    await this.elementActions.click(complaintTextInput, 'Complaint text input');
    await this.elementActions.sendKeys(complaintTextInput, 'New Complaints', 'Complaint text input');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save & Add New' }), 'Save and add new complaint');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(dateInput, 'Complaint date input second');
    await this.elementActions.sendKeys(dateInput, businessDate, 'Complaint date input second');
    await this.elementActions.click(complaintTextInput, 'Complaint text input second');
    await this.elementActions.sendKeys(complaintTextInput, 'complaint 1', 'Complaint text input second');
    await this.page.getByRole('radio', { name: 'Room Division' }).check();
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save & Add New' }), 'Save and add new complaint second');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(dateInput, 'Complaint date input third');
    await this.elementActions.sendKeys(dateInput, businessDate, 'Complaint date input third');
    await this.elementActions.click(complaintTextInput, 'Complaint text input third');
    await this.elementActions.sendKeys(complaintTextInput, 'house keepinng complaints', 'Complaint text input third');
    await this.page.getByRole('radio', { name: 'House Keeping' }).check();
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save complaint');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(this.page.getByRole('button').first(), 'Add/Reset complaints button');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close complaint form');

    await this.elementActions.click(this.page.getByRole('cell').first(), 'Select complaint row');
    await this.elementActions.click(this.page.getByRole('button').nth(1), 'Delete complaint button');
    await expect(this.page.getByRole('paragraph')).toContainText('Do you want to delete the selected record?');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Yes' }), 'Confirm complaint delete');
    await expect(this.page.getByRole('paragraph')).toContainText('Data Deleted Successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Confirm complaint delete OK');

    await this.elementActions.click(this.page.locator('.bx.bx-edit-alt').first(), 'Edit complaint icon');
    await this.elementActions.click(complaintTextInput, 'Edit complaint text input');
    await this.elementActions.sendKeys(complaintTextInput, 'complaint Modified', 'Edit complaint text input');
    await this.page.getByRole('radio', { name: 'House Keeping' }).check();
    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update complaint button');
    await this.expectSuccessAndConfirm();
        await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close complaints section');


    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close complaints section');
  }

  async performGuestPreferencesOperations(): Promise<void> {
    logger.info('Running Guest Preferences operations');
    await this.openSectionsMenuAndSelect('Guest Prefrences');

    const textboxes = this.page.getByRole('textbox');
    await this.elementActions.click(textboxes.first(), 'Guest preference name input');
    await this.elementActions.sendKeys(textboxes.first(), 'early checkin', 'Guest preference name input');
    await this.elementActions.click(textboxes.nth(1), 'Guest preference value input');
    await this.elementActions.sendKeys(textboxes.nth(1), 'test', 'Guest preference value input');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update guest preference');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close guest preference section');
  }

  async performNotesOperations(): Promise<void> {
    logger.info('Running Notes operations');
    await this.openSectionsMenuAndSelect('Notes');

    await this.elementActions.click(this.page.getByRole('button').first(), 'Add note button');
    const editor = this.page.getByRole('textbox', { name: 'Editor editing area: main.' });

    await this.elementActions.click(editor, 'Note editor');
    await this.elementActions.sendKeys(editor, 'Notes', 'Note editor content');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save & Add New' }), 'Save and add new note');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(editor, 'Note editor second');
    await this.elementActions.sendKeys(editor, 'Notes 1', 'Note editor second content');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save note');
    await this.expectSuccessAndConfirm();

    await expect(this.page.locator('tbody')).toContainText('Notes');

    await this.elementActions.click(this.page.getByRole('cell').first(), 'Select note row');
    await this.elementActions.click(this.page.getByRole('button').nth(1), 'Delete note selected row');
    await expect(this.page.getByRole('paragraph')).toContainText('Do you want to delete the selected record?');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Yes' }), 'Confirm note delete selected row');
    await expect(this.page.getByRole('paragraph')).toContainText('Data Deleted Successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Confirm note delete selected row OK');

    await this.elementActions.click(this.page.locator('.bx.bx-edit-alt').first(), 'Edit note icon');
    //await this.elementActions.click(this.page.getByText('Notes', { exact: true }), 'Select Notes 1');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update note button');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close notes edit dialog');

    await this.elementActions.click(this.page.locator('.bx.bx-edit-alt').first(), 'Edit note icon for delete');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Delete' }), 'Delete note from edit dialog');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Yes' }), 'Confirm delete note from edit dialog');
    await expect(this.page.locator('#swal2-html-container')).toContainText('Data Deleted Successfully.');
    await this.elementActions.click(this.page.getByText('OK'), 'Delete note from edit dialog OK');

    await this.elementActions.click(this.page.locator('.d-flex > icon-button-control > .btn').first(), 'Add note quick button');
    await this.elementActions.click(editor, 'Final note editor');
    await this.elementActions.sendKeys(editor, 'Notes final', 'Final note editor content');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save final note');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(this.page.getByText('Close'), 'Close notes section');
  }

  async performEventsOperations(): Promise<void> {
    logger.info('Running Events operations');
    await this.openSectionsMenuAndSelect('Events');
    const businessDate = await this.getBusinessDate();

    await this.elementActions.click(this.page.getByRole('button').first(), 'Add event button');

    const eventComboTextbox = this.page.getByRole('combobox').getByRole('textbox');
    await this.elementActions.click(eventComboTextbox, 'Event combobox input');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    await this.elementActions.click(this.page.getByRole('textbox', { name: 'Select' }), 'Event date input');
    await this.elementActions.sendKeys(this.page.getByRole('textbox', { name: 'Select' }), businessDate, 'Event date input');
    await this.page.keyboard.press('Tab');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save event');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close events section');

    await this.openSectionsMenuAndSelect('Events');
    await this.elementActions.click(this.page.getByRole('cell').first(), 'Select event row');
    await this.elementActions.click(this.page.getByRole('button').nth(1), 'Delete event button');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Yes' }), 'Confirm event delete');
    await expect(this.page.getByRole('paragraph')).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.page.getByRole('button', { name: 'OK' }), 'Confirm event delete OK');
    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close events section after delete');
  }

  async performDefaultsOperations(): Promise<void> {
    logger.info('Running Defaults operations');
    await this.openSectionsMenuAndSelect('Defaults');

    await this.elementActions.click(this.page.getByRole('combobox').first(), 'Defaults combobox');
    const defaultsTextbox = this.page
      .locator('ng-select')
      .filter({ hasText: '--select-- 2HUBMP 2HUB' })
      .getByRole('textbox');

    //await this.elementActions.click(defaultsTextbox, 'Defaults textbox');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Update' }), 'Update defaults');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close defaults section');
  }

  async performLoyaltyCreditCardOperations(): Promise<void> {
    logger.info('Running Loyality/Credit Card operations');
    await this.openSectionsMenuAndSelect('Loyality/Credit Card');
    const businessDate = await this.getBusinessDate();
    const nextBusinessDate = this.getNextDate(businessDate);

    const uniqueSeed = Date.now().toString().slice(-6);
    const firstMemberNumber = uniqueSeed;
    const secondMemberNumber = (Number(uniqueSeed) + 1).toString();

    await this.elementActions.click(this.page.getByRole('button').first(), 'Add loyalty/credit card');

    const combo = this.page.getByRole('combobox').getByRole('textbox');
    await this.elementActions.click(this.page.getByRole('combobox'), 'Loyalty type combobox');
    await this.elementActions.click(combo, 'Loyalty type textbox');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');
    await this.elementActions.pressKey('Tab');

    const memberNumberInput = this.page.locator('input-control').getByRole('textbox').first();
    await this.elementActions.click(memberNumberInput, 'Membership number input');
    await this.elementActions.sendKeys(memberNumberInput, firstMemberNumber, 'Membership number input');
    await this.elementActions.pressKey('Tab');

    const startDateInput = this.page.getByRole('textbox', { name: 'Select' }).first();
    const expiryDateInput = this.page.getByRole('textbox', { name: 'Select' }).nth(1);
    await this.elementActions.click(startDateInput, 'Loyalty start date input');
    await this.elementActions.sendKeys(startDateInput, businessDate, 'Loyalty start date input');
    
    //await this.page.consoleMessages
    await this.elementActions.click(expiryDateInput, 'Loyalty expiry date input');
    await this.elementActions.sendKeys(expiryDateInput, nextBusinessDate, 'Loyalty expiry date input');
    await this.elementActions.pressKey('Tab');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save & Add New' }), 'Save and add new loyalty record');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(this.page.getByRole('combobox'), 'Loyalty type combobox second');
    await this.elementActions.click(combo, 'Loyalty type textbox second');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('ArrowDown');
    await this.elementActions.pressKey('Enter');

    await this.elementActions.click(memberNumberInput, 'Membership number input second');
    await this.elementActions.sendKeys(memberNumberInput, secondMemberNumber, 'Membership number input second');

    await this.elementActions.click(startDateInput, 'Loyalty start date input second');
    await this.elementActions.sendKeys(startDateInput, businessDate, 'Loyalty start date input second');

    await this.elementActions.click(expiryDateInput, 'Loyalty expiry date input second');
    await this.elementActions.sendKeys(expiryDateInput, nextBusinessDate, 'Loyalty expiry date input second');
    await this.elementActions.pressKey('Tab');

    await this.elementActions.click(this.page.getByRole('button', { name: 'Save', exact: true }), 'Save loyalty record');
    await this.expectSuccessAndConfirm();

    await this.elementActions.click(this.page.getByRole('button', { name: 'Close' }), 'Close loyalty section');

    const fifthIconButton = this.page.locator('icon-button-control:nth-child(5) > .btn');
    await this.elementActions.click(fifthIconButton, 'Fifth icon button');
    await fifthIconButton.press('ControlOrMeta+Shift+I');
    await fifthIconButton.press('ControlOrMeta+Shift+I');
    await fifthIconButton.press('ControlOrMeta+Shift+I');
  }

  async runCompleteProfileOperationsFlow(searchName: string): Promise<void> {
    await this.openMarketingProfiles();
    await this.searchProfileAndOpen(searchName);

    await this.performComplaintsOperations();
    await this.performGuestPreferencesOperations();
    await this.performNotesOperations();
    await this.performEventsOperations();
    await this.performDefaultsOperations();
    await this.performLoyaltyCreditCardOperations();
  }
}
