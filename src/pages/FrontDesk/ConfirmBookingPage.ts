import { BrowserContext, expect, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export interface ConfirmBookingFlowData {
  bookingDate: string;
  lastName: string;
  firstName: string;
  phone: string;
  email: string;
  dropdownArrowDownPresses?: number;
  returnUrl?: string;
}

export class ConfirmBookingPage extends BasePage {
  private readonly elementActions: ElementActions;

  private readonly frontDeskSummary = this.page.getByText('-Waitlisted 38Confirmed 1Hold');
  private readonly frontDeskLink = this.page.getByRole('link', { name: ' Front Desk' });
  private readonly bookingCalendarLink = this.page.getByRole('link', { name: ' Booking Calendar' });
  private readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  private readonly confirmContinueButton = this.page.getByRole('button', { name: 'Confirm & Continue' });
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });
  private readonly closeButton = this.page.getByRole('button', { name: 'Close' });
  private readonly yesButton = this.page.getByRole('button', { name: 'Yes' });
  private readonly openBookingButton = this.page.getByRole('button', { name: '󰈈 Open Booking' });
  //private readonly toastMessage = this.page.locator('p');
  //private readonly toastMessage =  this.page.getByText('Please Enter Last Name');


  private readonly toastMessage = (message: string) =>
  this.page.getByText(message);

  private readonly confirmationDialog = this.page.locator('#swal2-html-container');
  private readonly optionDropdown = this.page
    .locator('ng-select')
    .filter({ hasText: '--select-- !@#$%^&*():\\"<>?|' });
    private readonly titleDropdown = this.page
      .locator('div')
      .filter({ hasText: /^Title--select--$/ })
      .locator('div')
      .first();

    private readonly sourceBox = this.page.locator('//*[@id="cdk-drop-list-1"]/div[1]');
    private readonly targetBox = this.page.locator('//*[@id="cdk-drop-list-1"]/div[3]');

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  async openBookingCalendarFromFrontDesk(): Promise<void> {
    logger.info('Opening Booking Calendar from Front Desk');
    await this.page.mouse.move(0, 400);
    //await this.elementActions.hover(this.frontDeskSummary, 'Front Desk summary');
    await this.elementActions.click(this.frontDeskLink, 'Front Desk link');
    await this.elementActions.click(this.bookingCalendarLink, 'Booking Calendar link');
  }

  async selectBookingDate(bookingDate: string): Promise<void> {
    logger.info(`Selecting booking date block: ${bookingDate}`);
    await this.sourceBox.dragTo(this.targetBox);
    //await this.page.locator('div').filter({ hasText: new RegExp(`^${bookingDate}$`) }).click();mmmm
    await this.nextButton.click();
    await this.confirmContinueButton.click();
  }

  async verifyLastNameValidation(): Promise<void> {
    logger.info('Verifying required last name validation');
    
    await expect(this.toastMessage('Please Enter Last Name')).toBeVisible();
    await this.okButton.click();
  }

  private async selectOptionByKeyboard(presses = 9): Promise<void> {

    await this.elementActions.click(this.titleDropdown, 'Option dropdown');
   

    // await this.elementActions.sendKeys("MR", '', 'Typing in dropdown to filter options', false);
    // await this.titleDropdown.press('Enter');

    // const dropdownInput = this.optionDropdown.getByRole('textbox');
    // await dropdownInput.click();

    for (let index = 0; index < presses; index += 1) {
      await this.optionDropdown.press('ArrowDown');
    }

    await this.optionDropdown.press('Enter');
  }

  private readonly emailInput = this.page.getByRole('textbox', { name: 'example@gmail.com' });

  async fillGuestDetails(data: ConfirmBookingFlowData): Promise<void> {
    logger.info('Filling guest details for booking confirmation');

    await this.page.getByRole('textbox').first().fill(data.lastName);
    await this.page.getByRole('textbox').nth(1).click();
    await this.closeButton.click();
    await this.page.getByRole('textbox').nth(1).fill(data.firstName);

    await this.selectOptionByKeyboard(data.dropdownArrowDownPresses ?? 9);

    await this.page.getByRole('textbox').nth(3).fill(data.phone);

    try {
      await this.elementActions.click(this.closeButton, 'close button');
    }catch (error) {
      
    }
    await this.elementActions.click(this.emailInput, 'Email input');
    await this.elementActions.sendKeys(this.emailInput, data.email, 'Filling email input');
    //await this.page.getByRole('textbox', { name: '    
    //await this.page.getByRole('textbox', { name: 'example@gmail.com' }).fill(data.email);
  }

  async submitBookingAndHandleConfirmation(options: Pick<ConfirmBookingFlowData, 'returnUrl'> = {}): Promise<void> {
    logger.info('Submitting booking confirmation');

    await this.confirmContinueButton.click();
    await expect(this.confirmationDialog).toContainText('Do you want to send the confirmation letter on save?');
    await this.yesButton.click();
    await expect(this.toastMessage('Guest(s) reservation successfull. Error in Sending Mail.')).toBeVisible();
    await this.okButton.click();
    await this.openBookingButton.click();

    if (options.returnUrl) {
      await this.page.goto(options.returnUrl);
    }
  }

  async completeConfirmBookingFlow(data: ConfirmBookingFlowData): Promise<void> {
    await this.openBookingCalendarFromFrontDesk();
    await this.selectBookingDate(data.bookingDate);
    await this.verifyLastNameValidation();
    await this.fillGuestDetails(data);
    await this.submitBookingAndHandleConfirmation({ returnUrl: data.returnUrl });
  }
}