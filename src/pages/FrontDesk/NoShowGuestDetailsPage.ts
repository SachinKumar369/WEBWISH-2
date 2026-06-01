import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../../core/BasePage';
import logger from '../../core/Logger';
import { ElementActions } from '../../utils/ElementActions';

export interface GuestModifyData {
  firstName: string;
  lastName: string;
  email: string;
  primaryContact: string;
  title?: string;
}

export class NoShowGuestDetailsPage extends BasePage {
  private readonly elementActions: ElementActions;

  // Locators
  private readonly editButton = this.page.locator('.btn-soft-secondary').first();
  private readonly successMessage = this.page.getByRole('paragraph');
  private readonly closeButton = this.page.getByRole('button', { name: 'Close' });
  private readonly okButton = this.page.getByRole('button', { name: 'OK' });
  private readonly updateButton = this.page.getByRole('button', { name: 'Update' });
  private readonly noShowButton = this.page.getByRole('button', { name: 'No Show' });

  // Search box: prefer component-scoped input, fallback to generic search input
  private readonly searchBox = this.page
    .locator('app-guest-search')
    .getByRole('textbox', { name: 'Search...' })
    .or(this.page.locator('input[placeholder="Search..."]').first());

  private readonly guaranteedToggle = this.page.getByRole('switch', { name: 'Guaranted' });
  private readonly titleOptionsList = this.page.getByLabel('Options list');
  private readonly clearFilters = this.page.locator('.btn.btn-close');
  private readonly firstAvailableGuest = this.page.getByRole('heading', { name: 'Open' }).first();

  constructor(page: Page, context: BrowserContext) {
    super(page, context);
    this.elementActions = new ElementActions(page);
  }

  async openFirstAvailableGuest():
    Promise<void> {

    try {

      logger.info(
        'Opening First Available Guest'
      );

      if (
        await this.clearFilters.isVisible()
      ) {

        await this.elementActions.click(
          this.clearFilters,
          'Clear Filters'
        );
      }

      await expect(
        this.firstAvailableGuest
      ).toBeVisible();

      await this.elementActions.click(
        this.firstAvailableGuest,
        'First Available Guest'
      );

      await this.page.waitForLoadState(
        'networkidle'
      );

      logger.info(
        'First Available Guest Opened'
      );

    } catch (error) {

      logger.error(
        `Failed to open available guest : ${error}`
      );

      throw error;
    }
  }

  private async clearAndType(locator: Locator, value: string, fieldName: string): Promise<void> {
    try {
      logger.info(`Updating ${fieldName} : ${value}`);
      await this.elementActions.click(locator, `${fieldName} input`);
      await this.elementActions.sendKeys(locator, value, `${fieldName} input`);
      logger.info(`${fieldName} Updated Successfully`);
    } catch (error) {
      logger.error(`Failed to update ${fieldName} : ${error}`);
      throw error;
    }
  }

  private async selectTitle(title?: string): Promise<void> {
    if (!title) {
      logger.info('No title update requested');
      return;
    }

    logger.info(`Selecting Title : ${title}`);
    const titleInput = this.page.locator('drop-down-searchable .ng-input input').first();

    if (await titleInput.count()) {
      await this.elementActions.click(titleInput, 'Title input');
      await this.elementActions.sendKeys(titleInput, title, 'Title input');
    } else {
      const titleToggle = this.page
        .locator('.col-md-4 > drop-down-searchable > .custom-dropdown > .ng-select-container')
        .first();
      await this.elementActions.click(titleToggle, 'Title dropdown');
      await this.elementActions.click(
        this.page
          .locator('.col-md-4 > drop-down-searchable > .custom-dropdown > .ng-select-container > .ng-arrow-wrapper')
          .first(),
        'Title dropdown arrow'
      );

      const titleSearchTextbox = this.page.locator('ng-select').filter({ hasText: '--select--× Mrs. Mrs Dr.' }).getByRole('textbox');
      await titleSearchTextbox.fill(title);
    }

    await this.titleOptionsList.getByText(title, { exact: true }).click();
    logger.info('Title Selected Successfully');
  }

  private readonly mainScreen = this.page.locator('page-header #button-email');

  private async confirmSuccessAndClose(): Promise<void> {
    await expect(this.successMessage).toContainText('Details created/updated successfully.');
    await this.elementActions.click(this.okButton, 'OK button');
    await this.page.waitForLoadState('networkidle');
    await this.elementActions.click(this.closeButton, 'Close button');
  }

  async updateGuestDetails(guestData: GuestModifyData): Promise<string> {
    try {
      logger.info('Clicking Edit Button');
      await this.elementActions.click(this.editButton, 'Edit Button');

      const lastNameTextbox = this.page.getByRole('textbox').nth(0);
      const firstNameTextbox = this.page.getByRole('textbox').nth(1);
      const emailTextbox = this.page.getByRole('textbox', { name: 'example@gmail.com' });
      const contactNumberTextbox = this.page.getByPlaceholder('Enter Contact Number').first();

      await this.clearAndType(lastNameTextbox, guestData.lastName, 'Last Name');
      await this.clearAndType(firstNameTextbox, guestData.firstName, 'First Name');
      await this.selectTitle(guestData.title);
      await this.clearAndType(emailTextbox, guestData.email, 'Email');
      await this.clearAndType(contactNumberTextbox, guestData.primaryContact, 'Contact Number');

      logger.info('Checking Guaranted Toggle Status');
      const isGuaranteedChecked = await this.guaranteedToggle.isChecked();
      logger.info(`Guaranted Toggle Status : ${isGuaranteedChecked}`);
      if (!isGuaranteedChecked) {
        logger.info('Enabling Guaranted Toggle');
        await this.guaranteedToggle.check();
        logger.info('Guaranted Toggle Enabled');
      }

      logger.info('Clicking Update Button');
      await this.elementActions.click(this.updateButton, 'Update Button');
      await this.confirmSuccessAndClose();

      const reservationNumber = await this.getReservationNumber();
      logger.info(`Reservation Number : ${reservationNumber}`);
      return reservationNumber;
    } catch (error) {
      logger.error(`Failed to update guest details : ${error}`);
      throw error;
    }
  }

  async markGuestAsNoShow(reservationNumber: string): Promise<void> {
    try {
      logger.info('Searching Reservation Number');
      await this.elementActions.sendKeys(this.searchBox, reservationNumber, 'Reservation search box', true);

          await this.elementActions.click(this.mainScreen, 'Main screen to ensure modal is closed');

      logger.info('Clicking No Show Button');
      await this.elementActions.click(this.noShowButton, 'No Show Button');
      await this.confirmSuccessAndClose();
      logger.info('Guest Marked As NoShow');
    } catch (error) {
      logger.error(`Failed to mark guest as NoShow : ${error}`);
      throw error;
    }
  }

  async getReservationNumber():
    Promise<string> {

    try {

      logger.info(
        'Getting Reservation Number'
      );

      const reservationNumber =
        await this.page
          .locator(
            'h5.text-info'
          )
          .nth(1)
          .textContent();

      logger.info(
        `Reservation Number : ${reservationNumber}`
      );

      return reservationNumber?.trim() || '';

    } catch (error) {

      logger.error(
        `Failed to get reservation number : ${error}`
      );

      return '';
    }
  }

  async getStayStatus():
    Promise<string> {

    try {

      logger.info(
        'Getting Stay Status'
      );

      const status =
        await this.page
          .getByText(
            /NO SHOW|NoShow/i
          )
          .first()
          .textContent();

      logger.info(
        `Stay Status : ${status}`
      );

      return status?.trim() || '';

    } catch (error) {

      logger.error(
        `Failed to get stay status : ${error}`
      );

      return '';
    }
  }
}